import { CurrentWeekDashboardClient } from '@/components/current-week/CurrentWeekDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { GET } from '@/app/api/current-week/route';
import type { CurrentWeekData } from '@/lib/current-week-types';

async function fetchCurrentWeekData(): Promise<CurrentWeekData> {
  const res = await GET();
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
