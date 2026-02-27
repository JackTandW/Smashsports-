import { NextResponse } from 'next/server';
import { getMockDailyMetrics, getMockPosts, getMockLastUpdated } from '@/lib/mock-data';
import { buildDashboardData } from '@/lib/data-processing';
import { sql, getLastRefreshTime } from '@/lib/db';
import type { DailyProfileMetrics, PostMetrics } from '@/lib/types';

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

    // Live data: read from Neon Postgres
    const lastUpdated = await getLastRefreshTime();

    // Check if we have any data
    const [countRow] = await sql`SELECT COUNT(*) as count FROM daily_metrics`;

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
    const dailyRows = await sql`
      SELECT
        dm.date::text,
        dm.platform,
        dm.profile_id as "profileId",
        dm.impressions,
        dm.engagements,
        dm.reactions,
        dm.comments,
        dm.shares,
        dm.saves,
        dm.video_views as "videoViews",
        dm.clicks,
        dm.followers,
        dm.follower_growth as "followerGrowth",
        dm.posts_published as "postsPublished"
      FROM daily_metrics dm
      ORDER BY dm.date ASC
    ` as DailyProfileMetrics[];

    // Read all posts from cache
    const postRows = await sql`
      SELECT
        p.id,
        p.platform,
        p.profile_id as "profileId",
        p.created_at::text as "createdAt",
        p.content,
        p.permalink,
        p.impressions,
        p.engagements,
        p.video_views as "videoViews",
        p.reactions,
        p.comments,
        p.shares,
        p.saves,
        p.clicks,
        p.emv
      FROM posts p
      ORDER BY p.engagements DESC
    ` as PostMetrics[];

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
