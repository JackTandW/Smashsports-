import { notFound } from 'next/navigation';
import { ShowDrillDown } from '@/components/shows/ShowDrillDown';
import { ErrorState } from '@/components/ui/ErrorState';
import { getShowConfig } from '@/lib/show-attribution';
import type { ShowDrillDownData } from '@/lib/show-types';

interface ShowDetailPageProps {
  params: Promise<{ showId: string }>;
}

async function fetchShowData(showId: string): Promise<ShowDrillDownData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/shows/${showId}?range=4w`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch show data: ${res.status}`);
  }

  return res.json();
}

export default async function ShowDetailPage({ params }: ShowDetailPageProps) {
  const { showId } = await params;

  // Validate show exists
  const show = getShowConfig(showId);
  if (!show) {
    notFound();
  }

  let data: ShowDrillDownData | null = null;
  let error: string | null = null;

  try {
    data = await fetchShowData(showId);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? `No data available for ${show.name}. Run a data refresh first.`}
      />
    );
  }

  return <ShowDrillDown initialData={data} />;
}
