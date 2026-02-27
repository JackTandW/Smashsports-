'use client';

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
import { formatCompact } from '@/lib/utils';
import type { TalentEngagementBarEntry } from '@/lib/talent-types';

interface TalentEngagementBarsProps {
  data: TalentEngagementBarEntry[];
}

export function TalentEngagementBars({ data }: TalentEngagementBarsProps) {
  // Show top 10 by avg engagement
  const topData = data.filter((d) => d.totalPosts > 0).slice(0, 10);

  if (topData.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Avg Engagement per Post</h3>
        <p className="text-xs text-muted text-center py-8">No engagement data for this period</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Avg Engagement per Post</h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#E5E5E5', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={100}
              tickFormatter={(name: string) => {
                const parts = name.split(' ');
                return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : name;
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined) => [
                formatCompact(value ?? 0),
                'Avg Engagement',
              ]}
              labelFormatter={(label: unknown) => String(label ?? '')}
            />
            <Bar dataKey="avgEngagement" radius={[0, 4, 4, 0]}>
              {topData.map((entry) => (
                <Cell
                  key={entry.talentId}
                  fill={entry.topShowColor ?? '#00D4FF'}
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
