import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
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
      return await handleWeekTransition();
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

async function handleWeekTransition() {
  const { weekStart, weekEnd } = getLastCompletedWeek();

  // Check if this week is already archived
  const existingRows = await sql`
    SELECT COUNT(*) as count FROM weekly_snapshots WHERE week_start = ${weekStart}
  `;
  const existingCount = Number(existingRows[0]?.count ?? 0);

  if (existingCount > 0) {
    return NextResponse.json({
      status: 'skipped',
      message: `Week ${weekStart} already archived (${existingCount} rows)`,
      triggeredAt: new Date().toISOString(),
    });
  }

  // Build snapshot from daily_metrics
  const dailyRows = await sql`
    SELECT date::text, platform,
            SUM(impressions)::integer as impressions, SUM(engagements)::integer as engagements,
            SUM(reactions)::integer as reactions, SUM(comments)::integer as comments,
            SUM(shares)::integer as shares, SUM(saves)::integer as saves,
            SUM(video_views)::integer as video_views, SUM(clicks)::integer as clicks,
            MAX(followers)::integer as followers, SUM(follower_growth)::integer as follower_growth,
            SUM(posts_published)::integer as posts_published
     FROM daily_metrics
     WHERE date >= ${weekStart} AND date <= ${weekEnd}
     GROUP BY date, platform
  ` as DailyMetricRow[];

  if (dailyRows.length === 0) {
    return NextResponse.json({
      status: 'skipped',
      message: `No daily_metrics data found for week ${weekStart}`,
      triggeredAt: new Date().toISOString(),
    });
  }

  const snapshots = buildSnapshotFromDailyMetrics(dailyRows, weekStart, weekEnd);

  // Persist to weekly_snapshots
  for (const row of snapshots) {
    await sql`
      INSERT INTO weekly_snapshots (week_start, week_end, platform, views, impressions,
        engagements, engagement_rate, posts_count, followers_start, followers_end,
        follower_growth, emv_total, emv_views, emv_likes, emv_comments, emv_shares, emv_other)
      VALUES (${row.week_start}, ${row.week_end}, ${row.platform}, ${row.views}, ${row.impressions},
        ${row.engagements}, ${row.engagement_rate}, ${row.posts_count}, ${row.followers_start},
        ${row.followers_end}, ${row.follower_growth}, ${row.emv_total}, ${row.emv_views},
        ${row.emv_likes}, ${row.emv_comments}, ${row.emv_shares}, ${row.emv_other})
      ON CONFLICT(week_start, platform) DO UPDATE SET
        views = EXCLUDED.views, impressions = EXCLUDED.impressions,
        engagements = EXCLUDED.engagements, engagement_rate = EXCLUDED.engagement_rate,
        posts_count = EXCLUDED.posts_count, followers_start = EXCLUDED.followers_start,
        followers_end = EXCLUDED.followers_end, follower_growth = EXCLUDED.follower_growth,
        emv_total = EXCLUDED.emv_total, emv_views = EXCLUDED.emv_views,
        emv_likes = EXCLUDED.emv_likes, emv_comments = EXCLUDED.emv_comments,
        emv_shares = EXCLUDED.emv_shares, emv_other = EXCLUDED.emv_other
    `;
  }

  return NextResponse.json({
    status: 'ok',
    message: `Archived week ${weekStart} → ${weekEnd} (${snapshots.length} rows)`,
    triggeredAt: new Date().toISOString(),
  });
}
