'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CurrentWeekData } from '@/lib/current-week-types';
import { LiveStatusHeader } from './LiveStatusHeader';
import { PaceMetricCards } from './PaceMetricCards';
import { HourlyTimeline } from './HourlyTimeline';
import { DayByDayBreakdown } from './DayByDayBreakdown';
import { PlatformRaceChart } from './PlatformRaceChart';
import { PostLogFeed } from './PostLogFeed';
import { EmvLiveCounter } from './EmvLiveCounter';
import { AlertsPanel } from './AlertsPanel';

interface CurrentWeekDashboardClientProps {
  initialData: CurrentWeekData;
}

const POLL_INTERVAL_MS = 60_000; // 60 seconds

export function CurrentWeekDashboardClient({
  initialData,
}: CurrentWeekDashboardClientProps) {
  const [data, setData] = useState<CurrentWeekData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/current-week');
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: CurrentWeekData = await res.json();
      setData(newData);
      setLastPollTime(new Date());
    } catch (err) {
      console.error('Failed to refresh current week data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-poll every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">This Week Live Tracker</h1>
          <p className="text-xs text-muted mt-1">
            Real-time performance tracking with 60-second auto-refresh
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRefreshing && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-xs text-muted">Refreshing...</span>
            </div>
          )}
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors disabled:opacity-50"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Fade overlay when refreshing */}
      <div
        className={`transition-opacity duration-300 ${
          isRefreshing ? 'opacity-70' : 'opacity-100'
        }`}
      >
        {/* Section 3.1: Live Status Header */}
        <LiveStatusHeader data={data.liveStatus} />

        {/* Section 3.2: Pace Metric Cards */}
        <div className="mt-6">
          <PaceMetricCards cards={data.paceCards} />
        </div>

        {/* Section 3.3 + 3.7: Hourly Timeline + EMV Counter side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <HourlyTimeline data={data.hourlyTimeline} />
          </div>
          <EmvLiveCounter data={data.emvCounter} />
        </div>

        {/* Section 3.4: Day-by-Day Breakdown */}
        <div className="mt-6">
          <DayByDayBreakdown days={data.dayBreakdown} />
        </div>

        {/* Section 3.5 + 3.8: Platform Race + Alerts side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <PlatformRaceChart data={data.platformRace} />
          <AlertsPanel alerts={data.alerts} />
        </div>

        {/* Section 3.6: Post Log Feed */}
        <div className="mt-6">
          <PostLogFeed posts={data.postLog} />
        </div>
      </div>
    </div>
  );
}
