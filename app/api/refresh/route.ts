import { NextResponse } from 'next/server';
import { getSproutClient } from '@/lib/sprout-api';
import type { SproutPostRow, SproutProfileAnalyticsRow } from '@/lib/sprout-api';
import { sql, logRefreshStart, logRefreshComplete } from '@/lib/db';
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

  const refreshId = await logRefreshStart();
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
      await logRefreshComplete(refreshId, 'completed', 0);
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

    // 2. Upsert profiles
    const profileMap = new Map<number, { platform: PlatformId; profile: SproutProfile }>();

    for (const p of relevantProfiles) {
      const platform = toPlatformId(p.network_type)!;
      const handle = p.native_name ?? p.name;
      await sql`
        INSERT INTO profiles (customer_profile_id, platform, name, handle, native_id)
        VALUES (${p.customer_profile_id}, ${platform}, ${p.name}, ${handle}, ${p.native_id})
        ON CONFLICT(customer_profile_id) DO UPDATE SET
          platform = EXCLUDED.platform,
          name = EXCLUDED.name,
          handle = EXCLUDED.handle,
          native_id = EXCLUDED.native_id,
          updated_at = CURRENT_TIMESTAMP
      `;
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

    // 4. Upsert daily metrics (batch via transaction)
    const dailyMetricQueries = [];
    for (const row of analyticsRows) {
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
      const impressions = m.impressions ?? 0;
      const videoViews = m.video_views ?? 0;
      const followers = m['lifetime_snapshot.followers_count'] ?? 0;
      const followerGrowth = m.net_follower_growth ?? 0;
      const postsPublished = m.posts_sent_count ?? 0;

      dailyMetricQueries.push(sql`
        INSERT INTO daily_metrics (
          profile_id, platform, date, impressions, engagements,
          reactions, comments, shares, saves, video_views,
          clicks, followers, follower_growth, posts_published
        ) VALUES (
          ${profileId}, ${entry.platform}, ${date}, ${impressions}, ${engagements},
          ${reactions}, ${comments}, ${shares}, ${saves}, ${videoViews},
          ${clicks}, ${followers}, ${followerGrowth}, ${postsPublished}
        )
        ON CONFLICT(profile_id, date) DO UPDATE SET
          impressions = EXCLUDED.impressions,
          engagements = EXCLUDED.engagements,
          reactions = EXCLUDED.reactions,
          comments = EXCLUDED.comments,
          shares = EXCLUDED.shares,
          saves = EXCLUDED.saves,
          video_views = EXCLUDED.video_views,
          clicks = EXCLUDED.clicks,
          followers = EXCLUDED.followers,
          follower_growth = EXCLUDED.follower_growth,
          posts_published = EXCLUDED.posts_published
      `);
      recordsUpdated++;
    }

    if (dailyMetricQueries.length > 0) {
      await sql.transaction(dailyMetricQueries);
    }
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

    // 6. Upsert posts (batch via transaction)
    const postQueries = [];
    for (const post of allPosts) {
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
      const content = (post.text ?? '').substring(0, 500);
      const createdAt = post.created_time ?? '';
      const permalink = post.perma_link ?? '';

      postQueries.push(sql`
        INSERT INTO posts (
          id, profile_id, platform, created_at, content, permalink,
          impressions, engagements, video_views, reactions,
          comments, shares, saves, clicks, emv
        ) VALUES (
          ${postId}, ${profileId}, ${platform}, ${createdAt}, ${content}, ${permalink},
          ${impressions}, ${engagements}, ${videoViews}, ${reactions},
          ${commentsCount}, ${sharesCount}, ${savesCount}, ${clicksCount}, ${emv}
        )
        ON CONFLICT(id) DO UPDATE SET
          impressions = EXCLUDED.impressions,
          engagements = EXCLUDED.engagements,
          video_views = EXCLUDED.video_views,
          reactions = EXCLUDED.reactions,
          comments = EXCLUDED.comments,
          shares = EXCLUDED.shares,
          saves = EXCLUDED.saves,
          clicks = EXCLUDED.clicks,
          emv = EXCLUDED.emv,
          cached_at = CURRENT_TIMESTAMP
      `);
      recordsUpdated++;
    }

    if (postQueries.length > 0) {
      await sql.transaction(postQueries);
    }
    console.log(`[Refresh] Upserted ${allPosts.length} posts`);

    await logRefreshComplete(refreshId, 'completed', recordsUpdated);

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
    await logRefreshComplete(refreshId, 'failed', recordsUpdated, message);

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
