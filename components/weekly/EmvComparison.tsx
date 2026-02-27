'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { WeeklyEmvBar } from '@/lib/weekly-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency, formatGrowth } from '@/lib/utils';

interface EmvComparisonProps {
  thisWeek: WeeklyEmvBar;
  lastWeek: WeeklyEmvBar;
  delta: number;
  percentChange: number;
}

const SEGMENTS = [
  { key: 'views', color: '#00D4FF', name: 'Views/Impressions' },
  { key: 'likes', color: '#00FF88', name: 'Likes' },
  { key: 'comments', color: '#FFB800', name: 'Comments' },
  { key: 'shares', color: '#E4405F', name: 'Shares' },
  { key: 'other', color: '#6B7280', name: 'Other' },
];

export function EmvComparison({
  thisWeek,
  lastWeek,
  delta,
  percentChange,
}: EmvComparisonProps) {
  const chartData = [
    { name: 'This Week', ...thisWeek },
    { name: 'Last Week', ...lastWeek },
  ];

  const changeColor = delta > 0 ? '#00FF88' : delta < 0 ? '#FF3366' : '#FFB800';
  const sign = delta >= 0 ? '+' : '';

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Earned Media Value (EMV)</h3>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <p className="text-xs text-muted mb-1">This Week</p>
          <p className="text-lg font-bold font-data text-accent">
            {formatCurrency(thisWeek.total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Last Week</p>
          <p className="text-lg font-bold font-data text-foreground">
            {formatCurrency(lastWeek.total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted mb-1">Change</p>
          <p className="text-lg font-bold font-data" style={{ color: changeColor }}>
            {sign}{formatCurrency(delta)}
          </p>
          <p className="text-xs font-data" style={{ color: changeColor }}>
            {formatGrowth(percentChange)}
          </p>
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickFormatter={(v) => formatCurrency(v)}
              axisLine={{ stroke: '#1E1E2E' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#E5E5E5', fontSize: 12 }}
              axisLine={{ stroke: '#1E1E2E' }}
              width={75}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(18, 18, 26, 0.95)',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                color: '#E5E5E5',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0), name ?? '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', color: '#6B7280' }}
            />
            {SEGMENTS.map((seg) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                stackId="emv"
                fill={seg.color}
                name={seg.name}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
