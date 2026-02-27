'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
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
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCompact, formatCurrency, formatGrowth } from '@/lib/utils';
import { DateRangeSelector } from './DateRangeSelector';
import { ShowPostTable } from './ShowPostTable';
import { ShowTimeline } from './ShowTimeline';
import type { ShowDrillDownData, DateRangePreset } from '@/lib/show-types';

interface ShowDrillDownProps {
  initialData: ShowDrillDownData;
}

export function ShowDrillDown({ initialData }: ShowDrillDownProps) {
  const [data, setData] = useState<ShowDrillDownData>(initialData);
  const [range, setRange] = useState<DateRangePreset>('4w');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (newRange: DateRangePreset) => {
    try {
      setIsLoading(true);
      setRange(newRange);
      const res = await fetch(`/api/shows/${data.show.id}?range=${newRange}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const newData: ShowDrillDownData = await res.json();
      setData(newData);
    } catch (err) {
      console.error('Failed to refresh show data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [data.show.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/shows"
            className="text-muted hover:text-foreground transition-colors text-sm"
          >
            ← Shows
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-1.5 h-10 rounded-full"
              style={{ backgroundColor: data.show.color }}
            />
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-background/50">
              <Image
                src={data.show.logoPath}
                alt={data.show.name}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{data.show.name}</h1>
              <p className="text-xs text-muted">
                {data.totalPosts} posts · {data.dateRange.start} to {data.dateRange.end}
              </p>
            </div>
          </div>
        </div>

        <DateRangeSelector value={range} onChange={fetchData} />
      </div>

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

        {/* Platform breakdown + Engagement pie */}
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

          {/* Engagement breakdown pie */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4">Engagement Breakdown</h3>
            <div className="relative" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.engagementBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                  >
                    {data.engagementBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
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
                <span className="text-xs text-muted">Total</span>
                <span className="text-lg font-data font-bold text-foreground">
                  {formatCompact(
                    data.engagementBreakdown.reduce((s, e) => s + e.value, 0)
                  )}
                </span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {data.engagementBreakdown.map((e) => (
                <div key={e.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                  <span className="text-muted">{e.name}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Timeline */}
        <div className="mt-6">
          <ShowTimeline
            data={data.timeline}
            shows={[data.show]}
            title={`${data.show.name} — Weekly Performance`}
          />
        </div>

        {/* Posts table */}
        <div className="mt-6">
          <ShowPostTable posts={data.posts} />
        </div>

        {/* Top hashtags */}
        {data.topHashtags.length > 0 && (
          <GlassCard className="p-5 mt-6">
            <h3 className="text-sm font-semibold mb-4">Top Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {data.topHashtags.map((tag) => (
                <div
                  key={tag.hashtag}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50"
                >
                  <span className="text-xs font-data text-accent">{tag.hashtag}</span>
                  <span className="text-[10px] text-muted">
                    {tag.postCount} post{tag.postCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-muted">
                    · avg {formatCompact(tag.avgEngagement)} eng
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
