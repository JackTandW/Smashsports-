import type {
  PlatformId,
  DailyProfileMetrics,
  PostMetrics,
  AggregateMetrics,
  PlatformMetrics,
  SparklinePoint,
  GrowthIndicator,
  HeroCardData,
  DonutSegment,
  GrowthLinePoint,
  HeatmapDay,
  EmvBarSegment,
  DashboardData,
  DataQualityStatus,
} from './types';
import { PLATFORM_IDS } from './types';
import { calculateEMV, getEMVBreakdown } from './emv-calculator';
import { detectAnomalies, checkDiscrepancies, detectZeroValues } from './anomaly-detection';
import { getPlatformConfig } from './utils';

function groupByPlatform(
  metrics: DailyProfileMetrics[]
): Record<PlatformId, DailyProfileMetrics[]> {
  const grouped: Partial<Record<PlatformId, DailyProfileMetrics[]>> = {};
  for (const m of metrics) {
    if (!grouped[m.platform]) grouped[m.platform] = [];
    grouped[m.platform]!.push(m);
  }
  return grouped as Record<PlatformId, DailyProfileMetrics[]>;
}

function sumMetric(
  metrics: DailyProfileMetrics[],
  key: keyof DailyProfileMetrics
): number {
  return metrics.reduce((sum, m) => sum + (Number(m[key]) || 0), 0);
}

function latestValue(
  metrics: DailyProfileMetrics[],
  key: keyof DailyProfileMetrics
): number {
  if (metrics.length === 0) return 0;
  const sorted = [...metrics].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return Number(sorted[0][key]) || 0;
}

export function aggregateMetrics(
  dailyMetrics: DailyProfileMetrics[]
): AggregateMetrics {
  const totalViews = sumMetric(dailyMetrics, 'videoViews');
  const totalImpressions = sumMetric(dailyMetrics, 'impressions');
  const totalEngagements = sumMetric(dailyMetrics, 'engagements');
  const totalPosts = sumMetric(dailyMetrics, 'postsPublished');

  const byPlatform = groupByPlatform(dailyMetrics);
  const totalFollowers = PLATFORM_IDS.reduce((sum, p) => {
    const platformMetrics = byPlatform[p] ?? [];
    return sum + latestValue(platformMetrics, 'followers');
  }, 0);

  const emv = PLATFORM_IDS.reduce((sum, platform) => {
    const platformMetrics = byPlatform[platform] ?? [];
    return (
      sum +
      calculateEMV(platform, {
        views: sumMetric(platformMetrics, 'videoViews'),
        impressions: sumMetric(platformMetrics, 'impressions'),
        likes: sumMetric(platformMetrics, 'reactions'),
        comments: sumMetric(platformMetrics, 'comments'),
        shares: sumMetric(platformMetrics, 'shares'),
        saves: sumMetric(platformMetrics, 'saves'),
        clicks: sumMetric(platformMetrics, 'clicks'),
      })
    );
  }, 0);

  const engagementRate =
    totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

  return {
    totalViews,
    totalImpressions,
    totalEngagements,
    engagementRate,
    totalPosts,
    totalFollowers,
    emv,
  };
}

export function getPerPlatformBreakdown(
  dailyMetrics: DailyProfileMetrics[],
  posts: PostMetrics[]
): PlatformMetrics[] {
  const byPlatform = groupByPlatform(dailyMetrics);

  return PLATFORM_IDS.map((platform) => {
    const metrics = byPlatform[platform] ?? [];
    const config = getPlatformConfig(platform);
    const available = metrics.length > 0;

    const totalViews = sumMetric(metrics, 'videoViews');
    const totalImpressions = sumMetric(metrics, 'impressions');
    const totalEngagements = sumMetric(metrics, 'engagements');
    const totalPosts = sumMetric(metrics, 'postsPublished');
    const totalFollowers = latestValue(metrics, 'followers');

    const emv = calculateEMV(platform, {
      views: totalViews,
      impressions: totalImpressions,
      likes: sumMetric(metrics, 'reactions'),
      comments: sumMetric(metrics, 'comments'),
      shares: sumMetric(metrics, 'shares'),
      saves: sumMetric(metrics, 'saves'),
      clicks: sumMetric(metrics, 'clicks'),
    });

    const engagementRate =
      totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    const platformPosts = posts
      .filter((p) => p.platform === platform)
      .sort((a, b) => b.engagements - a.engagements)
      .slice(0, 5);

    return {
      platform,
      profileName: config.name,
      profileHandle: config.handle,
      available,
      totalViews,
      totalImpressions,
      totalEngagements,
      engagementRate,
      totalPosts,
      totalFollowers,
      emv,
      topPosts: platformPosts,
    };
  });
}

export function getSparklineData(
  dailyMetrics: DailyProfileMetrics[],
  metricKey: keyof DailyProfileMetrics,
  days: number
): SparklinePoint[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Aggregate across platforms by date
  const byDate = new Map<string, number>();
  for (const m of dailyMetrics) {
    if (m.date < cutoffStr) continue;
    byDate.set(m.date, (byDate.get(m.date) ?? 0) + (Number(m[metricKey]) || 0));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function get30DayGrowth(
  dailyMetrics: DailyProfileMetrics[],
  metricKey: keyof DailyProfileMetrics
): GrowthIndicator {
  const now = new Date();
  const thirtyAgo = new Date();
  thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const sixtyAgo = new Date();
  sixtyAgo.setDate(sixtyAgo.getDate() - 60);

  const thirtyStr = thirtyAgo.toISOString().split('T')[0];
  const sixtyStr = sixtyAgo.toISOString().split('T')[0];
  const nowStr = now.toISOString().split('T')[0];

  let current = 0;
  let previous = 0;

  for (const m of dailyMetrics) {
    const val = Number(m[metricKey]) || 0;
    if (m.date >= thirtyStr && m.date <= nowStr) current += val;
    if (m.date >= sixtyStr && m.date < thirtyStr) previous += val;
  }

  const diff = current - previous;
  const percentage = previous > 0 ? (diff / previous) * 100 : current > 0 ? 100 : 0;

  return {
    value: diff,
    percentage,
    direction: percentage > 0.5 ? 'up' : percentage < -0.5 ? 'down' : 'flat',
  };
}

export function buildHeroCards(
  aggregate: AggregateMetrics,
  dailyMetrics: DailyProfileMetrics[]
): HeroCardData[] {
  const metrics: {
    label: string;
    key: string;
    value: number;
    format: 'number' | 'currency' | 'percentage';
    metricKey: keyof DailyProfileMetrics;
  }[] = [
    { label: 'Total Views', key: 'views', value: aggregate.totalViews, format: 'number', metricKey: 'videoViews' },
    { label: 'Total Impressions', key: 'impressions', value: aggregate.totalImpressions, format: 'number', metricKey: 'impressions' },
    { label: 'Total Engagements', key: 'engagements', value: aggregate.totalEngagements, format: 'number', metricKey: 'engagements' },
    { label: 'Engagement Rate', key: 'engRate', value: aggregate.engagementRate, format: 'percentage', metricKey: 'engagements' },
    { label: 'Total Posts', key: 'posts', value: aggregate.totalPosts, format: 'number', metricKey: 'postsPublished' },
    { label: 'Total Followers', key: 'followers', value: aggregate.totalFollowers, format: 'number', metricKey: 'followers' },
    { label: 'Earned Media Value', key: 'emv', value: aggregate.emv, format: 'currency', metricKey: 'engagements' },
  ];

  return metrics.map((m) => ({
    label: m.label,
    key: m.key,
    value: m.value,
    format: m.format,
    sparkline: getSparklineData(dailyMetrics, m.metricKey, 90),
    growth: get30DayGrowth(dailyMetrics, m.metricKey),
  }));
}

export function getDonutData(platforms: PlatformMetrics[]): DonutSegment[] {
  const total = platforms.reduce((s, p) => s + p.totalEngagements, 0);
  return platforms
    .filter((p) => p.available)
    .map((p) => ({
      platform: p.platform,
      name: getPlatformConfig(p.platform).name,
      value: p.totalEngagements,
      color: getPlatformConfig(p.platform).color,
      percentage: total > 0 ? (p.totalEngagements / total) * 100 : 0,
    }));
}

export function getGrowthData(
  dailyMetrics: DailyProfileMetrics[]
): GrowthLinePoint[] {
  const byMonth = new Map<string, Record<string, number>>();

  for (const m of dailyMetrics) {
    const month = m.date.substring(0, 7); // YYYY-MM
    if (!byMonth.has(month)) {
      byMonth.set(month, { total: 0, youtube: 0, instagram: 0, tiktok: 0, x: 0, facebook: 0 });
    }
    const entry = byMonth.get(month)!;
    // Use the latest follower count per platform per month
    const currentVal = entry[m.platform] ?? 0;
    if (m.followers > currentVal) {
      entry.total += m.followers - currentVal;
      entry[m.platform] = m.followers;
    }
  }

  // Recalculate total from platform values
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      total: data.youtube + data.instagram + data.tiktok + data.x + data.facebook,
      youtube: data.youtube,
      instagram: data.instagram,
      tiktok: data.tiktok,
      x: data.x,
      facebook: data.facebook,
    }));
}

export function getHeatmapData(posts: PostMetrics[]): HeatmapDay[] {
  const countByDate = new Map<string, number>();
  for (const post of posts) {
    const date = post.createdAt.split('T')[0];
    countByDate.set(date, (countByDate.get(date) ?? 0) + 1);
  }

  // Generate last 365 days
  const days: HeatmapDay[] = [];
  const today = new Date();

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat

    // Calculate week index from start
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    const weekIndex = Math.floor(
      (d.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    days.push({
      date: dateStr,
      count: countByDate.get(dateStr) ?? 0,
      dayOfWeek,
      weekIndex,
    });
  }

  return days;
}

export function getEmvBreakdownData(
  dailyMetrics: DailyProfileMetrics[]
): EmvBarSegment[] {
  const byPlatform = groupByPlatform(dailyMetrics);

  return PLATFORM_IDS.filter((p) => (byPlatform[p]?.length ?? 0) > 0).map(
    (platform) => {
      const metrics = byPlatform[platform] ?? [];
      const breakdown = getEMVBreakdown(platform, {
        views: sumMetric(metrics, 'videoViews'),
        impressions: sumMetric(metrics, 'impressions'),
        likes: sumMetric(metrics, 'reactions'),
        comments: sumMetric(metrics, 'comments'),
        shares: sumMetric(metrics, 'shares'),
        saves: sumMetric(metrics, 'saves'),
        clicks: sumMetric(metrics, 'clicks'),
      });

      return {
        platform,
        name: getPlatformConfig(platform).name,
        ...breakdown,
        total: breakdown.views + breakdown.likes + breakdown.comments + breakdown.shares + breakdown.other,
      };
    }
  );
}

export function getTopPosts(posts: PostMetrics[], limit: number): PostMetrics[] {
  return [...posts].sort((a, b) => b.engagements - a.engagements).slice(0, limit);
}

export function buildDashboardData(
  dailyMetrics: DailyProfileMetrics[],
  posts: PostMetrics[],
  lastUpdated: string | null
): DashboardData {
  const aggregate = aggregateMetrics(dailyMetrics);
  const platforms = getPerPlatformBreakdown(dailyMetrics, posts);
  const heroCards = buildHeroCards(aggregate, dailyMetrics);

  // Data quality
  const anomalies = detectAnomalies(dailyMetrics);
  const discrepancies = checkDiscrepancies(aggregate, platforms);
  const zeroValueAlerts = detectZeroValues(platforms);

  let freshnessLevel: 'fresh' | 'amber' | 'red' = 'fresh';
  if (lastUpdated) {
    const hours =
      (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
    if (hours > 48) freshnessLevel = 'red';
    else if (hours > 26) freshnessLevel = 'amber';
  } else {
    freshnessLevel = 'red';
  }

  return {
    aggregate,
    heroCards,
    platforms,
    charts: {
      donut: getDonutData(platforms),
      growth: getGrowthData(dailyMetrics),
      heatmap: getHeatmapData(posts),
      emvBreakdown: getEmvBreakdownData(dailyMetrics),
    },
    topPosts: getTopPosts(posts, 10),
    dataQuality: {
      lastUpdated,
      freshnessLevel,
      anomalies,
      discrepancies,
      zeroValueAlerts,
    },
  };
}
