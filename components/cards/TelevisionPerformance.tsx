'use client';

import { GlassCard } from '@/components/ui/GlassCard';

interface StaticMetric {
  label: string;
  value: string;
  subtitle: string;
}

const tvMetrics: StaticMetric[] = [
  { label: 'Total TV Unique Audience', value: '3,416,410', subtitle: 'Unique viewers' },
  { label: 'Total TV Broadcasts', value: '367', subtitle: 'Episodes aired' },
  { label: 'Total TV Hours Consumed', value: '2,447,944', subtitle: 'Viewer hours' },
  { label: 'Total TV 100% AVE', value: 'R118.3M', subtitle: 'R118,347,224' },
];

export function TelevisionPerformance() {
  return (
    <section aria-label="Television Performance">
      <h2 className="text-lg font-semibold mb-1">Television Performance</h2>
      <p className="text-xs text-muted mb-4">
        SuperSport broadcast data — lifetime
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tvMetrics.map((metric, i) => (
          <GlassCard
            key={metric.label}
            className="p-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
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
