import { TalentDashboardClient } from '@/components/talent/TalentDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { getBaseUrl } from '@/lib/utils';
import type { TalentOverviewData } from '@/lib/talent-types';

async function fetchTalentData(): Promise<TalentOverviewData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/talent?range=4w`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch talent data: ${res.status}`);
  }

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
