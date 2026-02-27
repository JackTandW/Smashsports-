'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { EmvBarSegment } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency } from '@/lib/utils';

interface EmvStackedBarProps {
  data: EmvBarSegment[];
}

const SEGMENTS = [
  { key: 'views', color: '#00D4FF', name: 'Views/Impressions' },
  { key: 'likes', color: '#00FF88', name: 'Likes' },
  { key: 'comments', color: '#FFB800', name: 'Comments' },
  { key: 'shares', color: '#E4405F', name: 'Shares' },
  { key: 'other', color: '#6B7280', name: 'Other' },
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
  const total = payload.reduce((s, p) => s + p.value, 0);
  return (
    <div className="glass rounded-lg border border-border p-3 text-sm min-w-[180px]">
      <p className="text-foreground font-medium mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-data text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-muted">Total</span>
        <span className="font-data font-bold text-foreground">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

export function EmvStackedBar({ data }: EmvStackedBarProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">EMV Breakdown by Platform</h3>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
              tickFormatter={(v: number) => formatCurrency(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#E5E5E5', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#6B7280' }}
              iconType="square"
            />
            {SEGMENTS.map((seg) => (
              <Bar
                key={seg.key}
                dataKey={seg.key}
                stackId="emv"
                fill={seg.color}
                name={seg.name}
                animationDuration={800}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
