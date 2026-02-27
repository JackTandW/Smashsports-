import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildShowDrillDownPayload } from '@/lib/show-data-processing';
import { getShowConfig } from '@/lib/show-attribution';
import type { PostMetrics, PlatformId } from '@/lib/types';
import type { DateRange, DateRangePreset } from '@/lib/show-types';

export const runtime = 'nodejs';

interface PostRow {
  id: string;
  profile_id: number;
  platform: string;
  created_at: string;
  content: string;
  permalink: string;
  impressions: number;
  engagements: number;
  video_views: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  emv: number;
}

function getDateRange(preset: DateRangePreset): DateRange {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (preset) {
    case '1w': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '4w': {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      start = d.toISOString().split('T')[0];
      break;
    }
    case '12w': {
      const d = new Date(now);
      d.setDate(d.getDate() - 84);
      start = d.toISOString().split('T')[0];
      break;
    }
    case 'ytd': {
      start = `${now.getFullYear()}-01-01`;
      break;
    }
    case 'all': {
      start = '2020-01-01';
      break;
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      start = d.toISOString().split('T')[0];
    }
  }

  return { start, end };
}

function getPreviousDateRange(dateRange: DateRange): DateRange {
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const durationMs = endDate.getTime() - startDate.getTime();

  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0],
  };
}

function mapRowToPostMetrics(row: PostRow): PostMetrics {
  return {
    id: row.id,
    platform: row.platform as PlatformId,
    profileId: row.profile_id,
    createdAt: row.created_at,
    content: row.content ?? '',
    permalink: row.permalink ?? '',
    impressions: row.impressions ?? 0,
    engagements: row.engagements ?? 0,
    videoViews: row.video_views ?? 0,
    reactions: row.reactions ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    saves: row.saves ?? 0,
    clicks: row.clicks ?? 0,
    emv: row.emv ?? 0,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const { showId } = await params;

    // Validate show exists
    const show = getShowConfig(showId);
    if (!show) {
      return NextResponse.json(
        { error: `Show '${showId}' not found` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = (searchParams.get('range') ?? '4w') as DateRangePreset;

    const dateRange = getDateRange(rangeParam);
    const previousDateRange = getPreviousDateRange(dateRange);

    const db = getDb();

    // Fetch posts for current period
    const currentPosts = db
      .prepare(
        `SELECT id, profile_id, platform, created_at, content, permalink,
                impressions, engagements, video_views, reactions, comments,
                shares, saves, clicks, emv
         FROM posts
         WHERE date(created_at) >= ? AND date(created_at) <= ?
         ORDER BY created_at DESC`
      )
      .all(dateRange.start, dateRange.end) as PostRow[];

    // Fetch posts for previous period
    const previousPosts = db
      .prepare(
        `SELECT id, profile_id, platform, created_at, content, permalink,
                impressions, engagements, video_views, reactions, comments,
                shares, saves, clicks, emv
         FROM posts
         WHERE date(created_at) >= ? AND date(created_at) <= ?
         ORDER BY created_at DESC`
      )
      .all(previousDateRange.start, previousDateRange.end) as PostRow[];

    const posts = currentPosts.map(mapRowToPostMetrics);
    const prevPosts = previousPosts.map(mapRowToPostMetrics);

    const payload = buildShowDrillDownPayload(showId, posts, prevPosts, dateRange);

    if (!payload) {
      return NextResponse.json(
        { error: `Show '${showId}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Show drill-down API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch show drill-down data' },
      { status: 500 }
    );
  }
}
