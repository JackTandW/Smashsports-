export type PlatformId = 'youtube' | 'instagram' | 'tiktok' | 'x' | 'facebook';

export const PLATFORM_IDS: PlatformId[] = ['youtube', 'instagram', 'tiktok', 'x', 'facebook'];

// --- Raw / API-level types ---

export interface SproutProfile {
  customer_profile_id: number;
  network_type: string;
  name: string;
  native_name: string;
  native_id: string;
}

export interface DailyProfileMetrics {
  date: string;
  platform: PlatformId;
  profileId: number;
  impressions: number;
  engagements: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  clicks: number;
  followers: number;
  followerGrowth: number;
  postsPublished: number;
}

export interface PostMetrics {
  id: string;
  platform: PlatformId;
  profileId: number;
  createdAt: string;
  content: string;
  permalink: string;
  impressions: number;
  engagements: number;
  videoViews: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  emv: number;
}

// --- Processed / Dashboard-level types ---

export interface AggregateMetrics {
  totalViews: number;
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  totalPosts: number;
  totalFollowers: number;
  emv: number;
}

export interface PlatformMetrics extends AggregateMetrics {
  platform: PlatformId;
  profileName: string;
  profileHandle: string;
  available: boolean;
  topPosts: PostMetrics[];
}

export interface SparklinePoint {
  date: string;
  value: number;
}

export interface GrowthIndicator {
  value: number;
  percentage: number;
  direction: 'up' | 'down' | 'flat';
}

export interface HeroCardData {
  label: string;
  key: string;
  value: number;
  format: 'number' | 'currency' | 'percentage';
  sparkline: SparklinePoint[];
  growth: GrowthIndicator;
}

// --- Chart data types ---

export interface DonutSegment {
  platform: PlatformId;
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface GrowthLinePoint {
  month: string;
  total: number;
  youtube: number;
  instagram: number;
  tiktok: number;
  x: number;
  facebook: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  dayOfWeek: number;
  weekIndex: number;
}

export interface EmvBarSegment {
  platform: PlatformId;
  name: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  other: number;
  total: number;
}

// --- Data quality types ---

export interface AnomalyFlag {
  date: string;
  platform: PlatformId;
  metric: string;
  value: number;
  rollingMean: number;
  rollingStdDev: number;
  deviations: number;
  direction: 'spike' | 'drop';
}

export interface DiscrepancyWarning {
  metric: string;
  aggregateValue: number;
  summedValue: number;
  deviationPercent: number;
}

export interface ZeroValueAlert {
  platform: PlatformId;
  metric: string;
  message: string;
}

export interface DataQualityStatus {
  lastUpdated: string | null;
  freshnessLevel: 'fresh' | 'amber' | 'red';
  anomalies: AnomalyFlag[];
  discrepancies: DiscrepancyWarning[];
  zeroValueAlerts: ZeroValueAlert[];
}

// --- Full dashboard payload ---

export interface DashboardData {
  aggregate: AggregateMetrics;
  heroCards: HeroCardData[];
  platforms: PlatformMetrics[];
  charts: {
    donut: DonutSegment[];
    growth: GrowthLinePoint[];
    heatmap: HeatmapDay[];
    emvBreakdown: EmvBarSegment[];
  };
  topPosts: PostMetrics[];
  dataQuality: DataQualityStatus;
}

// --- Platform config type ---

export interface PlatformConfig {
  name: string;
  color: string;
  colorLight: string;
  handle: string;
  sproutNetworkType: string;
}
