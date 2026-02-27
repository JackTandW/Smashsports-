'use client';

import { useState, useMemo } from 'react';
import type { PostMetrics } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact, formatCurrency, formatPercentage } from '@/lib/utils';

interface TopPostsTableProps {
  posts: PostMetrics[];
}

type SortKey = 'engagements' | 'videoViews' | 'impressions' | 'emv';
type SortDir = 'asc' | 'desc';

export function TopPostsTable({ posts }: TopPostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('engagements');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [posts, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({
    label,
    sortField,
  }: {
    label: string;
    sortField: SortKey;
  }) => (
    <button
      onClick={() => toggleSort(sortField)}
      className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === sortField && (
        <span className="text-accent">
          {sortDir === 'desc' ? '\u2193' : '\u2191'}
        </span>
      )}
    </button>
  );

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Top 10 Posts</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8">
                #
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted w-10">
                Platform
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted w-20">
                Date
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">
                Content
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Views" sortField="videoViews" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Engagements" sortField="engagements" />
              </th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted">
                Eng Rate
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="EMV" sortField="emv" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((post, i) => {
              const engRate =
                post.impressions > 0
                  ? (post.engagements / post.impressions) * 100
                  : 0;
              return (
                <tr
                  key={post.id}
                  className="border-b border-border/30 hover:bg-card/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (post.permalink) window.open(post.permalink, '_blank');
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && post.permalink) {
                      window.open(post.permalink, '_blank');
                    }
                  }}
                >
                  <td className="py-2.5 px-2 text-xs text-muted">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <PlatformIcon platform={post.platform} size={16} />
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted font-data whitespace-nowrap">
                    {new Date(post.createdAt).toLocaleDateString('en-ZA', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-2.5 px-2 text-xs max-w-[300px] truncate" title={post.content}>
                    {post.content.substring(0, 80)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs">
                    {formatCompact(post.videoViews)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs text-accent">
                    {formatCompact(post.engagements)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs">
                    {formatPercentage(engRate)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs text-positive">
                    {formatCurrency(post.emv)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
