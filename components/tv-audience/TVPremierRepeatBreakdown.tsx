'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { TVPremierRepeatData } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface TVPremierRepeatBreakdownProps {
  data: TVPremierRepeatData;
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
  return (
    <div className="glass rounded-lg border border-border p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-muted">
          <span style={{ color: entry.color }}>●</span> {entry.name}:{' '}
          <span className="font-data text-foreground">
            {formatCompact(entry.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

function formatMetricValue(val: number, fmt: 'number' | 'compact'): string {
  if (fmt === 'compact') return formatCompact(val);
  return val.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
}

export function TVPremierRepeatBreakdown({ data }: TVPremierRepeatBreakdownProps) {
  // Summary cards
  const bcMetric = data.metrics.find((m) => m.label === 'Total Broadcasts');
  const audMetric = data.metrics.find((m) => m.label === 'Total Audience');

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bcMetric && (
          <GlassCard className="p-4">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Premier Broadcasts
            </span>
            <p className="text-2xl font-data font-bold text-accent mt-1">
              {bcMetric.premier}
            </p>
            <p className="text-xs text-muted mt-0.5">
              vs {bcMetric.repeat} repeats
            </p>
          </GlassCard>
        )}
        {audMetric && (
          <GlassCard className="p-4">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              Premier Audience
            </span>
            <p className="text-2xl font-data font-bold text-accent mt-1">
              {formatCompact(audMetric.premier)}
            </p>
            <p className="text-xs text-muted mt-0.5">
              vs {formatCompact(audMetric.repeat)} repeat audience
            </p>
          </GlassCard>
        )}
      </div>

      {/* Horizontal bar chart */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Premier vs Repeat</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.metrics}
              layout="vertical"
              margin={{ top: 5, right: 20, bottom: 5, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
                tickFormatter={formatCompact}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
                width={75}
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
                dataKey="premier"
                name="Premier"
                fill="#00D4FF"
                radius={[0, 4, 4, 0]}
                barSize={18}
                animationDuration={800}
              />
              <Bar
                dataKey="repeat"
                name="Repeat"
                fill="#FFB800"
                radius={[0, 4, 4, 0]}
                barSize={18}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
