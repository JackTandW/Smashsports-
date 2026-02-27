'use client';

import { useMemo } from 'react';
import type { DayEngagement, WeeklyComparisonData } from '@/lib/weekly-types';
import type { PostMetrics, PlatformId } from '@/lib/types';
import { PLATFORM_IDS } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact, formatCurrency, getPlatformConfig } from '@/lib/utils';

interface ContentPerformanceProps {
  dayHeatmap: DayEngagement[];
  topPosts: PostMetrics[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getHeatmapColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(0, 212, 255, 0.05)';
  const intensity = value / max;
  if (intensity > 0.8) return 'rgba(0, 212, 255, 0.8)';
  if (intensity > 0.6) return 'rgba(0, 212, 255, 0.6)';
  if (intensity > 0.4) return 'rgba(0, 212, 255, 0.4)';
  if (intensity > 0.2) return 'rgba(0, 212, 255, 0.2)';
  return 'rgba(0, 212, 255, 0.08)';
}

export function ContentPerformance({ dayHeatmap, topPosts }: ContentPerformanceProps) {
  // Build heatmap grid: rows = platforms, columns = days
  const maxEngagement = useMemo(
    () => Math.max(...dayHeatmap.map((d) => d.engagements), 1),
    [dayHeatmap]
  );

  // Find best day overall
  const dayTotals = useMemo(() => {
    const totals = new Array(7).fill(0);
    for (const cell of dayHeatmap) {
      totals[cell.dayOfWeek] += cell.engagements;
    }
    return totals;
  }, [dayHeatmap]);

  const bestDayIndex = dayTotals.indexOf(Math.max(...dayTotals));

  return (
    <div className="space-y-6">
      {/* Day-of-Week Heatmap */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Day-of-Week Engagement Heatmap</h3>
          <span className="text-xs text-muted">
            Best day: <span className="text-accent font-medium">{DAY_LABELS[bestDayIndex]}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" role="table">
            <thead>
              <tr>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted w-28">
                  Platform
                </th>
                {DAY_LABELS.map((day, i) => (
                  <th
                    key={day}
                    className={`text-center py-2 px-2 text-xs font-medium ${
                      i === bestDayIndex ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {day}
                  </th>
                ))}
                <th className="text-right py-2 px-2 text-xs font-medium text-muted">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_IDS.map((platform) => {
                const platformCells = dayHeatmap.filter(
                  (d) => d.platform === platform
                );
                const platformTotal = platformCells.reduce(
                  (sum, c) => sum + c.engagements,
                  0
                );
                const config = getPlatformConfig(platform);

                return (
                  <tr
                    key={platform}
                    className="border-t border-border/30"
                  >
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} size={14} />
                        <span className="text-xs">{config.name}</span>
                      </div>
                    </td>
                    {DAY_LABELS.map((_, dayIndex) => {
                      const cell = platformCells.find(
                        (c) => c.dayOfWeek === dayIndex
                      );
                      const value = cell?.engagements ?? 0;
                      return (
                        <td key={dayIndex} className="py-1.5 px-1 text-center">
                          <div
                            className="rounded px-2 py-1.5 text-xs font-data transition-colors"
                            style={{ backgroundColor: getHeatmapColor(value, maxEngagement) }}
                            title={`${config.name} on ${DAY_LABELS[dayIndex]}: ${value.toLocaleString('en-ZA')} engagements`}
                          >
                            {value > 0 ? formatCompact(value) : '–'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 text-right font-data text-xs text-accent">
                      {formatCompact(platformTotal)}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t border-border">
                <td className="py-2.5 px-2 text-xs font-medium text-muted">
                  All Platforms
                </td>
                {dayTotals.map((total, i) => (
                  <td
                    key={i}
                    className={`py-2.5 px-1 text-center text-xs font-data font-medium ${
                      i === bestDayIndex ? 'text-accent' : 'text-foreground'
                    }`}
                  >
                    {formatCompact(total)}
                  </td>
                ))}
                <td className="py-2.5 px-2 text-right font-data text-xs font-medium text-accent">
                  {formatCompact(dayTotals.reduce((s, v) => s + v, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Heatmap legend */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
          <span className="text-[10px] text-muted">Low</span>
          <div className="flex gap-0.5">
            {[0.08, 0.2, 0.4, 0.6, 0.8].map((opacity) => (
              <div
                key={opacity}
                className="w-6 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(0, 212, 255, ${opacity})` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted">High</span>
        </div>
      </GlassCard>

      {/* Top 5 Posts */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Top 5 Posts This Week</h3>
        {topPosts.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">
            No post data available for this week
          </p>
        ) : (
          <div className="space-y-3">
            {topPosts.slice(0, 5).map((post, i) => {
              const engRate =
                post.impressions > 0
                  ? (post.engagements / post.impressions) * 100
                  : 0;

              return (
                <div
                  key={post.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-card/30 hover:bg-card/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (post.permalink) window.open(post.permalink, '_blank');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && post.permalink) {
                      window.open(post.permalink, '_blank');
                    }
                  }}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-accent">
                      {i + 1}
                    </span>
                  </div>

                  {/* Platform + content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PlatformIcon platform={post.platform} size={14} />
                      <span className="text-[10px] text-muted font-data">
                        {new Date(post.createdAt).toLocaleDateString('en-ZA', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 line-clamp-2">
                      {post.content.substring(0, 140)}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex-shrink-0 text-right space-y-1">
                    <div>
                      <span className="text-xs font-data text-accent">
                        {formatCompact(post.engagements)}
                      </span>
                      <span className="text-[10px] text-muted ml-1">eng</span>
                    </div>
                    <div>
                      <span className="text-xs font-data">
                        {formatCompact(post.videoViews)}
                      </span>
                      <span className="text-[10px] text-muted ml-1">views</span>
                    </div>
                    <div>
                      <span className="text-xs font-data text-positive">
                        {formatCurrency(post.emv)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-data text-muted">
                        {engRate.toFixed(2)}% rate
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
