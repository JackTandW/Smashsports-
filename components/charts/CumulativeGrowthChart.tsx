'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { GrowthLinePoint } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface CumulativeGrowthChartProps {
  data: GrowthLinePoint[];
}

const LINES = [
  { key: 'total', color: '#00D4FF', strokeWidth: 3, name: 'Total' },
  { key: 'youtube', color: '#FF0000', strokeWidth: 1.5, name: 'YouTube' },
  { key: 'instagram', color: '#E4405F', strokeWidth: 1.5, name: 'Instagram' },
  { key: 'tiktok', color: '#69C9D0', strokeWidth: 1.5, name: 'TikTok' },
  { key: 'x', color: '#1D9BF0', strokeWidth: 1.5, name: 'X' },
  { key: 'facebook', color: '#1877F2', strokeWidth: 1.5, name: 'Facebook' },
] as const;

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg border border-border p-3 text-sm min-w-[160px]">
      <p className="text-muted mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-data text-foreground">
            {formatCompact(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CumulativeGrowthChart({ data }: CumulativeGrowthChartProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Cumulative Follower Growth</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1E1E2E"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompact}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#6B7280' }}
              iconType="line"
            />
            {LINES.map((line) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                dot={false}
                name={line.name}
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
