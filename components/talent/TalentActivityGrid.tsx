'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { getInitials } from '@/lib/utils';
import type { TalentActivityEntry } from '@/lib/talent-types';

interface TalentActivityGridProps {
  data: TalentActivityEntry[];
}

function getCellColor(posts: number): string {
  if (posts === 0) return 'bg-white/[0.03]';
  if (posts === 1) return 'bg-accent/20';
  if (posts === 2) return 'bg-accent/40';
  if (posts === 3) return 'bg-accent/60';
  return 'bg-accent/80';
}

export function TalentActivityGrid({ data }: TalentActivityGridProps) {
  // Get week labels from first entry
  const weeks = data.length > 0 ? data[0].weekData : [];

  if (data.length === 0 || weeks.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Activity Grid</h3>
        <p className="text-xs text-muted text-center py-8">No activity data for this period</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Activity Grid</h3>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Header row: week labels */}
          <div className="flex items-center mb-2">
            <div className="w-[130px] flex-shrink-0" />
            {weeks.map((w) => (
              <div
                key={w.weekStart}
                className="flex-1 text-center text-[10px] text-muted"
              >
                {w.weekLabel}
              </div>
            ))}
          </div>

          {/* Talent rows */}
          {data.map((entry) => (
            <div key={entry.talentId} className="flex items-center mb-1">
              {/* Talent name */}
              <div className="w-[130px] flex-shrink-0 flex items-center gap-1.5 pr-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: entry.avatarColor }}
                >
                  {getInitials(entry.name)}
                </div>
                <span className="text-[10px] text-foreground truncate">
                  {entry.name.split(' ')[0]}
                </span>
              </div>

              {/* Week cells */}
              {entry.weekData.map((w) => (
                <div key={w.weekStart} className="flex-1 px-0.5">
                  <div
                    className={`h-6 rounded-sm ${getCellColor(w.posts)} transition-colors`}
                    title={`${entry.name}: ${w.posts} post${w.posts !== 1 ? 's' : ''} (${w.weekLabel})`}
                  >
                    {w.posts > 0 && (
                      <div className="flex items-center justify-center h-full text-[9px] font-data font-bold text-white/80">
                        {w.posts}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 ml-[130px]">
            <span className="text-[10px] text-muted">Less</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`w-4 h-4 rounded-sm ${getCellColor(n)}`}
                title={`${n} posts`}
              />
            ))}
            <span className="text-[10px] text-muted">More</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
