'use client';

import type { GrowthIndicator } from '@/lib/types';
import { formatGrowth } from '@/lib/utils';

interface GrowthBadgeProps {
  growth: GrowthIndicator;
}

export function GrowthBadge({ growth }: GrowthBadgeProps) {
  const colorClass =
    growth.direction === 'up'
      ? 'text-positive bg-positive/10'
      : growth.direction === 'down'
        ? 'text-negative bg-negative/10'
        : 'text-muted bg-muted/10';

  const arrow =
    growth.direction === 'up' ? '\u2191' : growth.direction === 'down' ? '\u2193' : '\u2192';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      <span>{arrow}</span>
      <span className="font-data">{formatGrowth(growth.percentage)}</span>
    </span>
  );
}
