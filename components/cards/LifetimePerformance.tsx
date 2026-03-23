'use client';

import { GlassCard } from '@/components/ui/GlassCard';

interface StaticMetric {
  label: string;
  value: string;
  subtitle: string;
}

const heroMetrics: StaticMetric[] = [
  { label: 'Total Views & Impressions', value: '118.9M', subtitle: 'Across all social platforms' },
  { label: 'Total Audience / Followers', value: '774.2K', subtitle: 'As at Mar 2026' },
  { label: 'Total Estimated Media Value', value: 'R134M+', subtitle: 'Social EMV R16.3M + TV AVE R118.3M' },
];

const supportingMetrics: StaticMetric[] = [
  { label: 'Total Posts', value: '3,916', subtitle: 'All platforms' },
  { label: 'Total Engagements', value: '4.1M', subtitle: '4,118,333' },
  { label: 'Total Followers', value: '774.2K', subtitle: 'As at Mar 2026' },
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
          <div
            key={metric.label}
            className="relative rounded-[14px] p-[1px] animate-fade-in"
            style={{
              animationDelay: `${i * 80}ms`,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.4), rgba(0,255,136,0.25), rgba(0,212,255,0.1))',
            }}
          >
            <div
              className="rounded-[13px] px-6 py-5"
              style={{
                background: 'linear-gradient(135deg, rgba(18,18,26,0.95), rgba(12,12,18,0.98))',
                boxShadow: '0 0 24px rgba(0,212,255,0.08), 0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-muted uppercase tracking-widest font-medium">{metric.label}</span>
                <span
                  className="font-data tabular-nums text-4xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff, #00D4FF)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {metric.value}
                </span>
                <span className="text-[11px] text-muted mt-1">{metric.subtitle}</span>
              </div>
            </div>
          </div>
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
