import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { PostMetrics, PlatformId } from '@/lib/types';
import { PLATFORM_IDS } from '@/lib/types';
import type { WeeklySnapshotRow } from '@/lib/weekly-types';
import type { DailyMetricRow } from '@/lib/weekly-data-processing';
import {
  getLastCompletedWeek,
  getCurrentWeek,
  getPreviousWeek,
  formatWeekLabel,
  buildSnapshotFromDailyMetrics,
  buildWeeklyComparison,
} from '@/lib/weekly-data-processing';
import { getMockDailyMetricRows, getMockPosts } from '@/lib/mock-data';

export const runtime = 'nodejs';

/**
 * GET /api/weekly?weekStart=YYYY-MM-DD
 * Returns WeeklyComparisonData for the selected week vs its prior week.
 * If weekStart is omitted, defaults to the CURRENT week (partial data if mid-week).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedWeekStart = searchParams.get('weekStart');

    // ── Mock-data path (Vercel / demo) ──
    if (process.env.USE_MOCK_DATA === 'true') {
      const current = getCurrentWeek();
      const weekStart = requestedWeekStart ?? current.weekStart;
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split('T')[0];
      const { weekStart: lastStart, weekEnd: lastEnd } = getPreviousWeek(weekStart);

      const allRows = getMockDailyMetricRows() as DailyMetricRow[];
      const thisRows = allRows.filter((r) => r.date >= weekStart && r.date <= weekEnd);
      const lastRows = allRows.filter((r) => r.date >= lastStart && r.date <= lastEnd);

      const thisSnap = buildSnapshotFromDailyMetrics(thisRows, weekStart, weekEnd);
      const lastSnap = buildSnapshotFromDailyMetrics(lastRows, lastStart, lastEnd);

      // Build 12 weeks of history
      const historySnaps: WeeklySnapshotRow[] = [];
      let cursor = new Date(weekStart);
      for (let i = 0; i < 12; i++) {
        const ws = cursor.toISOString().split('T')[0];
        const we = new Date(cursor); we.setDate(we.getDate() + 6);
        const weStr = we.toISOString().split('T')[0];
        const rows = allRows.filter((r) => r.date >= ws && r.date <= weStr);
        if (rows.length > 0) historySnaps.push(...buildSnapshotFromDailyMetrics(rows, ws, weStr));
        cursor.setDate(cursor.getDate() - 7);
      }

      const posts = getMockPosts().filter(
        (p) => p.createdAt >= `${weekStart}T00:00:00` && p.createdAt <= `${weekEnd}T23:59:59`
      );

      const now = new Date();
      const sast = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
      const todayStr = sast.toISOString().split('T')[0];
      const isPartial = todayStr >= weekStart && todayStr <= weekEnd;
      const partialDays = isPartial
        ? Math.floor((sast.getTime() - new Date(weekStart).getTime()) / 86400000) + 1
        : 7;

      const availableWeeks: { weekStart: string; weekEnd: string; label: string }[] = [];
      let wk = new Date(weekStart);
      for (let i = 0; i < 12; i++) {
        const ws = wk.toISOString().split('T')[0];
        const we2 = new Date(wk); we2.setDate(we2.getDate() + 6);
        availableWeeks.push({ weekStart: ws, weekEnd: we2.toISOString().split('T')[0], label: formatWeekLabel(ws) });
        wk.setDate(wk.getDate() - 7);
      }

      const data = buildWeeklyComparison(
        thisSnap, lastSnap, historySnaps, posts,
        weekStart, weekEnd, lastStart, lastEnd,
        availableWeeks, isPartial, partialDays
      );
      return NextResponse.json(data);
    }

    // ── Live-data path (SQLite) ──
    const db = getDb();

    // Determine which week to show
    let thisWeekStart: string;
    let thisWeekEnd: string;

    if (requestedWeekStart) {
      thisWeekStart = requestedWeekStart;
      const d = new Date(requestedWeekStart);
      d.setDate(d.getDate() + 6);
      thisWeekEnd = d.toISOString().split('T')[0];
    } else {
      // Default to the current week so users see this week's data (may be partial)
      const current = getCurrentWeek();
      thisWeekStart = current.weekStart;
      thisWeekEnd = current.weekEnd;
    }

    const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } =
      getPreviousWeek(thisWeekStart);

    // Check for partial week
    const now = new Date();
    const sast = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    const todayStr = sast.toISOString().split('T')[0];
    const isPartialWeek = todayStr >= thisWeekStart && todayStr <= thisWeekEnd;
    const partialDayCount = isPartialWeek
      ? Math.floor((sast.getTime() - new Date(thisWeekStart).getTime()) / (24 * 60 * 60 * 1000)) + 1
      : 7;

    // Try to get data from weekly_snapshots first
    let thisWeekRows = db
      .prepare('SELECT * FROM weekly_snapshots WHERE week_start = ?')
      .all(thisWeekStart) as WeeklySnapshotRow[];

    let lastWeekRows = db
      .prepare('SELECT * FROM weekly_snapshots WHERE week_start = ?')
      .all(lastWeekStart) as WeeklySnapshotRow[];

    // If no weekly snapshots exist, compute from daily_metrics on the fly
    if (thisWeekRows.length === 0) {
      const dailyRows = db
        .prepare(
          `SELECT date, platform, SUM(impressions) as impressions, SUM(engagements) as engagements,
                  SUM(reactions) as reactions, SUM(comments) as comments, SUM(shares) as shares,
                  SUM(saves) as saves, SUM(video_views) as video_views, SUM(clicks) as clicks,
                  MAX(followers) as followers, SUM(follower_growth) as follower_growth,
                  SUM(posts_published) as posts_published
           FROM daily_metrics
           WHERE date >= ? AND date <= ?
           GROUP BY date, platform`
        )
        .all(thisWeekStart, thisWeekEnd) as DailyMetricRow[];

      thisWeekRows = buildSnapshotFromDailyMetrics(dailyRows, thisWeekStart, thisWeekEnd);

      // Persist computed snapshots for future use
      const upsert = db.prepare(`
        INSERT INTO weekly_snapshots (week_start, week_end, platform, views, impressions,
          engagements, engagement_rate, posts_count, followers_start, followers_end,
          follower_growth, emv_total, emv_views, emv_likes, emv_comments, emv_shares, emv_other)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_start, platform) DO UPDATE SET
          views = excluded.views, impressions = excluded.impressions,
          engagements = excluded.engagements, engagement_rate = excluded.engagement_rate,
          posts_count = excluded.posts_count, followers_start = excluded.followers_start,
          followers_end = excluded.followers_end, follower_growth = excluded.follower_growth,
          emv_total = excluded.emv_total, emv_views = excluded.emv_views,
          emv_likes = excluded.emv_likes, emv_comments = excluded.emv_comments,
          emv_shares = excluded.emv_shares, emv_other = excluded.emv_other
      `);

      const insertMany = db.transaction((rows: WeeklySnapshotRow[]) => {
        for (const row of rows) {
          upsert.run(
            row.week_start, row.week_end, row.platform, row.views, row.impressions,
            row.engagements, row.engagement_rate, row.posts_count, row.followers_start,
            row.followers_end, row.follower_growth, row.emv_total, row.emv_views,
            row.emv_likes, row.emv_comments, row.emv_shares, row.emv_other
          );
        }
      });
      insertMany(thisWeekRows);
    }

    if (lastWeekRows.length === 0) {
      const dailyRows = db
        .prepare(
          `SELECT date, platform, SUM(impressions) as impressions, SUM(engagements) as engagements,
                  SUM(reactions) as reactions, SUM(comments) as comments, SUM(shares) as shares,
                  SUM(saves) as saves, SUM(video_views) as video_views, SUM(clicks) as clicks,
                  MAX(followers) as followers, SUM(follower_growth) as follower_growth,
                  SUM(posts_published) as posts_published
           FROM daily_metrics
           WHERE date >= ? AND date <= ?
           GROUP BY date, platform`
        )
        .all(lastWeekStart, lastWeekEnd) as DailyMetricRow[];

      lastWeekRows = buildSnapshotFromDailyMetrics(dailyRows, lastWeekStart, lastWeekEnd);

      const upsert = db.prepare(`
        INSERT INTO weekly_snapshots (week_start, week_end, platform, views, impressions,
          engagements, engagement_rate, posts_count, followers_start, followers_end,
          follower_growth, emv_total, emv_views, emv_likes, emv_comments, emv_shares, emv_other)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_start, platform) DO UPDATE SET
          views = excluded.views, impressions = excluded.impressions,
          engagements = excluded.engagements, engagement_rate = excluded.engagement_rate,
          posts_count = excluded.posts_count, followers_start = excluded.followers_start,
          followers_end = excluded.followers_end, follower_growth = excluded.follower_growth,
          emv_total = excluded.emv_total, emv_views = excluded.emv_views,
          emv_likes = excluded.emv_likes, emv_comments = excluded.emv_comments,
          emv_shares = excluded.emv_shares, emv_other = excluded.emv_other
      `);

      const insertMany = db.transaction((rows: WeeklySnapshotRow[]) => {
        for (const row of rows) {
          upsert.run(
            row.week_start, row.week_end, row.platform, row.views, row.impressions,
            row.engagements, row.engagement_rate, row.posts_count, row.followers_start,
            row.followers_end, row.follower_growth, row.emv_total, row.emv_views,
            row.emv_likes, row.emv_comments, row.emv_shares, row.emv_other
          );
        }
      });
      insertMany(lastWeekRows);
    }

    // Get recent weeks (up to 12) for sparklines and growth curves
    const recentWeeks = db
      .prepare(
        `SELECT * FROM weekly_snapshots
         WHERE week_start <= ?
         ORDER BY week_start DESC
         LIMIT ?`
      )
      .all(thisWeekStart, 12 * 6) as WeeklySnapshotRow[];

    // If we have fewer than 12 weeks of snapshots, backfill from daily_metrics
    const existingWeekStarts = new Set(recentWeeks.map((r) => r.week_start));
    const neededWeeks: { start: string; end: string }[] = [];
    let cursor = new Date(thisWeekStart);
    for (let i = 0; i < 12; i++) {
      const ws = cursor.toISOString().split('T')[0];
      if (!existingWeekStarts.has(ws)) {
        const endDate = new Date(cursor);
        endDate.setDate(endDate.getDate() + 6);
        neededWeeks.push({ start: ws, end: endDate.toISOString().split('T')[0] });
      }
      cursor.setDate(cursor.getDate() - 7);
    }

    // Backfill missing weeks
    if (neededWeeks.length > 0) {
      const upsert = db.prepare(`
        INSERT INTO weekly_snapshots (week_start, week_end, platform, views, impressions,
          engagements, engagement_rate, posts_count, followers_start, followers_end,
          follower_growth, emv_total, emv_views, emv_likes, emv_comments, emv_shares, emv_other)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_start, platform) DO UPDATE SET
          views = excluded.views, impressions = excluded.impressions,
          engagements = excluded.engagements, engagement_rate = excluded.engagement_rate,
          posts_count = excluded.posts_count, followers_start = excluded.followers_start,
          followers_end = excluded.followers_end, follower_growth = excluded.follower_growth,
          emv_total = excluded.emv_total, emv_views = excluded.emv_views,
          emv_likes = excluded.emv_likes, emv_comments = excluded.emv_comments,
          emv_shares = excluded.emv_shares, emv_other = excluded.emv_other
      `);

      for (const week of neededWeeks) {
        const dailyRows = db
          .prepare(
            `SELECT date, platform, SUM(impressions) as impressions, SUM(engagements) as engagements,
                    SUM(reactions) as reactions, SUM(comments) as comments, SUM(shares) as shares,
                    SUM(saves) as saves, SUM(video_views) as video_views, SUM(clicks) as clicks,
                    MAX(followers) as followers, SUM(follower_growth) as follower_growth,
                    SUM(posts_published) as posts_published
             FROM daily_metrics
             WHERE date >= ? AND date <= ?
             GROUP BY date, platform`
          )
          .all(week.start, week.end) as DailyMetricRow[];

        if (dailyRows.length > 0) {
          const snapshots = buildSnapshotFromDailyMetrics(dailyRows, week.start, week.end);
          for (const row of snapshots) {
            upsert.run(
              row.week_start, row.week_end, row.platform, row.views, row.impressions,
              row.engagements, row.engagement_rate, row.posts_count, row.followers_start,
              row.followers_end, row.follower_growth, row.emv_total, row.emv_views,
              row.emv_likes, row.emv_comments, row.emv_shares, row.emv_other
            );
          }
          recentWeeks.push(...snapshots);
        }
      }
    }

    // Fetch top posts for this week
    const topPosts = db
      .prepare(
        `SELECT id, platform, profile_id as profileId, created_at as createdAt,
                content, permalink, impressions, engagements, video_views as videoViews,
                reactions, comments, shares, saves, clicks, emv
         FROM posts
         WHERE created_at >= ? AND created_at <= ?
         ORDER BY engagements DESC
         LIMIT 20`
      )
      .all(
        `${thisWeekStart}T00:00:00`,
        `${thisWeekEnd}T23:59:59`
      ) as PostMetrics[];

    // Build available weeks for the selector
    const weekStartsRaw = db
      .prepare(
        `SELECT DISTINCT week_start FROM weekly_snapshots ORDER BY week_start DESC LIMIT 52`
      )
      .all() as { week_start: string }[];

    const availableWeeks = weekStartsRaw.map((r) => ({
      weekStart: r.week_start,
      weekEnd: (() => {
        const d = new Date(r.week_start);
        d.setDate(d.getDate() + 6);
        return d.toISOString().split('T')[0];
      })(),
      label: formatWeekLabel(r.week_start),
    }));

    // Build the full comparison
    const data = buildWeeklyComparison(
      thisWeekRows,
      lastWeekRows,
      recentWeeks,
      topPosts,
      thisWeekStart,
      thisWeekEnd,
      lastWeekStart,
      lastWeekEnd,
      availableWeeks,
      isPartialWeek,
      partialDayCount
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Weekly API error:', error);
    return NextResponse.json(
      { error: 'Failed to load weekly comparison data' },
      { status: 500 }
    );
  }
}
