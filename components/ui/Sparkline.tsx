'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({
  data,
  color = '#00D4FF',
  height = 40,
  width,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: width ?? '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
