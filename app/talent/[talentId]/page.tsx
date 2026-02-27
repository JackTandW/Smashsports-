import { notFound } from 'next/navigation';
import { NextRequest } from 'next/server';
import { TalentDrillDown } from '@/components/talent/TalentDrillDown';
import { ErrorState } from '@/components/ui/ErrorState';
import { getTalentConfig } from '@/lib/talent-config';
import { GET } from '@/app/api/talent/[talentId]/route';
import type { TalentDrillDownData } from '@/lib/talent-types';

interface TalentDetailPageProps {
  params: Promise<{ talentId: string }>;
}

async function fetchTalentData(talentId: string): Promise<TalentDrillDownData> {
  const res = await GET(
    new NextRequest(`http://localhost/api/talent/${talentId}?range=4w`),
    { params: Promise.resolve({ talentId }) }
  );

  if (res.status === 404) {
    notFound();
  }

  return res.json();
}

export default async function TalentDetailPage({ params }: TalentDetailPageProps) {
  const { talentId } = await params;

  // Validate talent exists
  const talent = getTalentConfig(talentId);
  if (!talent) {
    notFound();
  }

  let data: TalentDrillDownData | null = null;
  let error: string | null = null;

  try {
    data = await fetchTalentData(talentId);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error';
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ?? `No data available for ${talent.name}. Run the seed script first.`}
      />
    );
  }

  return <TalentDrillDown initialData={data} />;
}
