'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact, formatCurrency } from '@/lib/utils';
import type { HourlyDataPoint } from '@/lib/current-week-types';

interface HourlyTimelineProps {
  data: HourlyDataPoint[];
}

type MetricKey = 'engagements' | 'views' | 'impressions' | 'emv';

const METRIC_OPTIONS: { key: MetricKey; label: string }[] = [
  { key: 'engagements', label: 'Engagements' },
  { key: 'views', label: 'Views' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'emv', label: 'EMV' },
];

// Midnight boundaries at hours 24, 48, 72, 96, 120, 144
const MIDNIGHT_HOURS = [24, 48, 72, 96, 120, 144];
const DAY_LABELS_AT_MIDNIGHT = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function HourlyTimeline({ data }: HourlyTimelineProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('engagements');

  const formatter = activeMetric === 'emv' ? formatCurrency : formatCompact;

  function getCumulative(point: HourlyDataPoint, metric: MetricKey): number {
    switch (metric) {
      case 'engagements': return point.cumulativeEngagements;
      case 'views': return point.cumulativeViews;
      case 'impressions': return point.cumulativeImpressions;
      case 'emv': return point.cumulativeEmv;
    }
  }

  function getLwCumulative(point: HourlyDataPoint, metric: MetricKey): number {
    switch (metric) {
      case 'engagements': return point.lastWeekCumulativeEngagements;
      case 'views': return point.lastWeekCumulativeViews;
      case 'impressions': return point.lastWeekCumulativeImpressions;
      case 'emv': return point.lastWeekCumulativeEmv;
    }
  }

  // Prepare chart data
  const chartData = data.map((point) => {
    const twValue = getCumulative(point, activeMetric);
    return {
      hourOffset: point.hourOffset,
      dayLabel: point.dayLabel,
      hourLabel: point.hourLabel,
      thisWeek: twValue || null,
      lastWeek: getLwCumulative(point, activeMetric) || 0,
      postsCount: point.postsCount,
    };
  });

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">Hourly Activity Timeline</h3>

        {/* Metric toggle */}
        <div className="flex gap-1 bg-background/50 rounded-lg p-0.5">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveMetric(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeMetric === opt.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="thisWeekGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />

            <XAxis
              dataKey="hourOffset"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
              tickFormatter={(value: number) => {
                // Show day labels at start of each day
                if (value % 24 === 0) {
                  const dayIndex = value / 24;
                  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  return labels[dayIndex] ?? '';
                }
                return '';
              }}
              interval={23}
            />

            <YAxis
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatter(v)}
              width={55}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={(value: unknown) => {
                const idx = typeof value === 'number' ? value : 0;
                const point = data[idx];
                return point ? `${point.dayLabel} ${point.hourLabel}` : `Hour ${idx}`;
              }}
              formatter={(value: number | undefined, name: string | undefined) => [
                formatter(value ?? 0),
                name === 'thisWeek' ? 'This Week' : 'Last Week',
              ]}
            />

            {/* Midnight reference lines */}
            {MIDNIGHT_HOURS.map((hour, i) => (
              <ReferenceLine
                key={hour}
                x={hour}
                stroke="#1E1E2E"
                strokeDasharray="3 3"
                label={{
                  value: DAY_LABELS_AT_MIDNIGHT[i],
                  fill: '#6B7280',
                  fontSize: 10,
                  position: 'top',
                }}
              />
            ))}

            {/* Last week (dashed, faded) */}
            <Area
              type="monotone"
              dataKey="lastWeek"
              stroke="#6B7280"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              fill="none"
              dot={false}
              connectNulls={false}
            />

            {/* This week (solid, accent) */}
            <Area
              type="monotone"
              dataKey="thisWeek"
              stroke="#00D4FF"
              strokeWidth={2}
              fill="url(#thisWeekGradient)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent rounded" />
          <span>This Week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-muted" />
          <span>Last Week</span>
        </div>
      </div>
    </GlassCard>
  );
}
