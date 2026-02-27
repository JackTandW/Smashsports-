import type { PlatformId } from './types';
import type { DateRange, DateRangePreset } from './show-types';

// Re-export for convenience
export type { DateRange, DateRangePreset };

// --- Config types ---

export interface TalentConfig {
  id: string;
  name: string;
  role: string;              // "Presenter" | "Talent" | "Content Creator"
  colour: string;            // hex color for initials avatar
  accounts: Record<string, string | null>; // platformId → full URL or null
}

export interface TalentConfigFile {
  brandHashtags: string[];
  hashtags_to_track: string[];
  show_hashtags: string[];
  brand_hashtags: string[];
  talent: TalentConfig[];
}

// --- Data types ---

export interface TalentPost {
  id: string;
  talentId: string;
  platform: PlatformId;
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
  emv: number;
  showIds: string[];         // attributed show IDs (computed at query time)
}

// --- Section 5.7: Advocacy Summary Stats ---

export interface TalentAdvocacyStats {
  totalPosts: number;
  activeTalent: number;
  avgPostsPerTalent: number;
  topPlatform: PlatformId | null;
  topPlatformPosts: number;
}

// --- Section 5.1: Leaderboard ---

export interface TalentLeaderboardEntry {
  talentId: string;
  name: string;
  avatarColor: string;
  rank: number;
  totalPosts: number;
  totalEngagements: number;
  totalViews: number;
  emv: number;
  engagementRate: number;    // engagements / impressions
  topPlatform: PlatformId | null;
  deltaPosts: number | null;
  deltaEngagements: number | null;
}

// --- Section 5.2: Activity Grid ---

export interface TalentActivityWeek {
  weekLabel: string;
  weekStart: string;
  posts: number;
  engagements: number;
}

export interface TalentActivityEntry {
  talentId: string;
  name: string;
  avatarColor: string;
  weekData: TalentActivityWeek[];
}

// --- Section 5.3: Show Matrix ---

export interface TalentShowCell {
  showId: string;
  showName: string;
  showColor: string;
  postCount: number;
  engagements: number;
}

export interface TalentShowMatrixEntry {
  talentId: string;
  name: string;
  avatarColor: string;
  shows: TalentShowCell[];
}

// --- Section 5.4: Frequency Chart ---

export interface TalentFrequencyPoint {
  weekLabel: string;
  weekStart: string;
  postsCount: number;
  activeTalent: number;
}

// --- Section 5.5: Engagement Bars ---

export interface TalentEngagementBarEntry {
  talentId: string;
  name: string;
  avatarColor: string;
  avgEngagement: number;
  totalPosts: number;
  topShow: string | null;    // show name
  topShowColor: string | null;
}

// --- Section 5.8: Alerts ---

export type TalentAlertType = 'inactive' | 'declining' | 'rising_star' | 'no_hashtag';
export type TalentAlertSeverity = 'warning' | 'info' | 'success';

export interface TalentAlert {
  type: TalentAlertType;
  talentId: string;
  name: string;
  message: string;
  severity: TalentAlertSeverity;
}

// --- Overview Data (full /api/talent response) ---

export interface TalentOverviewData {
  advocacyStats: TalentAdvocacyStats;
  leaderboard: TalentLeaderboardEntry[];
  activityGrid: TalentActivityEntry[];
  showMatrix: TalentShowMatrixEntry[];
  frequencyChart: TalentFrequencyPoint[];
  engagementBars: TalentEngagementBarEntry[];
  alerts: TalentAlert[];
  dateRange: DateRange;
  totalPosts: number;
  totalTalent: number;
}

// --- Drill-Down types (Section 5.6) ---

export interface TalentHeroCard {
  label: string;
  value: number;
  format: 'number' | 'currency' | 'percentage';
  delta: number | null;
}

export interface TalentPlatformBreakdown {
  platform: PlatformId;
  posts: number;
  engagements: number;
  views: number;
  emv: number;
  color: string;
}

export interface TalentShowBreakdown {
  showId: string;
  showName: string;
  showColor: string;
  posts: number;
  engagements: number;
  emv: number;
}

export interface TalentTimelinePoint {
  weekLabel: string;
  weekStart: string;
  engagements: number;
  posts: number;
  views: number;
}

export interface TalentDrillDownData {
  talent: TalentConfig;
  heroCards: TalentHeroCard[];
  platformBreakdown: TalentPlatformBreakdown[];
  showBreakdown: TalentShowBreakdown[];
  timeline: TalentTimelinePoint[];
  posts: TalentPost[];
  dateRange: DateRange;
  totalPosts: number;
}
