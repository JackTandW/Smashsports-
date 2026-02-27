import { neon } from '@neondatabase/serverless';

/**
 * Neon Postgres serverless SQL client.
 * Uses HTTP-based tagged template literals — stateless, perfect for Vercel.
 *
 * Usage:  import { sql } from '@/lib/db';
 *         const rows = await sql`SELECT * FROM posts WHERE id = ${id}`;
 */
export const sql = neon(process.env.DATABASE_URL!);

// ─── Refresh log helpers ────────────────────────────────────────────────

export async function getLastRefreshTime(): Promise<string | null> {
  const rows = await sql`
    SELECT completed_at::text FROM refresh_log
    WHERE status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `;
  return (rows[0]?.completed_at as string) ?? null;
}

export async function logRefreshStart(): Promise<number> {
  const rows = await sql`
    INSERT INTO refresh_log (started_at, status)
    VALUES (NOW(), 'running')
    RETURNING id
  `;
  return rows[0].id as number;
}

export async function logRefreshComplete(
  id: number,
  status: 'completed' | 'failed',
  recordsUpdated: number,
  error?: string
): Promise<void> {
  await sql`
    UPDATE refresh_log
    SET completed_at = NOW(),
        status = ${status},
        records_updated = ${recordsUpdated},
        error = ${error ?? null},
        duration_ms = CAST(EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000 AS INTEGER)
    WHERE id = ${id}
  `;
}

// ─── Staleness check (H-02) ────────────────────────────────────────────

const STALENESS_THRESHOLD_HOURS = 26;

export interface RefreshStatus {
  lastRefreshAt: string | null;
  isStale: boolean;
  hoursAgo: number | null;
  lastDurationMs: number | null;
}

export async function getRefreshStatus(): Promise<RefreshStatus> {
  const rows = await sql`
    SELECT completed_at::text, duration_ms FROM refresh_log
    WHERE status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `;

  const row = rows[0];
  if (!row?.completed_at) {
    return { lastRefreshAt: null, isStale: true, hoursAgo: null, lastDurationMs: null };
  }

  const lastRefresh = new Date(row.completed_at as string);
  const hoursAgo = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60);

  return {
    lastRefreshAt: row.completed_at as string,
    isStale: hoursAgo > STALENESS_THRESHOLD_HOURS,
    hoursAgo: Math.round(hoursAgo * 10) / 10,
    lastDurationMs: (row.duration_ms as number) ?? null,
  };
}
