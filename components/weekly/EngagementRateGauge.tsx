'use client';

import type { EngagementGaugeData } from '@/lib/weekly-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatPercentage, formatGrowth } from '@/lib/utils';

interface EngagementRateGaugeProps {
  data: EngagementGaugeData;
}

export function EngagementRateGauge({ data }: EngagementRateGaugeProps) {
  const { currentRate, previousRate, fourWeekAverage, industryBenchmark, changePoints } = data;

  // Gauge parameters
  const maxRate = Math.max(10, currentRate * 1.5, previousRate * 1.5, industryBenchmark * 2);
  const cx = 150;
  const cy = 140;
  const r = 110;
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)

  function rateToAngle(rate: number): number {
    const pct = Math.min(rate / maxRate, 1);
    return startAngle - pct * Math.PI;
  }

  function polarToCart(angle: number, radius: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    };
  }

  // Arc path helper
  function describeArc(startA: number, endA: number, radius: number): string {
    const start = polarToCart(startA, radius);
    const end = polarToCart(endA, radius);
    const largeArc = startA - endA > Math.PI ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  const currentAngle = rateToAngle(currentRate);
  const prevAngle = rateToAngle(previousRate);
  const benchAngle = rateToAngle(industryBenchmark);

  // 4-week average zone (band from avg-0.5 to avg+0.5)
  const avgLow = rateToAngle(Math.max(0, fourWeekAverage - 0.5));
  const avgHigh = rateToAngle(fourWeekAverage + 0.5);

  const changeColor = changePoints > 0 ? '#00FF88' : changePoints < 0 ? '#FF3366' : '#FFB800';
  const changeSign = changePoints >= 0 ? '+' : '';

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Engagement Rate Comparison</h3>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 300 170" className="w-full max-w-[320px]">
          {/* Background arc */}
          <path
            d={describeArc(startAngle, endAngle, r)}
            fill="none"
            stroke="#1E1E2E"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* 4-week average zone */}
          <path
            d={describeArc(avgLow, avgHigh, r)}
            fill="none"
            stroke="rgba(0, 212, 255, 0.15)"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Current rate arc (filled portion) */}
          <path
            d={describeArc(startAngle, currentAngle, r)}
            fill="none"
            stroke="#00D4FF"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Industry benchmark line */}
          {(() => {
            const p1 = polarToCart(benchAngle, r - 16);
            const p2 = polarToCart(benchAngle, r + 16);
            return (
              <line
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#FFB800"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            );
          })()}

          {/* Previous week marker */}
          {(() => {
            const p = polarToCart(prevAngle, r);
            return (
              <circle cx={p.x} cy={p.y} r="5" fill="#6B7280" stroke="#0A0A0F" strokeWidth="2" />
            );
          })()}

          {/* Current rate needle tip */}
          {(() => {
            const p = polarToCart(currentAngle, r);
            return (
              <circle cx={p.x} cy={p.y} r="7" fill="#00D4FF" stroke="#0A0A0F" strokeWidth="2" />
            );
          })()}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            className="font-data"
            fill="#E5E5E5"
            fontSize="28"
            fontWeight="bold"
          >
            {currentRate.toFixed(2)}%
          </text>
          <text
            x={cx}
            y={cy + 2}
            textAnchor="middle"
            fill="#6B7280"
            fontSize="11"
          >
            Engagement Rate
          </text>

          {/* Scale labels */}
          <text x="20" y={cy + 15} fill="#6B7280" fontSize="10">0%</text>
          <text x="265" y={cy + 15} fill="#6B7280" fontSize="10" textAnchor="end">
            {maxRate.toFixed(0)}%
          </text>
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-muted">This Week</span>
            <span className="font-data text-foreground">{formatPercentage(currentRate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-muted" />
            <span className="text-muted">Last Week</span>
            <span className="font-data text-foreground">{formatPercentage(previousRate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber" style={{ display: 'inline-block' }} />
            <span className="text-muted">SA Benchmark</span>
            <span className="font-data text-foreground">{formatPercentage(industryBenchmark)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-accent/15" />
            <span className="text-muted">4-Week Avg</span>
            <span className="font-data text-foreground">{formatPercentage(fourWeekAverage)}</span>
          </div>
        </div>

        {/* Change callout */}
        <div className="mt-3 text-center">
          <span className="text-xs text-muted">Change: </span>
          <span className="font-data text-sm font-medium" style={{ color: changeColor }}>
            {changeSign}{changePoints.toFixed(2)} percentage points
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
