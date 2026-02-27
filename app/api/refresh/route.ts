import { NextResponse } from 'next/server';
import { getSproutClient } from '@/lib/sprout-api';
import type { SproutPostRow, SproutProfileAnalyticsRow } from '@/lib/sprout-api';
import { getDb, logRefreshStart, logRefreshComplete } from '@/lib/db';
import { calculateEMV } from '@/lib/emv-calculator';
import type { PlatformId, SproutProfile } from '@/lib/types';
import platformsConfig from '@/config/platforms.json';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute timeout for full refresh

// Map Sprout network_type → our PlatformId
// Sprout uses "fb_instagram_account" for Instagram business accounts
const NETWORK_TYPE_ALIASES: Record<string, string> = {
  fb_instagram_account: 'instagram',
};

function toPlatformId(networkType: string): PlatformId | null {
  const normalised = NETWORK_TYPE_ALIASES[networkType] ?? networkType;
  for (const [pid, cfg] of Object.entries(platformsConfig)) {
    if (cfg.sproutNetworkType === normalised) return pid as PlatformId;
  }
  return null;
}

// Profile-level metrics to request from Sprout
const PROFILE_METRICS = [
  'impressions',
  'reactions',
  'comments',
  'shares',
  'saves',
  'post_clicks',
  'video_views',
  'net_follower_growth',
  'lifetime_snapshot.followers_count',
  'posts_sent_count',
];

// Post-level metrics to request (validated against Sprout API)
// Platform caveats:
// - YouTube: `lifetime.impressions` returns 0 — YouTube Studio does not expose
//   per-post impressions via Sprout. Use `lifetime.views` as reach proxy.
// - Saves: `lifetime.saves_count` is NOT available at post level — Sprout API
//   returns 400 if requested. Post-level saves are only available via profile
//   analytics (daily_metrics). We set saves=0 for individual posts.
// - Clicks: `lifetime.post_content_clicks` returns data only for X and Facebook.
//   Instagram, TikTok, YouTube do not expose post-level clicks via Sprout.
const POST_METRICS = [
  'lifetime.impressions',
  'lifetime.reactions',
  'lifetime.comments_count',
  'lifetime.shares_count',
  'lifetime.post_content_clicks',
  'lifetime.video_views',
  'lifetime.views',
];

// Post fields to request (network_type is NOT a valid field in Sprout API)
const POST_FIELDS = [
  'created_time',
  'perma_link',
  'text',
  'customer_profile_id',
  'guid',
];

export async function POST(request: Request) {
  const client = getSproutClient();

  if (!client.isConfigured()) {
    return NextResponse.json(
      { error: 'Sprout API credentials not configured' },
      { status: 503 }
    );
  }

  // Optional auth for cron/external calls
  const authHeader = request.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && authHeader !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const refreshId = logRefreshStart();
  let recordsUpdated = 0;

  try {
    console.log('[Refresh] Starting Sprout Social data refresh...');

    // 1. Fetch profiles
    const profiles = await client.getProfiles();
    console.log(`[Refresh] Found ${profiles.length} profiles`);

    // Filter to platforms we care about
    const relevantProfiles = profiles.filter((p) => toPlatformId(p.network_type) !== null);
    console.log(`[Refresh] ${relevantProfiles.length} profiles match configured platforms`);

    if (relevantProfiles.length === 0) {
      logRefreshComplete(refreshId, 'completed', 0);
      return NextResponse.json({
        status: 'completed',
        message: 'No matching profiles found. Check platform configuration.',
        profiles: profiles.map((p) => ({
          name: p.name,
          network: p.network_type,
          id: p.customer_profile_id,
        })),
      });
    }

    const db = getDb();

    // 2. Upsert profiles
    const upsertProfile = db.prepare(`
      INSERT INTO profiles (customer_profile_id, platform, name, handle, native_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(customer_profile_id) DO UPDATE SET
        platform = excluded.platform,
        name = excluded.name,
        handle = excluded.handle,
        native_id = excluded.native_id,
        updated_at = CURRENT_TIMESTAMP
    `);

    const profileMap = new Map<number, { platform: PlatformId; profile: SproutProfile }>();

    for (const p of relevantProfiles) {
      const platform = toPlatformId(p.network_type)!;
      upsertProfile.run(
        p.customer_profile_id,
        platform,
        p.name,
        p.native_name ?? p.name,
        p.native_id
      );
      profileMap.set(p.customer_profile_id, { platform, profile: p });
    }
    console.log(`[Refresh] Upserted ${relevantProfiles.length} profiles`);

    // 3. Fetch daily profile analytics (last 365 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const profileIds = relevantProfiles.map((p) => p.customer_profile_id);
    console.log(`[Refresh] Fetching profile analytics from ${startDate} to ${endDate}...`);

    const analyticsRows = await client.getAllProfileAnalytics(
      profileIds,
      startDate,
      endDate,
      PROFILE_METRICS
    );

    // 4. Upsert daily metrics
    const upsertDailyMetric = db.prepare(`
      INSERT INTO daily_metrics (
        profile_id, platform, date, impressions, engagements,
        reactions, comments, shares, saves, video_views,
        clicks, followers, follower_growth, posts_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(profile_id, date) DO UPDATE SET
        impressions = excluded.impressions,
        engagements = excluded.engagements,
        reactions = excluded.reactions,
        comments = excluded.comments,
        shares = excluded.shares,
        saves = excluded.saves,
        video_views = excluded.video_views,
        clicks = excluded.clicks,
        followers = excluded.followers,
        follower_growth = excluded.follower_growth,
        posts_published = excluded.posts_published
    `);

    const upsertDailyMetrics = db.transaction(
      (rows: SproutProfileAnalyticsRow[]) => {
        for (const row of rows) {
          const profileId = row.dimensions.customer_profile_id;
          const date = row.dimensions['reporting_period.by(day)'];
          const entry = profileMap.get(profileId);
          if (!entry) continue;

          const m = row.metrics;
          const reactions = m.reactions ?? 0;
          const comments = m.comments ?? 0;
          const shares = m.shares ?? 0;
          const saves = m.saves ?? 0;
          const clicks = m.post_clicks ?? 0;
          const engagements = reactions + comments + shares + saves + clicks;

          upsertDailyMetric.run(
            profileId,
            entry.platform,
            date,
            m.impressions ?? 0,
            engagements,
            reactions,
            comments,
            shares,
            saves,
            m.video_views ?? 0,
            clicks,
            m['lifetime_snapshot.followers_count'] ?? 0,
            m.net_follower_growth ?? 0,
            m.posts_sent_count ?? 0
          );
          recordsUpdated++;
        }
      }
    );

    upsertDailyMetrics(analyticsRows);
    console.log(
      `[Refresh] Upserted ${analyticsRows.length} daily metric rows`
    );

    // 5. Fetch post analytics (paginated)
    console.log('[Refresh] Fetching post analytics...');
    const allPosts = await client.getAllPostAnalytics(
      profileIds,
      startDate,
      endDate,
      POST_METRICS,
      POST_FIELDS,
      ['lifetime.impressions:desc']
    );
    console.log(`[Refresh] Fetched ${allPosts.length} posts`);

    // 6. Upsert posts
    const upsertPost = db.prepare(`
      INSERT INTO posts (
        id, profile_id, platform, created_at, content, permalink,
        impressions, engagements, video_views, reactions,
        comments, shares, saves, clicks, emv
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        impressions = excluded.impressions,
        engagements = excluded.engagements,
        video_views = excluded.video_views,
        reactions = excluded.reactions,
        comments = excluded.comments,
        shares = excluded.shares,
        saves = excluded.saves,
        clicks = excluded.clicks,
        emv = excluded.emv,
        cached_at = CURRENT_TIMESTAMP
    `);

    const upsertPosts = db.transaction((posts: SproutPostRow[]) => {
      for (const post of posts) {
        // customer_profile_id comes back as a string from post analytics
        const profileIdRaw = post.customer_profile_id;
        if (!profileIdRaw) continue;
        const profileId = typeof profileIdRaw === 'string' ? Number(profileIdRaw) : profileIdRaw;

        const entry = profileMap.get(profileId);
        if (!entry) continue;

        const platform = entry.platform;
        const m = post.metrics ?? {};

        const reactions = m['lifetime.reactions'] ?? 0;
        const commentsCount = m['lifetime.comments_count'] ?? 0;
        const sharesCount = m['lifetime.shares_count'] ?? 0;
        const savesCount = 0; // C-02: saves not available at post level (only in daily profile analytics)
        const clicksCount = m['lifetime.post_content_clicks'] ?? 0; // C-03: only X/FB return clicks
        const rawImpressions = m['lifetime.impressions'] ?? 0;
        // C-01: YouTube impressions are always 0 via Sprout — use views as proxy
        const impressions = rawImpressions === 0 && platform === 'youtube'
          ? (m['lifetime.views'] ?? m['lifetime.video_views'] ?? 0)
          : rawImpressions;
        const videoViews = m['lifetime.video_views'] ?? m['lifetime.views'] ?? 0;
        const engagements = reactions + commentsCount + sharesCount + savesCount + clicksCount;

        // Calculate EMV using the standard calculator
        const emv = calculateEMV(platform, {
          views: videoViews,
          impressions,
          likes: reactions,
          comments: commentsCount,
          shares: sharesCount,
          saves: savesCount,
          clicks: clicksCount,
        });

        const postId = post.guid ?? `${platform}-${post.created_time}-${profileId}`;

        upsertPost.run(
          postId,
          profileId,
          platform,
          post.created_time ?? '',
          (post.text ?? '').substring(0, 500),
          post.perma_link ?? '',
          impressions,
          engagements,
          videoViews,
          reactions,
          commentsCount,
          sharesCount,
          savesCount,
          clicksCount,
          emv
        );
        recordsUpdated++;
      }
    });

    upsertPosts(allPosts);
    console.log(`[Refresh] Upserted ${allPosts.length} posts`);

    logRefreshComplete(refreshId, 'completed', recordsUpdated);

    return NextResponse.json({
      status: 'completed',
      message: `Refresh complete. ${recordsUpdated} records updated.`,
      profiles: relevantProfiles.map((p) => ({
        name: p.name,
        network: p.network_type,
        platform: toPlatformId(p.network_type),
      })),
      dailyMetrics: analyticsRows.length,
      posts: allPosts.length,
      recordsUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Refresh] Error:', message);
    logRefreshComplete(refreshId, 'failed', recordsUpdated, message);

    return NextResponse.json(
      {
        error: 'Refresh failed',
        message,
        recordsUpdated,
      },
      { status: 500 }
    );
  }
}
