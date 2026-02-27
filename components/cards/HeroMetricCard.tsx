'use client';

import type { HeroCardData } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Sparkline } from '@/components/ui/Sparkline';
import { GrowthBadge } from '@/components/ui/GrowthBadge';

interface HeroMetricCardProps {
  data: HeroCardData;
  index: number;
}

export function HeroMetricCard({ data, index }: HeroMetricCardProps) {
  return (
    <GlassCard
      className="p-4 animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">
          {data.label}
        </span>
        <AnimatedNumber
          value={data.value}
          format={data.format}
          className="text-2xl font-bold text-foreground"
        />
        <Sparkline
          data={data.sparkline}
          height={36}
        />
        <GrowthBadge growth={data.growth} />
      </div>
    </GlassCard>
  );
}

interface HeroSectionProps {
  cards: HeroCardData[];
}

export function HeroSection({ cards }: HeroSectionProps) {
  return (
    <section aria-label="Key metrics overview">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {cards.map((card, i) => (
          <HeroMetricCard key={card.key} data={card} index={i} />
        ))}
      </div>
    </section>
  );
}
