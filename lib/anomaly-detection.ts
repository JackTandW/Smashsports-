import type {
  DailyProfileMetrics,
  AggregateMetrics,
  PlatformMetrics,
  AnomalyFlag,
  DiscrepancyWarning,
  ZeroValueAlert,
  PlatformId,
} from './types';
import { PLATFORM_IDS } from './types';
import dashboardConfig from '@/config/dashboard.json';

export function detectAnomalies(
  dailyMetrics: DailyProfileMetrics[],
  windowDays: number = dashboardConfig.anomalyDetection.rollingWindowDays,
  threshold: number = dashboardConfig.anomalyDetection.sigmaThreshold
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const metricsToCheck: (keyof DailyProfileMetrics)[] = [
    'engagements',
    'impressions',
    'videoViews',
  ];

  // Group by platform
  const byPlatform = new Map<PlatformId, DailyProfileMetrics[]>();
  for (const m of dailyMetrics) {
    if (!byPlatform.has(m.platform)) byPlatform.set(m.platform, []);
    byPlatform.get(m.platform)!.push(m);
  }

  for (const [platform, metrics] of byPlatform) {
    const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length < dashboardConfig.anomalyDetection.minimumDataDays) continue;

    for (const metricKey of metricsToCheck) {
      for (let i = windowDays; i < sorted.length; i++) {
        const window = sorted.slice(i - windowDays, i);
        const values = window.map((m) => Number(m[metricKey]) || 0);
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        const variance =
          values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) continue;

        const currentValue = Number(sorted[i][metricKey]) || 0;
        const deviations = (currentValue - mean) / stdDev;

        if (Math.abs(deviations) > threshold) {
          flags.push({
            date: sorted[i].date,
            platform,
            metric: metricKey,
            value: currentValue,
            rollingMean: mean,
            rollingStdDev: stdDev,
            deviations: Math.abs(deviations),
            direction: deviations > 0 ? 'spike' : 'drop',
          });
        }
      }
    }
  }

  return flags;
}

export function checkDiscrepancies(
  aggregate: AggregateMetrics,
  platforms: PlatformMetrics[]
): DiscrepancyWarning[] {
  const warnings: DiscrepancyWarning[] = [];
  const threshold = dashboardConfig.discrepancyThresholdPercent / 100;

  const checks: { metric: string; aggValue: number; sumFn: (p: PlatformMetrics) => number }[] = [
    { metric: 'engagements', aggValue: aggregate.totalEngagements, sumFn: (p) => p.totalEngagements },
    { metric: 'impressions', aggValue: aggregate.totalImpressions, sumFn: (p) => p.totalImpressions },
    { metric: 'views', aggValue: aggregate.totalViews, sumFn: (p) => p.totalViews },
  ];

  for (const { metric, aggValue, sumFn } of checks) {
    const summed = platforms.filter((p) => p.available).reduce((s, p) => s + sumFn(p), 0);
    if (aggValue === 0) continue;
    const deviation = Math.abs(summed - aggValue) / aggValue;
    if (deviation > threshold) {
      warnings.push({
        metric,
        aggregateValue: aggValue,
        summedValue: summed,
        deviationPercent: deviation * 100,
      });
    }
  }

  return warnings;
}

export function detectZeroValues(
  platforms: PlatformMetrics[]
): ZeroValueAlert[] {
  const alerts: ZeroValueAlert[] = [];
  const keyMetrics: { key: keyof PlatformMetrics; label: string }[] = [
    { key: 'totalViews', label: 'Views' },
    { key: 'totalImpressions', label: 'Impressions' },
    { key: 'totalEngagements', label: 'Engagements' },
  ];

  for (const platform of platforms) {
    if (!platform.available) continue;

    for (const { key, label } of keyMetrics) {
      if (platform[key] === 0) {
        alerts.push({
          platform: platform.platform,
          metric: label,
          message: `${label} returned zero for ${platform.profileName} — potential API issue`,
        });
      }
    }
  }

  return alerts;
}
