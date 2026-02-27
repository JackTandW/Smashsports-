'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact, formatCurrency } from '@/lib/utils';
import { getShowConfig } from '@/lib/show-attribution';
import type { TalentPost } from '@/lib/talent-types';

interface TalentPostFeedProps {
  posts: TalentPost[];
}

type SortKey = 'engagements' | 'videoViews' | 'emv' | 'createdAt';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'engagements', label: 'Engagements' },
  { key: 'videoViews', label: 'Views' },
  { key: 'emv', label: 'EMV' },
  { key: 'createdAt', label: 'Date' },
];

export function TalentPostFeed({ posts }: TalentPostFeedProps) {
  const [sortBy, setSortBy] = useState<SortKey>('engagements');

  const sorted = [...posts].sort((a, b) => {
    if (sortBy === 'createdAt') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Posts ({posts.length})</h3>
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

      {sorted.length === 0 ? (
        <p className="text-xs text-muted text-center py-8">No posts for this period</p>
      ) : (
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs" role="table" aria-label="Talent posts">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-muted border-b border-border/50">
              <th scope="col" className="text-left py-2 pr-2 w-8">#</th>
              <th scope="col" className="text-center py-2 px-2 w-10">Plat.</th>
              <th scope="col" className="text-left py-2 px-2 w-20">Date</th>
              <th scope="col" className="text-left py-2 px-2">Content</th>
              <th scope="col" className="text-left py-2 px-2 w-24">Shows</th>
              <th scope="col" className="text-right py-2 px-2 w-16">Views</th>
              <th scope="col" className="text-right py-2 px-2 w-16">Eng.</th>
              <th scope="col" className="text-right py-2 pl-2 w-16">EMV</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((post, i) => (
              <tr
                key={post.id}
                className="border-b border-border/30 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => {
                  if (post.permalink) window.open(post.permalink, '_blank');
                }}
              >
                <td className="py-2 pr-2 text-muted font-data">{i + 1}</td>
                <td className="py-2 px-2 text-center">
                  <PlatformIcon platform={post.platform} size={14} />
                </td>
                <td className="py-2 px-2 text-muted whitespace-nowrap">
                  {new Date(post.createdAt).toLocaleDateString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="py-2 px-2">
                  <span className="truncate block max-w-[200px] text-foreground/80">
                    {post.content}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex flex-wrap gap-1">
                    {post.showIds.map((showId) => {
                      const show = getShowConfig(showId);
                      if (!show) return null;
                      return (
                        <span
                          key={showId}
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium text-white"
                          style={{ backgroundColor: show.color + '99' }}
                        >
                          {show.name.split(' ')[0]}
                        </span>
                      );
                    })}
                    {post.showIds.length === 0 && (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-data">
                  {formatCompact(post.videoViews)}
                </td>
                <td className="py-2 px-2 text-right font-data">
                  {formatCompact(post.engagements)}
                </td>
                <td className="py-2 pl-2 text-right font-data">
                  {formatCurrency(post.emv)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </GlassCard>
  );
}
