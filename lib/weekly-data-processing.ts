import type { PlatformId, PostMetrics } from './types';
import { PLATFORM_IDS } from './types';
import { getPlatformConfig } from './utils';
import { calculateEMV, getEMVBreakdown } from './emv-calculator';
import type {
  WeeklySnapshotRow,
  WeeklyMetrics,
  WeeklyHeroCard,
  WeeklyPlatformRow,
  WeeklyEmvBar,
  WeeklyGrowthPoint,
  WeeklyComparisonData,
  DayEngagement,
  EngagementGaugeData,
  ContentInsight,
} from './weekly-types';
import insightTemplates from '@/config/insight-templates.json';

// --- Date helpers (SAST-aware) ---

/** Get the most recent completed Monday-Sunday week in SAST */
export function getLastCompletedWeek(referenceDate?: Date): {
  weekStart: string;
  weekEnd: string;
} {
  const now = referenceDate ?? new Date();
  // Convert to SAST (UTC+2)
  const sast = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const day = sast.getDay(); // 0=Sun, 1=Mon...

  // If today is Monday, last completed week ended yesterday (Sunday)
  // Otherwise, go back to last Sunday
  const daysToLastSunday = day === 0 ? 7 : day;
  const lastSunday = new Date(sast);
  lastSunday.setDate(sast.getDate() - daysToLastSunday);

  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);

  return {
    weekStart: formatDateStr(lastMonday),
    weekEnd: formatDateStr(lastSunday),
  };
}

/** Get the week before a given week */
export function getPreviousWeek(weekStart: string): {
  weekStart: string;
  weekEnd: string;
} {
  const d = new Date(weekStart);
  d.setDate(d.getDate() - 7);
  const prevStart = formatDateStr(d);
  d.setDate(d.getDate() + 6);
  const prevEnd = formatDateStr(d);
  return { weekStart: prevStart, weekEnd: prevEnd };
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return d.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Get the current Monday-Sunday week in SAST (may be partial) */
export function getCurrentWeek(referenceDate?: Date): {
  weekStart: string;
  weekEnd: string;
} {
  const now = referenceDate ?? new Date();
  const sast = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const day = sast.getDay(); // 0=Sun, 1=Mon...

  // Calculate days back to Monday
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(sast);
  monday.setDate(sast.getDate() - daysToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: formatDateStr(monday),
    weekEnd: formatDateStr(sunday),
  };
}

// --- Check if we're mid-week (partial data) ---
export function checkPartialWeek(): { isPartial: boolean; dayCount: number } {
  const now = new Date();
  const sast = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const day = sast.getDay();
  // Sunday = 0, Monday = 1, etc.
  if (day === 0) {
    // It's Sunday — the current week ends today
    return { isPartial: false, dayCount: 7 };
  }
  // Mon=1 means 1 day into the week, Sat=6 means 6 days
  return { isPartial: true, dayCount: day };
}

// --- Snapshot to WeeklyMetrics conversion ---

function snapshotToMetrics(row: WeeklySnapshotRow): WeeklyMetrics {
  return {
    views: row.views,
    impressions: row.impressions,
    engagements: row.engagements,
    engagementRate: row.engagement_rate,
    postsCount: row.posts_count,
    followersStart: row.followers_start,
    followersEnd: row.followers_end,
    followerGrowth: row.follower_growth,
    emvTotal: row.emv_total,
    emvViews: row.emv_views,
    emvLikes: row.emv_likes,
    emvComments: row.emv_comments,
    emvShares: row.emv_shares,
    emvOther: row.emv_other,
  };
}

// --- Growth label thresholds ---

function getGrowthLabel(percentage: number): string {
  if (percentage > 20) return 'Strong Growth \uD83D\uDD25';
  if (percentage >= 5) return 'Healthy Growth';
  if (percentage >= 0) return 'Stable';
  if (percentage >= -5) return 'Slight Decline';
  return 'Needs Attention';
}

function getDirection(percentage: number): 'up' | 'down' | 'flat' {
  if (percentage > 0.5) return 'up';
  if (percentage < -0.5) return 'down';
  return 'flat';
}

function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// --- Hero cards ---

export function buildWeeklyHeroCards(
  thisWeek: WeeklyMetrics | null,
  lastWeek: WeeklyMetrics | null
): WeeklyHeroCard[] {
  const tw = thisWeek ?? emptyMetrics();
  const lw = lastWeek ?? emptyMetrics();

  const cards: { metric: string; key: string; twVal: number; lwVal: number; format: 'number' | 'currency' | 'percentage' }[] = [
    { metric: 'Views', key: 'views', twVal: tw.views, lwVal: lw.views, format: 'number' },
    { metric: 'Impressions', key: 'impressions', twVal: tw.impressions, lwVal: lw.impressions, format: 'number' },
    { metric: 'Engagements', key: 'engagements', twVal: tw.engagements, lwVal: lw.engagements, format: 'number' },
    { metric: 'Posts Published', key: 'posts', twVal: tw.postsCount, lwVal: lw.postsCount, format: 'number' },
    { metric: 'Follower Growth', key: 'followerGrowth', twVal: tw.followerGrowth, lwVal: lw.followerGrowth, format: 'number' },
  ];

  return cards.map((c) => {
    const pct = calcPercentChange(c.twVal, c.lwVal);
    return {
      metric: c.metric,
      key: c.key,
      thisWeek: c.twVal,
      lastWeek: c.lwVal,
      delta: c.twVal - c.lwVal,
      percentChange: pct,
      direction: getDirection(pct),
      label: getGrowthLabel(pct),
      format: c.format,
    };
  });
}

// --- Engagement gauge ---

export function buildEngagementGauge(
  thisWeekTotal: WeeklyMetrics | null,
  lastWeekTotal: WeeklyMetrics | null,
  recentWeeks: WeeklySnapshotRow[]
): EngagementGaugeData {
  const current = thisWeekTotal?.engagementRate ?? 0;
  const previous = lastWeekTotal?.engagementRate ?? 0;

  // Calculate 4-week rolling average from total rows
  const totalRows = recentWeeks
    .filter((r) => r.platform === 'total')
    .slice(0, 4);
  const fourWeekAvg =
    totalRows.length > 0
      ? totalRows.reduce((sum, r) => sum + r.engagement_rate, 0) / totalRows.length
      : current;

  return {
    currentRate: current,
    previousRate: previous,
    fourWeekAverage: fourWeekAvg,
    industryBenchmark: 3.5,
    changePoints: current - previous,
  };
}

// --- EMV comparison ---

export function buildEmvComparison(
  thisWeekTotal: WeeklyMetrics | null,
  lastWeekTotal: WeeklyMetrics | null
) {
  const tw = thisWeekTotal ?? emptyMetrics();
  const lw = lastWeekTotal ?? emptyMetrics();

  return {
    thisWeek: {
      label: 'This Week',
      views: tw.emvViews,
      likes: tw.emvLikes,
      comments: tw.emvComments,
      shares: tw.emvShares,
      other: tw.emvOther,
      total: tw.emvTotal,
    } as WeeklyEmvBar,
    lastWeek: {
      label: 'Last Week',
      views: lw.emvViews,
      likes: lw.emvLikes,
      comments: lw.emvComments,
      shares: lw.emvShares,
      other: lw.emvOther,
      total: lw.emvTotal,
    } as WeeklyEmvBar,
    delta: tw.emvTotal - lw.emvTotal,
    percentChange: calcPercentChange(tw.emvTotal, lw.emvTotal),
  };
}

// --- Per-platform table ---

export function buildPlatformTable(
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[],
  recentWeeks: WeeklySnapshotRow[]
): WeeklyPlatformRow[] {
  const rows: WeeklyPlatformRow[] = [];

  for (const platform of PLATFORM_IDS) {
    const tw = thisWeekRows.find((r) => r.platform === platform);
    const lw = lastWeekRows.find((r) => r.platform === platform);
    const twm = tw ? snapshotToMetrics(tw) : null;
    const lwm = lw ? snapshotToMetrics(lw) : null;

    // Collect historical values for sparklines
    const platformHistory = recentWeeks
      .filter((r) => r.platform === platform)
      .reverse(); // oldest first

    const metricDefs: { metric: string; key: string; twVal: number; lwVal: number; historyKey: keyof WeeklySnapshotRow; format: 'number' | 'currency' | 'percentage' }[] = [
      { metric: 'Views', key: 'views', twVal: twm?.views ?? 0, lwVal: lwm?.views ?? 0, historyKey: 'views', format: 'number' },
      { metric: 'Engagements', key: 'engagements', twVal: twm?.engagements ?? 0, lwVal: lwm?.engagements ?? 0, historyKey: 'engagements', format: 'number' },
      { metric: 'Eng. Rate', key: 'engagementRate', twVal: twm?.engagementRate ?? 0, lwVal: lwm?.engagementRate ?? 0, historyKey: 'engagement_rate', format: 'percentage' },
      { metric: 'Posts', key: 'posts', twVal: twm?.postsCount ?? 0, lwVal: lwm?.postsCount ?? 0, historyKey: 'posts_count', format: 'number' },
      { metric: 'EMV', key: 'emv', twVal: twm?.emvTotal ?? 0, lwVal: lwm?.emvTotal ?? 0, historyKey: 'emv_total', format: 'currency' },
    ];

    for (const def of metricDefs) {
      const pct = calcPercentChange(def.twVal, def.lwVal);
      const sparkline = platformHistory.map((r) => ({
        value: Number(r[def.historyKey]) || 0,
      }));

      rows.push({
        platform,
        metric: def.metric,
        metricKey: def.key,
        thisWeek: def.twVal,
        lastWeek: def.lwVal,
        delta: def.twVal - def.lwVal,
        percentChange: pct,
        direction: getDirection(pct),
        format: def.format,
        sparkline,
      });
    }
  }

  return rows;
}

// --- Growth curve (12 weeks) ---

export function buildGrowthCurve(
  recentWeeks: WeeklySnapshotRow[]
): WeeklyGrowthPoint[] {
  // Get total rows, sorted oldest first
  const totalRows = recentWeeks
    .filter((r) => r.platform === 'total')
    .reverse()
    .slice(-12);

  return totalRows.map((r, i) => ({
    weekLabel: `W${i + 1}`,
    weekStart: r.week_start,
    views: r.views,
    impressions: r.impressions,
    engagements: r.engagements,
    engagementRate: r.engagement_rate,
    emv: r.emv_total,
  }));
}

// --- Day-of-week heatmap from posts ---

export function buildDayHeatmap(posts: PostMetrics[]): DayEngagement[] {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const results: DayEngagement[] = [];

  for (const platform of PLATFORM_IDS) {
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const platformPosts = posts.filter((p) => {
        if (p.platform !== platform) return false;
        const d = new Date(p.createdAt);
        // Convert JS day (0=Sun) to our day (0=Mon)
        const jsDay = d.getDay();
        const ourDay = jsDay === 0 ? 6 : jsDay - 1;
        return ourDay === dayOfWeek;
      });

      const totalEngagements = platformPosts.reduce(
        (sum, p) => sum + p.engagements,
        0
      );

      results.push({
        dayOfWeek,
        dayLabel: dayLabels[dayOfWeek],
        platform,
        engagements: totalEngagements,
      });
    }
  }

  return results;
}

// --- Analyst Insights ---

type TemplateMap = Record<string, string>;

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}

export function generateInsights(
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[],
  topPosts: PostMetrics[],
  recentWeeks: WeeklySnapshotRow[]
): ContentInsight[] {
  const insights: ContentInsight[] = [];
  const templates = insightTemplates as Record<string, TemplateMap>;

  // 1. Find biggest growth metric per platform
  let biggestGrowth = { platform: '' as PlatformId, metric: '', pct: -Infinity, twVal: 0, lwVal: 0 };
  let biggestDecline = { platform: '' as PlatformId, metric: '', pct: Infinity, twVal: 0, lwVal: 0 };

  for (const platform of PLATFORM_IDS) {
    const tw = thisWeekRows.find((r) => r.platform === platform);
    const lw = lastWeekRows.find((r) => r.platform === platform);
    if (!tw || !lw) continue;

    const checks: { metric: string; twVal: number; lwVal: number }[] = [
      { metric: 'engagement', twVal: tw.engagements, lwVal: lw.engagements },
      { metric: 'views', twVal: tw.views, lwVal: lw.views },
      { metric: 'impressions', twVal: tw.impressions, lwVal: lw.impressions },
    ];

    for (const check of checks) {
      const pct = calcPercentChange(check.twVal, check.lwVal);
      if (pct > biggestGrowth.pct) {
        biggestGrowth = { platform, metric: check.metric, pct, twVal: check.twVal, lwVal: check.lwVal };
      }
      if (pct < biggestDecline.pct) {
        biggestDecline = { platform, metric: check.metric, pct, twVal: check.twVal, lwVal: check.lwVal };
      }
    }
  }

  // Biggest growth insight
  if (biggestGrowth.pct > 0 && biggestGrowth.platform) {
    const platName = getPlatformConfig(biggestGrowth.platform).name;
    insights.push({
      type: 'growth',
      icon: '\uD83D\uDCC8',
      title: 'Biggest Growth',
      body: fillTemplate(
        templates.growth?.biggest ?? '{platform} {metric} grew {percentage}% week-on-week.',
        {
          platform: platName,
          metric: biggestGrowth.metric,
          percentage: biggestGrowth.pct.toFixed(1),
        }
      ),
      severity: 'positive',
    });
  }

  // Biggest decline insight
  if (biggestDecline.pct < 0 && biggestDecline.platform) {
    const platName = getPlatformConfig(biggestDecline.platform).name;
    const twPosts = thisWeekRows.find((r) => r.platform === biggestDecline.platform)?.posts_count ?? 0;
    const lwPosts = lastWeekRows.find((r) => r.platform === biggestDecline.platform)?.posts_count ?? 0;
    const postContext = twPosts < lwPosts
      ? ` Posting frequency dropped from ${lwPosts} to ${twPosts} posts.`
      : '';

    insights.push({
      type: 'decline',
      icon: '\uD83D\uDCC9',
      title: 'Biggest Decline',
      body: fillTemplate(
        templates.decline?.biggest ?? '{platform} {metric} dropped {percentage}% week-on-week.{context}',
        {
          platform: platName,
          metric: biggestDecline.metric,
          percentage: Math.abs(biggestDecline.pct).toFixed(1),
          context: postContext,
        }
      ),
      severity: 'negative',
    });
  }

  // Top post insight
  if (topPosts.length > 0) {
    const best = topPosts[0];
    const platName = getPlatformConfig(best.platform).name;
    const preview = best.content.substring(0, 60);
    insights.push({
      type: 'top_post',
      icon: '\u2B50',
      title: 'Top Performer',
      body: fillTemplate(
        templates.topPost?.best ?? 'The top post was on {platform} with {engagements} engagements: "{preview}..."',
        {
          platform: platName,
          engagements: best.engagements.toLocaleString('en-ZA'),
          preview,
        }
      ),
      severity: 'positive',
    });
  }

  // Anomaly detection: check if any platform metric deviates >2 std from 4-week average
  for (const platform of PLATFORM_IDS) {
    const history = recentWeeks
      .filter((r) => r.platform === platform)
      .slice(0, 4);

    if (history.length < 3) continue;

    const tw = thisWeekRows.find((r) => r.platform === platform);
    if (!tw) continue;

    const engValues = history.map((r) => r.engagements);
    const mean = engValues.reduce((s, v) => s + v, 0) / engValues.length;
    const variance = engValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / engValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0 && Math.abs(tw.engagements - mean) > 2 * stdDev) {
      const platName = getPlatformConfig(platform).name;
      const direction = tw.engagements > mean ? 'spike' : 'drop';
      const deviations = ((tw.engagements - mean) / stdDev).toFixed(1);
      insights.push({
        type: 'anomaly',
        icon: '\u26A0\uFE0F',
        title: `${platName} Anomaly`,
        body: fillTemplate(
          templates.anomaly?.detected ?? '{platform} engagements show an unusual {direction} ({deviations}\u03C3 from 4-week average).',
          { platform: platName, direction, deviations: Math.abs(Number(deviations)).toFixed(1) }
        ),
        severity: 'neutral',
      });
    }
  }

  // Recommendation
  // Find the platform with lowest engagement rate that has decent volume
  const activeThisWeek = thisWeekRows
    .filter((r) => r.platform !== 'total' && r.engagements > 0)
    .sort((a, b) => a.engagement_rate - b.engagement_rate);

  if (activeThisWeek.length > 0) {
    const weakest = activeThisWeek[0];
    const platName = getPlatformConfig(weakest.platform as PlatformId).name;

    // Find best performing platform
    const strongest = [...activeThisWeek].sort(
      (a, b) => b.engagement_rate - a.engagement_rate
    )[0];
    const strongName = getPlatformConfig(strongest.platform as PlatformId).name;

    insights.push({
      type: 'recommendation',
      icon: '\uD83D\uDCA1',
      title: 'Recommendation',
      body: fillTemplate(
        templates.recommendation?.engagement ??
          'Consider adapting {strongPlatform} content strategies for {weakPlatform}, which has the lowest engagement rate at {rate}%.',
        {
          strongPlatform: strongName,
          weakPlatform: platName,
          rate: weakest.engagement_rate.toFixed(2),
        }
      ),
      severity: 'info',
    });
  }

  return insights;
}

// --- Build snapshot from daily_metrics if weekly_snapshots is empty ---

export interface DailyMetricRow {
  date: string;
  platform: string;
  impressions: number;
  engagements: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  video_views: number;
  clicks: number;
  followers: number;
  follower_growth: number;
  posts_published: number;
}

export function buildSnapshotFromDailyMetrics(
  dailyRows: DailyMetricRow[],
  weekStart: string,
  weekEnd: string
): WeeklySnapshotRow[] {
  const results: WeeklySnapshotRow[] = [];
  const totals: WeeklyMetrics = emptyMetrics();

  for (const platform of PLATFORM_IDS) {
    const platformRows = dailyRows.filter(
      (r) => r.platform === platform && r.date >= weekStart && r.date <= weekEnd
    );

    if (platformRows.length === 0) {
      results.push({
        week_start: weekStart,
        week_end: weekEnd,
        platform,
        views: 0,
        impressions: 0,
        engagements: 0,
        engagement_rate: 0,
        posts_count: 0,
        followers_start: 0,
        followers_end: 0,
        follower_growth: 0,
        emv_total: 0,
        emv_views: 0,
        emv_likes: 0,
        emv_comments: 0,
        emv_shares: 0,
        emv_other: 0,
      });
      continue;
    }

    const views = platformRows.reduce((s, r) => s + r.video_views, 0);
    const impressions = platformRows.reduce((s, r) => s + r.impressions, 0);
    const engagements = platformRows.reduce((s, r) => s + r.engagements, 0);
    const reactions = platformRows.reduce((s, r) => s + r.reactions, 0);
    const comments = platformRows.reduce((s, r) => s + r.comments, 0);
    const shares = platformRows.reduce((s, r) => s + r.shares, 0);
    const saves = platformRows.reduce((s, r) => s + r.saves, 0);
    const clicks = platformRows.reduce((s, r) => s + r.clicks, 0);
    const postsCount = platformRows.reduce((s, r) => s + r.posts_published, 0);
    const followerGrowth = platformRows.reduce((s, r) => s + r.follower_growth, 0);

    // Get first and last day followers
    const sorted = [...platformRows].sort((a, b) => a.date.localeCompare(b.date));
    const followersStart = sorted[0].followers;
    const followersEnd = sorted[sorted.length - 1].followers;

    const engRate = impressions > 0 ? (engagements / impressions) * 100 : 0;

    // Calculate EMV
    const emvBreakdown = getEMVBreakdown(platform, {
      views,
      impressions,
      likes: reactions,
      comments,
      shares,
      saves,
      clicks,
    });
    const emvTotal = emvBreakdown.views + emvBreakdown.likes + emvBreakdown.comments + emvBreakdown.shares + emvBreakdown.other;

    const row: WeeklySnapshotRow = {
      week_start: weekStart,
      week_end: weekEnd,
      platform,
      views,
      impressions,
      engagements,
      engagement_rate: engRate,
      posts_count: postsCount,
      followers_start: followersStart,
      followers_end: followersEnd,
      follower_growth: followerGrowth,
      emv_total: emvTotal,
      emv_views: emvBreakdown.views,
      emv_likes: emvBreakdown.likes,
      emv_comments: emvBreakdown.comments,
      emv_shares: emvBreakdown.shares,
      emv_other: emvBreakdown.other,
    };

    results.push(row);

    // Accumulate totals
    totals.views += views;
    totals.impressions += impressions;
    totals.engagements += engagements;
    totals.postsCount += postsCount;
    totals.followerGrowth += followerGrowth;
    totals.followersStart += followersStart;
    totals.followersEnd += followersEnd;
    totals.emvTotal += emvTotal;
    totals.emvViews += emvBreakdown.views;
    totals.emvLikes += emvBreakdown.likes;
    totals.emvComments += emvBreakdown.comments;
    totals.emvShares += emvBreakdown.shares;
    totals.emvOther += emvBreakdown.other;
  }

  // Add total row
  totals.engagementRate =
    totals.impressions > 0
      ? (totals.engagements / totals.impressions) * 100
      : 0;

  results.push({
    week_start: weekStart,
    week_end: weekEnd,
    platform: 'total',
    views: totals.views,
    impressions: totals.impressions,
    engagements: totals.engagements,
    engagement_rate: totals.engagementRate,
    posts_count: totals.postsCount,
    followers_start: totals.followersStart,
    followers_end: totals.followersEnd,
    follower_growth: totals.followerGrowth,
    emv_total: totals.emvTotal,
    emv_views: totals.emvViews,
    emv_likes: totals.emvLikes,
    emv_comments: totals.emvComments,
    emv_shares: totals.emvShares,
    emv_other: totals.emvOther,
  });

  return results;
}

// --- Assemble full comparison payload ---

export function buildWeeklyComparison(
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[],
  recentWeeks: WeeklySnapshotRow[],
  topPosts: PostMetrics[],
  thisWeekStart: string,
  thisWeekEnd: string,
  lastWeekStart: string,
  lastWeekEnd: string,
  availableWeeks: { weekStart: string; weekEnd: string; label: string }[],
  isPartialWeek: boolean,
  partialDayCount: number
): WeeklyComparisonData {
  const twTotal = thisWeekRows.find((r) => r.platform === 'total') ?? null;
  const lwTotal = lastWeekRows.find((r) => r.platform === 'total') ?? null;
  const twMetrics = twTotal ? snapshotToMetrics(twTotal) : null;
  const lwMetrics = lwTotal ? snapshotToMetrics(lwTotal) : null;

  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
    isPartialWeek,
    partialDayCount,
    heroCards: buildWeeklyHeroCards(twMetrics, lwMetrics),
    engagementGauge: buildEngagementGauge(twMetrics, lwMetrics, recentWeeks),
    emvComparison: buildEmvComparison(twMetrics, lwMetrics),
    platformTable: buildPlatformTable(thisWeekRows, lastWeekRows, recentWeeks),
    growthCurve: buildGrowthCurve(recentWeeks),
    dayHeatmap: buildDayHeatmap(topPosts),
    topPosts: topPosts.sort((a, b) => b.engagements - a.engagements).slice(0, 5),
    insights: generateInsights(thisWeekRows, lastWeekRows, topPosts, recentWeeks),
    availableWeeks,
  };
}

function emptyMetrics(): WeeklyMetrics {
  return {
    views: 0,
    impressions: 0,
    engagements: 0,
    engagementRate: 0,
    postsCount: 0,
    followersStart: 0,
    followersEnd: 0,
    followerGrowth: 0,
    emvTotal: 0,
    emvViews: 0,
    emvLikes: 0,
    emvComments: 0,
    emvShares: 0,
    emvOther: 0,
  };
}
