import type {
  TVAudienceData,
  TVAudiencePayload,
  TVHeroCard,
  TVSeasonComparisonGroup,
  TVSeasonComparisonRow,
  TVEpisodeChartPoint,
  TVReachChartData,
  TVReachPoint,
  TVWeeklyPerformanceRow,
  TVDonutSegment,
  TVPremierRepeatData,
  TVBroadcastItem,
  TVKeyStats,
  TVItemsSummary,
  TVEpisodeTable,
  TVReachBuildSheet,
  TVKpaData,
  TVKpaRow,
} from './tv-audience-types';

// ─── Master Build ────────────────────────────────────────

export function buildTVAudiencePayload(raw: TVAudienceData): TVAudiencePayload {
  // Build weekly performance first — hero cards need it for sparklines
  const weeklyPerformance = buildWeeklyPerformance(raw.tvItems.items);

  return {
    metadata: raw.metadata,
    heroCards: buildHeroCards(raw.keyStats, raw.tvItems.summary, raw.tvItems.items, weeklyPerformance),
    episodeChart: buildEpisodeChartData(raw.episodeTable),
    weeklyPerformance,
    channelDonut: buildChannelDonut(raw.tvItems.items),
    tierDonut: buildTierDonut(raw.tvItems.items),
    premierRepeat: buildPremierRepeatBreakdown(raw.tvItems.items),
  };
}

// ─── A. Hero Cards ───────────────────────────────────────

function buildSparklineFromWeeks(
  weeks: TVWeeklyPerformanceRow[],
  extractor: (w: TVWeeklyPerformanceRow) => number,
  count = 10,
): number[] {
  // weeks are sorted descending (most recent first) — reverse for chronological sparkline
  const recent = weeks.slice(0, count).reverse();
  return recent.map(extractor);
}

function buildHeroCards(
  keyStats: TVKeyStats,
  summary: TVItemsSummary,
  items: TVBroadcastItem[],
  weeklyPerformance: TVWeeklyPerformanceRow[],
): TVHeroCard[] {
  // Total consumption hours for current season (2025/2026)
  const currentSeasonItems = items.filter((i) => i.season === '2025/2026');
  const totalConsumptionHours = currentSeasonItems.reduce((s, i) => s + i.consumption, 0);

  return [
    {
      key: 'uniqueAudience',
      label: 'Total Unique Audience',
      value: keyStats.totalUniqueAudience,
      format: 'number',
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.totalReach),
    },
    {
      key: 'consumptionHours',
      label: 'Consumption Hours',
      value: totalConsumptionHours,
      format: 'number',
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.totalConsumption),
    },
    {
      key: 'wowIncrease',
      label: 'Week-on-Week Increase',
      value: keyStats.increaseFromPreviousWeek * 100,
      format: 'percentage',
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.totalReach),
    },
    {
      key: 'newViewers',
      label: 'New Viewers (7 Days)',
      value: keyStats.totalNewViewersPast7Days,
      format: 'number',
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.totalReach),
    },
    {
      key: 'peakAudience',
      label: 'Peak Audience',
      value: keyStats.peakAudienceSingleBroadcast,
      format: 'number',
      subtitle: keyStats.peakAudienceDateTime,
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.maxAmr),
    },
    {
      key: 'totalBroadcasts',
      label: 'Total Broadcasts',
      value: summary.totalBroadcasts,
      format: 'number',
      sparkline: buildSparklineFromWeeks(weeklyPerformance, (w) => w.broadcastCount),
    },
  ];
}

// ─── B. Season Comparison ────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  Broadcast_details: 'Broadcast Details',
  Unique_audience: 'Unique Audience',
  Consumption: 'Consumption',
  Broadcast_count: 'Broadcast Count',
  Broadcast_SoV: 'Share of Voice',
};

const SECTION_ORDER = [
  'Broadcast_details',
  'Unique_audience',
  'Consumption',
  'Broadcast_count',
  'Broadcast_SoV',
];

function detectShiftType(row: TVKpaRow): TVSeasonComparisonRow['shiftType'] {
  if (row.shiftYoY === null) return 'none';
  // Check if season values look like date strings
  if (typeof row.season2024 === 'string' && /\d{4}/.test(row.season2024)) return 'date';
  if (typeof row.season2025 === 'string' && /\d{4}/.test(row.season2025)) return 'date';
  // Heuristic: small shift + large numbers → percentage
  if (
    row.shiftYoY !== null &&
    Math.abs(row.shiftYoY) < 1 &&
    typeof row.season2024 === 'number' &&
    typeof row.season2025 === 'number' &&
    (row.season2024 > 100 || row.season2025 > 100)
  ) {
    return 'percentage';
  }
  return 'absolute';
}

function buildSeasonComparison(kpa: TVKpaData): TVSeasonComparisonGroup[] {
  return SECTION_ORDER
    .filter((section) => kpa.bySections[section])
    .map((section) => {
      const rows = kpa.bySections[section]
        .filter((r) => !(r.season2024 === null && r.season2025 === null && r.keyCriteria === ''))
        .map((r): TVSeasonComparisonRow => ({
          kpi: r.seasonKpi,
          keyCriteria: r.keyCriteria,
          season2024: r.season2024,
          season2025: r.season2025,
          shiftYoY: r.shiftYoY,
          shiftType: detectShiftType(r),
        }));

      return {
        section,
        sectionLabel: SECTION_LABELS[section] || section,
        rows,
      };
    })
    .filter((g) => g.rows.length > 0);
}

// ─── C. Episode Chart ────────────────────────────────────

function buildEpisodeChartData(episodeTable: TVEpisodeTable): TVEpisodeChartPoint[] {
  return episodeTable.episodes
    .filter((ep) => {
      // Filter out episodes where both seasons are 0/null
      const v2024 = ep.season2024Audience ?? 0;
      const v2025 = ep.season2025Audience ?? 0;
      return v2024 > 0 || v2025 > 0;
    })
    .map((ep) => ({
      label: ep.label,
      season2024: ep.season2024Audience ?? 0,
      season2025: ep.season2025Audience ?? 0,
    }));
}

// ─── D. Reach Chart ──────────────────────────────────────

const VARIANT_LABELS: Record<string, string> = {
  all_all: 'All Broadcasts',
  all_premier: 'Premier Only',
  all_repeat: 'Repeats Only',
  all_KC: 'Kaizer Chiefs',
  all_OP: 'Orlando Pirates',
  all_MS: 'Mamelodi Sundowns',
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}

function buildReachChartData(reachBuild: TVReachBuildSheet[]): TVReachChartData {
  // Filter out duplicates (sheets containing "(2)")
  const unique = reachBuild.filter((rb) => !rb.sheetName.includes('(2)'));

  const variants = unique
    .filter((rb) => VARIANT_LABELS[rb.variant])
    .map((rb) => ({
      key: rb.variant,
      label: VARIANT_LABELS[rb.variant] || rb.variant,
    }));

  const seriesByVariant: Record<string, TVReachPoint[]> = {};
  for (const rb of unique) {
    if (!VARIANT_LABELS[rb.variant]) continue;
    seriesByVariant[rb.variant] = rb.rows.map((row) => ({
      date: row.date,
      dateLabel: formatDateLabel(row.date),
      reach: row.reach,
      amr: row.amr,
    }));
  }

  return { variants, seriesByVariant };
}

// ─── E. Weekly Performance ───────────────────────────────

function getISOWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  // Get ISO week number
  const temp = new Date(d.getTime());
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const yearStart = new Date(temp.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((temp.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1 - 4) / 7
  );
  return `${temp.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function buildWeeklyPerformance(items: TVBroadcastItem[]): TVWeeklyPerformanceRow[] {
  const weekMap = new Map<string, TVBroadcastItem[]>();

  for (const item of items) {
    const key = getISOWeekKey(item.date);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(item);
  }

  const rows: TVWeeklyPerformanceRow[] = [];
  for (const [weekKey, weekItems] of weekMap) {
    const n = weekItems.length;
    rows.push({
      weekKey,
      weekLabel: weekKey.replace('-W', ' W'),
      broadcastCount: n,
      avgAmr: weekItems.reduce((s, i) => s + i.amr, 0) / n,
      maxAmr: Math.max(...weekItems.map((i) => i.amr)),
      avgTvr: weekItems.reduce((s, i) => s + i.tvr, 0) / n,
      avgAtsSeconds: weekItems.reduce((s, i) => s + i.atsSeconds, 0) / n,
      totalReach: weekItems.reduce((s, i) => s + i.aveDailyReach, 0),
      totalConsumption: weekItems.reduce((s, i) => s + i.consumption, 0),
    });
  }

  // Sort descending by weekKey (most recent first)
  rows.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  return rows;
}

// ─── F. Channel & Tier Donuts ────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  'SS PSL': '#00D4FF',
  'SS Variety 4': '#00FF88',
  'SS Variety 3': '#FFB800',
  'SS Blitz': '#FF3366',
};

const TIER_COLORS: Record<string, string> = {
  'DStv Compact': '#00D4FF',
  'DStv Access': '#FFB800',
};

function buildDonut(
  items: TVBroadcastItem[],
  groupFn: (item: TVBroadcastItem) => string,
  colorMap: Record<string, string>,
  fallbackColor: string,
): TVDonutSegment[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = groupFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const total = items.length;
  const segments: TVDonutSegment[] = [];
  for (const [name, value] of counts) {
    segments.push({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: colorMap[name] || fallbackColor,
    });
  }

  // Sort by value descending
  segments.sort((a, b) => b.value - a.value);
  return segments;
}

function buildChannelDonut(items: TVBroadcastItem[]): TVDonutSegment[] {
  return buildDonut(items, (i) => i.channel, CHANNEL_COLORS, '#6B7280');
}

function buildTierDonut(items: TVBroadcastItem[]): TVDonutSegment[] {
  return buildDonut(items, (i) => i.dstvService, TIER_COLORS, '#6B7280');
}

// ─── G. Premier vs Repeat ────────────────────────────────

function buildPremierRepeatBreakdown(items: TVBroadcastItem[]): TVPremierRepeatData {
  const premier = items.filter((i) => i.txType === 'Premier');
  const repeat = items.filter((i) => i.txType === 'Repeat');

  const avgOrZero = (arr: TVBroadcastItem[], fn: (i: TVBroadcastItem) => number) =>
    arr.length > 0 ? arr.reduce((s, i) => s + fn(i), 0) / arr.length : 0;

  return {
    metrics: [
      {
        label: 'Total Broadcasts',
        premier: premier.length,
        repeat: repeat.length,
        format: 'number',
      },
      {
        label: 'Total Audience',
        premier: premier.reduce((s, i) => s + i.aveDailyReach, 0),
        repeat: repeat.reduce((s, i) => s + i.aveDailyReach, 0),
        format: 'compact',
      },
      {
        label: 'Avg AMR',
        premier: avgOrZero(premier, (i) => i.amr),
        repeat: avgOrZero(repeat, (i) => i.amr),
        format: 'compact',
      },
      {
        label: 'Avg TVR',
        premier: avgOrZero(premier, (i) => i.tvr),
        repeat: avgOrZero(repeat, (i) => i.tvr),
        format: 'number',
      },
    ],
  };
}
