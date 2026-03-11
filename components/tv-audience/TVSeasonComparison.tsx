'use client';

import type { TVSeasonComparisonGroup, TVSeasonComparisonRow } from '@/lib/tv-audience-types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCompact, formatGrowth } from '@/lib/utils';

interface TVSeasonComparisonProps {
  groups: TVSeasonComparisonGroup[];
}

function formatCellValue(val: number | string | null): string {
  if (val === null) return '—';
  if (typeof val === 'string') return val;
  if (Math.abs(val) >= 1000) return formatCompact(val);
  if (Number.isInteger(val)) return val.toLocaleString('en-ZA');
  return val.toFixed(2);
}

function formatShift(row: TVSeasonComparisonRow): string {
  if (row.shiftYoY === null) return '—';
  switch (row.shiftType) {
    case 'percentage':
      return formatGrowth(row.shiftYoY * 100);
    case 'absolute':
      return formatGrowth(row.shiftYoY);
    case 'date':
      return row.shiftYoY > 0 ? `+${row.shiftYoY}` : `${row.shiftYoY}`;
    default:
      return '—';
  }
}

function shiftColor(row: TVSeasonComparisonRow): string {
  if (row.shiftYoY === null || row.shiftType === 'none') return 'text-muted';
  if (row.shiftYoY > 0) return 'text-positive';
  if (row.shiftYoY < 0) return 'text-negative';
  return 'text-muted';
}

export function TVSeasonComparison({ groups }: TVSeasonComparisonProps) {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Season KPA Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">KPI</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted">Criteria</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted">2024/2025</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted">2025/2026</th>
              <th className="text-right py-2 px-2 text-xs font-medium text-muted">YoY Shift</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows key={group.section} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function GroupRows({ group }: { group: TVSeasonComparisonGroup }) {
  return (
    <>
      {/* Section header row */}
      <tr className="bg-card/50">
        <td
          colSpan={5}
          className="py-2 px-2 text-xs font-semibold text-accent uppercase tracking-wider"
        >
          {group.sectionLabel}
        </td>
      </tr>
      {/* Data rows */}
      {group.rows.map((row, idx) => (
        <tr
          key={`${group.section}-${idx}`}
          className="border-b border-border/20 hover:bg-card/50 transition-colors"
        >
          <td className="py-1.5 px-2 text-xs text-foreground">{row.kpi}</td>
          <td className="py-1.5 px-2 text-xs text-muted">{row.keyCriteria}</td>
          <td className="py-1.5 px-2 text-right font-data text-xs text-foreground">
            {formatCellValue(row.season2024)}
          </td>
          <td className="py-1.5 px-2 text-right font-data text-xs text-accent">
            {formatCellValue(row.season2025)}
          </td>
          <td className={`py-1.5 px-2 text-right font-data text-xs ${shiftColor(row)}`}>
            {formatShift(row)}
          </td>
        </tr>
      ))}
    </>
  );
}
