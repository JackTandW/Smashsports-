import { NextResponse } from 'next/server';
import tvRawData from '@/data/tv_audience_data.json';
import { buildTVAudiencePayload } from '@/lib/tv-audience-data-processing';
import type { TVAudienceData } from '@/lib/tv-audience-types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const payload = buildTVAudiencePayload(tvRawData as unknown as TVAudienceData);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('[tv-audience] Error building payload:', error);
    return NextResponse.json(
      { error: 'Failed to process TV audience data' },
      { status: 500 },
    );
  }
}
