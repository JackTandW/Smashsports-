import type { PlatformId } from './types';
import type {
  TalentPost,
  TalentOverviewData,
  TalentAdvocacyStats,
  TalentLeaderboardEntry,
  TalentActivityEntry,
  TalentActivityWeek,
  TalentShowMatrixEntry,
  TalentShowCell,
  TalentFrequencyPoint,
  TalentEngagementBarEntry,
  TalentAlert,
  TalentDrillDownData,
  TalentHeroCard,
  TalentPlatformBreakdown,
  TalentShowBreakdown,
  TalentTimelinePoint,
  DateRange,
} from './talent-types';
import { getTalentConfigs, getTalentConfig } from './talent-config';
import { getTalentPostsByTalent, attributeTalentPostToShows } from './talent-attribution';
import { getShowConfigs } from './show-attribution';
import { getPlatformColor, computeDelta, getWeekStart, formatWeekLabel } from './utils';

// ─── C-04: Talent Post Deduplication ──────────────────────────

/**
 * Deduplicate talent posts by content fingerprint.
 * Two posts are considered duplicates if they share the same talentId + platform +
 * normalised content (stripped of whitespace/case). When duplicates exist, the post
 * with the highest engagements is kept.
 */
export function deduplicateTalentPosts(posts: TalentPost[]): TalentPost[] {
  const seen = new Map<string, TalentPost>();
  for (const post of posts) {
    const fingerprint = `${post.talentId}|${post.platform}|${post.content.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    const existing = seen.get(fingerprint);
    if (!existing || post.engagements > existing.engagements) {
      seen.set(fingerprint, post);
    }
  }
  return Array.from(seen.values());
}

// ─── Section 5.7: Advocacy Stats ──────────────────────────

function buildAdvocacyStats(posts: TalentPost[]): TalentAdvocacyStats {
  const talentIds = new Set(posts.map((p) => p.talentId));
  const activeTalent = talentIds.size;
  const totalPosts = posts.length;
  const avgPostsPerTalent = activeTalent > 0 ? Math.round((totalPosts / activeTalent) * 10) / 10 : 0;

  // Top platform
  const platformCounts = new Map<PlatformId, number>();
  for (const post of posts) {
    platformCounts.set(post.platform, (platformCounts.get(post.platform) ?? 0) + 1);
  }
  let topPlatform: PlatformId | null = null;
  let topPlatformPosts = 0;
  for (const [platform, count] of platformCounts) {
    if (count > topPlatformPosts) {
      topPlatform = platform;
      topPlatformPosts = count;
    }
  }

  return { totalPosts, activeTalent, avgPostsPerTalent, topPlatform, topPlatformPosts };
}

// ─── Section 5.1: Leaderboard ──────────────────────────────

function buildTalentLeaderboard(
  posts: TalentPost[],
  previousPosts: TalentPost[]
): TalentLeaderboardEntry[] {
  const configs = getTalentConfigs();
  const currentMap = getTalentPostsByTalent(posts);
  const previousMap = getTalentPostsByTalent(previousPosts);

  const entries: TalentLeaderboardEntry[] = configs.map((t) => {
    const tPosts = currentMap.get(t.id) ?? [];
    const prevPosts = previousMap.get(t.id) ?? [];

    const totalEngagements = tPosts.reduce((s, p) => s + p.engagements, 0);
    const totalViews = tPosts.reduce((s, p) => s + p.videoViews, 0);
    const totalImpressions = tPosts.reduce((s, p) => s + p.impressions, 0);
    const emv = tPosts.reduce((s, p) => s + p.emv, 0);
    const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    const prevEngagements = prevPosts.reduce((s, p) => s + p.engagements, 0);
    const prevPostCount = prevPosts.length;

    // Top platform
    const platCounts = new Map<PlatformId, number>();
    for (const p of tPosts) {
      platCounts.set(p.platform, (platCounts.get(p.platform) ?? 0) + p.engagements);
    }
    let topPlatform: PlatformId | null = null;
    let topVal = 0;
    for (const [plat, val] of platCounts) {
      if (val > topVal) {
        topPlatform = plat;
        topVal = val;
      }
    }

    return {
      talentId: t.id,
      name: t.name,
      avatarColor: t.colour,
      rank: 0,
      totalPosts: tPosts.length,
      totalEngagements,
      totalViews,
      emv: Math.round(emv * 100) / 100,
      engagementRate: Math.round(engagementRate * 100) / 100,
      topPlatform,
      deltaPosts: computeDelta(tPosts.length, prevPostCount),
      deltaEngagements: computeDelta(totalEngagements, prevEngagements),
    };
  });

  // Sort by engagements descending and assign rank
  entries.sort((a, b) => b.totalEngagements - a.totalEngagements);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

// ─── Section 5.2: Activity Grid ──────────────────────────

function buildTalentActivityGrid(
  posts: TalentPost[],
  dateRange: DateRange
): TalentActivityEntry[] {
  const configs = getTalentConfigs();

  // Build week buckets
  const weeks: string[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const current = new Date(getWeekStart(start.toISOString()));

  while (current <= end) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 7);
  }

  // Group posts by talent+week
  const postMap = new Map<string, { posts: number; engagements: number }>();
  for (const post of posts) {
    const ws = getWeekStart(post.createdAt);
    const key = `${post.talentId}:${ws}`;
    const entry = postMap.get(key) ?? { posts: 0, engagements: 0 };
    entry.posts++;
    entry.engagements += post.engagements;
    postMap.set(key, entry);
  }

  return configs.map((t) => ({
    talentId: t.id,
    name: t.name,
    avatarColor: t.colour,
    weekData: weeks.map((ws): TalentActivityWeek => {
      const key = `${t.id}:${ws}`;
      const data = postMap.get(key) ?? { posts: 0, engagements: 0 };
      return {
        weekLabel: formatWeekLabel(ws),
        weekStart: ws,
        posts: data.posts,
        engagements: data.engagements,
      };
    }),
  }));
}

// ─── Section 5.3: Show Matrix ──────────────────────────

function buildTalentShowMatrix(posts: TalentPost[]): TalentShowMatrixEntry[] {
  const configs = getTalentConfigs();
  const showConfigs = getShowConfigs();

  // Build map: talentId → showId → { postCount, engagements }
  const matrixMap = new Map<string, Map<string, { postCount: number; engagements: number }>>();

  for (const post of posts) {
    const showIds = post.showIds;
    for (const showId of showIds) {
      const talentShows = matrixMap.get(post.talentId) ?? new Map();
      const cell = talentShows.get(showId) ?? { postCount: 0, engagements: 0 };
      cell.postCount++;
      cell.engagements += post.engagements;
      talentShows.set(showId, cell);
      matrixMap.set(post.talentId, talentShows);
    }
  }

  return configs.map((t) => {
    const talentShows = matrixMap.get(t.id) ?? new Map();
    return {
      talentId: t.id,
      name: t.name,
      avatarColor: t.colour,
      shows: showConfigs.map((show): TalentShowCell => {
        const cell = talentShows.get(show.id) ?? { postCount: 0, engagements: 0 };
        return {
          showId: show.id,
          showName: show.name,
          showColor: show.color,
          postCount: cell.postCount,
          engagements: cell.engagements,
        };
      }),
    };
  });
}

// ─── Section 5.4: Frequency Chart ──────────────────────────

function buildTalentFrequencyChart(
  posts: TalentPost[],
  dateRange: DateRange
): TalentFrequencyPoint[] {
  const weeks: string[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const current = new Date(getWeekStart(start.toISOString()));

  while (current <= end) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 7);
  }

  // Group posts by week
  const weekMap = new Map<string, { posts: number; talents: Set<string> }>();
  for (const post of posts) {
    const ws = getWeekStart(post.createdAt);
    const entry = weekMap.get(ws) ?? { posts: 0, talents: new Set() };
    entry.posts++;
    entry.talents.add(post.talentId);
    weekMap.set(ws, entry);
  }

  return weeks.map((ws): TalentFrequencyPoint => {
    const data = weekMap.get(ws);
    return {
      weekLabel: formatWeekLabel(ws),
      weekStart: ws,
      postsCount: data?.posts ?? 0,
      activeTalent: data?.talents.size ?? 0,
    };
  });
}

// ─── Section 5.5: Engagement Bars ──────────────────────────

function buildTalentEngagementBars(posts: TalentPost[]): TalentEngagementBarEntry[] {
  const configs = getTalentConfigs();
  const showConfigs = getShowConfigs();
  const talentMap = getTalentPostsByTalent(posts);

  const entries: TalentEngagementBarEntry[] = configs.map((t) => {
    const tPosts = talentMap.get(t.id) ?? [];
    const totalEngagements = tPosts.reduce((s, p) => s + p.engagements, 0);
    const avgEngagement = tPosts.length > 0 ? Math.round(totalEngagements / tPosts.length) : 0;

    // Top show by post count
    const showCounts = new Map<string, number>();
    for (const p of tPosts) {
      for (const showId of p.showIds) {
        showCounts.set(showId, (showCounts.get(showId) ?? 0) + 1);
      }
    }
    let topShowId: string | null = null;
    let topShowCount = 0;
    for (const [showId, count] of showCounts) {
      if (count > topShowCount) {
        topShowId = showId;
        topShowCount = count;
      }
    }

    const topShowConfig = topShowId ? showConfigs.find((s) => s.id === topShowId) : null;

    return {
      talentId: t.id,
      name: t.name,
      avatarColor: t.colour,
      avgEngagement,
      totalPosts: tPosts.length,
      topShow: topShowConfig?.name ?? null,
      topShowColor: topShowConfig?.color ?? null,
    };
  });

  // Sort by avg engagement descending
  entries.sort((a, b) => b.avgEngagement - a.avgEngagement);
  return entries;
}

// ─── Section 5.8: Alerts ──────────────────────────

function buildTalentAlerts(
  posts: TalentPost[],
  previousPosts: TalentPost[]
): TalentAlert[] {
  const configs = getTalentConfigs();
  const alerts: TalentAlert[] = [];

  // 14 days ago threshold for "inactive"
  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString();

  const currentMap = getTalentPostsByTalent(posts);
  const previousMap = getTalentPostsByTalent(previousPosts);

  for (const t of configs) {
    const tPosts = currentMap.get(t.id) ?? [];
    const prevPosts = previousMap.get(t.id) ?? [];

    // Inactive: 0 posts in last 2 weeks
    const recentPosts = tPosts.filter((p) => p.createdAt >= twoWeeksAgoStr);
    if (recentPosts.length === 0) {
      alerts.push({
        type: 'inactive',
        talentId: t.id,
        name: t.name,
        message: `${t.name} hasn't posted in the last 2 weeks`,
        severity: 'warning',
      });
    }

    // Declining: >30% engagement drop
    const currentEng = tPosts.reduce((s, p) => s + p.engagements, 0);
    const prevEng = prevPosts.reduce((s, p) => s + p.engagements, 0);
    if (prevEng > 0) {
      const delta = ((currentEng - prevEng) / prevEng) * 100;
      if (delta < -30) {
        alerts.push({
          type: 'declining',
          talentId: t.id,
          name: t.name,
          message: `${t.name}'s engagement dropped ${Math.abs(Math.round(delta))}% vs previous period`,
          severity: 'warning',
        });
      }

      // Rising star: >50% engagement increase
      if (delta > 50) {
        alerts.push({
          type: 'rising_star',
          talentId: t.id,
          name: t.name,
          message: `${t.name}'s engagement up ${Math.round(delta)}% vs previous period`,
          severity: 'success',
        });
      }
    }

    // No hashtag: posts without show attribution
    const noHashtagPosts = tPosts.filter((p) => p.showIds.length === 0);
    if (noHashtagPosts.length > 0 && tPosts.length > 0) {
      const pct = Math.round((noHashtagPosts.length / tPosts.length) * 100);
      if (pct >= 30) {
        alerts.push({
          type: 'no_hashtag',
          talentId: t.id,
          name: t.name,
          message: `${pct}% of ${t.name}'s posts lack show hashtags (${noHashtagPosts.length}/${tPosts.length})`,
          severity: 'info',
        });
      }
    }
  }

  return alerts;
}

// ─── Master Overview Builder ──────────────────────────

export function buildTalentOverviewPayload(
  rawPosts: TalentPost[],
  rawPreviousPosts: TalentPost[],
  dateRange: DateRange
): TalentOverviewData {
  // C-04: Deduplicate before processing
  const posts = deduplicateTalentPosts(rawPosts);
  const previousPosts = deduplicateTalentPosts(rawPreviousPosts);
  const configs = getTalentConfigs();

  return {
    advocacyStats: buildAdvocacyStats(posts),
    leaderboard: buildTalentLeaderboard(posts, previousPosts),
    activityGrid: buildTalentActivityGrid(posts, dateRange),
    showMatrix: buildTalentShowMatrix(posts),
    frequencyChart: buildTalentFrequencyChart(posts, dateRange),
    engagementBars: buildTalentEngagementBars(posts),
    alerts: buildTalentAlerts(posts, previousPosts),
    dateRange,
    totalPosts: posts.length,
    totalTalent: configs.length,
  };
}

// ─── Drill-Down Builder ──────────────────────────

export function buildTalentDrillDownPayload(
  talentId: string,
  rawAllPosts: TalentPost[],
  rawPreviousPosts: TalentPost[],
  dateRange: DateRange
): TalentDrillDownData | null {
  const config = getTalentConfig(talentId);
  if (!config) return null;

  // C-04: Deduplicate before processing
  const allPosts = deduplicateTalentPosts(rawAllPosts);
  const posts = allPosts.filter((p) => p.talentId === talentId);
  const prevPosts = deduplicateTalentPosts(rawPreviousPosts).filter((p) => p.talentId === talentId);

  // Hero cards
  const totalEngagements = posts.reduce((s, p) => s + p.engagements, 0);
  const totalViews = posts.reduce((s, p) => s + p.videoViews, 0);
  const totalEmv = posts.reduce((s, p) => s + p.emv, 0);
  const prevEngagements = prevPosts.reduce((s, p) => s + p.engagements, 0);
  const prevViews = prevPosts.reduce((s, p) => s + p.videoViews, 0);
  const prevEmv = prevPosts.reduce((s, p) => s + p.emv, 0);

  const heroCards: TalentHeroCard[] = [
    {
      label: 'Total Posts',
      value: posts.length,
      format: 'number',
      delta: computeDelta(posts.length, prevPosts.length),
    },
    {
      label: 'Engagements',
      value: totalEngagements,
      format: 'number',
      delta: computeDelta(totalEngagements, prevEngagements),
    },
    {
      label: 'Views',
      value: totalViews,
      format: 'number',
      delta: computeDelta(totalViews, prevViews),
    },
    {
      label: 'EMV',
      value: Math.round(totalEmv * 100) / 100,
      format: 'currency',
      delta: computeDelta(totalEmv, prevEmv),
    },
  ];

  // Platform breakdown
  const platMap = new Map<PlatformId, { posts: number; engagements: number; views: number; emv: number }>();
  for (const post of posts) {
    const entry = platMap.get(post.platform) ?? { posts: 0, engagements: 0, views: 0, emv: 0 };
    entry.posts++;
    entry.engagements += post.engagements;
    entry.views += post.videoViews;
    entry.emv += post.emv;
    platMap.set(post.platform, entry);
  }
  const platformBreakdown: TalentPlatformBreakdown[] = Array.from(platMap.entries())
    .map(([platform, data]) => ({
      platform,
      posts: data.posts,
      engagements: data.engagements,
      views: data.views,
      emv: Math.round(data.emv * 100) / 100,
      color: getPlatformColor(platform),
    }))
    .sort((a, b) => b.engagements - a.engagements);

  // Show breakdown
  const showMap = new Map<string, { posts: number; engagements: number; emv: number }>();
  const showConfigs = getShowConfigs();
  for (const post of posts) {
    for (const showId of post.showIds) {
      const entry = showMap.get(showId) ?? { posts: 0, engagements: 0, emv: 0 };
      entry.posts++;
      entry.engagements += post.engagements;
      entry.emv += post.emv;
      showMap.set(showId, entry);
    }
  }
  const showBreakdown: TalentShowBreakdown[] = showConfigs
    .map((show) => {
      const data = showMap.get(show.id) ?? { posts: 0, engagements: 0, emv: 0 };
      return {
        showId: show.id,
        showName: show.name,
        showColor: show.color,
        posts: data.posts,
        engagements: data.engagements,
        emv: Math.round(data.emv * 100) / 100,
      };
    })
    .filter((s) => s.posts > 0)
    .sort((a, b) => b.engagements - a.engagements);

  // Timeline
  const weeks: string[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  const current = new Date(getWeekStart(start.toISOString()));
  while (current <= end) {
    weeks.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 7);
  }

  const weekMap = new Map<string, { engagements: number; posts: number; views: number }>();
  for (const post of posts) {
    const ws = getWeekStart(post.createdAt);
    const entry = weekMap.get(ws) ?? { engagements: 0, posts: 0, views: 0 };
    entry.engagements += post.engagements;
    entry.posts++;
    entry.views += post.videoViews;
    weekMap.set(ws, entry);
  }

  const timeline: TalentTimelinePoint[] = weeks.map((ws) => {
    const data = weekMap.get(ws) ?? { engagements: 0, posts: 0, views: 0 };
    return {
      weekLabel: formatWeekLabel(ws),
      weekStart: ws,
      engagements: data.engagements,
      posts: data.posts,
      views: data.views,
    };
  });

  // Sort posts by date descending
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    talent: config,
    heroCards,
    platformBreakdown,
    showBreakdown,
    timeline,
    posts: sortedPosts,
    dateRange,
    totalPosts: posts.length,
  };
}
