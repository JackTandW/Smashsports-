'use client';

import { useEffect } from 'react';
import type { DashboardData } from '@/lib/types';
import { HeroSection } from '@/components/cards/HeroMetricCard';
import { PlatformGrid } from '@/components/cards/PlatformCard';
import { ChartsSection } from '@/components/charts/ChartsSection';
import { useDashboardStore } from '@/store/dashboard-store';

interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const setLastUpdated = useDashboardStore((s) => s.setLastUpdated);

  useEffect(() => {
    setLastUpdated(data.dataQuality.lastUpdated);
  }, [data.dataQuality.lastUpdated, setLastUpdated]);

  return (
    <div className="space-y-2">
      {/* Data quality warnings */}
      {data.dataQuality.zeroValueAlerts.length > 0 && (
        <div className="glass rounded-lg border border-amber/30 px-4 py-2 text-xs text-amber">
          {data.dataQuality.zeroValueAlerts.map((a, i) => (
            <p key={i}>&#x26A0; {a.message}</p>
          ))}
        </div>
      )}

      {data.dataQuality.discrepancies.length > 0 && (
        <div className="glass rounded-lg border border-border px-4 py-2 text-xs text-muted">
          {data.dataQuality.discrepancies.map((d, i) => (
            <p key={i}>
              &#x24D8; {d.metric}: platform totals differ from aggregate by{' '}
              {d.deviationPercent.toFixed(1)}%
            </p>
          ))}
        </div>
      )}

      <HeroSection cards={data.heroCards} />
      <PlatformGrid platforms={data.platforms} />
      <ChartsSection data={data} />

      {/* Anomaly summary */}
      {data.dataQuality.anomalies.length > 0 && (
        <div className="glass rounded-lg border border-border p-4 mt-8">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="text-amber">&#x26A0;</span>
            Anomaly Alerts ({data.dataQuality.anomalies.length})
          </h3>
          <div className="space-y-1">
            {data.dataQuality.anomalies.slice(0, 5).map((a, i) => (
              <p key={i} className="text-xs text-muted">
                <span className={a.direction === 'spike' ? 'text-positive' : 'text-negative'}>
                  {a.direction === 'spike' ? '\u2191' : '\u2193'}
                </span>{' '}
                {a.platform} {a.metric} on {a.date}: {a.deviations.toFixed(1)}\u03C3{' '}
                {a.direction} from 30-day average
              </p>
            ))}
            {data.dataQuality.anomalies.length > 5 && (
              <p className="text-xs text-muted">
                ...and {data.dataQuality.anomalies.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
