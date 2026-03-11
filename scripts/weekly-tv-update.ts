#!/usr/bin/env npx tsx
/**
 * ┌─────────────────────────────────────────────────┐
 * │  Weekly TV Audience Update                      │
 * │  Run every Monday with the new Excel tracker.   │
 * │                                                 │
 * │  Usage:                                         │
 * │    npm run tv:update [path-to-xlsx]              │
 * │    npx tsx scripts/weekly-tv-update.ts [path]    │
 * │                                                 │
 * │  If no path given, auto-detects the latest      │
 * │  "Betway*Audience Tracker*.xlsx" in Downloads.  │
 * └─────────────────────────────────────────────────┘
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import type { TVAudienceData, TVAudiencePayload } from '../lib/tv-audience-types';
import { buildTVAudiencePayload } from '../lib/tv-audience-data-processing';

// ─── ANSI colours ─────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[97m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
};

function heading(text: string) {
  console.log(`\n${C.bgCyan}${C.bold} ${text} ${C.reset}`);
}

function success(text: string) {
  console.log(`  ${C.green}✓${C.reset} ${text}`);
}

function warn(text: string) {
  console.log(`  ${C.yellow}⚠${C.reset} ${text}`);
}

function info(label: string, value: string | number) {
  console.log(`  ${C.dim}${label}:${C.reset} ${C.white}${value}${C.reset}`);
}

function metric(label: string, value: string | number, color = C.cyan) {
  console.log(`  ${C.dim}${label.padEnd(28)}${C.reset} ${color}${C.bold}${value}${C.reset}`);
}

function divider() {
  console.log(`  ${C.dim}${'─'.repeat(50)}${C.reset}`);
}

// ─── Auto-detect spreadsheet ──────────────────────────────

function findLatestTracker(): string | null {
  const downloadsDir = path.join(process.env.HOME || '/Users/jack', 'Downloads');
  if (!fs.existsSync(downloadsDir)) return null;

  const files = fs.readdirSync(downloadsDir)
    .filter(f => /betway.*audience.*tracker.*\.xlsx$/i.test(f))
    .map(f => ({
      name: f,
      fullPath: path.join(downloadsDir, f),
      mtime: fs.statSync(path.join(downloadsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime); // newest first

  return files.length > 0 ? files[0].fullPath : null;
}

// ─── Format helpers ───────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-ZA');
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// ─── Summary printer ──────────────────────────────────────

function printSummary(raw: TVAudienceData, payload: TVAudiencePayload) {
  const { metadata, keyStats, tvItems, episodeTable, reachBuild, kpa } = raw;

  // ── Header
  heading('TV AUDIENCE WEEKLY UPDATE');
  console.log('');
  info('Show', metadata.showName);
  info('Week', metadata.weekNumber.toString());
  info('Age Group', metadata.ageGroup);
  info('Seasons', metadata.seasons.map(s => s.label).join(' / '));
  info('Date Range', `${tvItems.summary.dateRange.start} → ${tvItems.summary.dateRange.end}`);
  info('Parsed At', new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));

  // ── Headline KPIs
  heading('HEADLINE KPIs');
  console.log('');
  metric('Total Unique Audience', fmtNum(keyStats.totalUniqueAudience), C.green);
  metric('WoW Increase', fmtPct(keyStats.increaseFromPreviousWeek * 100),
    keyStats.increaseFromPreviousWeek >= 0 ? C.green : C.red);
  metric('New Viewers (7 days)', fmtNum(keyStats.totalNewViewersPast7Days));
  metric('Peak Single Broadcast', fmtNum(keyStats.peakAudienceSingleBroadcast));
  metric('Peak Date/Time', keyStats.peakAudienceDateTime);

  // ── Broadcast Mix
  heading('BROADCAST MIX');
  console.log('');
  metric('Total Broadcasts', tvItems.summary.totalBroadcasts.toString());
  metric('Premier', tvItems.summary.byTxType.premier.toString(), C.cyan);
  metric('Repeat', tvItems.summary.byTxType.repeat.toString(), C.yellow);
  divider();

  // Channels
  const channelEntries = Object.entries(tvItems.summary.byChannel).sort(([, a], [, b]) => b - a);
  for (const [ch, count] of channelEntries) {
    const pct = ((count / tvItems.summary.totalBroadcasts) * 100).toFixed(1);
    metric(`  ${ch}`, `${count} (${pct}%)`);
  }

  // ── Episode Comparison
  heading('EPISODE COMPARISON');
  console.log('');
  const eps = episodeTable.episodes;
  const epsWithBoth = eps.filter(e => e.season2024Audience && e.season2025Audience);
  metric('Total Episodes', eps.length.toString());
  metric('With Both Seasons', epsWithBoth.length.toString());

  if (epsWithBoth.length > 0) {
    divider();
    console.log(`  ${C.dim}${'Episode'.padEnd(10)} ${'2024/25'.padStart(10)} ${'2025/26'.padStart(10)} ${'Change'.padStart(10)}${C.reset}`);
    for (const ep of epsWithBoth.slice(0, 10)) {
      const v24 = ep.season2024Audience ?? 0;
      const v25 = ep.season2025Audience ?? 0;
      const change = v24 > 0 ? ((v25 - v24) / v24) * 100 : 0;
      const changeColor = change >= 0 ? C.green : C.red;
      console.log(
        `  ${C.white}${ep.label.padEnd(10)}${C.reset}` +
        ` ${fmtNum(v24).padStart(10)}` +
        ` ${C.cyan}${fmtNum(v25).padStart(10)}${C.reset}` +
        ` ${changeColor}${fmtPct(change).padStart(10)}${C.reset}`
      );
    }
    if (epsWithBoth.length > 10) {
      console.log(`  ${C.dim}... and ${epsWithBoth.length - 10} more${C.reset}`);
    }
  }

  // ── Reach Build
  heading('CUMULATIVE REACH');
  console.log('');
  const uniqueReach = reachBuild.filter(r => !r.sheetName.includes('(2)'));
  for (const rb of uniqueReach) {
    const label = rb.variant.replace(/_/g, ' ').replace(/\ball\b/gi, 'All');
    metric(`  ${label}`, `${fmtNum(rb.summary.finalCumulativeReach)} reach (${rb.rows.length} broadcasts)`);
  }

  // ── Weekly Performance (top 5 most recent)
  heading('RECENT WEEKLY PERFORMANCE');
  console.log('');
  const weeks = payload.weeklyPerformance.slice(0, 5);
  console.log(`  ${C.dim}${'Week'.padEnd(12)} ${'BC#'.padStart(4)} ${'Avg AMR'.padStart(10)} ${'Avg ATS'.padStart(10)} ${'Reach'.padStart(10)}${C.reset}`);
  for (const w of weeks) {
    console.log(
      `  ${C.white}${w.weekLabel.padEnd(12)}${C.reset}` +
      ` ${String(w.broadcastCount).padStart(4)}` +
      ` ${C.cyan}${fmtNum(Math.round(w.avgAmr)).padStart(10)}${C.reset}` +
      ` ${fmtDuration(w.avgAtsSeconds).padStart(10)}` +
      ` ${C.green}${fmtNum(Math.round(w.totalReach)).padStart(10)}${C.reset}`
    );
  }

  // ── KPA Sections
  heading('KPA SUMMARY');
  console.log('');
  metric('Total KPA Metrics', kpa.rows.length.toString());
  metric('Sections', Object.keys(kpa.bySections).length.toString());
  for (const [section, rows] of Object.entries(kpa.bySections)) {
    const label = section.replace(/_/g, ' ');
    metric(`  ${label}`, `${rows.length} metrics`);
  }

  // ── Dashboard Payload Validation
  heading('DASHBOARD PAYLOAD VALIDATION');
  console.log('');
  success(`Hero cards: ${payload.heroCards.length}`);
  success(`Episode chart points: ${payload.episodeChart.length}`);
  success(`Weekly performance rows: ${payload.weeklyPerformance.length}`);
  success(`Channel donut segments: ${payload.channelDonut.length}`);
  success(`Tier donut segments: ${payload.tierDonut.length}`);
  success(`Premier/Repeat metrics: ${payload.premierRepeat.metrics.length}`);

  // ── Final status
  console.log('');
  console.log(`${C.bgGreen}${C.bold} ✅ UPDATE COMPLETE ${C.reset}`);
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  📺  TV Audience Weekly Update               ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════╝${C.reset}`);

  // 1. Resolve spreadsheet path
  let filePath = process.argv[2];

  if (!filePath) {
    console.log(`\n  ${C.dim}No file specified — scanning Downloads...${C.reset}`);
    const detected = findLatestTracker();
    if (detected) {
      filePath = detected;
      const basename = path.basename(detected);
      const mtime = fs.statSync(detected).mtime;
      success(`Found: ${basename}`);
      info('Modified', mtime.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }));
    } else {
      console.error(`\n  ${C.red}❌ No Betway tracker found in ~/Downloads${C.reset}`);
      console.error(`  ${C.dim}   Usage: npm run tv:update <path-to-xlsx>${C.reset}\n`);
      process.exit(1);
    }
  }

  if (!fs.existsSync(filePath)) {
    console.error(`\n  ${C.red}❌ File not found: ${filePath}${C.reset}\n`);
    process.exit(1);
  }

  const basename = path.basename(filePath);
  info('Input', basename);

  // 2. Run the parser
  heading('STEP 1: PARSE SPREADSHEET');
  console.log('');
  console.log(`  ${C.dim}Running parse-tv-audience.ts...${C.reset}`);

  const scriptPath = path.join(__dirname, 'parse-tv-audience.ts');
  const projectRoot = path.resolve(__dirname, '..');

  try {
    execSync(`npx tsx "${scriptPath}" "${filePath}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    success('Parser completed successfully');
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string };
    console.error(`\n  ${C.red}❌ Parser failed${C.reset}`);
    if (execErr.stderr) console.error(`  ${C.dim}${execErr.stderr}${C.reset}`);
    if (execErr.stdout) console.log(execErr.stdout);
    process.exit(1);
  }

  // 3. Load and validate the JSON
  heading('STEP 2: VALIDATE & PROCESS');
  console.log('');
  const jsonPath = path.join(projectRoot, 'data', 'tv_audience_data.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`  ${C.red}❌ JSON not found at: ${jsonPath}${C.reset}`);
    process.exit(1);
  }

  const raw: TVAudienceData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  success(`Loaded tv_audience_data.json (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`);

  // 4. Build dashboard payload (validates all transforms)
  let payload: TVAudiencePayload;
  try {
    payload = buildTVAudiencePayload(raw);
    success('Dashboard payload built — all 7 transforms passed');
  } catch (err) {
    console.error(`\n  ${C.red}❌ Payload build failed: ${err}${C.reset}`);
    process.exit(1);
  }

  // 5. Print the full summary
  heading('STEP 3: WEEKLY SUMMARY');
  printSummary(raw, payload);

  // 6. Remind about dev server
  console.log(`  ${C.dim}To preview the dashboard:${C.reset}`);
  console.log(`  ${C.cyan}  npm run dev${C.reset}`);
  console.log(`  ${C.dim}  Then visit ${C.cyan}http://localhost:3000/tv-audience${C.reset}`);
  console.log('');
}

main().catch((err) => {
  console.error(`\n${C.red}❌ Update failed:${C.reset}`, err);
  process.exit(1);
});
