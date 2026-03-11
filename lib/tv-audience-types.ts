// --- TV Audience Data Types ---
// Used by scripts/parse-tv-audience.ts and future TV dashboard components.

// ─── Metadata ─────────────────────────────────────────────

export interface TVSeason {
  label: string;        // "2024/2025" or "2025/2026"
  startDate: string;    // ISO date YYYY-MM-DD
  endDate: string;      // ISO date YYYY-MM-DD
}

export interface TVAudienceMetadata {
  sourceFile: string;
  parsedAt: string;           // ISO 8601 timestamp
  weekNumber: number;         // extracted from report title
  showName: string;           // "Betway Premiership Preview Show"
  ageGroup: string;           // e.g. "All 4+"
  seasons: TVSeason[];
}

// ─── Key Stats (Report-Key Stats sheet) ───────────────────

export interface TVKeyStatsBreakdown {
  section: string;                    // e.g. "Broadcast_details", "Unique_audience"
  keyCriteria: string;                // e.g. "Date", "Premier", "All"
  seasonKpi: string;                  // e.g. "Start date", "Total Unique Audience"
  season2024: number | string | null;
  season2025: number | string | null;
  shiftYoY: number | null;
}

export interface TVKeyStats {
  totalUniqueAudience: number;
  increaseFromPreviousWeek: number;       // decimal, e.g. 0.092
  totalNewViewersPast7Days: number;
  peakAudienceSingleBroadcast: number;
  peakAudienceDateTime: string;           // e.g. "2025-11-29 - 13:59"
  breakdowns: TVKeyStatsBreakdown[];
}

// ─── Episode Table ────────────────────────────────────────

export interface TVEpisodeRow {
  episodeNumber: number;
  label: string;                          // "Ep. 1", "Ep. 2", etc.
  season2024Audience: number | null;
  season2025Audience: number | null;
  season2024Scaled: number | null;        // in thousands
  season2025Scaled: number | null;        // in thousands
}

export interface TVEpisodeTable {
  episodes: TVEpisodeRow[];
}

// ─── TV Items (broadcast transactions) ────────────────────

export interface TVBroadcastItem {
  description: string;
  customGroup: string;
  channel: string;
  date: string;                   // ISO date YYYY-MM-DD
  startTime: string;              // HH:MM:SS
  endTime: string;                // HH:MM:SS
  durationSeconds: number;
  amr: number;                    // Average Minute Rating
  peakAmr: number;                // Peak AMR [1 Minute]
  tsushrPercent: number;          // Time Slot Universe Share %
  aveDailyReach: number;          // Ave. Daily RCH
  atsSeconds: number;             // Average Time Spent (seconds)
  loyaltyPercent: number;         // Loyalty % [>=75%]
  cost: number;
  tvr: number;                    // Television Rating
  sample: number;
  universe: number;
  season: string;                 // "2024/2025" or "2025/2026"
  txType: string;                 // "Premier" or "Repeat"
  consumption: number;
  dstvService: string;            // DStv package tier
  hours: number;
  episodeId: string;
  sequenceId: string;
  sequenceIdDedup: string;
  channelService: string;
  dateTimeLabel: string;          // e.g. "2024-10-24 - 19:29"
}

export interface TVItemsSummary {
  totalBroadcasts: number;
  uniqueChannels: string[];
  dateRange: { start: string; end: string };
  byTxType: { premier: number; repeat: number };
  bySeason: Record<string, number>;
  byChannel: Record<string, number>;
}

export interface TVItemsData {
  items: TVBroadcastItem[];
  summary: TVItemsSummary;
}

// ─── Reach Build ──────────────────────────────────────────

export interface TVReachBuildRow {
  cumeCounter: number;
  date: string;                   // ISO date YYYY-MM-DD
  startTime: string;              // HH:MM:SS
  endTime: string;                // HH:MM:SS
  durationSeconds: number;
  description: string;
  channel: string;
  customGroup: string;
  reach: number;                  // RCH [Cons. - TH: 5min.]
  reachPercent: number;           // RCH %
  amr: number;
  effReach2Plus: number;          // EFF RCH [2+]
  season: string;
  competition: string;
  broadcastPlatform: string;
  broadcastStatus: string;
  absoluteUnique: number;
  year: number;
  isoWeek: number;
}

export interface TVReachBuildSummary {
  totalRows: number;
  finalCumulativeReach: number;
  finalEffReach: number;
  dateRange: { start: string; end: string };
}

export interface TVReachBuildSheet {
  sheetName: string;              // e.g. "Reachbuild_all_all"
  variant: string;                // e.g. "all_all", "all_premier", "all_repeat"
  rows: TVReachBuildRow[];
  summary: TVReachBuildSummary;
}

// ─── KPA View (KPI summary) ──────────────────────────────

export interface TVKpaRow {
  section: string;
  keyCriteria: string;
  seasonKpi: string;
  season2024: number | string | null;
  season2025: number | string | null;
  shiftYoY: number | null;
}

export interface TVKpaData {
  rows: TVKpaRow[];
  bySections: Record<string, TVKpaRow[]>;
}

// ─── Top-Level Output ─────────────────────────────────────

export interface TVAudienceData {
  metadata: TVAudienceMetadata;
  keyStats: TVKeyStats;
  episodeTable: TVEpisodeTable;
  tvItems: TVItemsData;
  reachBuild: TVReachBuildSheet[];
  kpa: TVKpaData;
}

// ─── Processed Dashboard Payload ─────────────────────────

export interface TVAudiencePayload {
  metadata: TVAudienceMetadata;
  heroCards: TVHeroCard[];
  seasonComparison: TVSeasonComparisonGroup[];
  episodeChart: TVEpisodeChartPoint[];
  reachChart: TVReachChartData;
  weeklyPerformance: TVWeeklyPerformanceRow[];
  channelDonut: TVDonutSegment[];
  tierDonut: TVDonutSegment[];
  premierRepeat: TVPremierRepeatData;
}

export interface TVHeroCard {
  key: string;
  label: string;
  value: number;
  format: 'number' | 'percentage';
  subtitle?: string;
  sparkline?: number[];
}

export interface TVSeasonComparisonGroup {
  section: string;
  sectionLabel: string;
  rows: TVSeasonComparisonRow[];
}

export interface TVSeasonComparisonRow {
  kpi: string;
  keyCriteria: string;
  season2024: number | string | null;
  season2025: number | string | null;
  shiftYoY: number | null;
  shiftType: 'percentage' | 'absolute' | 'date' | 'none';
}

export interface TVEpisodeChartPoint {
  label: string;
  season2024: number;
  season2025: number;
}

export interface TVReachChartData {
  variants: { key: string; label: string }[];
  seriesByVariant: Record<string, TVReachPoint[]>;
}

export interface TVReachPoint {
  date: string;
  dateLabel: string;
  reach: number;
  amr: number;
}

export interface TVWeeklyPerformanceRow {
  weekKey: string;
  weekLabel: string;
  broadcastCount: number;
  avgAmr: number;
  maxAmr: number;
  avgTvr: number;
  avgAtsSeconds: number;
  totalReach: number;
}

export interface TVDonutSegment {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface TVPremierRepeatData {
  metrics: TVPremierRepeatMetric[];
}

export interface TVPremierRepeatMetric {
  label: string;
  premier: number;
  repeat: number;
  format: 'number' | 'compact';
}
