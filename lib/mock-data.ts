import type {
  PlatformId,
  DailyProfileMetrics,
  PostMetrics,
  PLATFORM_IDS,
} from './types';
import { calculateEMV } from './emv-calculator';

// Seeded random for deterministic mock data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// Base metrics per platform (realistic SA sports media)
const PLATFORM_BASELINES: Record<
  PlatformId,
  {
    followers: number;
    dailyImpressions: number;
    dailyViews: number;
    dailyEngagements: number;
    postsPerDay: number;
    growthRate: number; // monthly follower growth rate
  }
> = {
  youtube: {
    followers: 45000,
    dailyImpressions: 15000,
    dailyViews: 8000,
    dailyEngagements: 520,
    postsPerDay: 0.7,
    growthRate: 0.03,
  },
  instagram: {
    followers: 85000,
    dailyImpressions: 35000,
    dailyViews: 12000,
    dailyEngagements: 1450,
    postsPerDay: 1.5,
    growthRate: 0.04,
  },
  tiktok: {
    followers: 120000,
    dailyImpressions: 50000,
    dailyViews: 25000,
    dailyEngagements: 2800,
    postsPerDay: 1.2,
    growthRate: 0.06,
  },
  x: {
    followers: 35000,
    dailyImpressions: 20000,
    dailyViews: 3000,
    dailyEngagements: 380,
    postsPerDay: 3.0,
    growthRate: 0.02,
  },
  facebook: {
    followers: 60000,
    dailyImpressions: 25000,
    dailyViews: 6000,
    dailyEngagements: 750,
    postsPerDay: 1.0,
    growthRate: 0.015,
  },
};

const MOCK_POST_CONTENT = [
  'PSL highlights: Sundowns dominate in thrilling 3-1 victory',
  'Banter with the Boys: Who deserves the Ballon d\'Or?',
  'Hot Takes: Is Benni McCarthy the greatest SA striker ever?',
  'Behind the Boot: Day in the life of a PSL academy player',
  'Best of Enemies: Chiefs vs Pirates debate gets HEATED',
  'The Big 3 Show: Premier League title race predictions',
  'Match preview: Bafana Bafana vs Nigeria AFCON qualifier',
  'Transfer rumours: Which PSL stars are Europe-bound?',
  'Fan poll: Rate your team\'s transfer window out of 10',
  'Exclusive interview: Rising star talks first professional contract',
  'Tactical breakdown: Why Orlando Pirates\' 3-4-3 is working',
  'Hot Takes: Should VAR be removed from the PSL?',
  'Weekend fixtures preview: All the key PSL matchups',
  'Banter with the Boys: Funniest football moments of the week',
  'Mamelodi Sundowns set new unbeaten record in the PSL',
  'UCL night: SA players performing in European competitions',
  'Women\'s football spotlight: Banyana Banyana squad update',
  'Youth development: SA\'s top 5 under-21 prospects',
  'Coaching carousel: Which PSL clubs need a new manager?',
  'Derby day special: Soweto Derby preview and predictions',
  'Best of Enemies: Premier League top 4 battle royale',
  'Training ground access: Inside a PSL pre-season camp',
  'Fan culture: The loudest stadiums in South African football',
  'Betway Premiership: Matchday 15 results and standings',
  'The Big 3 Show: Champions League quarter-final review',
  'Hot Takes: Is the PSL the best league in Africa?',
  'Transfer deadline day: Last-minute PSL moves and deals',
  'Fitness special: How modern footballers train differently',
  'Banter with the Boys: Fantasy football draft gone wrong',
  'Match reaction: Late drama in Nedbank Cup quarter-final',
];

function generateDailyMetrics(days: number): DailyProfileMetrics[] {
  const rand = seededRandom(42);
  const metrics: DailyProfileMetrics[] = [];
  const today = new Date();
  const platforms: PlatformId[] = ['youtube', 'instagram', 'tiktok', 'x', 'facebook'];

  for (const platform of platforms) {
    const base = PLATFORM_BASELINES[platform];
    let currentFollowers = Math.round(
      base.followers / Math.pow(1 + base.growthRate, days / 30)
    );

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];

      // Day-of-week factor (weekends slightly higher engagement)
      const dow = date.getDay();
      const dowFactor = dow === 0 || dow === 6 ? 1.15 : 1.0;

      // Random variance (0.5 - 1.5)
      const variance = 0.5 + rand() * 1.0;

      // Occasional viral spike (1% chance of 3-5x)
      const spike = rand() < 0.01 ? 3 + rand() * 2 : 1;

      const factor = dowFactor * variance * spike;

      const impressions = Math.round(base.dailyImpressions * factor);
      const videoViews = Math.round(base.dailyViews * factor);
      const engagements = Math.round(base.dailyEngagements * factor);

      // Break engagements into types
      const reactions = Math.round(engagements * 0.55);
      const comments = Math.round(engagements * 0.15);
      const shares = Math.round(engagements * 0.12);
      const saves = Math.round(engagements * 0.08);
      const clicks = engagements - reactions - comments - shares - saves;

      // Follower growth
      const dailyGrowth = Math.round(
        currentFollowers * (base.growthRate / 30) * (0.5 + rand())
      );
      currentFollowers += dailyGrowth;

      // Posts published
      const postsPublished =
        rand() < base.postsPerDay
          ? Math.ceil(base.postsPerDay * (0.5 + rand()))
          : 0;

      metrics.push({
        date: dateStr,
        platform,
        profileId: platforms.indexOf(platform) + 1,
        impressions,
        engagements,
        reactions,
        comments,
        shares,
        saves,
        videoViews,
        clicks,
        followers: currentFollowers,
        followerGrowth: dailyGrowth,
        postsPublished,
      });
    }
  }

  return metrics;
}

function generatePosts(
  dailyMetrics: DailyProfileMetrics[],
  count: number
): PostMetrics[] {
  const rand = seededRandom(99);
  const posts: PostMetrics[] = [];
  const platforms: PlatformId[] = ['youtube', 'instagram', 'tiktok', 'x', 'facebook'];

  for (let i = 0; i < count; i++) {
    const platform = platforms[Math.floor(rand() * platforms.length)];
    const daysAgo = Math.floor(rand() * 365);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const base = PLATFORM_BASELINES[platform];
    const variance = 0.3 + rand() * 2.5;
    const spike = rand() < 0.05 ? 3 + rand() * 5 : 1;
    const factor = variance * spike;

    const impressions = Math.round(base.dailyImpressions * factor * 0.7);
    const videoViews = Math.round(base.dailyViews * factor * 0.8);
    const engagements = Math.round(base.dailyEngagements * factor * 0.6);
    const reactions = Math.round(engagements * 0.55);
    const comments = Math.round(engagements * 0.15);
    const shares = Math.round(engagements * 0.12);
    const saves = Math.round(engagements * 0.08);
    const clicks = Math.max(0, engagements - reactions - comments - shares - saves);

    const content =
      MOCK_POST_CONTENT[Math.floor(rand() * MOCK_POST_CONTENT.length)];

    const emv = calculateEMV(platform, {
      views: videoViews,
      impressions,
      likes: reactions,
      comments,
      shares,
      saves,
      clicks,
    });

    posts.push({
      id: `mock-${platform}-${i}`,
      platform,
      profileId: platforms.indexOf(platform) + 1,
      createdAt: date.toISOString(),
      content,
      permalink: `https://example.com/${platform}/post-${i}`,
      impressions,
      engagements,
      videoViews,
      reactions,
      comments,
      shares,
      saves,
      clicks,
      emv,
    });
  }

  return posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// Cache the generated data so it's consistent within a session
let cachedDaily: DailyProfileMetrics[] | null = null;
let cachedPosts: PostMetrics[] | null = null;

export function getMockDailyMetrics(): DailyProfileMetrics[] {
  if (!cachedDaily) {
    cachedDaily = generateDailyMetrics(365);
  }
  return cachedDaily;
}

export function getMockPosts(): PostMetrics[] {
  if (!cachedPosts) {
    cachedPosts = generatePosts(getMockDailyMetrics(), 250);
  }
  return cachedPosts;
}

export function getMockLastUpdated(): string {
  const now = new Date();
  now.setHours(now.getHours() - 2); // 2 hours ago
  return now.toISOString();
}
