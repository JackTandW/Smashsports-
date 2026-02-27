'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import type { ShowSummary } from '@/lib/show-types';
import { formatGrowth } from '@/lib/utils';

interface ShowCardProps {
  show: ShowSummary;
}

export function ShowCard({ show }: ShowCardProps) {
  const router = useRouter();

  return (
    <GlassCard
      className="p-5 cursor-pointer hover:border-border/60 transition-all group"
      onClick={() => router.push(`/shows/${show.showId}`)}
    >
      <div className="flex items-center gap-3 mb-4">
        {/* Color accent bar */}
        <div
          className="w-1 h-10 rounded-full"
          style={{ backgroundColor: show.color }}
        />

        {/* Show logo */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-background/50 flex-shrink-0">
          <Image
            src={show.logoPath}
            alt={show.showName}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>

        {/* Show name */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
            {show.showName}
          </h3>
          <p className="text-xs text-muted">
            {show.totalPosts} post{show.totalPosts !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCell
          label="Engagements"
          value={show.totalEngagements}
          format="number"
          delta={show.deltaEngagements}
        />
        <MetricCell
          label="Views"
          value={show.totalViews}
          format="number"
          delta={show.deltaViews}
        />
        <MetricCell
          label="Posts"
          value={show.totalPosts}
          format="number"
          delta={show.deltaPosts}
        />
        <MetricCell
          label="EMV"
          value={show.emvTotal}
          format="currency"
          delta={show.deltaEmv}
        />
      </div>
    </GlassCard>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const colorClass =
    direction === 'up'
      ? 'text-positive bg-positive/10'
      : direction === 'down'
        ? 'text-negative bg-negative/10'
        : 'text-muted bg-muted/10';
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${colorClass}`}
    >
      <span>{arrow}</span>
      <span className="font-data">{formatGrowth(delta)}</span>
    </span>
  );
}

function MetricCell({
  label,
  value,
  format,
  delta,
}: {
  label: string;
  value: number;
  format: 'number' | 'currency';
  delta: number | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <AnimatedNumber
          value={value}
          format={format === 'currency' ? 'currency' : 'number'}
          className="text-sm font-data font-semibold"
        />
        {delta !== null && (
          <DeltaBadge delta={delta} />
        )}
      </div>
    </div>
  );
}
