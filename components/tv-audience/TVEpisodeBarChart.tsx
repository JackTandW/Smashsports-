'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { TVEpisodeChartPoint } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface TVEpisodeBarChartProps {
  data: TVEpisodeChartPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const s2024 = payload.find((p) => p.name === '2024/2025');
  const s2025 = payload.find((p) => p.name === '2025/2026');
  const v2024 = s2024?.value ?? 0;
  const v2025 = s2025?.value ?? 0;
  const delta = v2024 > 0 ? ((v2025 - v2024) / v2024) * 100 : 0;

  return (
    <div className="glass rounded-lg border border-border p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p className="text-muted">
        <span style={{ color: '#6B7280' }}>●</span> 2024/2025:{' '}
        <span className="font-data text-foreground">{formatCompact(v2024)}</span>
      </p>
      <p className="text-muted">
        <span style={{ color: '#00D4FF' }}>●</span> 2025/2026:{' '}
        <span className="font-data text-accent">{formatCompact(v2025)}</span>
      </p>
      {v2024 > 0 && (
        <p className={`text-xs mt-1 ${delta >= 0 ? 'text-positive' : 'text-negative'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% YoY
        </p>
      )}
    </div>
  );
}

export function TVEpisodeBarChart({ data }: TVEpisodeBarChartProps) {
  if (data.length === 0) return null;

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Episode Audience Comparison</h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#1E1E2E' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 11 }}
              axisLine={{ stroke: '#1E1E2E' }}
              tickFormatter={formatCompact}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={30}
              formatter={(value: string) => (
                <span className="text-xs text-muted">{value}</span>
              )}
            />
            <Bar
              dataKey="season2024"
              name="2024/2025"
              fill="#6B7280"
              radius={[4, 4, 0, 0]}
              barSize={14}
              animationDuration={800}
            />
            <Bar
              dataKey="season2025"
              name="2025/2026"
              fill="#00D4FF"
              radius={[4, 4, 0, 0]}
              barSize={14}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
