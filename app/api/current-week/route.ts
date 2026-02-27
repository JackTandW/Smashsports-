import { NextResponse } from 'next/server';
import { getDb, getLastRefreshTime } from '@/lib/db';
import type { PostMetrics } from '@/lib/types';
import type { DailyMetricRow } from '@/lib/weekly-data-processing';
import type { WeeklySnapshotRow } from '@/lib/weekly-types';
import {
  getCurrentWeekRange,
  buildCurrentWeekPayload,
} from '@/lib/current-week-processing';
import { getPreviousWeek } from '@/lib/weekly-data-processing';

export const runtime = 'nodejs';

const DAILY_METRICS_QUERY = `
  SELECT date, platform,
         SUM(impressions) as impressions, SUM(engagements) as engagements,
         SUM(reactions) as reactions, SUM(comments) as comments,
         SUM(shares) as shares, SUM(saves) as saves,
         SUM(video_views) as video_views, SUM(clicks) as clicks,
         MAX(followers) as followers, SUM(follower_growth) as follower_growth,
         SUM(posts_published) as posts_published
  FROM daily_metrics
  WHERE date >= ? AND date <= ?
  GROUP BY date, platform
`;

const POSTS_QUERY = `
  SELECT id, platform, profile_id as profileId, created_at as createdAt,
         content, permalink, impressions, engagements, video_views as videoViews,
         reactions, comments, shares, saves, clicks, emv
  FROM posts
  WHERE created_at >= ? AND created_at <= ?
  ORDER BY created_at DESC
`;

/**
 * GET /api/current-week
 * Returns CurrentWeekData for the live tracker.
 * Computes everything on-the-fly from daily_metrics + posts (never persists in-progress week).
 */
export async function GET() {
  try {
    const db = getDb();
    const { weekStart, weekEnd } = getCurrentWeekRange();
    const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } = getPreviousWeek(weekStart);

    // 1. This week daily metrics
    const thisWeekDailyRows = db
      .prepare(DAILY_METRICS_QUERY)
      .all(weekStart, weekEnd) as DailyMetricRow[];

    // 2. Last week daily metrics
    const lastWeekDailyRows = db
      .prepare(DAILY_METRICS_QUERY)
      .all(lastWeekStart, lastWeekEnd) as DailyMetricRow[];

    // 3. This week posts
    const thisWeekPosts = db
      .prepare(POSTS_QUERY)
      .all(
        `${weekStart}T00:00:00`,
        `${weekEnd}T23:59:59`
      ) as PostMetrics[];

    // 4. Last week posts (for hourly comparison)
    const lastWeekPosts = db
      .prepare(POSTS_QUERY)
      .all(
        `${lastWeekStart}T00:00:00`,
        `${lastWeekEnd}T23:59:59`
      ) as PostMetrics[];

    // 5. Recent posts (last 4 weeks) for velocity calculation
    const fourWeeksAgo = new Date(weekStart);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentPosts = db
      .prepare(POSTS_QUERY)
      .all(
        `${fourWeeksAgo.toISOString().split('T')[0]}T00:00:00`,
        `${weekEnd}T23:59:59`
      ) as PostMetrics[];

    // 6. Last week snapshot (if already persisted)
    const lastWeekSnapshotRows = db
      .prepare('SELECT * FROM weekly_snapshots WHERE week_start = ?')
      .all(lastWeekStart) as WeeklySnapshotRow[];

    // 7. Last refresh time
    const lastRefreshed = getLastRefreshTime();

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
