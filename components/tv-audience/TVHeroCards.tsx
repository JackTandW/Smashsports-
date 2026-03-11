'use client';

import type { TVHeroCard } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Sparkline } from '@/components/ui/Sparkline';

interface TVHeroCardsProps {
  cards: TVHeroCard[];
}

export function TVHeroCards({ cards }: TVHeroCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const sparkData = card.sparkline?.map((v) => ({ value: v })) ?? [];

        return (
          <GlassCard key={card.key} className="p-4">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              {card.label}
            </span>
            <div className="mt-2">
              <AnimatedNumber
                value={card.value}
                format={card.format === 'percentage' ? 'percentage' : 'number'}
                className="text-2xl font-bold text-foreground"
              />
            </div>
            {sparkData.length > 0 && (
              <div className="mt-2 -mx-1">
                <Sparkline data={sparkData} color="#00D4FF" height={32} />
              </div>
            )}
            {card.subtitle && (
              <p className="text-[10px] text-muted mt-1 truncate" title={card.subtitle}>
                {card.subtitle}
              </p>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}
