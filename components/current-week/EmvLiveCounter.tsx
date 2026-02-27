'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCurrency } from '@/lib/utils';
import type { EmvCounterData } from '@/lib/current-week-types';

interface EmvLiveCounterProps {
  data: EmvCounterData;
}

export function EmvLiveCounter({ data }: EmvLiveCounterProps) {
  const progressCapped = Math.min(data.progressPercentage, 100);

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">EMV Live Counter</h3>

      {/* Large animated EMV value */}
      <div className="text-center mb-4">
        <div className="text-4xl font-semibold text-accent">
          <AnimatedNumber value={data.currentTotal} format="currency" />
        </div>
        <div className="text-xs text-muted mt-1">Earned Media Value (ZAR)</div>
      </div>

      {/* Projected total */}
      <div className="text-center mb-4">
        <span className="text-xs text-muted">Projected: </span>
        <span className="text-sm font-data text-foreground/80">
          {formatCurrency(data.projectedTotal)}
        </span>
      </div>

      {/* Progress bar vs last week */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>vs Last Week</span>
          <span className="font-data">{data.progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-border/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
            style={{ width: `${progressCapped}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted mt-1">
          <span>R 0</span>
          <span>{formatCurrency(data.lastWeekFinal)}</span>
        </div>
      </div>

      {/* EMV breakdown */}
      <div className="border-t border-border pt-3 mt-3">
        <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Breakdown</div>
        <div className="space-y-1.5">
          <BreakdownRow label="Views" value={data.breakdown.views} total={data.currentTotal} color="bg-accent" />
          <BreakdownRow label="Likes" value={data.breakdown.likes} total={data.currentTotal} color="bg-positive" />
          <BreakdownRow label="Comments" value={data.breakdown.comments} total={data.currentTotal} color="bg-amber" />
          <BreakdownRow label="Shares" value={data.breakdown.shares} total={data.currentTotal} color="bg-negative" />
          <BreakdownRow label="Other" value={data.breakdown.other} total={data.currentTotal} color="bg-muted" />
        </div>
      </div>
    </GlassCard>
  );
}

function BreakdownRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-16">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-data text-[10px] text-foreground/70 w-16 text-right">
        {formatCurrency(value)}
      </span>
    </div>
  );
}
