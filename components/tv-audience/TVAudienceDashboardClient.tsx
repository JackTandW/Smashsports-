'use client';

import type { TVAudiencePayload } from '@/lib/tv-audience-types';
import { TVHeroCards } from './TVHeroCards';
import { TVEpisodeBarChart } from './TVEpisodeBarChart';
import { TVWeeklyPerformanceChart } from './TVWeeklyPerformanceChart';
import { TVDistributionDonuts } from './TVDistributionDonuts';
import { TVPremierRepeatBreakdown } from './TVPremierRepeatBreakdown';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';

interface TVAudienceDashboardClientProps {
  data: TVAudiencePayload;
}

export function TVAudienceDashboardClient({ data }: TVAudienceDashboardClientProps) {
  const { metadata } = data;
  const seasonLabels = metadata.seasons.map((s) => s.label).join(' & ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          TV Audience — {metadata.showName}
        </h1>
        <p className="text-xs text-muted mt-1">
          Week {metadata.weekNumber} · {metadata.ageGroup} · Seasons: {seasonLabels}
        </p>
      </div>

      {/* Section 1: Hero KPI Cards */}
      <TVHeroCards cards={data.heroCards} />

      {/* Section 2: Episode Comparison */}
      <ChartErrorBoundary fallbackTitle="Episode Comparison">
        <TVEpisodeBarChart data={data.episodeChart} />
      </ChartErrorBoundary>

      {/* Section 3: Weekly Performance Chart */}
      <ChartErrorBoundary fallbackTitle="Weekly Performance">
        <TVWeeklyPerformanceChart rows={data.weeklyPerformance} />
      </ChartErrorBoundary>

      {/* Section 4: Distribution Donuts */}
      <ChartErrorBoundary fallbackTitle="Distribution">
        <TVDistributionDonuts
          channelData={data.channelDonut}
          tierData={data.tierDonut}
        />
      </ChartErrorBoundary>

      {/* Section 5: Premier vs Repeat */}
      <ChartErrorBoundary fallbackTitle="Premier vs Repeat">
        <TVPremierRepeatBreakdown data={data.premierRepeat} />
      </ChartErrorBoundary>
    </div>
  );
}
