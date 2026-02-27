import { notFound } from 'next/navigation';
import { NextRequest } from 'next/server';
import { ShowDrillDown } from '@/components/shows/ShowDrillDown';
import { ErrorState } from '@/components/ui/ErrorState';
import { getShowConfig } from '@/lib/show-attribution';
import { GET } from '@/app/api/shows/[showId]/route';
import type { ShowDrillDownData } from '@/lib/show-types';

interface ShowDetailPageProps {
  params: Promise<{ showId: string }>;
}

async function fetchShowData(showId: string): Promise<ShowDrillDownData> {
  const res = await GET(
    new NextRequest(`http://localhost/api/shows/${showId}?range=4w`),
    { params: Promise.resolve({ showId }) }
  );

  if (res.status === 404) {
    notFound();
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
