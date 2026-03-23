'use client';

import { GlassCard } from '@/components/ui/GlassCard';

interface StaticMetric {
  label: string;
  value: string;
  subtitle: string;
}

const heroMetrics: StaticMetric[] = [
  { label: 'Total Views / Impressions', value: '118.9M', subtitle: 'Across all social platforms' },
  { label: 'Total Audience Reach', value: '95.9M', subtitle: 'Estimated unique reach' },
  { label: 'Total Est. Media Value', value: 'R134M+', subtitle: 'Social EMV R16.3M + TV AVE R118.3M' },
];

const supportingMetrics: StaticMetric[] = [
  { label: 'Total Posts', value: '3,916', subtitle: 'All platforms' },
  { label: 'Total Engagements', value: '4.1M', subtitle: '4,118,333' },
  { label: 'Total Followers', value: '752K+', subtitle: 'As at Jan 2026' },
  { label: 'Total Likes', value: '9.5M', subtitle: '9,475,128' },
  { label: 'Engagement Rate', value: '3.46%', subtitle: 'Lifetime average' },
];

export function LifetimePerformance() {
  return (
    <section aria-label="Lifetime Performance">
      <h2 className="text-lg font-semibold mb-1">Lifetime Performance</h2>
      <p className="text-xs text-muted mb-4">
        Since inception — data as at January 2026 (source: Smash Sports Overview Document)
      </p>

      {/* Hero cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {heroMetrics.map((metric, i) => (
          <GlassCard
            key={metric.label}
            className="p-4 animate-fade-in"
            style={{
              animationDelay: `${i * 80}ms`,
              borderTop: '2px solid rgba(34,197,94,0.5)',
            }}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted uppercase tracking-wide">{metric.label}</span>
              <span className="font-data tabular-nums text-3xl font-bold text-foreground">{metric.value}</span>
              <span className="text-[10px] text-muted">{metric.subtitle}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Supporting metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {supportingMetrics.map((metric, i) => (
          <GlassCard
            key={metric.label}
            className="p-4 animate-fade-in"
            style={{ animationDelay: `${(i + 3) * 80}ms` }}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted uppercase tracking-wide">{metric.label}</span>
              <span className="font-data tabular-nums text-2xl font-bold text-foreground">{metric.value}</span>
              <span className="text-[10px] text-muted">{metric.subtitle}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
