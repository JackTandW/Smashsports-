-- Smash Sports Dashboard — PostgreSQL Schema (Neon)

-- Profile metadata cache
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  customer_profile_id INTEGER UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  handle TEXT,
  native_id TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics (one row per profile per day)
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, date)
);

-- Post-level data cache
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
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
  emv DOUBLE PRECISION DEFAULT 0,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly snapshots (for Prompt 02 compatibility)
CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  engagement_rate DOUBLE PRECISION DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  followers_start INTEGER DEFAULT 0,
  followers_end INTEGER DEFAULT 0,
  follower_growth INTEGER DEFAULT 0,
  emv_total DOUBLE PRECISION DEFAULT 0,
  emv_views DOUBLE PRECISION DEFAULT 0,
  emv_likes DOUBLE PRECISION DEFAULT 0,
  emv_comments DOUBLE PRECISION DEFAULT 0,
  emv_shares DOUBLE PRECISION DEFAULT 0,
  emv_other DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(week_start, platform)
);

-- Refresh log
CREATE TABLE IF NOT EXISTS refresh_log (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'running',
  error TEXT,
  records_updated INTEGER DEFAULT 0,
  duration_ms INTEGER
);

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
  created_at TIMESTAMP NOT NULL,
  content TEXT,
  permalink TEXT,
  impressions INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  emv DOUBLE PRECISION DEFAULT 0,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_talent_posts_talent ON talent_posts(talent_id);
CREATE INDEX IF NOT EXISTS idx_talent_posts_created ON talent_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_talent_posts_platform ON talent_posts(platform);
