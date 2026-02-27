'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';
import type { TalentFrequencyPoint } from '@/lib/talent-types';

interface TalentFrequencyChartProps {
  data: TalentFrequencyPoint[];
}

export function TalentFrequencyChart({ data }: TalentFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Posting Frequency</h3>
        <p className="text-xs text-muted text-center py-8">No frequency data for this period</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Posting Frequency</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="weekLabel"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => [
                formatCompact(value ?? 0),
                name === 'postsCount' ? 'Posts' : 'Active Talent',
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="postsCount"
              fill="#00D4FF"
              fillOpacity={0.6}
              radius={[3, 3, 0, 0]}
              name="postsCount"
            />
            <Line
              yAxisId="right"
              dataKey="activeTalent"
              stroke="#00FF88"
              strokeWidth={2}
              dot={{ fill: '#00FF88', r: 3 }}
              name="activeTalent"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded-sm bg-accent/60" />
          <span className="text-muted">Posts</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-0.5 bg-positive" />
          <span className="text-muted">Active Talent</span>
        </div>
      </div>
    </GlassCard>
  );
}
