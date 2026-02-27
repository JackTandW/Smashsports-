-- Smash Sports Dashboard — SQLite Schema

-- Profile metadata cache
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_profile_id INTEGER UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT,
  native_id TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics (one row per profile per day)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  follower_growth INTEGER DEFAULT 0,
  posts_published INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, date)
);

-- Post-level data cache
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  content TEXT,
  permalink TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  emv REAL DEFAULT 0,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weekly snapshots (for Prompt 02 compatibility)
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  followers_start INTEGER DEFAULT 0,
  followers_end INTEGER DEFAULT 0,
  follower_growth INTEGER DEFAULT 0,
  emv_total REAL DEFAULT 0,
  emv_views REAL DEFAULT 0,
  emv_likes REAL DEFAULT 0,
  emv_comments REAL DEFAULT 0,
  emv_shares REAL DEFAULT 0,
  emv_other REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(week_start, platform)
);

-- Refresh log
CREATE TABLE IF NOT EXISTS refresh_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  status TEXT DEFAULT 'running',
  error TEXT,
  records_updated INTEGER DEFAULT 0
);

-- M-07: Add duration_ms to refresh_log if not present
-- SQLite does not support IF NOT EXISTS for ALTER TABLE, so we handle this in code.
-- The column is added programmatically in lib/db.ts if missing.

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_platform ON daily_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_metrics(date);
CREATE INDEX IF NOT EXISTS idx_daily_profile_date ON daily_metrics(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_engagements ON posts(engagements DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_week_start ON weekly_snapshots(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_platform ON weekly_snapshots(platform);

-- Talent posts (personal accounts, separate from brand posts)
CREATE TABLE IF NOT EXISTS talent_posts (
  id TEXT PRIMARY KEY,
  talent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  content TEXT,
  permalink TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  emv REAL DEFAULT 0,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talent_posts_talent ON talent_posts(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_posts_created ON talent_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_talent_posts_platform ON talent_posts(platform);
