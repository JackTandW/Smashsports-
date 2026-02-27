'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact, formatCurrency } from '@/lib/utils';
import type { ShowComparisonEntry } from '@/lib/show-types';

interface ShowComparisonChartProps {
  data: ShowComparisonEntry[];
}

type ComparisonMetric = 'engagements' | 'views' | 'impressions' | 'emv' | 'posts';

const METRIC_OPTIONS: { key: ComparisonMetric; label: string }[] = [
  { key: 'engagements', label: 'Engagements' },
  { key: 'views', label: 'Views' },
  { key: 'impressions', label: 'Impressions' },
  { key: 'emv', label: 'EMV' },
  { key: 'posts', label: 'Posts' },
];

export function ShowComparisonChart({ data }: ShowComparisonChartProps) {
  const [metric, setMetric] = useState<ComparisonMetric>('engagements');

  const formatter = metric === 'emv' ? formatCurrency : formatCompact;

  const sortedData = [...data].sort((a, b) => b[metric] - a[metric]);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold">Show Comparison</h3>
        <div className="flex gap-1 bg-background/50 rounded-lg p-0.5">
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMetric(opt.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === opt.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatter(v)}
            />
            <YAxis
              type="category"
              dataKey="showName"
              tick={{ fill: '#E5E5E5', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined) => [
                formatter(value ?? 0),
                METRIC_OPTIONS.find((o) => o.key === metric)?.label ?? metric,
              ]}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar
              dataKey={metric}
              radius={[0, 4, 4, 0]}
              animationDuration={800}
            >
              {sortedData.map((entry) => (
                <Cell key={entry.showId} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
