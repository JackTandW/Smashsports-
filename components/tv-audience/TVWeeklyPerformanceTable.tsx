'use client';

import { useState, useMemo, useCallback } from 'react';
import type { TVWeeklyPerformanceRow } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact } from '@/lib/utils';

interface TVWeeklyPerformanceTableProps {
  rows: TVWeeklyPerformanceRow[];
}

type SortKey = 'weekKey' | 'broadcastCount' | 'avgAmr' | 'avgTvr' | 'avgAtsSeconds' | 'totalReach';
type SortDir = 'asc' | 'desc';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function TVWeeklyPerformanceTable({ rows }: TVWeeklyPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('weekKey');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      return sortDir === 'desc'
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
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
        <span className="text-accent">{sortDir === 'desc' ? '↓' : '↑'}</span>
      )}
    </button>
  );

  const downloadCsv = useCallback(() => {
    const header = 'Week,Broadcasts,Avg AMR,Avg TVR,Avg ATS (s),Total Reach\n';
    const csvRows = sorted.map((r) =>
      [r.weekLabel, r.broadcastCount, r.avgAmr.toFixed(0), r.avgTvr.toFixed(2), r.avgAtsSeconds.toFixed(0), r.totalReach.toFixed(0)].join(',')
    );
    const csv = header + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tv-weekly-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Weekly Performance</h3>
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
              <th className="text-left py-2 px-2">
                <SortHeader label="Week" field="weekKey" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Broadcasts" field="broadcastCount" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Avg AMR" field="avgAmr" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Avg TVR" field="avgTvr" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Avg ATS" field="avgAtsSeconds" />
              </th>
              <th className="text-right py-2 px-2">
                <SortHeader label="Total Reach" field="totalReach" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.weekKey}
                className="border-b border-border/20 hover:bg-card/50 transition-colors"
              >
                <td className="py-1.5 px-2 text-xs text-foreground font-medium">
                  {row.weekLabel}
                </td>
                <td className="py-1.5 px-2 text-right font-data text-xs text-foreground">
                  {row.broadcastCount}
                </td>
                <td className="py-1.5 px-2 text-right font-data text-xs text-accent">
                  {formatCompact(Math.round(row.avgAmr))}
                </td>
                <td className="py-1.5 px-2 text-right font-data text-xs text-foreground">
                  {row.avgTvr.toFixed(2)}
                </td>
                <td className="py-1.5 px-2 text-right font-data text-xs text-foreground">
                  {formatDuration(row.avgAtsSeconds)}
                </td>
                <td className="py-1.5 px-2 text-right font-data text-xs text-accent">
                  {formatCompact(Math.round(row.totalReach))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
