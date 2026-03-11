import { TVAudienceDashboardClient } from '@/components/tv-audience/TVAudienceDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tv-audience/route';
import type { TVAudiencePayload } from '@/lib/tv-audience-types';

export const dynamic = 'force-dynamic';

async function fetchTVAudienceData(): Promise<TVAudiencePayload> {
  const res = await GET();
  return res.json();
}

export default async function TVAudiencePage() {
  let data: TVAudiencePayload | null = null;
  let error: string | null = null;

  try {
    data = await fetchTVAudienceData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? 'No TV audience data available. Run the parser script first.'}
      />
    );
  }

  return <TVAudienceDashboardClient data={data} />;
}
