'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact, getInitials } from '@/lib/utils';
import type { TalentShowMatrixEntry } from '@/lib/talent-types';

interface TalentShowMatrixProps {
  data: TalentShowMatrixEntry[];
}

export function TalentShowMatrix({ data }: TalentShowMatrixProps) {
  if (data.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Talent × Show Matrix</h3>
        <p className="text-xs text-muted text-center py-8">No data for this period</p>
      </GlassCard>
    );
  }

  // Get show columns from first entry
  const shows = data[0].shows;

  // Find max engagements for bar scaling
  let maxEngagements = 0;
  for (const entry of data) {
    for (const show of entry.shows) {
      if (show.engagements > maxEngagements) {
        maxEngagements = show.engagements;
      }
    }
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Talent × Show Matrix</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table" aria-label="Talent show matrix">
          <thead>
            <tr className="border-b border-border/50">
              <th scope="col" className="text-left py-2 pr-4 w-[140px]">Talent</th>
              {shows.map((show) => (
                <th scope="col" key={show.showId} className="text-center py-2 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: show.showColor }}
                    />
                    <span className="text-muted truncate max-w-[80px]">
                      {show.showName}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr
                key={entry.talentId}
                className="border-b border-border/30"
              >
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: entry.avatarColor }}
                    >
                      {getInitials(entry.name)}
                    </div>
                    <span className="truncate max-w-[100px]">{entry.name}</span>
                  </div>
                </td>
                {entry.shows.map((show) => (
                  <td key={show.showId} className="py-2 px-2">
                    {show.postCount > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-data font-medium">
                          {show.postCount}
                        </span>
                        <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${maxEngagements > 0 ? (show.engagements / maxEngagements) * 100 : 0}%`,
                              backgroundColor: show.showColor,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted">
                          {formatCompact(show.engagements)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-center text-muted">—</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
