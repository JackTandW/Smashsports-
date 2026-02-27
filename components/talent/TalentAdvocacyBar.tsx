'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import type { TalentAdvocacyStats } from '@/lib/talent-types';

interface TalentAdvocacyBarProps {
  stats: TalentAdvocacyStats;
}

export function TalentAdvocacyBar({ stats }: TalentAdvocacyBarProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassCard className="p-4">
        <p className="text-xs text-muted mb-1">Total Posts</p>
        <AnimatedNumber
          value={stats.totalPosts}
          format="number"
          className="text-2xl font-bold"
        />
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-xs text-muted mb-1">Active Talent</p>
        <AnimatedNumber
          value={stats.activeTalent}
          format="number"
          className="text-2xl font-bold"
        />
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-xs text-muted mb-1">Avg Posts / Talent</p>
        <span className="text-2xl font-bold font-data text-foreground">
          {stats.avgPostsPerTalent.toFixed(1)}
        </span>
      </GlassCard>

      <GlassCard className="p-4">
        <p className="text-xs text-muted mb-1">Top Platform</p>
        <div className="flex items-center gap-2">
          {stats.topPlatform && (
            <PlatformIcon platform={stats.topPlatform} size={20} />
          )}
          <span className="text-2xl font-bold font-data text-foreground capitalize">
            {stats.topPlatform ?? 'N/A'}
          </span>
        </div>
        {stats.topPlatformPosts > 0 && (
          <p className="text-xs text-muted mt-0.5">
            {stats.topPlatformPosts} posts
          </p>
        )}
      </GlassCard>
    </div>
  );
}
