import { DashboardClient } from '@/components/layout/DashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { GET } from '@/app/api/analytics/route';
import type { DashboardData } from '@/lib/types';

async function fetchDashboardData(): Promise<DashboardData> {
  const res = await GET();
  return res.json();
}

export default async function LifetimePage() {
  let data: DashboardData | null = null;
  let error: string | null = null;

  try {
    data = await fetchDashboardData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return <ErrorState message={error ?? 'No data available'} />;
  }

  return <DashboardClient data={data} />;
}
