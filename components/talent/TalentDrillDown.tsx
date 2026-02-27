'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCompact, formatCurrency, formatGrowth, getInitials } from '@/lib/utils';
import { DateRangeSelector } from '@/components/shows/DateRangeSelector';
import { TalentPostFeed } from './TalentPostFeed';
import type { TalentDrillDownData, DateRangePreset } from '@/lib/talent-types';

interface TalentDrillDownProps {
  initialData: TalentDrillDownData;
}

export function TalentDrillDown({ initialData }: TalentDrillDownProps) {
  const [data, setData] = useState<TalentDrillDownData>(initialData);
  const [range, setRange] = useState<DateRangePreset>('4w');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (newRange: DateRangePreset) => {
    try {
      setFetchError(null);
      setIsLoading(true);
      setRange(newRange);
      const res = await fetch(`/api/talent/${data.talent.id}?range=${newRange}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: TalentDrillDownData = await res.json();
      setData(newData);
    } catch (err) {
      console.error('Failed to refresh talent data:', err);
      setFetchError('Failed to update data. Showing previous results.');
    } finally {
      setIsLoading(false);
    }
  }, [data.talent.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/talent"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            &larr; Talent
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: data.talent.colour }}
            >
              {getInitials(data.talent.name)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{data.talent.name}</h1>
              <p className="text-xs text-muted">
                {data.totalPosts} posts &middot; {data.dateRange.start} to {data.dateRange.end}
              </p>
            </div>
          </div>
        </div>

        <DateRangeSelector value={range} onChange={fetchData} />
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
        {/* Hero cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {data.heroCards.map((card) => (
            <GlassCard key={card.label} className="p-4">
              <p className="text-xs text-muted mb-1">{card.label}</p>
              <AnimatedNumber
                value={card.value}
                format={card.format}
                className="text-2xl font-bold"
              />
              {card.delta !== null && (
                <span
                  className={`text-xs font-medium mt-1 inline-block ${
                    card.delta > 0
                      ? 'text-positive'
                      : card.delta < 0
                        ? 'text-negative'
                        : 'text-muted'
                  }`}
                >
                  {formatGrowth(card.delta)} vs prev period
                </span>
              )}
            </GlassCard>
          ))}
        </div>

        {/* Platform breakdown + Show donut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Platform breakdown bar chart */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">Platform Breakdown</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.platformBreakdown}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCompact(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    tick={{ fill: '#E5E5E5', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121A',
                      border: '1px solid #1E1E2E',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined) => [
                      formatCompact(value ?? 0),
                      'Engagements',
                    ]}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="engagements" radius={[0, 4, 4, 0]}>
                    {data.platformBreakdown.map((entry) => (
                      <Cell key={entry.platform} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Show breakdown donut */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">Show Breakdown</h3>
            <div className="relative" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.showBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="engagements"
                    animationDuration={800}
                  >
                    {data.showBreakdown.map((entry) => (
                      <Cell key={entry.showId} fill={entry.showColor} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121A',
                      border: '1px solid #1E1E2E',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatCompact(value ?? 0),
                      name ?? '',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-muted">Shows</span>
                <span className="text-lg font-data font-bold text-foreground">
                  {data.showBreakdown.length}
                </span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {data.showBreakdown.map((s) => (
                <div key={s.showId} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: s.showColor }}
                  />
                  <span className="text-muted">{s.showName}</span>
                  <span className="text-muted font-data">({s.posts})</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">
              {data.talent.name} — Weekly Performance
            </h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.timeline}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCompact(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12121A',
                      border: '1px solid #1E1E2E',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatCompact(value ?? 0),
                      name === 'engagements' ? 'Engagements' : name === 'posts' ? 'Posts' : 'Views',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="engagements"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    dot={{ fill: '#00D4FF', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="posts"
                    stroke="#00FF88"
                    strokeWidth={2}
                    dot={{ fill: '#00FF88', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-0.5 bg-accent" />
                <span className="text-muted">Engagements</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-0.5 bg-positive" />
                <span className="text-muted">Posts</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Post feed */}
        <div className="mt-6">
          <TalentPostFeed posts={data.posts} />
        </div>
      </div>
    </div>
  );
}
