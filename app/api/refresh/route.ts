import { NextResponse } from 'next/server';
import { getSproutClient } from '@/lib/sprout-api';
import type { SproutPostRow, SproutProfileAnalyticsRow } from '@/lib/sprout-api';
import { sql, logRefreshStart, logRefreshComplete } from '@/lib/db';
import { calculateEMV } from '@/lib/emv-calculator';
import type { PlatformId, SproutProfile } from '@/lib/types';
import platformsConfig from '@/config/platforms.json';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minute timeout for full refresh

/**
 * Sanitise text for safe insertion via Neon's HTTP driver.
 *
 * Neon serialises SQL parameters as JSON in the HTTP body. Social media post
 * text (emoji, surrogates, stray backslashes, null bytes) can produce malformed
 * JSON that crashes the server-side parser with:
 *   "could not parse the HTTP request body: unexpected end of hex escape"
 *
 * Strategy: round-trip through Buffer to normalise encoding, then strip every
 * character class known to cause issues.
 */
function sanitiseForNeon(raw: string | null | undefined, maxLen = 500): string {
  if (!raw) return '';

  let text = raw;

  // 1. Buffer round-trip: re-encode to clean up broken UTF-8 sequences
  try {
    text = Buffer.from(text, 'utf8').toString('utf8');
  } catch (_) {
    // If encoding fails, fall through with the original string
  }

  // 2. Strip null bytes and ASCII control chars (except \n \r \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Remove lone surrogates (unpaired high/low surrogates break JSON)
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '');
  text = text.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');

  // 4. Remove literal backslash sequences that form invalid hex/unicode escapes
  //    e.g. a literal "\x1" or "\u00" in the text (not a real escape, but Neon's
  //    JSON parser tries to interpret them)
  text = text.replace(/\\x[0-9a-fA-F]{0,1}(?![0-9a-fA-F])/g, '');
  text = text.replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, '');

  // 5. Replace any remaining backslashes that could start ambiguous escapes
  //    with a safe unicode representation
  text = text.replace(/\\/g, '\u29F5'); // ⧵ (reverse solidus operator)

  // 6. Truncate
  return text.substring(0, maxLen);
}

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
// Note: 'engagements' gives the Sprout-computed total (includes comments, shares,
// clicks, saves, etc.) which is more complete than summing individual metrics —
// Sprout does NOT return comments/shares/clicks at the profile analytics level
// for most platforms, so individual metrics undercount total engagements.
const PROFILE_METRICS = [
  'engagements',
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
      const name = sanitiseForNeon(p.name, 200);
      const handle = sanitiseForNeon(p.native_name ?? p.name, 200);
      const nativeId = sanitiseForNeon(p.native_id, 200);
      await sql`
        INSERT INTO profiles (customer_profile_id, platform, name, handle, native_id)
        VALUES (${p.customer_profile_id}, ${platform}, ${name}, ${handle}, ${nativeId})
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
      // Prefer Sprout's pre-computed 'engagements' total — it includes all
      // engagement types even when individual metrics (comments, shares, clicks)
      // return 0 at the profile analytics level.
      const summedEngagements = reactions + comments + shares + saves + clicks;
      const sproutEngagements = m.engagements ?? 0;
      const engagements = Math.max(sproutEngagements, summedEngagements);
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
          -- Protect followers: don't overwrite non-zero with zero
          -- (Sprout sometimes returns 0 followers for recent days temporarily)
          followers = CASE
            WHEN EXCLUDED.followers > 0 THEN EXCLUDED.followers
            ELSE daily_metrics.followers
          END,
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

    // 6. Upsert posts (chunked transactions — 50 posts per batch to avoid
    //    Neon HTTP body size limits while keeping performance reasonable)
    const CHUNK_SIZE = 50;
    let postsSkipped = 0;

    for (let chunkStart = 0; chunkStart < allPosts.length; chunkStart += CHUNK_SIZE) {
      const chunk = allPosts.slice(chunkStart, chunkStart + CHUNK_SIZE);
      const chunkQueries = [];

      for (const post of chunk) {
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

        const postId = sanitiseForNeon(post.guid ?? `${platform}-${post.created_time}-${profileId}`, 300);
        const content = sanitiseForNeon(post.text);
        const createdAt = post.created_time ?? '';
        const permalink = sanitiseForNeon(post.perma_link, 1000);

        chunkQueries.push(sql`
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

      if (chunkQueries.length > 0) {
        try {
          await sql.transaction(chunkQueries);
        } catch (chunkErr) {
          // If a chunk fails, fall back to individual inserts so one bad post
          // doesn't lose the whole chunk
          console.warn(`[Refresh] Chunk ${chunkStart}-${chunkStart + chunk.length} failed, falling back to individual inserts:`, chunkErr);
          for (const q of chunkQueries) {
            try {
              await q;
            } catch (postErr) {
              postsSkipped++;
              console.warn(`[Refresh] Skipped post in fallback:`, postErr instanceof Error ? postErr.message : postErr);
            }
          }
        }
      }

      if ((chunkStart + CHUNK_SIZE) % 500 === 0) {
        console.log(`[Refresh] Posts progress: ${Math.min(chunkStart + CHUNK_SIZE, allPosts.length)}/${allPosts.length}`);
      }
    }

    console.log(`[Refresh] Upserted ${allPosts.length - postsSkipped} posts (${postsSkipped} skipped)`);

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
