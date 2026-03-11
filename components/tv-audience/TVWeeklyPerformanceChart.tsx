'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TVWeeklyPerformanceRow } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface TVWeeklyPerformanceChartProps {
  rows: TVWeeklyPerformanceRow[];
}

type MetricKey = 'totalReach' | 'avgAmr' | 'broadcastCount' | 'totalConsumption';

const METRICS: { key: MetricKey; label: string; color: string; formatter: (v: number) => string }[] = [
  { key: 'totalReach', label: 'Total Reach', color: '#00D4FF', formatter: (v) => formatCompact(Math.round(v)) },
  { key: 'avgAmr', label: 'Avg AMR', color: '#00FF88', formatter: (v) => formatCompact(Math.round(v)) },
  { key: 'totalConsumption', label: 'Consumption', color: '#FFB800', formatter: (v) => formatCompact(Math.round(v)) },
  { key: 'broadcastCount', label: 'Broadcasts', color: '#FF3366', formatter: (v) => String(Math.round(v)) },
];

export function TVWeeklyPerformanceChart({ rows }: TVWeeklyPerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('totalReach');
  const metric = METRICS.find((m) => m.key === activeMetric) ?? METRICS[0];

  // Chronological order (oldest first) for the chart
  const chartData = useMemo(() => {
    return [...rows]
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
      .map((r) => ({
        weekLabel: r.weekLabel,
        value: r[activeMetric],
      }));
  }, [rows, activeMetric]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Weekly Performance</h3>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeMetric === m.key
                  ? 'text-white bg-white/10'
                  : 'text-muted hover:text-foreground hover:bg-white/5'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" vertical={false} />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
              interval="preserveStartEnd"
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => metric.formatter(v)}
              width={55}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: 8,
                fontSize: 12,
                color: '#E5E5E5',
              }}
              formatter={(value: number | undefined) => [
                value !== undefined ? metric.formatter(value) : '—',
                metric.label,
              ]}
              labelStyle={{ color: '#6B7280' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar
              dataKey="value"
              fill={metric.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
              animationDuration={600}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
