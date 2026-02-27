'use client';

import type { DashboardData } from '@/lib/types';
import { PlatformDonutChart } from './PlatformDonutChart';
import { CumulativeGrowthChart } from './CumulativeGrowthChart';
import { ContentHeatmap } from './ContentHeatmap';
import { EmvStackedBar } from './EmvStackedBar';
import { TopPostsTable } from './TopPostsTable';

interface ChartsSectionProps {
  data: DashboardData;
}

export function ChartsSection({ data }: ChartsSectionProps) {
  return (
    <section aria-label="Analytics charts" className="mt-8 space-y-6">
      <h2 className="text-lg font-semibold">Analytics</h2>

      {/* Row 1: Donut + Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlatformDonutChart data={data.charts.donut} />
        <CumulativeGrowthChart data={data.charts.growth} />
      </div>

      {/* Row 2: Heatmap (full width) */}
      <ContentHeatmap data={data.charts.heatmap} />

      {/* Row 3: EMV Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EmvStackedBar data={data.charts.emvBreakdown} />
        <div /> {/* Empty cell for balance */}
      </div>

      {/* Row 4: Top Posts Table (full width) */}
      <TopPostsTable posts={data.topPosts} />
    </section>
  );
}
