'use client';

import { useState, useMemo, useCallback } from 'react';
import type { WeeklyPlatformRow } from '@/lib/weekly-types';
import type { PlatformId } from '@/lib/types';
import { PLATFORM_IDS } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Sparkline } from '@/components/ui/Sparkline';
import {
  formatCompact,
  formatCurrency,
  formatPercentage,
  formatGrowth,
  getPlatformConfig,
  getPlatformColor,
} from '@/lib/utils';

interface PlatformWeeklyTableProps {
  rows: WeeklyPlatformRow[];
}

type SortKey = 'thisWeek' | 'lastWeek' | 'delta' | 'percentChange';
type SortDir = 'asc' | 'desc';

function formatValue(value: number, format: 'number' | 'currency' | 'percentage'): string {
  switch (format) {
    case 'currency': return formatCurrency(value);
    case 'percentage': return formatPercentage(value);
    default: return formatCompact(value);
  }
}

function formatDeltaVal(value: number, format: 'number' | 'currency' | 'percentage'): string {
  const sign = value >= 0 ? '+' : '';
  switch (format) {
    case 'currency': return `${sign}${formatCurrency(value)}`;
    case 'percentage': return `${sign}${value.toFixed(2)}pp`;
    default: return `${sign}${formatCompact(value)}`;
  }
}

export function PlatformWeeklyTable({ rows }: PlatformWeeklyTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('percentChange');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === field && (
        <span className="text-accent">{sortDir === 'desc' ? '\u2193' : '\u2191'}</span>
      )}
    </button>
  );

  const downloadCsv = useCallback(() => {
    const header = 'Platform,Metric,This Week,Last Week,Delta,% Change\n';
    const csvRows = sorted.map((r) => {
      const vals = [
        getPlatformConfig(r.platform).name,
        r.metric,
        r.thisWeek,
        r.lastWeek,
        r.delta,
        `${r.percentChange.toFixed(1)}%`,
      ];
      return vals.join(',');
    });
    const csv = header + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'weekly-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  // Group by platform for visual separation
  const platforms = PLATFORM_IDS.filter((p) => rows.some((r) => r.platform === p));

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Per-Platform Weekly Comparison</h3>
        <button
          onClick={downloadCsv}
          className="px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
        >
          Download CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted w-10">Platform</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Metric</th>
              <th className="text-right py-2 px-2">
                <SortHeader label="This Week" field="thisWeek" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Last Week" field="lastWeek" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="\u0394" field="delta" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="% Change" field="percentChange" />
              </th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted w-24">Trend</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => {
              const platformRows = sorted.filter((r) => r.platform === platform);
              const color = getPlatformColor(platform);

              return platformRows.map((row, idx) => (
                <tr
                  key={`${platform}-${row.metricKey}`}
                  className="border-b border-border/20 hover:bg-card/50 transition-colors"
                  style={idx === 0 ? { borderLeftWidth: '3px', borderLeftColor: color } : {}}
                >
                  <td className="py-2 px-2">
                    {idx === 0 && <PlatformIcon platform={platform} size={16} />}
                  </td>
                  <td className="py-2 px-2 text-xs text-muted">
                    {idx === 0 && (
                      <span className="text-foreground font-medium mr-2">
                        {getPlatformConfig(platform).name}
                      </span>
                    )}
                    {row.metric}
                  </td>
                  <td className="py-2 px-2 text-right font-data text-xs text-accent">
                    {formatValue(row.thisWeek, row.format)}
                  </td>
                  <td className="py-2 px-2 text-right font-data text-xs text-foreground">
                    {formatValue(row.lastWeek, row.format)}
                  </td>
                  <td className={`py-2 px-2 text-right font-data text-xs ${
                    row.direction === 'up' ? 'text-positive' : row.direction === 'down' ? 'text-negative' : 'text-amber'
                  }`}>
                    {formatDeltaVal(row.delta, row.format)}
                  </td>
                  <td className={`py-2 px-2 text-right font-data text-xs ${
                    row.direction === 'up' ? 'text-positive' : row.direction === 'down' ? 'text-negative' : 'text-amber'
                  }`}>
                    {row.direction === 'up' ? '\u2191' : row.direction === 'down' ? '\u2193' : '\u2192'}{' '}
                    {formatGrowth(row.percentChange)}
                  </td>
                  <td className="py-2 px-2">
                    {row.sparkline.length > 1 && (
                      <Sparkline data={row.sparkline} color={color} height={24} width={80} />
                    )}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
