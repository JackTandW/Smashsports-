/**
 * Parse Betway Premiership Preview Show audience tracker Excel file.
 * Outputs clean JSON for the TV Audience dashboard.
 *
 * Usage: npx tsx scripts/parse-tv-audience.ts [path-to-xlsx]
 *
 * If no path is given, defaults to:
 *   ~/Downloads/Betway Premiership Preview Show_Audience Tracker.xlsx
 */

import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

import type {
  TVAudienceData,
  TVAudienceMetadata,
  TVKeyStats,
  TVKeyStatsBreakdown,
  TVEpisodeTable,
  TVEpisodeRow,
  TVItemsData,
  TVBroadcastItem,
  TVReachBuildSheet,
  TVReachBuildRow,
  TVKpaData,
  TVKpaRow,
  TVSeason,
} from '../lib/tv-audience-types';

// ─── Helpers ──────────────────────────────────────────────

type RawRow = (string | number | Date | boolean | null | undefined)[];

function getRawRows(wb: XLSX.WorkBook, sheetName: string): RawRow[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1, defval: null, raw: false });
}

function getRawRowsWithDates(wb: XLSX.WorkBook, sheetName: string): RawRow[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<RawRow>(ws, { header: 1, defval: null });
}

/** Convert a JS Date (from Excel date serial) to YYYY-MM-DD string.
 *  SheetJS cellDates creates Date objects in LOCAL time, so we must
 *  use local getters (getFullYear etc.) — NOT toISOString() which is UTC
 *  and can shift dates back by one day in SAST (UTC+2). */
function toISODate(val: unknown): string {
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    // Already a date string like "2024-10-24"
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    // Try parsing ISO
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
  }
  return String(val ?? '');
}

/** Convert an Excel time-only Date (1899-12-30T...) to HH:MM:SS.
 *  SheetJS cellDates creates Date objects in LOCAL time, so we use
 *  local getters — NOT getUTCHours() which is offset by timezone. */
function toTimeString(val: unknown): string {
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    const s = String(val.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  if (typeof val === 'string') {
    // Already formatted time string
    const match = val.match(/(\d{1,2}:\d{2}(:\d{2})?)/);
    if (match) return match[1];
  }
  return String(val ?? '00:00:00');
}

/** Convert Excel duration (time-only Date) to total seconds.
 *  SheetJS cellDates creates Date objects in LOCAL time, so we use
 *  local getters — NOT getUTCHours() which is offset by timezone. */
function toDurationSeconds(val: unknown): number {
  if (val instanceof Date) {
    return val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds();
  }
  if (typeof val === 'number') return Math.round(val);
  return 0;
}

/** Safely parse a number, returning null for non-numeric values */
function toNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Safely parse a number, returning 0 for non-numeric values */
function toNum0(val: unknown): number {
  return toNum(val) ?? 0;
}

/** Convert a value to a clean string for display */
function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return toISODate(val);
  return String(val).trim();
}

// ─── Sheet Parsers ────────────────────────────────────────

function parseKeyStats(wb: XLSX.WorkBook): { keyStats: TVKeyStats; metadata: Partial<TVAudienceMetadata> } {
  // Prefer the "Dates" variant which has proper date columns; fall back to any "Report-Key Stats*" sheet
  const keyStatsSheet = wb.SheetNames.find(n => /^Report-Key Stats-Dates/i.test(n))
    ?? wb.SheetNames.find(n => /^Report-Key Stats/i.test(n))
    ?? 'Report-Key Stats';
  const rows = getRawRowsWithDates(wb, keyStatsSheet);
  if (rows.length === 0) throw new Error(`Sheet matching "Report-Key Stats*" not found or empty (tried "${keyStatsSheet}")`);

  // Row 0: Title with week number — in col 2
  const titleCell = toStr(rows[0]?.[2]);
  const weekMatch = titleCell.match(/WEEK\s+(\d+)/i);
  const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : 0;
  const showName = titleCell.replace(/\s*-\s*WEEK\s+\d+.*$/i, '').trim();

  // Row 2: KPIs in specific column positions
  //   col 7 = "TOTAL UNIQUE AUDIENCE" label, col 9 = value
  //   col 10 = "INCREASE FROM PREVIOUS WEEK" label, col 12 = value
  //   col 13 = "TOTAL NUMBER OF NEW VIEWERS" label, col 15 = value
  //   col 16 = "PEAK AUDIENCE (SINGLE BROADCAST)" label, col 18 = value
  //   col 19 = "PEAK AUDIENCE (DATE & TIME)" label, col 21 = value
  const kpiRow = rows[2] || [];
  const totalUniqueAudience = toNum0(kpiRow[9]);
  const increaseFromPreviousWeek = toNum0(kpiRow[12]);
  const totalNewViewersPast7Days = toNum0(kpiRow[15]);
  const peakAudienceSingleBroadcast = toNum0(kpiRow[18]);
  const peakAudienceDateTime = toStr(kpiRow[21]);

  // Row 3: Age group in col 2
  const ageGroup = toStr(rows[3]?.[2]) || 'All 4+';

  // Rows 3-4: Season date ranges
  const seasons: TVSeason[] = [];
  for (const row of [rows[3], rows[4]]) {
    if (!row) continue;
    const label = toStr(row[3]);
    if (label && label.includes('/')) {
      seasons.push({
        label,
        startDate: toISODate(row[4]),
        endDate: toISODate(row[5]),
      });
    }
  }

  // Rows 5+: Section/Key_criteria/KPI breakdown
  // Row 5 is the header row ("Section", "Key_criteria", "Season/ KPI", ...)
  const breakdowns: TVKeyStatsBreakdown[] = [];
  for (let i = 6; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] === null || row[0] === undefined) continue;
    const section = toStr(row[0]);
    if (!section) continue;

    breakdowns.push({
      section,
      keyCriteria: toStr(row[1]),
      seasonKpi: toStr(row[2]),
      season2024: row[3] instanceof Date ? toISODate(row[3]) : (toNum(row[3]) ?? (toStr(row[3]) || null)),
      season2025: row[4] instanceof Date ? toISODate(row[4]) : (toNum(row[4]) ?? (toStr(row[4]) || null)),
      shiftYoY: toNum(row[5]),
    });
  }

  return {
    keyStats: {
      totalUniqueAudience,
      increaseFromPreviousWeek,
      totalNewViewersPast7Days,
      peakAudienceSingleBroadcast,
      peakAudienceDateTime,
      breakdowns,
    },
    metadata: {
      weekNumber,
      showName: showName || 'Betway Premiership Preview Show',
      ageGroup,
      seasons,
    },
  };
}

function parseEpisodeTable(wb: XLSX.WorkBook): TVEpisodeTable {
  const rows = getRawRowsWithDates(wb, 'Episode_table');
  if (rows.length === 0) throw new Error('Sheet "Episode_table" not found or empty');

  // Column layout (from exploration):
  //   col 2 = episode number (or "Episode number" header)
  //   col 3 = label ("Ep. 1", etc.)
  //   col 7 = 2024/2025 audience
  //   col 8 = 2025/2026 audience
  //   col 13 = 2024/2025 scaled (thousands)
  //   col 14 = 2025/2026 scaled (thousands)
  // Row 1 is the header, data starts at row 2

  const episodes: TVEpisodeRow[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const epNum = toNum(row[2]);
    const label = toStr(row[3]);
    if (epNum === null || !label || !label.startsWith('Ep.')) continue;

    const s2024 = toNum(row[7]);
    const s2025 = toNum(row[8]);
    // Skip rows where both seasons are null/0 and label suggests placeholder
    if (s2024 === null && s2025 === null) continue;

    episodes.push({
      episodeNumber: epNum,
      label,
      season2024Audience: s2024,
      season2025Audience: s2025,
      season2024Scaled: toNum(row[13]),
      season2025Scaled: toNum(row[14]),
    });
  }

  return { episodes };
}

function parseTVItems(wb: XLSX.WorkBook): TVItemsData {
  const rows = getRawRowsWithDates(wb, 'TV_items');
  if (rows.length === 0) throw new Error('Sheet "TV_items" not found or empty');

  // Row 0 = headers, data starts at row 1
  // Column indices (from exploration):
  //  0=Description, 1=Custom Group, 2=Channel, 3=Date, 4=Start time, 5=End time,
  //  6=Duration\Variable, 7=AMR, 8=Peak AMR, 9=TSUSHR%, 10=Ave. Daily RCH,
  //  11=ATS, 12=Loyalty%, 13=Cost, 14=TVR, 15=Sample, 16=Universe,
  //  17=Season, 18=TX_Type, 19=Consumption, 20=DStv_service, 21=Hours,
  //  22=Episode_ID, 23=Sequence_ID, 24=Sequence_ID_dedup, 25=Channel_Service, 26=Date_time

  const items: TVBroadcastItem[] = [];
  const channels = new Set<string>();
  const txTypeCounts = { premier: 0, repeat: 0 };
  const seasonCounts: Record<string, number> = {};
  const channelCounts: Record<string, number> = {};
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] === null) continue;

    const channel = toStr(row[2]);
    const date = toISODate(row[3]);
    const season = toStr(row[17]);
    const txType = toStr(row[18]);

    channels.add(channel);
    if (txType.toLowerCase() === 'premier') txTypeCounts.premier++;
    else txTypeCounts.repeat++;
    seasonCounts[season] = (seasonCounts[season] || 0) + 1;
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;

    items.push({
      description: toStr(row[0]),
      customGroup: toStr(row[1]),
      channel,
      date,
      startTime: toTimeString(row[4]),
      endTime: toTimeString(row[5]),
      durationSeconds: toDurationSeconds(row[6]),
      amr: toNum0(row[7]),
      peakAmr: toNum0(row[8]),
      tsushrPercent: toNum0(row[9]),
      aveDailyReach: toNum0(row[10]),
      atsSeconds: toDurationSeconds(row[11]),
      loyaltyPercent: toNum0(row[12]),
      cost: toNum0(row[13]),
      tvr: toNum0(row[14]),
      sample: toNum0(row[15]),
      universe: toNum0(row[16]),
      season,
      txType,
      consumption: toNum0(row[19]),
      dstvService: toStr(row[20]),
      hours: toNum0(row[21]),
      episodeId: toStr(row[22]),
      sequenceId: toStr(row[23]),
      sequenceIdDedup: toStr(row[24]),
      channelService: toStr(row[25]),
      dateTimeLabel: toStr(row[26]),
    });
  }

  return {
    items,
    summary: {
      totalBroadcasts: items.length,
      uniqueChannels: Array.from(channels).sort(),
      dateRange: { start: minDate, end: maxDate },
      byTxType: txTypeCounts,
      bySeason: seasonCounts,
      byChannel: channelCounts,
    },
  };
}

function parseReachBuild(wb: XLSX.WorkBook, sheetName: string): TVReachBuildSheet | null {
  const rows = getRawRowsWithDates(wb, sheetName);
  if (rows.length < 2) return null;

  // Row 0 = headers, data starts at row 1
  // Columns: 0=Cume Counter, 1=Date, 2=Start Time, 3=End Time, 4=Duration,
  //   5=Description, 6=Channel, 7=Custom group, 8=RCH, 9=RCH%, 10=AMR,
  //   11=EFF RCH [2+], 12=Season, 13=Competition, 14=Broadcast platform,
  //   15=Broadcast_status, 16=Absolute_Unique, 17=Year, 18=ISO_week

  const variant = sheetName.replace(/^Reachbuild_?/i, '') || 'all';
  const parsed: TVReachBuildRow[] = [];
  let minDate = '9999-12-31';
  let maxDate = '0000-01-01';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] === null) continue;

    const counter = toNum(row[0]);
    if (counter === null) continue;

    const date = toISODate(row[1]);
    if (date < minDate) minDate = date;
    if (date > maxDate) maxDate = date;

    parsed.push({
      cumeCounter: counter,
      date,
      startTime: toTimeString(row[2]),
      endTime: toTimeString(row[3]),
      durationSeconds: toDurationSeconds(row[4]),
      description: toStr(row[5]),
      channel: toStr(row[6]),
      customGroup: toStr(row[7]),
      reach: toNum0(row[8]),
      reachPercent: toNum0(row[9]),
      amr: toNum0(row[10]),
      effReach2Plus: toNum0(row[11]),
      season: toStr(row[12]),
      competition: toStr(row[13]),
      broadcastPlatform: toStr(row[14]),
      broadcastStatus: toStr(row[15]),
      absoluteUnique: toNum0(row[16]),
      year: toNum0(row[17]),
      isoWeek: toNum0(row[18]),
    });
  }

  if (parsed.length === 0) return null;

  const lastRow = parsed[parsed.length - 1];

  return {
    sheetName,
    variant,
    rows: parsed,
    summary: {
      totalRows: parsed.length,
      finalCumulativeReach: lastRow.reach,
      finalEffReach: lastRow.effReach2Plus,
      dateRange: { start: minDate, end: maxDate },
    },
  };
}

function parseKPA(wb: XLSX.WorkBook): TVKpaData {
  const rows = getRawRowsWithDates(wb, 'KPA_viewTDD');
  if (rows.length === 0) throw new Error('Sheet "KPA_viewTDD" not found or empty');

  // Row 0 = headers, data starts at row 1
  // Columns: 0=Section, 1=Key_criteria, 2=Season/KPI, 3=2024/2025, 4=2025/2026, 5=Shift

  const kpaRows: TVKpaRow[] = [];
  const bySections: Record<string, TVKpaRow[]> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[0] === null || row[0] === undefined) continue;
    const section = toStr(row[0]);
    if (!section) continue;

    const kpaRow: TVKpaRow = {
      section,
      keyCriteria: toStr(row[1]),
      seasonKpi: toStr(row[2]),
      season2024: row[3] instanceof Date ? toISODate(row[3]) : (toNum(row[3]) ?? (toStr(row[3]) || null)),
      season2025: row[4] instanceof Date ? toISODate(row[4]) : (toNum(row[4]) ?? (toStr(row[4]) || null)),
      shiftYoY: toNum(row[5]),
    };

    kpaRows.push(kpaRow);
    if (!bySections[section]) bySections[section] = [];
    bySections[section].push(kpaRow);
  }

  return { rows: kpaRows, bySections };
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const defaultPath = path.join(
    process.env.HOME || '/Users/jack',
    'Downloads',
    'Betway Premiership Preview Show_Audience Tracker.xlsx'
  );
  const filePath = process.argv[2] || defaultPath;

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ File not found: ${filePath}`);
    console.error('   Provide path as argument: npx tsx scripts/parse-tv-audience.ts <path>');
    process.exit(1);
  }

  console.log(`\n📊 Parsing: ${path.basename(filePath)}`);
  console.log(`   Path: ${filePath}\n`);

  // Read workbook with cellDates for proper date parsing
  const wb = XLSX.readFile(filePath, { cellDates: true });

  console.log(`   Found ${wb.SheetNames.length} sheets:`);
  wb.SheetNames.forEach((name, i) => {
    const hidden = wb.Workbook?.Sheets?.[i]?.Hidden ? '(hidden)' : '(visible)';
    console.log(`     ${hidden} ${name}`);
  });
  console.log('');

  // Parse each sheet
  console.log('   Parsing Report-Key Stats...');
  const { keyStats, metadata: partialMeta } = parseKeyStats(wb);
  console.log(`     ✓ Week ${partialMeta.weekNumber}, ${keyStats.breakdowns.length} breakdown rows`);
  console.log(`     ✓ Total unique audience: ${keyStats.totalUniqueAudience.toLocaleString()}`);

  console.log('   Parsing Episode_table...');
  const episodeTable = parseEpisodeTable(wb);
  console.log(`     ✓ ${episodeTable.episodes.length} episodes with data`);

  console.log('   Parsing TV_items...');
  const tvItems = parseTVItems(wb);
  console.log(`     ✓ ${tvItems.items.length} broadcast items`);
  console.log(`     ✓ Channels: ${tvItems.summary.uniqueChannels.join(', ')}`);
  console.log(`     ✓ Premier: ${tvItems.summary.byTxType.premier}, Repeat: ${tvItems.summary.byTxType.repeat}`);

  // Detect and parse all Reachbuild sheets
  const reachBuildSheets = wb.SheetNames.filter(n => /^Reachbuild/i.test(n));
  console.log(`   Parsing ${reachBuildSheets.length} Reachbuild sheets...`);
  const reachBuild: TVReachBuildSheet[] = [];
  for (const name of reachBuildSheets) {
    const sheet = parseReachBuild(wb, name);
    if (sheet) {
      reachBuild.push(sheet);
      console.log(`     ✓ ${name}: ${sheet.rows.length} rows, final reach: ${sheet.summary.finalCumulativeReach.toLocaleString()}`);
    } else {
      console.log(`     ⚠ ${name}: no data rows found, skipping`);
    }
  }

  console.log('   Parsing KPA_viewTDD...');
  const kpa = parseKPA(wb);
  console.log(`     ✓ ${kpa.rows.length} KPA rows across ${Object.keys(kpa.bySections).length} sections`);

  // Assemble the full output
  const metadata: TVAudienceMetadata = {
    sourceFile: path.basename(filePath),
    parsedAt: new Date().toISOString(),
    weekNumber: partialMeta.weekNumber ?? 0,
    showName: partialMeta.showName ?? 'Betway Premiership Preview Show',
    ageGroup: partialMeta.ageGroup ?? 'All 4+',
    seasons: partialMeta.seasons ?? [],
  };

  const output: TVAudienceData = {
    metadata,
    keyStats,
    episodeTable,
    tvItems,
    reachBuild,
    kpa,
  };

  // Write output
  const outDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'tv_audience_data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Output written to: ${outPath}`);
  console.log(`   File size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);

  // Summary
  console.log('\n📋 Summary:');
  console.log(`   Show: ${metadata.showName}`);
  console.log(`   Week: ${metadata.weekNumber}`);
  console.log(`   Seasons: ${metadata.seasons.map(s => s.label).join(', ')}`);
  console.log(`   Total unique audience: ${keyStats.totalUniqueAudience.toLocaleString()}`);
  console.log(`   Peak audience: ${keyStats.peakAudienceSingleBroadcast.toLocaleString()}`);
  console.log(`   Episodes: ${episodeTable.episodes.length}`);
  console.log(`   Broadcast items: ${tvItems.items.length}`);
  console.log(`   Reachbuild variants: ${reachBuild.length}`);
  console.log(`   KPA metrics: ${kpa.rows.length}`);
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Parser failed:', err);
  process.exit(1);
});
