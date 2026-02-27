import { ShowsDashboardClient } from '@/components/shows/ShowsDashboardClient';
import { ErrorState } from '@/components/ui/ErrorState';
import { getShowConfigs } from '@/lib/show-attribution';
import { getBaseUrl } from '@/lib/utils';
import type { ShowOverviewData } from '@/lib/show-types';

async function fetchShowsData(): Promise<ShowOverviewData> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/shows?range=4w`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch shows data: ${res.status}`);
  }

  return res.json();
}

export default async function ShowsPage() {
  let data: ShowOverviewData | null = null;
  let error: string | null = null;

  try {
    data = await fetchShowsData();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? 'No shows data available. Run a data refresh first.'}
      />
    );
  }

  const shows = getShowConfigs();

  return <ShowsDashboardClient initialData={data} shows={shows} />;
}
