'use client';

import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import type { PostMetrics } from '@/lib/types';

interface MiniBarChartProps {
  posts: PostMetrics[];
  color: string;
}

export function MiniBarChart({ posts, color }: MiniBarChartProps) {
  if (posts.length === 0) return null;

  const data = posts.map((p, i) => ({
    name: `Post ${i + 1}`,
    engagements: p.engagements,
    content: p.content.substring(0, 60),
  }));

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              background: '#12121A',
              border: '1px solid #1E1E2E',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#E5E5E5',
            }}
            formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Engagements']}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload;
              return item?.content ?? '';
            }}
          />
          <Bar
            dataKey="engagements"
            fill={color}
            radius={[2, 2, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
