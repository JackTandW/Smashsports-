'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact } from '@/lib/utils';
import type { HashtagHealthEntry } from '@/lib/show-types';

interface HashtagHealthCheckProps {
  data: HashtagHealthEntry[];
}

export function HashtagHealthCheck({ data }: HashtagHealthCheckProps) {
  const maxPosts = Math.max(...data.map((d) => d.postCount), 1);

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Hashtag Health Check</h3>

      {data.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          No hashtag data available for this period.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">
                  Hashtag
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted">
                  Show
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted">
                  Posts
                </th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted w-32">
                  Usage
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium text-muted">
                  Avg Engagement
                </th>
                <th className="text-center py-2 px-2 text-xs font-medium text-muted">
                  Top Platform
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr
                  key={entry.hashtag}
                  className="border-b border-border/30 hover:bg-card/50 transition-colors"
                >
                  <td className="py-2.5 px-2">
                    <span className="font-data text-xs text-accent">
                      {entry.hashtag}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.showColor }}
                      />
                      <span className="text-xs text-muted truncate max-w-[100px]">
                        {entry.showName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs">
                    {entry.postCount}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="w-full bg-background/50 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${(entry.postCount / maxPosts) * 100}%`,
                          backgroundColor: entry.showColor,
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-data text-xs">
                    {formatCompact(entry.avgEngagement)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {entry.topPlatform ? (
                      <div className="flex justify-center">
                        <PlatformIcon platform={entry.topPlatform} size={14} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
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
