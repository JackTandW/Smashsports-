import type { PostMetrics, PlatformId } from './types';
import type {
  ShowConfig,
  ShowSummary,
  ShowComparisonEntry,
  ShowContributionSegment,
  ShowTimelinePoint,
  HashtagHealthEntry,
  ShowOverviewData,
  ShowDrillDownData,
  ShowHeroCard,
  ShowPlatformBreakdown,
  ShowEngagementBreakdown,
  ShowTopHashtag,
  DateRange,
} from './show-types';
import {
  getShowConfigs,
  getShowConfig,
  getAttributedPosts,
  countAttributedPosts,
  extractHashtags,
  attributePostToShows,
} from './show-attribution';
import { getPlatformColor, computeDelta, getWeekStart, formatWeekLabel } from './utils';

// ─── Section 4.1: Show Summaries ──────────────────────────

function buildShowSummaries(
  attributedMap: Map<string, PostMetrics[]>,
  previousAttributedMap: Map<string, PostMetrics[]>
): ShowSummary[] {
  const configs = getShowConfigs();

  return configs.map((show) => {
    const posts = attributedMap.get(show.id) ?? [];
    const prevPosts = previousAttributedMap.get(show.id) ?? [];

    const totalEngagements = posts.reduce((s, p) => s + p.engagements, 0);
    const totalViews = posts.reduce((s, p) => s + p.videoViews, 0);
    const totalImpressions = posts.reduce((s, p) => s + p.impressions, 0);
    const emvTotal = posts.reduce((s, p) => s + p.emv, 0);
    const engagementRate =
      totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

    const prevEngagements = prevPosts.reduce((s, p) => s + p.engagements, 0);
    const prevViews = prevPosts.reduce((s, p) => s + p.videoViews, 0);
    const prevEmv = prevPosts.reduce((s, p) => s + p.emv, 0);

    return {
      showId: show.id,
      showName: show.name,
      color: show.color,
      logoPath: show.logoPath,
      totalEngagements,
      totalViews,
      totalImpressions,
      totalPosts: posts.length,
      emvTotal,
      engagementRate,
      deltaEngagements: computeDelta(totalEngagements, prevEngagements),
      deltaViews: computeDelta(totalViews, prevViews),
      deltaPosts: computeDelta(posts.length, prevPosts.length),
      deltaEmv: computeDelta(emvTotal, prevEmv),
    };
  });
}

// ─── Section 4.2: Show Comparison ─────────────────────────

function buildShowComparison(
  attributedMap: Map<string, PostMetrics[]>
): ShowComparisonEntry[] {
  const configs = getShowConfigs();

  return configs
    .map((show) => {
      const posts = attributedMap.get(show.id) ?? [];
      return {
        showId: show.id,
        showName: show.name,
        color: show.color,
        engagements: posts.reduce((s, p) => s + p.engagements, 0),
        views: posts.reduce((s, p) => s + p.videoViews, 0),
        impressions: posts.reduce((s, p) => s + p.impressions, 0),
        emv: posts.reduce((s, p) => s + p.emv, 0),
        posts: posts.length,
      };
    })
    .sort((a, b) => b.engagements - a.engagements);
}

// ─── Section 4.3: Show Contribution Donut ─────────────────

function buildShowContribution(
  attributedMap: Map<string, PostMetrics[]>
): ShowContributionSegment[] {
  const configs = getShowConfigs();

  const entries = configs.map((show) => {
    const posts = attributedMap.get(show.id) ?? [];
    return {
      showId: show.id,
      showName: show.name,
      color: show.color,
      value: posts.reduce((s, p) => s + p.engagements, 0),
      percentage: 0,
    };
  });

  const total = entries.reduce((s, e) => s + e.value, 0);
  for (const entry of entries) {
    entry.percentage = total > 0 ? (entry.value / total) * 100 : 0;
  }

  return entries.sort((a, b) => b.value - a.value);
}

// ─── Section 4.5: Show Timeline (weekly) ──────────────────

function buildShowTimeline(
  attributedMap: Map<string, PostMetrics[]>
): ShowTimelinePoint[] {
  const configs = getShowConfigs();

  // Collect all unique week starts
  const weekMap = new Map<string, Map<string, number>>();

  for (const show of configs) {
    const posts = attributedMap.get(show.id) ?? [];
    for (const post of posts) {
      const ws = getWeekStart(post.createdAt);
      if (!weekMap.has(ws)) {
        weekMap.set(ws, new Map());
      }
      const showMetrics = weekMap.get(ws)!;
      showMetrics.set(show.id, (showMetrics.get(show.id) ?? 0) + post.engagements);
    }
  }

  // Sort weeks chronologically
  const sortedWeeks = Array.from(weekMap.keys()).sort();

  return sortedWeeks.map((ws) => {
    const showMetrics = weekMap.get(ws)!;
    const point: ShowTimelinePoint = {
      weekLabel: formatWeekLabel(ws),
      weekStart: ws,
    };
    for (const show of configs) {
      point[show.id] = showMetrics.get(show.id) ?? 0;
    }
    return point;
  });
}

// ─── Section 4.6: Hashtag Health Check ────────────────────

function buildHashtagHealth(
  posts: PostMetrics[]
): HashtagHealthEntry[] {
  const configs = getShowConfigs();

  // Build a map of hashtag → show for known hashtags
  const hashtagShowMap = new Map<string, ShowConfig>();
  for (const show of configs) {
    for (const tag of show.hashtags) {
      hashtagShowMap.set(`#${tag}`, show);
    }
  }

  // Aggregate per hashtag
  const hashtagStats = new Map<
    string,
    {
      count: number;
      totalEngagements: number;
      platformCounts: Map<PlatformId, number>;
      showId: string;
      showName: string;
      showColor: string;
    }
  >();

  for (const post of posts) {
    const hashtags = extractHashtags(post.content);
    for (const tag of hashtags) {
      const show = hashtagShowMap.get(tag);
      if (!show) continue; // Only track show-related hashtags

      if (!hashtagStats.has(tag)) {
        hashtagStats.set(tag, {
          count: 0,
          totalEngagements: 0,
          platformCounts: new Map(),
          showId: show.id,
          showName: show.name,
          showColor: show.color,
        });
      }

      const stats = hashtagStats.get(tag)!;
      stats.count++;
      stats.totalEngagements += post.engagements;
      stats.platformCounts.set(
        post.platform,
        (stats.platformCounts.get(post.platform) ?? 0) + 1
      );
    }
  }

  return Array.from(hashtagStats.entries())
    .map(([hashtag, stats]) => {
      // Find top platform
      let topPlatform: PlatformId | null = null;
      let topCount = 0;
      for (const [platform, count] of stats.platformCounts) {
        if (count > topCount) {
          topCount = count;
          topPlatform = platform;
        }
      }

      return {
        hashtag,
        showId: stats.showId,
        showName: stats.showName,
        showColor: stats.showColor,
        postCount: stats.count,
        avgEngagement: stats.count > 0 ? Math.round(stats.totalEngagements / stats.count) : 0,
        totalEngagements: stats.totalEngagements,
        topPlatform,
      };
    })
    .sort((a, b) => b.postCount - a.postCount);
}

// ─── Master Assembler: Overview ───────────────────────────

export function buildShowOverviewPayload(
  posts: PostMetrics[],
  previousPosts: PostMetrics[],
  dateRange: DateRange
): ShowOverviewData {
  const attributedMap = getAttributedPosts(posts);
  const previousAttributedMap = getAttributedPosts(previousPosts);
  const { attributed, unattributed } = countAttributedPosts(posts);

  return {
    summaries: buildShowSummaries(attributedMap, previousAttributedMap),
    comparison: buildShowComparison(attributedMap),
    contribution: buildShowContribution(attributedMap),
    timeline: buildShowTimeline(attributedMap),
    hashtagHealth: buildHashtagHealth(posts),
    dateRange,
    totalAttributedPosts: attributed,
    totalUnattributedPosts: unattributed,
  };
}

// ─── Drill-Down: Single Show ──────────────────────────────

function buildDrillDownHeroCards(
  posts: PostMetrics[],
  previousPosts: PostMetrics[]
): ShowHeroCard[] {
  const totalEngagements = posts.reduce((s, p) => s + p.engagements, 0);
  const totalViews = posts.reduce((s, p) => s + p.videoViews, 0);
  const emvTotal = posts.reduce((s, p) => s + p.emv, 0);

  const prevEngagements = previousPosts.reduce((s, p) => s + p.engagements, 0);
  const prevViews = previousPosts.reduce((s, p) => s + p.videoViews, 0);
  const prevEmv = previousPosts.reduce((s, p) => s + p.emv, 0);

  return [
    {
      label: 'Total Engagements',
      value: totalEngagements,
      format: 'number',
      delta: computeDelta(totalEngagements, prevEngagements),
    },
    {
      label: 'Total Views',
      value: totalViews,
      format: 'number',
      delta: computeDelta(totalViews, prevViews),
    },
    {
      label: 'Posts',
      value: posts.length,
      format: 'number',
      delta: computeDelta(posts.length, previousPosts.length),
    },
    {
      label: 'EMV',
      value: emvTotal,
      format: 'currency',
      delta: computeDelta(emvTotal, prevEmv),
    },
  ];
}

function buildPlatformBreakdown(
  posts: PostMetrics[]
): ShowPlatformBreakdown[] {
  const platformMap = new Map<PlatformId, ShowPlatformBreakdown>();

  for (const post of posts) {
    if (!platformMap.has(post.platform)) {
      platformMap.set(post.platform, {
        platform: post.platform,
        engagements: 0,
        views: 0,
        impressions: 0,
        emv: 0,
        posts: 0,
        color: getPlatformColor(post.platform),
      });
    }
    const entry = platformMap.get(post.platform)!;
    entry.engagements += post.engagements;
    entry.views += post.videoViews;
    entry.impressions += post.impressions;
    entry.emv += post.emv;
    entry.posts++;
  }

  return Array.from(platformMap.values()).sort(
    (a, b) => b.engagements - a.engagements
  );
}

function buildEngagementBreakdown(
  posts: PostMetrics[]
): ShowEngagementBreakdown[] {
  let reactions = 0;
  let comments = 0;
  let shares = 0;
  let saves = 0;
  let clicks = 0;

  for (const post of posts) {
    reactions += post.reactions;
    comments += post.comments;
    shares += post.shares;
    saves += post.saves;
    clicks += post.clicks;
  }

  return [
    { name: 'Reactions', value: reactions, color: '#00D4FF' },
    { name: 'Comments', value: comments, color: '#7B2FF7' },
    { name: 'Shares', value: shares, color: '#00FF88' },
    { name: 'Saves', value: saves, color: '#FFB800' },
    { name: 'Clicks', value: clicks, color: '#FF3366' },
  ].filter((e) => e.value > 0);
}

function buildSingleShowTimeline(
  posts: PostMetrics[],
  showId: string
): ShowTimelinePoint[] {
  const weekMap = new Map<string, number>();

  for (const post of posts) {
    const ws = getWeekStart(post.createdAt);
    weekMap.set(ws, (weekMap.get(ws) ?? 0) + post.engagements);
  }

  const sortedWeeks = Array.from(weekMap.keys()).sort();

  return sortedWeeks.map((ws) => ({
    weekLabel: formatWeekLabel(ws),
    weekStart: ws,
    [showId]: weekMap.get(ws) ?? 0,
  }));
}

function buildTopHashtags(posts: PostMetrics[]): ShowTopHashtag[] {
  const tagStats = new Map<string, { count: number; totalEngagements: number }>();

  for (const post of posts) {
    const hashtags = extractHashtags(post.content);
    for (const tag of hashtags) {
      if (!tagStats.has(tag)) {
        tagStats.set(tag, { count: 0, totalEngagements: 0 });
      }
      const stats = tagStats.get(tag)!;
      stats.count++;
      stats.totalEngagements += post.engagements;
    }
  }

  return Array.from(tagStats.entries())
    .map(([hashtag, stats]) => ({
      hashtag,
      postCount: stats.count,
      avgEngagement: stats.count > 0 ? Math.round(stats.totalEngagements / stats.count) : 0,
    }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 20);
}

export function buildShowDrillDownPayload(
  showId: string,
  allPosts: PostMetrics[],
  allPreviousPosts: PostMetrics[],
  dateRange: DateRange
): ShowDrillDownData | null {
  const show = getShowConfig(showId);
  if (!show) return null;

  // Filter posts attributed to this show
  const posts = allPosts.filter((p) => attributePostToShows(p.content).includes(showId));
  const previousPosts = allPreviousPosts.filter((p) =>
    attributePostToShows(p.content).includes(showId)
  );

  return {
    show,
    heroCards: buildDrillDownHeroCards(posts, previousPosts),
    platformBreakdown: buildPlatformBreakdown(posts),
    engagementBreakdown: buildEngagementBreakdown(posts),
    timeline: buildSingleShowTimeline(posts, showId),
    posts: posts.sort((a, b) => b.engagements - a.engagements),
    topHashtags: buildTopHashtags(posts),
    dateRange,
    totalPosts: posts.length,
  };
}
