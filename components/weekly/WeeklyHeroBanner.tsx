'use client';

import type { WeeklyHeroCard } from '@/lib/weekly-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCompact, formatCurrency, formatGrowth } from '@/lib/utils';

interface WeeklyHeroBannerProps {
  thisWeekLabel: string;
  lastWeekLabel: string;
  cards: WeeklyHeroCard[];
  isPartialWeek: boolean;
  partialDayCount: number;
}

function directionArrow(dir: 'up' | 'down' | 'flat') {
  if (dir === 'up') return '\u2191';
  if (dir === 'down') return '\u2193';
  return '\u2192';
}

function directionColor(dir: 'up' | 'down' | 'flat') {
  if (dir === 'up') return 'text-positive';
  if (dir === 'down') return 'text-negative';
  return 'text-amber';
}

function directionBg(dir: 'up' | 'down' | 'flat') {
  if (dir === 'up') return 'bg-positive/10';
  if (dir === 'down') return 'bg-negative/10';
  return 'bg-amber/10';
}

function labelColor(label: string) {
  if (label.includes('Strong Growth')) return 'text-positive';
  if (label.includes('Healthy Growth')) return 'text-positive';
  if (label === 'Stable') return 'text-amber';
  if (label.includes('Slight Decline')) return 'text-amber';
  return 'text-negative';
}

function formatVal(value: number, format: 'number' | 'currency' | 'percentage'): string {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'percentage': return `${value.toFixed(2)}%`;
    default: return formatCompact(value);
  }
}

function formatDelta(value: number, format: 'number' | 'currency' | 'percentage'): string {
  const sign = value >= 0 ? '+' : '';
  switch (format) {
    case 'currency': return `${sign}${formatCurrency(value)}`;
    default: return `${sign}${formatCompact(value)}`;
  }
}

export function WeeklyHeroBanner({
  thisWeekLabel,
  lastWeekLabel,
  cards,
  isPartialWeek,
  partialDayCount,
}: WeeklyHeroBannerProps) {
  return (
    <div className="space-y-4">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Week of {thisWeekLabel}
          </h1>
          <p className="text-sm text-muted">
            vs Week of {lastWeekLabel}
          </p>
        </div>
      </div>

      {/* Partial week warning */}
      {isPartialWeek && (
        <div className="glass rounded-[12px] border border-amber/30 p-3 flex items-center gap-2">
          <span className="text-amber">\u26A0\uFE0F</span>
          <p className="text-sm text-amber">
            This week&apos;s data is partial (Mon&ndash;Day {partialDayCount} of 7).
            Full comparison available Monday.
          </p>
        </div>
      )}

      {/* Hero metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <GlassCard key={card.key} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-medium text-muted uppercase tracking-wide">
                {card.metric}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${directionColor(card.direction)} ${directionBg(card.direction)}`}
              >
                {directionArrow(card.direction)} {formatGrowth(card.percentChange)}
              </span>
            </div>

            {/* This week value */}
            <div className="mb-3">
              <AnimatedNumber value={card.thisWeek} format={card.format} className="text-2xl font-bold text-foreground" />
            </div>

            {/* Comparison row */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">
                Last: <span className="font-data">{formatVal(card.lastWeek, card.format)}</span>
              </span>
              <span className={`font-data font-medium ${directionColor(card.direction)}`}>
                {formatDelta(card.delta, card.format)}
              </span>
            </div>

            {/* Growth label */}
            <div className="mt-2">
              <span className={`text-[10px] font-medium ${labelColor(card.label)}`}>
                {card.label}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
