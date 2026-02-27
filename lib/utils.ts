import type { PlatformId, PlatformConfig } from './types';
import platformsConfig from '@/config/platforms.json';

// ─── Shared Helpers ──────────────────────────────────────

/**
 * Compute percentage change between two periods.
 * Returns null when no meaningful comparison is possible.
 * Shared by show-data-processing and talent-data-processing.
 */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Get the Monday (ISO week start) for a date string, using SAST (UTC+2).
 * Ensures consistent weekly bucketing for South Africa timezone.
 */
export function getWeekStart(dateStr: string): string {
  // Convert to SAST (UTC+2) by adding 2 hours in ms
  const utcDate = new Date(dateStr);
  const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
  const sastMs = utcDate.getTime() + SAST_OFFSET_MS;
  const d = new Date(sastMs);

  // Use UTC methods on the shifted date to avoid local TZ interference
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date string as a short week label (e.g. "Feb 24").
 */
export function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
}

/**
 * Extract initials from a full name.
 * "Kgotso Molefe" → "KM"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Formatting ──────────────────────────────────────────

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('en-ZA');
}

export function formatCurrency(value: number, precision?: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `R ${(value / 1_000_000).toFixed(precision ?? 1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R ${(value / 1_000).toFixed(precision ?? 1)}K`;
  }
  const decimals = precision ?? (Math.abs(value) < 100 ? 2 : 0);
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatExact(value: number): string {
  return value.toLocaleString('en-ZA');
}

export function formatExactCurrency(value: number): string {
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatGrowth(percentage: number): string {
  if (percentage === 0) return '0.0%';
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

/**
 * Round percentage values so they sum to exactly 100%.
 * Uses the largest-remainder method.
 */
export function roundPercentages(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => 0);

  const percentages = values.map((v) => (v / total) * 100);
  const floored = percentages.map((p) => Math.floor(p * 10) / 10);
  const remainder = 100 - floored.reduce((s, v) => s + v, 0);
  const remainders = percentages.map((p, i) => ({
    index: i,
    diff: p - floored[i],
  }));
  remainders.sort((a, b) => b.diff - a.diff);

  // Distribute remaining 0.1%s
  const steps = Math.round(remainder * 10);
  for (let i = 0; i < steps && i < remainders.length; i++) {
    floored[remainders[i].index] = Math.round((floored[remainders[i].index] + 0.1) * 10) / 10;
  }

  return floored;
}

export function getPlatformConfig(platform: PlatformId): PlatformConfig {
  return (platformsConfig as Record<PlatformId, PlatformConfig>)[platform];
}

export function getPlatformColor(platform: PlatformId): string {
  return getPlatformConfig(platform).color;
}

export function getBenchmarkLabel(
  engagementRate: number
): { label: string; color: string } {
  if (engagementRate >= 5.0) return { label: 'Excellent', color: 'text-positive' };
  if (engagementRate >= 3.0) return { label: 'Strong', color: 'text-positive' };
  if (engagementRate >= 1.5) return { label: 'Average', color: 'text-amber' };
  if (engagementRate >= 0.5) return { label: 'Below Average', color: 'text-amber' };
  return { label: 'Needs Attention', color: 'text-negative' };
}

export function timeAgo(isoDate: string): string {
  const now = new Date();
  const then = new Date(isoDate);
  const diffMs = now.getTime() - then.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
