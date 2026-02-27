import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/utils';
import { getLastCompletedWeek, buildSnapshotFromDailyMetrics } from '@/lib/weekly-data-processing';
import type { DailyMetricRow } from '@/lib/weekly-data-processing';
import type { WeeklySnapshotRow } from '@/lib/weekly-types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job');

  try {
    // Week-transition job: archive the completed week into weekly_snapshots
    if (job === 'week-transition') {
      return handleWeekTransition();
    }

    // Default: Trigger the same refresh logic as /api/refresh
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/refresh`, { method: 'POST' });
    const result = await response.json();

    return NextResponse.json({
      status: 'ok',
      refresh: result,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

function handleWeekTransition() {
  const db = getDb();
  const { weekStart, weekEnd } = getLastCompletedWeek();

  // Check if this week is already archived
  const existing = db
    .prepare('SELECT COUNT(*) as count FROM weekly_snapshots WHERE week_start = ?')
    .get(weekStart) as { count: number };

  if (existing.count > 0) {
    return NextResponse.json({
      status: 'skipped',
      message: `Week ${weekStart} already archived (${existing.count} rows)`,
      triggeredAt: new Date().toISOString(),
    });
  }

  // Build snapshot from daily_metrics
  const dailyRows = db
    .prepare(
      `SELECT date, platform,
              SUM(impressions) as impressions, SUM(engagements) as engagements,
              SUM(reactions) as reactions, SUM(comments) as comments,
              SUM(shares) as shares, SUM(saves) as saves,
              SUM(video_views) as video_views, SUM(clicks) as clicks,
              MAX(followers) as followers, SUM(follower_growth) as follower_growth,
              SUM(posts_published) as posts_published
       FROM daily_metrics
       WHERE date >= ? AND date <= ?
       GROUP BY date, platform`
    )
    .all(weekStart, weekEnd) as DailyMetricRow[];

  if (dailyRows.length === 0) {
    return NextResponse.json({
      status: 'skipped',
      message: `No daily_metrics data found for week ${weekStart}`,
      triggeredAt: new Date().toISOString(),
    });
  }

  const snapshots = buildSnapshotFromDailyMetrics(dailyRows, weekStart, weekEnd);

  // Persist to weekly_snapshots
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

  insertMany(snapshots);

  return NextResponse.json({
    status: 'ok',
    message: `Archived week ${weekStart} → ${weekEnd} (${snapshots.length} rows)`,
    triggeredAt: new Date().toISOString(),
  });
}
