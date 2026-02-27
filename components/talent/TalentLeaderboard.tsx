'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact, formatCurrency, formatGrowth, getInitials } from '@/lib/utils';
import type { TalentLeaderboardEntry } from '@/lib/talent-types';

interface TalentLeaderboardProps {
  data: TalentLeaderboardEntry[];
}

type SortKey = 'totalEngagements' | 'totalPosts' | 'totalViews' | 'emv';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'totalEngagements', label: 'Engagements' },
  { key: 'totalPosts', label: 'Posts' },
  { key: 'totalViews', label: 'Views' },
  { key: 'emv', label: 'EMV' },
];

export function TalentLeaderboard({ data }: TalentLeaderboardProps) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('totalEngagements');

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Talent Leaderboard</h3>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                sortBy === opt.key
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="Talent leaderboard">
          <thead>
            <tr className="text-muted border-b border-border/50">
              <th scope="col" className="text-left py-2 pr-2 w-8">#</th>
              <th scope="col" className="text-left py-2 pr-4">Talent</th>
              <th scope="col" className="text-right py-2 px-2" aria-sort={sortBy === 'totalPosts' ? 'descending' : undefined}>Posts</th>
              <th scope="col" className="text-right py-2 px-2" aria-sort={sortBy === 'totalEngagements' ? 'descending' : undefined}>Engagements</th>
              <th scope="col" className="text-right py-2 px-2" aria-sort={sortBy === 'totalViews' ? 'descending' : undefined}>Views</th>
              <th scope="col" className="text-right py-2 px-2" aria-sort={sortBy === 'emv' ? 'descending' : undefined}>EMV</th>
              <th scope="col" className="text-right py-2 px-2">Eng Rate</th>
              <th scope="col" className="text-center py-2 px-2">Platform</th>
              <th scope="col" className="text-right py-2 pl-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => (
              <tr
                key={entry.talentId}
                className="border-b border-border/30 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => router.push(`/talent/${entry.talentId}`)}
              >
                <td className="py-2.5 pr-2 text-muted font-data">{i + 1}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: entry.avatarColor }}
                    >
                      {getInitials(entry.name)}
                    </div>
                    <span className="font-medium truncate max-w-[120px]">
                      {entry.name}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {entry.totalPosts}
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {formatCompact(entry.totalEngagements)}
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {formatCompact(entry.totalViews)}
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {formatCurrency(entry.emv)}
                </td>
                <td className="py-2.5 px-2 text-right font-data">
                  {entry.engagementRate.toFixed(1)}%
                </td>
                <td className="py-2.5 px-2 text-center">
                  {entry.topPlatform && (
                    <PlatformIcon platform={entry.topPlatform} size={14} />
                  )}
                </td>
                <td className="py-2.5 pl-2 text-right">
                  {entry.deltaEngagements !== null && (
                    <DeltaBadge delta={entry.deltaEngagements} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const arrow = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192';

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${colorClass}`}
    >
      <span>{arrow}</span>
      <span className="font-data">{formatGrowth(delta)}</span>
    </span>
  );
}
