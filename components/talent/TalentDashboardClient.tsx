'use client';

import { useState, useCallback } from 'react';
import type { TalentOverviewData, DateRangePreset } from '@/lib/talent-types';
import { DateRangeSelector } from '@/components/shows/DateRangeSelector';
import { TalentAdvocacyBar } from './TalentAdvocacyBar';
import { TalentLeaderboard } from './TalentLeaderboard';
import { TalentActivityGrid } from './TalentActivityGrid';
import { TalentShowMatrix } from './TalentShowMatrix';
import { TalentFrequencyChart } from './TalentFrequencyChart';
import { TalentEngagementBars } from './TalentEngagementBars';
import { TalentAlerts } from './TalentAlerts';
import { ChartErrorBoundary } from '@/components/ui/ChartErrorBoundary';

interface TalentDashboardClientProps {
  initialData: TalentOverviewData;
}

export function TalentDashboardClient({ initialData }: TalentDashboardClientProps) {
  const [data, setData] = useState<TalentOverviewData>(initialData);
  const [range, setRange] = useState<DateRangePreset>('4w');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (newRange: DateRangePreset) => {
    try {
      setFetchError(null);
      setIsLoading(true);
      setRange(newRange);
      const res = await fetch(`/api/talent?range=${newRange}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: TalentOverviewData = await res.json();
      setData(newData);
    } catch (err) {
      console.error('Failed to refresh talent data:', err);
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
          <h1 className="text-xl font-semibold">Talent Performance</h1>
          <p className="text-xs text-muted mt-1">
            On-air talent advocacy tracking · {data.totalPosts} posts from{' '}
            {data.advocacyStats.activeTalent} active talent
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
        {/* Section 5.7: Advocacy Stats */}
        <TalentAdvocacyBar stats={data.advocacyStats} />

        {/* Section 5.1: Leaderboard */}
        <div className="mt-6">
          <TalentLeaderboard data={data.leaderboard} />
        </div>

        {/* Section 5.2: Activity Grid */}
        <div className="mt-6">
          <TalentActivityGrid data={data.activityGrid} />
        </div>

        {/* Section 5.3: Show Matrix */}
        <div className="mt-6">
          <TalentShowMatrix data={data.showMatrix} />
        </div>

        {/* Section 5.4 + 5.5: Frequency + Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ChartErrorBoundary fallbackTitle="Posting Frequency">
            <TalentFrequencyChart data={data.frequencyChart} />
          </ChartErrorBoundary>
          <ChartErrorBoundary fallbackTitle="Avg Engagement per Post">
            <TalentEngagementBars data={data.engagementBars} />
          </ChartErrorBoundary>
        </div>

        {/* Section 5.8: Alerts */}
        <div className="mt-6">
          <TalentAlerts data={data.alerts} />
        </div>
      </div>
    </div>
  );
}
