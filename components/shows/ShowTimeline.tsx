'use client';

import { useState } from 'react';
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
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';
import type { ShowTimelinePoint } from '@/lib/show-types';
import type { ShowConfig } from '@/lib/show-types';

interface ShowTimelineProps {
  data: ShowTimelinePoint[];
  shows: ShowConfig[];
  title?: string;
}

export function ShowTimeline({
  data,
  shows,
  title = 'Performance Over Time',
}: ShowTimelineProps) {
  const [hiddenShows, setHiddenShows] = useState<Set<string>>(new Set());

  const toggleShow = (showId: string) => {
    setHiddenShows((prev) => {
      const next = new Set(prev);
      if (next.has(showId)) {
        next.delete(showId);
      } else {
        next.add(showId);
      }
      return next;
    });
  };

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />

            <XAxis
              dataKey="weekLabel"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#1E1E2E' }}
            />

            <YAxis
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
              width={55}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: '#12121A',
                border: '1px solid #1E1E2E',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                const show = shows.find((s) => s.id === name);
                return [formatCompact(value ?? 0), show?.name ?? name ?? ''];
              }}
            />

            <Legend content={() => null} />

            {shows.map((show) => (
              <Line
                key={show.id}
                type="monotone"
                dataKey={show.id}
                name={show.id}
                stroke={show.color}
                strokeWidth={2}
                dot={{ r: 3, fill: show.color }}
                activeDot={{ r: 5 }}
                hide={hiddenShows.has(show.id)}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {shows.map((show) => (
          <button
            key={show.id}
            onClick={() => toggleShow(show.id)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              hiddenShows.has(show.id) ? 'opacity-30' : 'opacity-100'
            }`}
          >
            <span
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: show.color }}
            />
            <span className="text-muted hover:text-foreground">{show.name}</span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
