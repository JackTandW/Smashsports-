import { WeeklyDashboardClient } from '@/components/weekly/WeeklyDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { GET } from '@/app/api/weekly/route';
import type { WeeklyComparisonData } from '@/lib/weekly-types';

async function fetchWeeklyData(): Promise<WeeklyComparisonData> {
  const res = await GET(new Request('http://localhost/api/weekly'));
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
