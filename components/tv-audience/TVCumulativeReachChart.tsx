'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TVReachChartData } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface TVCumulativeReachChartProps {
  data: TVReachChartData;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg border border-border p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted">
          {entry.name}:{' '}
          <span className="font-data text-foreground">
            {formatCompact(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function TVCumulativeReachChart({ data }: TVCumulativeReachChartProps) {
  const [selectedVariant, setSelectedVariant] = useState(
    data.variants[0]?.key || 'all_all',
  );

  const series = data.seriesByVariant[selectedVariant] || [];

  if (data.variants.length === 0) return null;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Cumulative Reach Build</h3>
        <select
          value={selectedVariant}
          onChange={(e) => setSelectedVariant(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {data.variants.map((v) => (
            <option key={v.key} value={v.key}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#1E1E2E' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#1E1E2E' }}
              tickFormatter={formatCompact}
            />
            <Tooltip content={<CustomTooltip />} />
            <defs>
              <linearGradient id="reachGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="reach"
              stroke="#00D4FF"
              strokeWidth={2}
              fill="url(#reachGradient)"
              name="Reach"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
