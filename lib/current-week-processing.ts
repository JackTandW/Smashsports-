import type { PlatformId, PostMetrics } from './types';
import { PLATFORM_IDS } from './types';
import { getPlatformColor } from './utils';
import { getEMVBreakdown } from './emv-calculator';
import {
  buildSnapshotFromDailyMetrics,
  getPreviousWeek,
} from './weekly-data-processing';
import type { DailyMetricRow } from './weekly-data-processing';
import type { WeeklySnapshotRow } from './weekly-types';
import type {
  CurrentWeekData,
  LiveStatusData,
  PaceMetricCard,
  PaceStatus,
  HourlyDataPoint,
  DayBreakdown,
  DayStatus,
  PlatformRaceEntry,
  LivePostEntry,
  VelocityStatus,
  EmvCounterData,
  TrackerAlert,
  AlertThresholds,
} from './current-week-types';
import alertConfig from '@/config/alerts.json';

// --- SAST date helpers ---

const SAST_TZ = 'Africa/Johannesburg';

/** Get current time in SAST */
export function getSASTNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SAST_TZ }));
}

/** Get current Mon-Sun week range in SAST */
export function getCurrentWeekRange(): { weekStart: string; weekEnd: string } {
  const now = getSASTNow();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  // Days since Monday: Sun=6, Mon=0, Tue=1, etc.
  const daysSinceMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
  };
}

/** Get hours elapsed since Monday 00:00 SAST */
export function getHoursIntoWeek(): number {
  const now = getSASTNow();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const hours = daysSinceMonday * 24 + now.getHours() + now.getMinutes() / 60;
  return Math.round(hours * 10) / 10; // 1 decimal place
}

/** Get current day number (1=Mon, 7=Sun) */
export function getCurrentDayNumber(): number {
  const now = getSASTNow();
  const day = now.getDay();
  return day === 0 ? 7 : day;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// --- Section 3.1: Live Status ---

export function buildLiveStatus(lastRefreshed: string | null): LiveStatusData {
  const { weekStart, weekEnd } = getCurrentWeekRange();
  const currentDay = getCurrentDayNumber();
  const hoursIntoWeek = getHoursIntoWeek();

  const dayStatuses: DayStatus[] = [];
  for (let i = 1; i <= 7; i++) {
    if (i < currentDay) dayStatuses.push('completed');
    else if (i === currentDay) dayStatuses.push('in_progress');
    else dayStatuses.push('upcoming');
  }

  return {
    weekStart,
    weekEnd,
    currentDay,
    hoursIntoWeek,
    lastRefreshed,
    dayStatuses,
  };
}

// --- Section 3.2: Pace Metric Cards ---

function getPaceStatus(projectedVsLastWeek: number): PaceStatus {
  if (projectedVsLastWeek >= 10) return 'ahead';
  if (projectedVsLastWeek >= -5) return 'on_track';
  if (projectedVsLastWeek >= -20) return 'behind';
  return 'significantly_behind';
}

export function buildPaceMetricCards(
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[]
): PaceMetricCard[] {
  const twTotal = thisWeekRows.find((r) => r.platform === 'total');
  const lwTotal = lastWeekRows.find((r) => r.platform === 'total');

  const hoursElapsed = getHoursIntoWeek();
  const totalHoursInWeek = 168;

  // Avoid divide by zero
  const projectionMultiplier = hoursElapsed > 0 ? totalHoursInWeek / hoursElapsed : 1;

  const metrics: {
    label: string;
    key: string;
    twKey: keyof WeeklySnapshotRow;
    format: 'number' | 'currency' | 'percentage';
  }[] = [
    { label: 'Engagements', key: 'engagements', twKey: 'engagements', format: 'number' },
    { label: 'Views', key: 'views', twKey: 'views', format: 'number' },
    { label: 'Impressions', key: 'impressions', twKey: 'impressions', format: 'number' },
    { label: 'Posts Published', key: 'posts', twKey: 'posts_count', format: 'number' },
    { label: 'EMV', key: 'emv', twKey: 'emv_total', format: 'currency' },
  ];

  return metrics.map((m) => {
    const currentTotal = Number(twTotal?.[m.twKey] ?? 0);
    const lastWeekFinal = Number(lwTotal?.[m.twKey] ?? 0);
    const projectedTotal = Math.round(currentTotal * projectionMultiplier);
    const pacePercentage =
      lastWeekFinal > 0
        ? ((projectedTotal - lastWeekFinal) / lastWeekFinal) * 100
        : projectedTotal > 0
          ? 100
          : 0;

    return {
      label: m.label,
      key: m.key,
      currentTotal,
      projectedTotal,
      lastWeekFinal,
      paceStatus: getPaceStatus(pacePercentage),
      pacePercentage,
      format: m.format,
    };
  });
}

// --- Section 3.3: Hourly Timeline ---

export function buildHourlyTimeline(
  thisWeekPosts: PostMetrics[],
  lastWeekPosts: PostMetrics[],
  thisWeekDailyRows: DailyMetricRow[],
  lastWeekDailyRows: DailyMetricRow[],
  weekStart: string,
  lastWeekStart: string
): HourlyDataPoint[] {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hoursIntoWeek = getHoursIntoWeek();
  const currentHour = Math.floor(hoursIntoWeek);

  // Build hour-by-hour post buckets for this week
  const twPostBuckets = bucketPostsByHour(thisWeekPosts, weekStart);
  const lwPostBuckets = bucketPostsByHour(lastWeekPosts, lastWeekStart);

  // Build daily totals map for this week and last week
  const twDailyMap = buildDailyMap(thisWeekDailyRows);
  const lwDailyMap = buildDailyMap(lastWeekDailyRows);

  const points: HourlyDataPoint[] = [];
  let cumEng = 0, cumViews = 0, cumImp = 0, cumEmv = 0;
  let lwCumEng = 0, lwCumViews = 0, lwCumImp = 0, lwCumEmv = 0;

  for (let h = 0; h <= Math.min(currentHour, 167); h++) {
    const dayIndex = Math.floor(h / 24);
    const hourInDay = h % 24;
    const dayLabel = dayLabels[dayIndex] ?? 'Sun';
    const hourLabel = `${String(hourInDay).padStart(2, '0')}:00`;

    // This week data from post buckets
    const twBucket = twPostBuckets[h] ?? { engagements: 0, views: 0, impressions: 0, emv: 0, count: 0 };
    // Scale hourly values: distribute daily totals across hours proportional to posts
    const dateStr = getDateForDayIndex(weekStart, dayIndex);
    const dailyTotal = twDailyMap[dateStr];

    let engagements = twBucket.engagements;
    let views = twBucket.views;
    let impressions = twBucket.impressions;
    let emv = twBucket.emv;

    // If we have daily totals but few posts, use daily totals distributed evenly
    if (dailyTotal && hourInDay === 23) {
      // Adjust last hour of day to match daily totals
      const dayHourRange = Array.from({ length: 24 }, (_, i) => dayIndex * 24 + i);
      const summedEng = dayHourRange.reduce((s, hh) => s + (twPostBuckets[hh]?.engagements ?? 0), 0);
      if (dailyTotal.engagements > summedEng) {
        engagements += (dailyTotal.engagements - summedEng);
      }
    }

    cumEng += engagements;
    cumViews += views;
    cumImp += impressions;
    cumEmv += emv;

    // Last week comparison
    const lwBucket = lwPostBuckets[h] ?? { engagements: 0, views: 0, impressions: 0, emv: 0, count: 0 };
    lwCumEng += lwBucket.engagements;
    lwCumViews += lwBucket.views;
    lwCumImp += lwBucket.impressions;
    lwCumEmv += lwBucket.emv;

    points.push({
      hourOffset: h,
      dayLabel,
      hourLabel,
      engagements,
      views,
      impressions,
      emv,
      postsCount: twBucket.count,
      cumulativeEngagements: cumEng,
      cumulativeViews: cumViews,
      cumulativeImpressions: cumImp,
      cumulativeEmv: cumEmv,
      lastWeekCumulativeEngagements: lwCumEng,
      lastWeekCumulativeViews: lwCumViews,
      lastWeekCumulativeImpressions: lwCumImp,
      lastWeekCumulativeEmv: lwCumEmv,
    });
  }

  // Fill in last week data beyond current hour (for dashed line)
  for (let h = currentHour + 1; h <= 167; h++) {
    const dayIndex = Math.floor(h / 24);
    const hourInDay = h % 24;
    const dayLabel = dayLabels[dayIndex] ?? 'Sun';
    const hourLabel = `${String(hourInDay).padStart(2, '0')}:00`;

    const lwBucket = lwPostBuckets[h] ?? { engagements: 0, views: 0, impressions: 0, emv: 0, count: 0 };
    lwCumEng += lwBucket.engagements;
    lwCumViews += lwBucket.views;
    lwCumImp += lwBucket.impressions;
    lwCumEmv += lwBucket.emv;

    points.push({
      hourOffset: h,
      dayLabel,
      hourLabel,
      engagements: 0,
      views: 0,
      impressions: 0,
      emv: 0,
      postsCount: 0,
      cumulativeEngagements: 0, // null-like: will be filtered in chart
      cumulativeViews: 0,
      cumulativeImpressions: 0,
      cumulativeEmv: 0,
      lastWeekCumulativeEngagements: lwCumEng,
      lastWeekCumulativeViews: lwCumViews,
      lastWeekCumulativeImpressions: lwCumImp,
      lastWeekCumulativeEmv: lwCumEmv,
    });
  }

  return points;
}

interface HourBucket {
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  count: number;
}

function bucketPostsByHour(
  posts: PostMetrics[],
  weekStartStr: string
): Record<number, HourBucket> {
  const weekStart = new Date(weekStartStr + 'T00:00:00+02:00'); // SAST
  const buckets: Record<number, HourBucket> = {};

  for (const post of posts) {
    const postDate = new Date(post.createdAt);
    const diffMs = postDate.getTime() - weekStart.getTime();
    const hourOffset = Math.floor(diffMs / (1000 * 60 * 60));

    if (hourOffset < 0 || hourOffset > 167) continue;

    if (!buckets[hourOffset]) {
      buckets[hourOffset] = { engagements: 0, views: 0, impressions: 0, emv: 0, count: 0 };
    }

    buckets[hourOffset].engagements += post.engagements;
    buckets[hourOffset].views += post.videoViews;
    buckets[hourOffset].impressions += post.impressions;
    buckets[hourOffset].emv += post.emv;
    buckets[hourOffset].count += 1;
  }

  return buckets;
}

interface DailyTotals {
  engagements: number;
  views: number;
  impressions: number;
}

function buildDailyMap(rows: DailyMetricRow[]): Record<string, DailyTotals> {
  const map: Record<string, DailyTotals> = {};
  for (const row of rows) {
    if (!map[row.date]) {
      map[row.date] = { engagements: 0, views: 0, impressions: 0 };
    }
    map[row.date].engagements += row.engagements;
    map[row.date].views += row.video_views;
    map[row.date].impressions += row.impressions;
  }
  return map;
}

function getDateForDayIndex(weekStart: string, dayIndex: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  return formatDate(d);
}

// --- Section 3.4: Day-by-Day Breakdown ---

export function buildDayBreakdown(
  thisWeekDailyRows: DailyMetricRow[],
  lastWeekDailyRows: DailyMetricRow[],
  thisWeekPosts: PostMetrics[],
  lastWeekPosts: PostMetrics[],
  weekStart: string,
  lastWeekStart: string
): DayBreakdown[] {
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDay = getCurrentDayNumber();

  const days: DayBreakdown[] = [];

  for (let i = 0; i < 7; i++) {
    const dateStr = getDateForDayIndex(weekStart, i);
    const lwDateStr = getDateForDayIndex(lastWeekStart, i);
    const dayNum = i + 1; // 1-7

    // This week data
    const twDayRows = thisWeekDailyRows.filter((r) => r.date === dateStr);
    const engagements = twDayRows.reduce((s, r) => s + r.engagements, 0);
    const views = twDayRows.reduce((s, r) => s + r.video_views, 0);
    const impressions = twDayRows.reduce((s, r) => s + r.impressions, 0);
    const postsCount = thisWeekPosts.filter(
      (p) => p.createdAt.startsWith(dateStr)
    ).length;

    // EMV for the day
    const emv = twDayRows.reduce((s, r) => {
      const breakdown = getEMVBreakdown(r.platform as PlatformId, {
        views: r.video_views,
        impressions: r.impressions,
        likes: r.reactions,
        comments: r.comments,
        shares: r.shares,
        saves: r.saves,
        clicks: r.clicks,
      });
      return s + breakdown.views + breakdown.likes + breakdown.comments + breakdown.shares + breakdown.other;
    }, 0);

    // Last week same day
    const lwDayRows = lastWeekDailyRows.filter((r) => r.date === lwDateStr);
    const lwEngagements = lwDayRows.reduce((s, r) => s + r.engagements, 0);
    const lwViews = lwDayRows.reduce((s, r) => s + r.video_views, 0);

    const deltaEngagements = engagements - lwEngagements;
    const deltaViews = views - lwViews;
    const pctEng = lwEngagements > 0 ? ((engagements - lwEngagements) / lwEngagements) * 100 : engagements > 0 ? 100 : 0;
    const pctViews = lwViews > 0 ? ((views - lwViews) / lwViews) * 100 : views > 0 ? 100 : 0;

    let status: DayStatus;
    if (dayNum < currentDay) status = 'completed';
    else if (dayNum === currentDay) status = 'in_progress';
    else status = 'upcoming';

    days.push({
      dayIndex: i,
      dayLabel: dayLabels[i],
      date: dateStr,
      status,
      engagements,
      views,
      impressions,
      emv,
      postsCount,
      lastWeekEngagements: lwEngagements,
      lastWeekViews: lwViews,
      deltaEngagements,
      deltaViews,
      percentChangeEngagements: pctEng,
      percentChangeViews: pctViews,
    });
  }

  return days;
}

// --- Section 3.5: Platform Race ---

export function buildPlatformRace(
  thisWeekRows: WeeklySnapshotRow[]
): PlatformRaceEntry[] {
  return PLATFORM_IDS
    .map((platform) => {
      const row = thisWeekRows.find((r) => r.platform === platform);
      return {
        platform,
        engagements: row?.engagements ?? 0,
        views: row?.views ?? 0,
        impressions: row?.impressions ?? 0,
        postsCount: row?.posts_count ?? 0,
        emv: row?.emv_total ?? 0,
        color: getPlatformColor(platform),
      };
    })
    .sort((a, b) => b.engagements - a.engagements);
}

// --- Section 3.6: Post Log ---

export function buildPostLog(
  thisWeekPosts: PostMetrics[],
  recentPosts: PostMetrics[] // last 4 weeks for velocity calculation
): LivePostEntry[] {
  // Calculate average engagements per platform from recent history
  const platformAverages: Record<string, number> = {};
  for (const platform of PLATFORM_IDS) {
    const platPosts = recentPosts.filter((p) => p.platform === platform);
    if (platPosts.length > 0) {
      platformAverages[platform] = platPosts.reduce((s, p) => s + p.engagements, 0) / platPosts.length;
    } else {
      platformAverages[platform] = 0;
    }
  }

  return thisWeekPosts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50) // max 50 posts
    .map((post) => {
      const avg = platformAverages[post.platform] || 1;
      const multiplier = post.engagements / avg;

      let velocity: VelocityStatus;
      if (multiplier >= 1.5) velocity = 'outperforming';
      else if (multiplier >= 0.5) velocity = 'normal';
      else velocity = 'underperforming';

      return {
        id: post.id,
        platform: post.platform,
        createdAt: post.createdAt,
        content: post.content.substring(0, 100),
        permalink: post.permalink,
        engagements: post.engagements,
        views: post.videoViews,
        impressions: post.impressions,
        emv: post.emv,
        velocity,
        velocityMultiplier: Math.round(multiplier * 10) / 10,
      };
    });
}

// --- Section 3.7: EMV Counter ---

export function buildEmvCounter(
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[]
): EmvCounterData {
  const twTotal = thisWeekRows.find((r) => r.platform === 'total');
  const lwTotal = lastWeekRows.find((r) => r.platform === 'total');

  const currentTotal = twTotal?.emv_total ?? 0;
  const lastWeekFinal = lwTotal?.emv_total ?? 0;

  const hoursElapsed = getHoursIntoWeek();
  const projectedTotal =
    hoursElapsed > 0 ? Math.round(currentTotal * (168 / hoursElapsed)) : 0;

  const progressPercentage =
    lastWeekFinal > 0 ? (currentTotal / lastWeekFinal) * 100 : currentTotal > 0 ? 100 : 0;

  return {
    currentTotal,
    projectedTotal,
    lastWeekFinal,
    progressPercentage,
    breakdown: {
      views: twTotal?.emv_views ?? 0,
      likes: twTotal?.emv_likes ?? 0,
      comments: twTotal?.emv_comments ?? 0,
      shares: twTotal?.emv_shares ?? 0,
      other: twTotal?.emv_other ?? 0,
    },
  };
}

// --- Section 3.8: Alerts ---

export function generateAlerts(
  thisWeekPosts: PostMetrics[],
  recentPosts: PostMetrics[],
  thisWeekRows: WeeklySnapshotRow[],
  lastWeekRows: WeeklySnapshotRow[]
): TrackerAlert[] {
  const config = alertConfig as AlertThresholds;
  const alerts: TrackerAlert[] = [];

  // 1. Viral post detection
  if (config.enabled.viral) {
    const platformAverages: Record<string, number> = {};
    for (const platform of PLATFORM_IDS) {
      const platPosts = recentPosts.filter((p) => p.platform === platform);
      if (platPosts.length > 0) {
        platformAverages[platform] =
          platPosts.reduce((s, p) => s + p.engagements, 0) / platPosts.length;
      }
    }

    for (const post of thisWeekPosts) {
      const avg = platformAverages[post.platform] || 0;
      if (avg > 0 && post.engagements >= avg * config.viralThresholdMultiplier) {
        alerts.push({
          id: `viral-${post.id}`,
          type: 'viral',
          severity: 'positive',
          title: 'Viral Post Detected',
          message: `A post on ${post.platform} is outperforming the average by ${((post.engagements / avg) * 100 - 100).toFixed(0)}% with ${post.engagements.toLocaleString()} engagements.`,
          timestamp: post.createdAt,
          platform: post.platform,
        });
      }
    }
  }

  // 2. Posting gap detection
  if (config.enabled.postingGap && thisWeekPosts.length > 0) {
    const sorted = [...thisWeekPosts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestPost = sorted[0];
    const now = new Date();
    const hoursSinceLastPost =
      (now.getTime() - new Date(latestPost.createdAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastPost >= config.postingGapHours) {
      alerts.push({
        id: `gap-${Date.now()}`,
        type: 'posting_gap',
        severity: 'neutral',
        title: 'Posting Gap Detected',
        message: `No new posts in the last ${Math.round(hoursSinceLastPost)} hours. The last post was on ${latestPost.platform}.`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 3. Engagement drop detection (vs last week same point)
  if (config.enabled.engagementDrop) {
    const twTotal = thisWeekRows.find((r) => r.platform === 'total');
    const lwTotal = lastWeekRows.find((r) => r.platform === 'total');

    if (twTotal && lwTotal) {
      const hoursElapsed = getHoursIntoWeek();
      // Estimate where last week was at this point
      const lwPaceEstimate = lwTotal.engagements * (hoursElapsed / 168);

      if (lwPaceEstimate > 0) {
        const ratio = twTotal.engagements / lwPaceEstimate;
        if (ratio <= config.engagementDropThreshold) {
          alerts.push({
            id: `drop-${Date.now()}`,
            type: 'engagement_drop',
            severity: 'negative',
            title: 'Engagement Drop',
            message: `Engagements are tracking at ${Math.round(ratio * 100)}% of last week's pace at this point in the week.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 4. Milestone detection
  if (config.enabled.milestone) {
    const twTotal = thisWeekRows.find((r) => r.platform === 'total');
    const lwTotal = lastWeekRows.find((r) => r.platform === 'total');

    if (twTotal && lwTotal) {
      const currentEng = twTotal.engagements;
      const lastEng = lwTotal.engagements;

      for (const threshold of config.milestoneThresholds) {
        if (currentEng >= threshold && lastEng < threshold) {
          alerts.push({
            id: `milestone-${threshold}`,
            type: 'milestone',
            severity: 'positive',
            title: 'Milestone Reached',
            message: `This week surpassed ${threshold.toLocaleString()} total engagements!`,
            timestamp: new Date().toISOString(),
          });
          break; // Only show the highest milestone crossed
        }
      }
    }
  }

  return alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// --- Master assembler ---

export function buildCurrentWeekPayload(
  thisWeekDailyRows: DailyMetricRow[],
  lastWeekDailyRows: DailyMetricRow[],
  thisWeekPosts: PostMetrics[],
  lastWeekPosts: PostMetrics[],
  recentPosts: PostMetrics[],
  lastWeekSnapshotRows: WeeklySnapshotRow[],
  lastRefreshed: string | null
): CurrentWeekData {
  const { weekStart, weekEnd } = getCurrentWeekRange();
  const { weekStart: lastWeekStart } = getPreviousWeek(weekStart);
  const lastWeekEnd = getPreviousWeek(weekStart).weekStart;

  // Build this-week snapshot on-the-fly from daily metrics
  const thisWeekRows = buildSnapshotFromDailyMetrics(
    thisWeekDailyRows,
    weekStart,
    weekEnd
  );

  // Use stored last-week snapshot, or build from daily metrics
  const lastWeekRows =
    lastWeekSnapshotRows.length > 0
      ? lastWeekSnapshotRows
      : buildSnapshotFromDailyMetrics(
          lastWeekDailyRows,
          lastWeekStart,
          getPreviousWeek(weekStart).weekEnd
        );

  return {
    liveStatus: buildLiveStatus(lastRefreshed),
    paceCards: buildPaceMetricCards(thisWeekRows, lastWeekRows),
    hourlyTimeline: buildHourlyTimeline(
      thisWeekPosts,
      lastWeekPosts,
      thisWeekDailyRows,
      lastWeekDailyRows,
      weekStart,
      lastWeekStart
    ),
    dayBreakdown: buildDayBreakdown(
      thisWeekDailyRows,
      lastWeekDailyRows,
      thisWeekPosts,
      lastWeekPosts,
      weekStart,
      lastWeekStart
    ),
    platformRace: buildPlatformRace(thisWeekRows),
    postLog: buildPostLog(thisWeekPosts, recentPosts),
    emvCounter: buildEmvCounter(thisWeekRows, lastWeekRows),
    alerts: generateAlerts(thisWeekPosts, recentPosts, thisWeekRows, lastWeekRows),
  };
}
