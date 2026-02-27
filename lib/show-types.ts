import type { PlatformId, PostMetrics } from './types';

// --- Config types ---

export interface ShowConfig {
  id: string;
  name: string;
  hashtags: string[];
  keywords: string[];
  color: string;
  logoPath: string;
}

export interface ShowsConfigFile {
  shows: ShowConfig[];
}

// --- Date range ---

export type DateRangePreset = '1w' | '4w' | '12w' | 'ytd' | 'all';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// --- Overview types (Section 4.1–4.3, 4.5–4.6) ---

export interface ShowSummary {
  showId: string;
  showName: string;
  color: string;
  logoPath: string;
  totalEngagements: number;
  totalViews: number;
  totalImpressions: number;
  totalPosts: number;
  emvTotal: number;
  engagementRate: number;
  deltaEngagements: number | null; // % change vs previous period
  deltaViews: number | null;
  deltaPosts: number | null;
  deltaEmv: number | null;
}

export interface ShowComparisonEntry {
  showId: string;
  showName: string;
  color: string;
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  posts: number;
}

export interface ShowContributionSegment {
  showId: string;
  showName: string;
  color: string;
  value: number;
  percentage: number;
}

export interface ShowTimelinePoint {
  weekLabel: string; // e.g. "Jan 6"
  weekStart: string; // YYYY-MM-DD
  [showId: string]: number | string; // dynamic keys for each show's metric value
}

export interface HashtagHealthEntry {
  hashtag: string;
  showId: string;
  showName: string;
  showColor: string;
  postCount: number;
  avgEngagement: number;
  totalEngagements: number;
  topPlatform: PlatformId | null;
}

export interface ShowOverviewData {
  summaries: ShowSummary[];
  comparison: ShowComparisonEntry[];
  contribution: ShowContributionSegment[];
  timeline: ShowTimelinePoint[];
  hashtagHealth: HashtagHealthEntry[];
  dateRange: DateRange;
  totalAttributedPosts: number;
  totalUnattributedPosts: number;
}

// --- Drill-down types (Section 4.4) ---

export interface ShowHeroCard {
  label: string;
  value: number;
  format: 'number' | 'currency' | 'percentage';
  delta: number | null; // % change vs previous period
}

export interface ShowPlatformBreakdown {
  platform: PlatformId;
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  posts: number;
  color: string;
}

export interface ShowEngagementBreakdown {
  name: string;
  value: number;
  color: string;
}

export interface ShowTopHashtag {
  hashtag: string;
  postCount: number;
  avgEngagement: number;
}

export interface ShowDrillDownData {
  show: ShowConfig;
  heroCards: ShowHeroCard[];
  platformBreakdown: ShowPlatformBreakdown[];
  engagementBreakdown: ShowEngagementBreakdown[];
  timeline: ShowTimelinePoint[];
  posts: PostMetrics[];
  topHashtags: ShowTopHashtag[];
  dateRange: DateRange;
  totalPosts: number;
}
