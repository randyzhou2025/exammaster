-- 个人主页 https://qiway.site/ 每日访问（与 examprep 活跃分开统计）
CREATE TABLE IF NOT EXISTS homepage_daily_visits (
  activity_date DATE NOT NULL,
  visitor_key VARCHAR(128) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(64) NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  visit_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (activity_date, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_homepage_daily_visits_date ON homepage_daily_visits (activity_date);
