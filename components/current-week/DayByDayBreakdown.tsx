'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCompact, formatCurrency } from '@/lib/utils';
import type { DayBreakdown } from '@/lib/current-week-types';

interface DayByDayBreakdownProps {
  days: DayBreakdown[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export function DayByDayBreakdown({ days }: DayByDayBreakdownProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">Day-by-Day Breakdown</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => (
          <DayCard key={day.dayIndex} day={day} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DayBreakdown }) {
  const isLive = day.status === 'in_progress';
  const isUpcoming = day.status === 'upcoming';

  let borderClass = 'border-border';
  if (isLive) borderClass = 'border-accent/50 shadow-accent/10 shadow-lg';
  if (isUpcoming) borderClass = 'border-border/50';

  return (
    <GlassCard
      className={`min-w-[160px] flex-shrink-0 p-4 ${borderClass} ${
        isUpcoming ? 'opacity-50' : ''
      }`}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold">{day.dayLabel}</span>
          <span className="text-xs text-muted ml-2">{formatDate(day.date)}</span>
        </div>
        {isLive && (
          <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            LIVE
          </span>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <MetricRow
          label="Engagements"
          value={day.engagements}
          delta={day.percentChangeEngagements}
          isUpcoming={isUpcoming}
        />
        <MetricRow
          label="Views"
          value={day.views}
          delta={day.percentChangeViews}
          isUpcoming={isUpcoming}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">EMV</span>
          <span className="font-data text-foreground/80">
            {isUpcoming ? '—' : formatCurrency(day.emv)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Posts</span>
          <span className="font-data text-foreground/80">
            {isUpcoming ? '—' : day.postsCount}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

function MetricRow({
  label,
  value,
  delta,
  isUpcoming,
}: {
  label: string;
  value: number;
  delta: number;
  isUpcoming: boolean;
}) {
  const deltaColor =
    delta > 0 ? 'text-positive' : delta < 0 ? 'text-negative' : 'text-muted';

  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-data text-foreground/80">
          {isUpcoming ? '—' : formatCompact(value)}
        </span>
        {!isUpcoming && delta !== 0 && (
          <span className={`font-data text-[10px] ${deltaColor}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}
