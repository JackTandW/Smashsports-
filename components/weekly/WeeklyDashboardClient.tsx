'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WeeklyComparisonData } from '@/lib/weekly-types';
import { WeeklyHeroBanner } from './WeeklyHeroBanner';
import { EngagementRateGauge } from './EngagementRateGauge';
import { EmvComparison } from './EmvComparison';
import { PlatformWeeklyTable } from './PlatformWeeklyTable';
import { WeeklyGrowthCurve } from './WeeklyGrowthCurve';
import { ContentPerformance } from './ContentPerformance';
import { AnalystInsights } from './AnalystInsights';

interface WeeklyDashboardClientProps {
  initialData: WeeklyComparisonData;
}

export function WeeklyDashboardClient({ initialData }: WeeklyDashboardClientProps) {
  const [data, setData] = useState<WeeklyComparisonData>(initialData);
  const [selectedWeek, setSelectedWeek] = useState<string>(initialData.thisWeekStart);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeekData = useCallback(async (weekStart: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/weekly?weekStart=${weekStart}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: WeeklyComparisonData = await res.json();
      setData(newData);
    } catch (err) {
      console.error('Failed to load week data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleWeekChange = (weekStart: string) => {
    setSelectedWeek(weekStart);
    if (weekStart !== data.thisWeekStart) {
      fetchWeekData(weekStart);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with week selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Weekly Comparison</h1>
          <p className="text-xs text-muted mt-1">
            Week-over-week performance analysis across all platforms
          </p>
        </div>

        {/* Week selector dropdown */}
        <div className="flex items-center gap-3">
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-xs text-muted">Loading...</span>
            </div>
          )}
          <div className="relative">
            <select
              value={selectedWeek}
              onChange={(e) => handleWeekChange(e.target.value)}
              className="appearance-none bg-card border border-border rounded-lg px-3 py-2 pr-8 text-sm text-foreground cursor-pointer hover:border-accent/50 transition-colors focus:outline-none focus:ring-1 focus:ring-accent/50"
              disabled={isLoading}
            >
              {data.availableWeeks.map((week) => (
                <option key={week.weekStart} value={week.weekStart}>
                  Week of {week.label}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-muted"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Fade overlay when loading */}
      <div className={`transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* Section 2.1: Hero Banner */}
        <WeeklyHeroBanner
          cards={data.heroCards}
          thisWeekLabel={data.thisWeekStart}
          lastWeekLabel={data.lastWeekStart}
          isPartialWeek={data.isPartialWeek}
          partialDayCount={data.partialDayCount}
        />

        {/* Section 2.2 + 2.3: Gauge + EMV side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <EngagementRateGauge data={data.engagementGauge} />
          <EmvComparison
            thisWeek={data.emvComparison.thisWeek}
            lastWeek={data.emvComparison.lastWeek}
            delta={data.emvComparison.delta}
            percentChange={data.emvComparison.percentChange}
          />
        </div>

        {/* Section 2.4: Per-Platform Table */}
        <div className="mt-6">
          <PlatformWeeklyTable rows={data.platformTable} />
        </div>

        {/* Section 2.5: Growth Curves */}
        <div className="mt-6">
          <WeeklyGrowthCurve data={data.growthCurve} />
        </div>

        {/* Section 2.6: Content Performance */}
        <div className="mt-6">
          <ContentPerformance
            dayHeatmap={data.dayHeatmap}
            topPosts={data.topPosts}
          />
        </div>

        {/* Section 2.7: Analyst Insights */}
        <div className="mt-6">
          <AnalystInsights insights={data.insights} />
        </div>
      </div>
    </div>
  );
}
