import { NextResponse } from 'next/server';
import { getMockDailyMetrics, getMockPosts, getMockLastUpdated } from '@/lib/mock-data';
import { buildDashboardData } from '@/lib/data-processing';
import { getDb, getLastRefreshTime } from '@/lib/db';
import type { DailyProfileMetrics, PostMetrics, PlatformId } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const useMock = process.env.USE_MOCK_DATA === 'true';

    if (useMock) {
      const dailyMetrics = getMockDailyMetrics();
      const posts = getMockPosts();
      const lastUpdated = getMockLastUpdated();
      const data = buildDashboardData(dailyMetrics, posts, lastUpdated);
      return NextResponse.json(data);
    }

    // Live data: read from SQLite cache
    const db = getDb();
    const lastUpdated = getLastRefreshTime();

    // Check if we have any data
    const countRow = db
      .prepare('SELECT COUNT(*) as count FROM daily_metrics')
      .get() as { count: number };

    if (countRow.count === 0) {
      return NextResponse.json(
        {
          error: 'No data available. Run a refresh first.',
          hint: 'POST /api/refresh to fetch data from Sprout Social',
        },
        { status: 404 }
      );
    }

    // Read all daily metrics from cache
    const dailyRows = db
      .prepare(
        `SELECT
          dm.date,
          dm.platform,
          dm.profile_id as profileId,
          dm.impressions,
          dm.engagements,
          dm.reactions,
          dm.comments,
          dm.shares,
          dm.saves,
          dm.video_views as videoViews,
          dm.clicks,
          dm.followers,
          dm.follower_growth as followerGrowth,
          dm.posts_published as postsPublished
        FROM daily_metrics dm
        ORDER BY dm.date ASC`
      )
      .all() as DailyProfileMetrics[];

    // Read all posts from cache
    const postRows = db
      .prepare(
        `SELECT
          p.id,
          p.platform,
          p.profile_id as profileId,
          p.created_at as createdAt,
          p.content,
          p.permalink,
          p.impressions,
          p.engagements,
          p.video_views as videoViews,
          p.reactions,
          p.comments,
          p.shares,
          p.saves,
          p.clicks,
          p.emv
        FROM posts p
        ORDER BY p.engagements DESC`
      )
      .all() as PostMetrics[];

    // Build the full dashboard payload using the existing processing pipeline
    const data = buildDashboardData(
      dailyRows as DailyProfileMetrics[],
      postRows as PostMetrics[],
      lastUpdated
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to load analytics data' },
      { status: 500 }
    );
  }
}
