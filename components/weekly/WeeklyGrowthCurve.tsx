'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import type { WeeklyGrowthPoint } from '@/lib/weekly-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact, formatCurrency, formatPercentage } from '@/lib/utils';

interface WeeklyGrowthCurveProps {
  data: WeeklyGrowthPoint[];
}

// Simple linear regression
function trendLine(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return values.map((_, i) => intercept + slope * i);
}

// 4-week moving average
function movingAverage(values: number[], window = 4): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null;
    const slice = values.slice(i - window + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / window;
  });
}

export function WeeklyGrowthCurve({ data }: WeeklyGrowthCurveProps) {
  if (data.length === 0) return null;

  // Add trend lines to data
  const viewsTrend = trendLine(data.map((d) => d.views));
  const impressionsTrend = trendLine(data.map((d) => d.impressions));
  const engRateTrend = trendLine(data.map((d) => d.engagementRate));
  const emvMA = movingAverage(data.map((d) => d.emv));

  const metricsData = data.map((d, i) => ({
    ...d,
    viewsTrend: viewsTrend[i],
    impressionsTrend: impressionsTrend[i],
    engRateTrend: engRateTrend[i],
  }));

  const emvData = data.map((d, i) => ({
    weekLabel: d.weekLabel,
    emv: d.emv,
    emvMA: emvMA[i],
  }));

  const isLast = (index: number) => index === data.length - 1;

  return (
    <div className="space-y-6">
      {/* Main metrics chart */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Week-on-Week Growth (12 Weeks)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metricsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
                tickFormatter={formatCompact}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(18, 18, 26, 0.95)',
                  border: '1px solid #1E1E2E',
                  borderRadius: '8px',
                  color: '#E5E5E5',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const v = value ?? 0;
                  const n = name ?? '';
                  if (n.includes('Rate') || n.includes('Trend (Rate)'))
                    return [formatPercentage(v), n];
                  return [formatCompact(v), n];
                }}
              />

              {/* Views line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="views"
                stroke="#00D4FF"
                strokeWidth={2}
                name="Views"
                dot={(props: { index?: number; cx?: number; cy?: number }) =>
                  isLast(props.index ?? 0) ? (
                    <circle cx={props.cx ?? 0} cy={props.cy ?? 0} r={5} fill="#00D4FF" stroke="#0A0A0F" strokeWidth={2} key={`views-dot-${props.index}`} />
                  ) : <circle key={`views-nodot-${props.index}`} r={0} cx={0} cy={0} />
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="viewsTrend"
                stroke="#00D4FF"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Trend (Views)"
                opacity={0.4}
              />

              {/* Impressions line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                stroke="#00FF88"
                strokeWidth={2}
                name="Impressions"
                dot={(props: { index?: number; cx?: number; cy?: number }) =>
                  isLast(props.index ?? 0) ? (
                    <circle cx={props.cx ?? 0} cy={props.cy ?? 0} r={5} fill="#00FF88" stroke="#0A0A0F" strokeWidth={2} key={`imp-dot-${props.index}`} />
                  ) : <circle key={`imp-nodot-${props.index}`} r={0} cx={0} cy={0} />
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressionsTrend"
                stroke="#00FF88"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Trend (Impressions)"
                opacity={0.4}
              />

              {/* Engagement Rate line (right axis) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="engagementRate"
                stroke="#FFB800"
                strokeWidth={2}
                name="Eng. Rate %"
                dot={(props: { index?: number; cx?: number; cy?: number }) =>
                  isLast(props.index ?? 0) ? (
                    <circle cx={props.cx ?? 0} cy={props.cy ?? 0} r={5} fill="#FFB800" stroke="#0A0A0F" strokeWidth={2} key={`eng-dot-${props.index}`} />
                  ) : <circle key={`eng-nodot-${props.index}`} r={0} cx={0} cy={0} />
                }
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="engRateTrend"
                stroke="#FFB800"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Trend (Rate)"
                opacity={0.4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* EMV area chart */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">EMV Growth (12 Weeks)</h3>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={emvData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E2E" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#1E1E2E' }}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(18, 18, 26, 0.95)',
                  border: '1px solid #1E1E2E',
                  borderRadius: '8px',
                  color: '#E5E5E5',
                  fontSize: '12px',
                }}
                formatter={(value: number | undefined, name: string | undefined) => [formatCurrency(value ?? 0), name ?? '']}
              />
              <defs>
                <linearGradient id="emvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="emv"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#emvGradient)"
                name="EMV"
              />
              <Line
                type="monotone"
                dataKey="emvMA"
                stroke="#FFB800"
                strokeWidth={2}
                dot={false}
                name="4-Week Avg"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
