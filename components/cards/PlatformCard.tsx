'use client';

import type { PlatformMetrics } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MiniBarChart } from '@/components/charts/MiniBarChart';
import { formatCompact, formatCurrency, formatPercentage, getPlatformColor, getBenchmarkLabel } from '@/lib/utils';

interface PlatformCardProps {
  data: PlatformMetrics;
  index: number;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-sm font-data text-foreground">{value}</span>
    </div>
  );
}

export function PlatformCard({ data, index }: PlatformCardProps) {
  const color = getPlatformColor(data.platform);
  const benchmark = getBenchmarkLabel(data.engagementRate);

  if (!data.available) {
    return (
      <GlassCard
        className="p-5 opacity-50 animate-fade-in"
        accentColor={color}
        style={{ animationDelay: `${(index + 7) * 80}ms` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <PlatformIcon platform={data.platform} size={24} />
          <div>
            <h3 className="font-semibold text-sm">{data.profileName}</h3>
            <p className="text-xs text-muted">{data.profileHandle}</p>
          </div>
        </div>
        <div className="text-center py-6">
          <p className="text-xs text-amber">
            Data requires additional API authorization
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      className="p-5 animate-fade-in"
      accentColor={color}
      style={{ animationDelay: `${(index + 7) * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <PlatformIcon platform={data.platform} size={24} />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{data.profileName}</h3>
          <p className="text-xs text-muted">{data.profileHandle}</p>
        </div>
        <span className={`text-xs font-medium ${benchmark.color}`}>
          {benchmark.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="divide-y divide-border/50">
        <MetricRow label="Followers" value={formatCompact(data.totalFollowers)} />
        <MetricRow label="Views" value={formatCompact(data.totalViews)} />
        <MetricRow label="Impressions" value={formatCompact(data.totalImpressions)} />
        <MetricRow label="Engagements" value={formatCompact(data.totalEngagements)} />
        <MetricRow label="Engagement Rate" value={formatPercentage(data.engagementRate)} />
        <MetricRow label="Posts" value={formatCompact(data.totalPosts)} />
        <MetricRow label="EMV" value={formatCurrency(data.emv)} />
      </div>

      {/* Mini chart */}
      {data.topPosts.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted mb-2">Top 5 Posts (Engagements)</p>
          <MiniBarChart posts={data.topPosts} color={color} />
        </div>
      )}
    </GlassCard>
  );
}

interface PlatformGridProps {
  platforms: PlatformMetrics[];
}

export function PlatformGrid({ platforms }: PlatformGridProps) {
  return (
    <section aria-label="Platform breakdown" className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Platform Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {platforms.map((p, i) => (
          <PlatformCard key={p.platform} data={p} index={i} />
        ))}
      </div>
    </section>
  );
}
