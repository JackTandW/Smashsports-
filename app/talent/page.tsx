import { TalentDashboardClient } from '@/components/talent/TalentDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/talent/route';
import type { TalentOverviewData } from '@/lib/talent-types';

async function fetchTalentData(): Promise<TalentOverviewData> {
  const res = await GET(new NextRequest('http://localhost/api/talent?range=4w'));
  return res.json();
}

export default async function TalentPage() {
  let data: TalentOverviewData | null = null;
  let error: string | null = null;

  try {
    data = await fetchTalentData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? 'No talent data available. Run the seed script first.'}
      />
    );
  }

  return <TalentDashboardClient initialData={data} />;
}
