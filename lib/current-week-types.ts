import type { PlatformId, PostMetrics } from './types';

// --- Pace / Status enums ---

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'significantly_behind';
export type DayStatus = 'completed' | 'in_progress' | 'upcoming';
export type VelocityStatus = 'outperforming' | 'normal' | 'underperforming';
export type AlertType = 'viral' | 'posting_gap' | 'engagement_drop' | 'milestone';
export type AlertSeverity = 'positive' | 'negative' | 'neutral' | 'info';

// --- Section 3.1: Live Status Header ---

export interface LiveStatusData {
  weekStart: string;       // YYYY-MM-DD
  weekEnd: string;         // YYYY-MM-DD
  currentDay: number;      // 1-7 (Monday = 1)
  hoursIntoWeek: number;   // 0-168
  lastRefreshed: string | null; // ISO timestamp
  dayStatuses: DayStatus[]; // length 7, one per day Mon-Sun
}

// --- Section 3.2: Pace Metric Cards ---

export interface PaceMetricCard {
  label: string;
  key: string;
  currentTotal: number;
  projectedTotal: number;
  lastWeekFinal: number;
  paceStatus: PaceStatus;
  pacePercentage: number;  // projected vs last week %
  format: 'number' | 'currency' | 'percentage';
}

// --- Section 3.3: Hourly Activity Timeline ---

export interface HourlyDataPoint {
  hourOffset: number;       // 0-167 (hours since Mon 00:00)
  dayLabel: string;         // "Mon", "Tue", etc.
  hourLabel: string;        // "00:00", "01:00", etc.
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  postsCount: number;
  // Cumulative values for area chart
  cumulativeEngagements: number;
  cumulativeViews: number;
  cumulativeImpressions: number;
  cumulativeEmv: number;
  // Last week comparison (cumulative)
  lastWeekCumulativeEngagements: number;
  lastWeekCumulativeViews: number;
  lastWeekCumulativeImpressions: number;
  lastWeekCumulativeEmv: number;
}

// --- Section 3.4: Day-by-Day Breakdown ---

export interface DayBreakdown {
  dayIndex: number;        // 0-6 (Mon=0)
  dayLabel: string;        // "Mon", "Tue", etc.
  date: string;            // YYYY-MM-DD
  status: DayStatus;
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  postsCount: number;
  // vs last week same day
  lastWeekEngagements: number;
  lastWeekViews: number;
  deltaEngagements: number;
  deltaViews: number;
  percentChangeEngagements: number;
  percentChangeViews: number;
}

// --- Section 3.5: Platform Race Chart ---

export interface PlatformRaceEntry {
  platform: PlatformId;
  engagements: number;
  views: number;
  impressions: number;
  postsCount: number;
  emv: number;
  color: string;
}

// --- Section 3.6: Post Log (Live Feed) ---

export interface LivePostEntry {
  id: string;
  platform: PlatformId;
  createdAt: string;
  content: string;          // truncated to 100 chars
  permalink: string;
  engagements: number;
  views: number;
  impressions: number;
  emv: number;
  velocity: VelocityStatus;
  velocityMultiplier: number; // e.g. 2.3x average
}

// --- Section 3.7: EMV Live Counter ---

export interface EmvCounterData {
  currentTotal: number;
  projectedTotal: number;
  lastWeekFinal: number;
  progressPercentage: number;  // current / lastWeekFinal * 100
  breakdown: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    other: number;
  };
}

// --- Section 3.8: Alerts & Notifications ---

export interface TrackerAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  platform?: PlatformId;
}

// --- Alert configuration ---

export interface AlertThresholds {
  viralThresholdMultiplier: number;
  postingGapHours: number;
  engagementDropThreshold: number;
  milestoneThresholds: number[];
  enabled: {
    viral: boolean;
    postingGap: boolean;
    engagementDrop: boolean;
    milestone: boolean;
  };
}

// --- Full API response payload ---

export interface CurrentWeekData {
  liveStatus: LiveStatusData;
  paceCards: PaceMetricCard[];
  hourlyTimeline: HourlyDataPoint[];
  dayBreakdown: DayBreakdown[];
  platformRace: PlatformRaceEntry[];
  postLog: LivePostEntry[];
  emvCounter: EmvCounterData;
  alerts: TrackerAlert[];
}
