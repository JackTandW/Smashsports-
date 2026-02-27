import type { PlatformId, PostMetrics } from './types';

// --- Weekly snapshot row (mirrors DB schema) ---

export interface WeeklySnapshotRow {
  week_start: string;
  week_end: string;
  platform: string; // PlatformId | 'total'
  views: number;
  impressions: number;
  engagements: number;
  engagement_rate: number;
  posts_count: number;
  followers_start: number;
  followers_end: number;
  follower_growth: number;
  emv_total: number;
  emv_views: number;
  emv_likes: number;
  emv_comments: number;
  emv_shares: number;
  emv_other: number;
}

// --- Processed weekly comparison types ---

export interface WeeklyMetrics {
  views: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
  postsCount: number;
  followersStart: number;
  followersEnd: number;
  followerGrowth: number;
  emvTotal: number;
  emvViews: number;
  emvLikes: number;
  emvComments: number;
  emvShares: number;
  emvOther: number;
}

export interface WeeklyDelta {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'flat';
  label: string; // "Strong Growth", "Healthy Growth", "Stable", etc.
}

export interface WeeklyHeroCard {
  metric: string;
  key: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
  percentChange: number;
  direction: 'up' | 'down' | 'flat';
  label: string;
  format: 'number' | 'currency' | 'percentage';
}

export interface WeeklyPlatformRow {
  platform: PlatformId;
  metric: string;
  metricKey: string;
  thisWeek: number;
  lastWeek: number;
  delta: number;
  percentChange: number;
  direction: 'up' | 'down' | 'flat';
  format: 'number' | 'currency' | 'percentage';
  sparkline: { value: number }[];
}

export interface WeeklyEmvBar {
  label: string; // 'This Week' | 'Last Week'
  views: number;
  likes: number;
  comments: number;
  shares: number;
  other: number;
  total: number;
}

export interface WeeklyGrowthPoint {
  weekLabel: string;
  weekStart: string;
  views: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
  emv: number;
}

export interface DayEngagement {
  dayOfWeek: number; // 0=Mon, 6=Sun
  dayLabel: string;
  platform: PlatformId;
  engagements: number;
}

export interface ContentInsight {
  type: 'growth' | 'decline' | 'top_post' | 'anomaly' | 'recommendation';
  icon: string;
  title: string;
  body: string;
  severity: 'positive' | 'negative' | 'neutral' | 'info';
}

export interface EngagementGaugeData {
  currentRate: number;
  previousRate: number;
  fourWeekAverage: number;
  industryBenchmark: number;
  changePoints: number;
}

export interface WeeklyComparisonData {
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;
  isPartialWeek: boolean;
  partialDayCount: number;
  heroCards: WeeklyHeroCard[];
  engagementGauge: EngagementGaugeData;
  emvComparison: {
    thisWeek: WeeklyEmvBar;
    lastWeek: WeeklyEmvBar;
    delta: number;
    percentChange: number;
  };
  platformTable: WeeklyPlatformRow[];
  growthCurve: WeeklyGrowthPoint[];
  dayHeatmap: DayEngagement[];
  topPosts: PostMetrics[];
  insights: ContentInsight[];
  availableWeeks: { weekStart: string; weekEnd: string; label: string }[];
}
