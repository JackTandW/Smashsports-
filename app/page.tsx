import { DashboardClient } from '@/components/layout/DashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import type { DashboardData } from '@/lib/types';

async function fetchDashboardData(): Promise<DashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/analytics`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch analytics: ${res.status}`);
  }

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
