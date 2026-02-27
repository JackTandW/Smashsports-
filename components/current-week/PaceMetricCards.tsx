'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { formatCompact, formatCurrency } from '@/lib/utils';
import type { PaceMetricCard, PaceStatus } from '@/lib/current-week-types';

interface PaceMetricCardsProps {
  cards: PaceMetricCard[];
}

const PACE_CONFIG: Record<PaceStatus, { label: string; color: string; bg: string }> = {
  ahead: { label: 'Ahead', color: 'text-positive', bg: 'bg-positive/10' },
  on_track: { label: 'On Track', color: 'text-accent', bg: 'bg-accent/10' },
  behind: { label: 'Behind', color: 'text-amber', bg: 'bg-amber/10' },
  significantly_behind: { label: 'Behind Pace', color: 'text-negative', bg: 'bg-negative/10' },
};

function formatValue(value: number, format: string): string {
  if (format === 'currency') return formatCurrency(value);
  return formatCompact(value);
}

export function PaceMetricCards({ cards }: PaceMetricCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const pace = PACE_CONFIG[card.paceStatus];

        return (
          <GlassCard key={card.key} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">{card.label}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pace.color} ${pace.bg}`}
              >
                {pace.label}
              </span>
            </div>

            {/* Current total */}
            <div className="text-2xl font-semibold mb-3">
              <AnimatedNumber value={card.currentTotal} format={card.format} />
            </div>

            {/* Pace projection */}
            <div className="flex items-center justify-between text-xs">
              <div className="text-muted">
                <span>Projected: </span>
                <span className={`font-data ${pace.color}`}>
                  {formatValue(card.projectedTotal, card.format)}
                </span>
              </div>
            </div>

            {/* Last week final */}
            <div className="flex items-center justify-between text-xs mt-1">
              <div className="text-muted">
                <span>Last week: </span>
                <span className="font-data text-foreground/70">
                  {formatValue(card.lastWeekFinal, card.format)}
                </span>
              </div>
              {/* Pace percentage */}
              <span className={`font-data text-[10px] ${pace.color}`}>
                {card.pacePercentage > 0 ? '+' : ''}
                {card.pacePercentage.toFixed(1)}%
              </span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
