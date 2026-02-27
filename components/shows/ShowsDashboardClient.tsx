'use client';

import { useState, useCallback } from 'react';
import type { ShowOverviewData, ShowConfig, DateRangePreset } from '@/lib/show-types';
import { DateRangeSelector } from './DateRangeSelector';
import { ShowCard } from './ShowCard';
import { ShowComparisonChart } from './ShowComparisonChart';
import { ShowContributionDonut } from './ShowContributionDonut';
import { ShowTimeline } from './ShowTimeline';
import { HashtagHealthCheck } from './HashtagHealthCheck';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';

interface ShowsDashboardClientProps {
  initialData: ShowOverviewData;
  shows: ShowConfig[];
}

export function ShowsDashboardClient({ initialData, shows }: ShowsDashboardClientProps) {
  const [data, setData] = useState<ShowOverviewData>(initialData);
  const [range, setRange] = useState<DateRangePreset>('4w');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (newRange: DateRangePreset) => {
    try {
      setFetchError(null);
      setIsLoading(true);
      setRange(newRange);
      const res = await fetch(`/api/shows?range=${newRange}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: ShowOverviewData = await res.json();
      setData(newData);
    } catch (err) {
      console.error('Failed to refresh shows data:', err);
      setFetchError('Failed to update data. Showing previous results.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Show Performance</h1>
          <p className="text-xs text-muted mt-1">
            Performance by show based on hashtag attribution ·{' '}
            {data.totalAttributedPosts} attributed / {data.totalUnattributedPosts}{' '}
            unattributed posts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-xs text-muted">Loading...</span>
            </div>
          )}
          <DateRangeSelector value={range} onChange={fetchData} />
        </div>
      </div>

      {fetchError && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-negative/10 border border-negative/20 text-xs text-negative">
          <span>⚠</span>
          <span>{fetchError}</span>
          <button onClick={() => fetchData(range)} className="ml-auto underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      <div
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-70' : 'opacity-100'
        }`}
      >
        {/* Section 4.1: Show cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.summaries.map((show) => (
            <ShowCard key={show.showId} show={show} />
          ))}
        </div>

        {/* Section 4.2 + 4.3: Comparison + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <ChartErrorBoundary fallbackTitle="Show Comparison">
              <ShowComparisonChart data={data.comparison} />
            </ChartErrorBoundary>
          </div>
          <ChartErrorBoundary fallbackTitle="Contribution">
            <ShowContributionDonut data={data.contribution} />
          </ChartErrorBoundary>
        </div>

        {/* Section 4.5: Timeline */}
        <div className="mt-6">
          <ChartErrorBoundary fallbackTitle="Show Timeline">
            <ShowTimeline data={data.timeline} shows={shows} />
          </ChartErrorBoundary>
        </div>

        {/* Section 4.6: Hashtag Health */}
        <div className="mt-6">
          <HashtagHealthCheck data={data.hashtagHealth} />
        </div>
      </div>
    </div>
  );
}
