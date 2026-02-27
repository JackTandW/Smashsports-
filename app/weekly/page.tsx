import { WeeklyDashboardClient } from '@/components/weekly/WeeklyDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { getBaseUrl } from '@/lib/utils';
import type { WeeklyComparisonData } from '@/lib/weekly-types';

async function fetchWeeklyData(): Promise<WeeklyComparisonData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/weekly`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch weekly data: ${res.status}`);
  }

  return res.json();
}

export default async function WeeklyPage() {
  let data: WeeklyComparisonData | null = null;
  let error: string | null = null;

  try {
    data = await fetchWeeklyData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No weekly data available. Run a data refresh first.'} />;
  }

  return <WeeklyDashboardClient initialData={data} />;
}
