import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTalentConfig } from '@/lib/talent-config';
import { calculateEMV } from '@/lib/emv-calculator';
import type { PlatformId } from '@/lib/types';

export const runtime = 'nodejs';

interface PostBody {
  talentId: string;
  platform: PlatformId;
  content: string;
  permalink?: string;
  impressions?: number;
  engagements?: number;
  videoViews?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  createdAt?: string;
}

const VALID_PLATFORMS: PlatformId[] = ['youtube', 'instagram', 'tiktok', 'x', 'facebook'];

export async function POST(request: NextRequest) {
  try {
    const body: PostBody = await request.json();

    // Validate required fields
    if (!body.talentId || !body.platform || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: talentId, platform, content' },
        { status: 400 }
      );
    }

    // Validate talent exists
    const talent = getTalentConfig(body.talentId);
    if (!talent) {
      return NextResponse.json({ error: 'Talent not found' }, { status: 404 });
    }

    // Validate platform
    if (!VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate talent has this platform configured
    if (!talent.accounts[body.platform]) {
      return NextResponse.json(
        { error: `${talent.name} does not have a ${body.platform} account configured` },
        { status: 400 }
      );
    }

    const reactions = body.reactions ?? 0;
    const comments = body.comments ?? 0;
    const shares = body.shares ?? 0;
    const saves = body.saves ?? 0;
    const engagements = body.engagements ?? (reactions + comments + shares + saves);
    const videoViews = body.videoViews ?? 0;
    const impressions = body.impressions ?? 0;

    // Calculate EMV
    const emv = calculateEMV(body.platform, {
      views: videoViews,
      impressions,
      likes: reactions,
      comments,
      shares,
      saves,
      clicks: body.clicks ?? 0,
    });

    const id = 'tp-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
    const createdAt = body.createdAt ?? new Date().toISOString();
    const permalink = body.permalink ?? '';

    await sql`
      INSERT INTO talent_posts (id, talent_id, platform, created_at, content, permalink, impressions, engagements, video_views, reactions, comments, shares, saves, emv)
      VALUES (${id}, ${body.talentId}, ${body.platform}, ${createdAt}, ${body.content}, ${permalink}, ${impressions}, ${engagements}, ${videoViews}, ${reactions}, ${comments}, ${shares}, ${saves}, ${emv})
    `;

    return NextResponse.json({
      id,
      talentId: body.talentId,
      platform: body.platform,
      createdAt,
      content: body.content,
      engagements,
      emv,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create talent post:', error);
    return NextResponse.json(
      { error: 'Failed to create talent post' },
      { status: 500 }
    );
  }
}
