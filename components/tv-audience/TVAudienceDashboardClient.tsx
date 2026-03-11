'use client';

import type { TVAudiencePayload } from '@/lib/tv-audience-types';
import { TVHeroCards } from './TVHeroCards';
import { TVSeasonComparison } from './TVSeasonComparison';
import { TVEpisodeBarChart } from './TVEpisodeBarChart';
import { TVCumulativeReachChart } from './TVCumulativeReachChart';
import { TVWeeklyPerformanceTable } from './TVWeeklyPerformanceTable';
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

      {/* Section 2: Season Comparison */}
      <TVSeasonComparison groups={data.seasonComparison} />

      {/* Section 3: Episode Bar Chart */}
      <ChartErrorBoundary fallbackTitle="Episode Comparison">
        <TVEpisodeBarChart data={data.episodeChart} />
      </ChartErrorBoundary>

      {/* Section 4: Cumulative Reach */}
      <ChartErrorBoundary fallbackTitle="Cumulative Reach">
        <TVCumulativeReachChart data={data.reachChart} />
      </ChartErrorBoundary>

      {/* Section 5: Weekly Performance Table */}
      <TVWeeklyPerformanceTable rows={data.weeklyPerformance} />

      {/* Section 6: Distribution Donuts */}
      <ChartErrorBoundary fallbackTitle="Distribution">
        <TVDistributionDonuts
          channelData={data.channelDonut}
          tierData={data.tierDonut}
        />
      </ChartErrorBoundary>

      {/* Section 7: Premier vs Repeat */}
      <ChartErrorBoundary fallbackTitle="Premier vs Repeat">
        <TVPremierRepeatBreakdown data={data.premierRepeat} />
      </ChartErrorBoundary>
    </div>
  );
}
