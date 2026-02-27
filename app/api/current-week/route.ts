import { NextResponse } from 'next/server';
import { sql, getLastRefreshTime } from '@/lib/db';
import type { PostMetrics } from '@/lib/types';
import type { DailyMetricRow } from '@/lib/weekly-data-processing';
import type { WeeklySnapshotRow } from '@/lib/weekly-types';
import {
  getCurrentWeekRange,
  buildCurrentWeekPayload,
} from '@/lib/current-week-processing';
import { getPreviousWeek } from '@/lib/weekly-data-processing';

export const runtime = 'nodejs';

/**
 * GET /api/current-week
 * Returns CurrentWeekData for the live tracker.
 * Computes everything on-the-fly from daily_metrics + posts (never persists in-progress week).
 */
export async function GET() {
  try {
    // ── Mock-data path (Vercel / demo) ──
    if (process.env.USE_MOCK_DATA === 'true') {
      const { getMockDailyMetricRows, getMockPosts } = await import('@/lib/mock-data');
      const allDaily = getMockDailyMetricRows() as DailyMetricRow[];
      const { weekStart, weekEnd } = getCurrentWeekRange();
      const { weekStart: lastStart, weekEnd: lastEnd } = getPreviousWeek(weekStart);

      const thisWeekDaily = allDaily.filter((r) => r.date >= weekStart && r.date <= weekEnd);
      const lastWeekDaily = allDaily.filter((r) => r.date >= lastStart && r.date <= lastEnd);

      const allPosts = getMockPosts();
      const thisWeekPosts = allPosts.filter(
        (p) => p.createdAt >= `${weekStart}T00:00:00` && p.createdAt <= `${weekEnd}T23:59:59`
      );
      const lastWeekPosts = allPosts.filter(
        (p) => p.createdAt >= `${lastStart}T00:00:00` && p.createdAt <= `${lastEnd}T23:59:59`
      );
      const fourWeeksAgo = new Date(weekStart);
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const recentPosts = allPosts.filter(
        (p) => p.createdAt >= `${fourWeeksAgo.toISOString().split('T')[0]}T00:00:00` && p.createdAt <= `${weekEnd}T23:59:59`
      );

      const data = buildCurrentWeekPayload(
        thisWeekDaily, lastWeekDaily, thisWeekPosts, lastWeekPosts, recentPosts, [], null
      );
      return NextResponse.json(data);
    }

    // ── Live-data path (Neon Postgres) ──
    const { weekStart, weekEnd } = getCurrentWeekRange();
    const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } = getPreviousWeek(weekStart);

    // 1. This week daily metrics
    const thisWeekDailyRows = await sql`
      SELECT date::text, platform,
             SUM(impressions)::integer as impressions, SUM(engagements)::integer as engagements,
             SUM(reactions)::integer as reactions, SUM(comments)::integer as comments,
             SUM(shares)::integer as shares, SUM(saves)::integer as saves,
             SUM(video_views)::integer as video_views, SUM(clicks)::integer as clicks,
             MAX(followers)::integer as followers, SUM(follower_growth)::integer as follower_growth,
             SUM(posts_published)::integer as posts_published
      FROM daily_metrics
      WHERE date >= ${weekStart} AND date <= ${weekEnd}
      GROUP BY date, platform
    ` as DailyMetricRow[];

    // 2. Last week daily metrics
    const lastWeekDailyRows = await sql`
      SELECT date::text, platform,
             SUM(impressions)::integer as impressions, SUM(engagements)::integer as engagements,
             SUM(reactions)::integer as reactions, SUM(comments)::integer as comments,
             SUM(shares)::integer as shares, SUM(saves)::integer as saves,
             SUM(video_views)::integer as video_views, SUM(clicks)::integer as clicks,
             MAX(followers)::integer as followers, SUM(follower_growth)::integer as follower_growth,
             SUM(posts_published)::integer as posts_published
      FROM daily_metrics
      WHERE date >= ${lastWeekStart} AND date <= ${lastWeekEnd}
      GROUP BY date, platform
    ` as DailyMetricRow[];

    // 3. This week posts
    const thisWeekPosts = await sql`
      SELECT id, platform, profile_id as "profileId", created_at::text as "createdAt",
             content, permalink, impressions, engagements, video_views as "videoViews",
             reactions, comments, shares, saves, clicks, emv
      FROM posts
      WHERE created_at >= ${`${weekStart}T00:00:00`} AND created_at <= ${`${weekEnd}T23:59:59`}
      ORDER BY created_at DESC
    ` as PostMetrics[];

    // 4. Last week posts (for hourly comparison)
    const lastWeekPosts = await sql`
      SELECT id, platform, profile_id as "profileId", created_at::text as "createdAt",
             content, permalink, impressions, engagements, video_views as "videoViews",
             reactions, comments, shares, saves, clicks, emv
      FROM posts
      WHERE created_at >= ${`${lastWeekStart}T00:00:00`} AND created_at <= ${`${lastWeekEnd}T23:59:59`}
      ORDER BY created_at DESC
    ` as PostMetrics[];

    // 5. Recent posts (last 4 weeks) for velocity calculation
    const fourWeeksAgo = new Date(weekStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentPosts = await sql`
      SELECT id, platform, profile_id as "profileId", created_at::text as "createdAt",
             content, permalink, impressions, engagements, video_views as "videoViews",
             reactions, comments, shares, saves, clicks, emv
      FROM posts
      WHERE created_at >= ${`${fourWeeksAgo.toISOString().split('T')[0]}T00:00:00`}
        AND created_at <= ${`${weekEnd}T23:59:59`}
      ORDER BY created_at DESC
    ` as PostMetrics[];

    // 6. Last week snapshot (if already persisted)
    const lastWeekSnapshotRows = await sql`
      SELECT week_start::text, week_end::text, platform, views, impressions,
             engagements, engagement_rate, posts_count, followers_start, followers_end,
             follower_growth, emv_total, emv_views, emv_likes, emv_comments, emv_shares, emv_other
      FROM weekly_snapshots WHERE week_start = ${lastWeekStart}
    ` as WeeklySnapshotRow[];

    // 7. Last refresh time
    const lastRefreshed = await getLastRefreshTime();

    // Build the payload
    const data = buildCurrentWeekPayload(
      thisWeekDailyRows,
      lastWeekDailyRows,
      thisWeekPosts,
      lastWeekPosts,
      recentPosts,
      lastWeekSnapshotRows,
      lastRefreshed
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Current week API error:', error);
    return NextResponse.json(
      { error: 'Failed to load current week data' },
      { status: 500 }
    );
  }
}
