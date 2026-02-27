import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'db', 'smash-dashboard.sqlite');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schemaPath = path.join(process.cwd(), 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
    }

    // M-07: Add duration_ms column to refresh_log if not present
    const cols = db.prepare("PRAGMA table_info('refresh_log')").all() as { name: string }[];
    if (!cols.some((c) => c.name === 'duration_ms')) {
      db.exec('ALTER TABLE refresh_log ADD COLUMN duration_ms INTEGER');
    }
  }
  return db;
}

export function getLastRefreshTime(): string | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT completed_at FROM refresh_log
       WHERE status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`
    )
    .get() as { completed_at: string } | undefined;
  return row?.completed_at ?? null;
}

export function logRefreshStart(): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO refresh_log (started_at, status) VALUES (datetime('now'), 'running')`
    )
    .run();
  return Number(result.lastInsertRowid);
}

export function logRefreshComplete(
  id: number,
  status: 'completed' | 'failed',
  recordsUpdated: number,
  error?: string
): void {
  const db = getDb();
  // M-07: Track duration in seconds alongside completion
  db.prepare(
    `UPDATE refresh_log
     SET completed_at = datetime('now'),
         status = ?,
         records_updated = ?,
         error = ?,
         duration_ms = CAST((julianday('now') - julianday(started_at)) * 86400000 AS INTEGER)
     WHERE id = ?`
  ).run(status, recordsUpdated, error ?? null, id);
}

// H-02: Staleness check — data older than threshold hours is considered stale
const STALENESS_THRESHOLD_HOURS = 26; // ~1 day with buffer for daily refreshes

export interface RefreshStatus {
  lastRefreshAt: string | null;
  isStale: boolean;
  hoursAgo: number | null;
  lastDurationMs: number | null;
}

export function getRefreshStatus(): RefreshStatus {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT completed_at, duration_ms FROM refresh_log
       WHERE status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`
    )
    .get() as { completed_at: string; duration_ms: number | null } | undefined;

  if (!row?.completed_at) {
    return { lastRefreshAt: null, isStale: true, hoursAgo: null, lastDurationMs: null };
  }

  const lastRefresh = new Date(row.completed_at + 'Z');
  const hoursAgo = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60);

  return {
    lastRefreshAt: row.completed_at,
    isStale: hoursAgo > STALENESS_THRESHOLD_HOURS,
    hoursAgo: Math.round(hoursAgo * 10) / 10,
    lastDurationMs: row.duration_ms,
  };
}
