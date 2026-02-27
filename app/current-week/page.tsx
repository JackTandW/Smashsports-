import { CurrentWeekDashboardClient } from '@/components/current-week/CurrentWeekDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import type { CurrentWeekData } from '@/lib/current-week-types';

async function fetchCurrentWeekData(): Promise<CurrentWeekData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/current-week`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch current week data: ${res.status}`);
  }

  return res.json();
}

export default async function CurrentWeekPage() {
  let data: CurrentWeekData | null = null;
  let error: string | null = null;

  try {
    data = await fetchCurrentWeekData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? 'No current week data available. Run a data refresh first.'}
      />
    );
  }

  return <CurrentWeekDashboardClient initialData={data} />;
}
