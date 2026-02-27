'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact } from '@/lib/utils';
import { getPlatformConfig } from '@/lib/utils';
import type { PlatformRaceEntry } from '@/lib/current-week-types';

interface PlatformRaceChartProps {
  data: PlatformRaceEntry[];
}

export function PlatformRaceChart({ data }: PlatformRaceChartProps) {
  const chartData = data.map((entry) => ({
    platform: entry.platform,
    name: getPlatformConfig(entry.platform).name,
    engagements: entry.engagements,
    color: entry.color,
  }));

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Platform Race</h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" horizontal={false} />

            <XAxis
              type="number"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
              tickFormatter={(v: number) => formatCompact(v)}
            />

            <YAxis
              type="category"
              dataKey="name"
              tick={false}
              width={0}
              axisLine={false}
              tickLine={false}
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
                'Engagements',
              ]}
            />

            <Bar
              dataKey="engagements"
              radius={[0, 6, 6, 0]}
              barSize={28}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Platform labels with icons */}
      <div className="space-y-2 mt-2">
        {data.map((entry) => (
          <div key={entry.platform} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={entry.platform} size={16} />
              <span className="text-xs text-muted">
                {getPlatformConfig(entry.platform).name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-data text-xs">{formatCompact(entry.engagements)}</span>
              <span className="text-[10px] text-muted">
                {entry.postsCount} post{entry.postsCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
