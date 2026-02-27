'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DonutSegment } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface PlatformDonutChartProps {
  data: DonutSegment[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DonutSegment }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="glass rounded-lg border border-border p-3 text-sm">
      <p className="font-medium" style={{ color: item.color }}>
        {item.name}
      </p>
      <p className="text-foreground font-data">
        {formatCompact(item.value)} engagements
      </p>
      <p className="text-muted">{item.percentage.toFixed(1)}%</p>
    </div>
  );
}

export function PlatformDonutChart({ data }: PlatformDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Platform Contribution</h3>
      <div className="relative" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry) => (
                <Cell key={entry.platform} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-muted">Total</span>
          <span className="text-xl font-data font-bold text-foreground">
            {formatCompact(total)}
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((d) => (
          <div key={d.platform} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-muted">{d.name}</span>
            <span className="font-data text-foreground">
              {d.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
