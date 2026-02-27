import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { buildTalentDrillDownPayload } from '@/lib/talent-data-processing';
import { getTalentConfig } from '@/lib/talent-config';
import { enrichTalentPostsWithShows } from '@/lib/talent-attribution';
import type { PlatformId } from '@/lib/types';
import type { TalentPost, DateRange, DateRangePreset } from '@/lib/talent-types';

export const runtime = 'nodejs';

interface TalentPostRow {
  id: string;
  talent_id: string;
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
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - durationMs);
  return {
    start: previousStart.toISOString().split('T')[0],
    end: previousEnd.toISOString().split('T')[0],
  };
}

function mapRowToTalentPost(row: TalentPostRow): TalentPost {
  return {
    id: row.id,
    talentId: row.talent_id,
    platform: row.platform as PlatformId,
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
    emv: row.emv ?? 0,
    showIds: [],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ talentId: string }> }
) {
  try {
    const { talentId } = await params;

    // Validate talent exists
    const talent = getTalentConfig(talentId);
    if (!talent) {
      return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const range = (searchParams.get('range') ?? '4w') as DateRangePreset;
    const dateRange = getDateRange(range);
    const previousRange = getPreviousDateRange(dateRange);

    // ── Mock-data path (Vercel / demo) ──
    if (process.env.USE_MOCK_DATA === 'true') {
      const { getMockTalentPosts } = await import('@/lib/mock-data');
      const all = getMockTalentPosts();
      const posts = all.filter((p) => p.createdAt >= `${dateRange.start}T00:00:00` && p.createdAt <= `${dateRange.end}T23:59:59`);
      const prevPosts = all.filter((p) => p.createdAt >= `${previousRange.start}T00:00:00` && p.createdAt <= `${previousRange.end}T23:59:59`);
      const data = buildTalentDrillDownPayload(talentId, posts, prevPosts, dateRange);
      if (!data) return NextResponse.json({ error: 'Failed to build data' }, { status: 500 });
      return NextResponse.json(data);
    }

    const currentRows = await sql`
      SELECT id, talent_id, platform, created_at::text, content, permalink,
             impressions, engagements, video_views, reactions, comments,
             shares, saves, emv
      FROM talent_posts
      WHERE created_at::date >= ${dateRange.start} AND created_at::date <= ${dateRange.end}
      ORDER BY created_at DESC
    ` as TalentPostRow[];

    const previousRows = await sql`
      SELECT id, talent_id, platform, created_at::text, content, permalink,
             impressions, engagements, video_views, reactions, comments,
             shares, saves, emv
      FROM talent_posts
      WHERE created_at::date >= ${previousRange.start} AND created_at::date <= ${previousRange.end}
      ORDER BY created_at DESC
    ` as TalentPostRow[];

    const posts = enrichTalentPostsWithShows(currentRows.map(mapRowToTalentPost));
    const previousPosts = enrichTalentPostsWithShows(previousRows.map(mapRowToTalentPost));

    const data = buildTalentDrillDownPayload(talentId, posts, previousPosts, dateRange);
    if (!data) {
      return NextResponse.json({ error: 'Failed to build data' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch talent drill-down:', error);
    return NextResponse.json(
      { error: 'Failed to fetch talent data' },
      { status: 500 }
    );
  }
}
