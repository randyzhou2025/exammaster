-- 主页项目入口点击（考练宝典 / 提示词助手 / PrivacyBlur）
CREATE TABLE IF NOT EXISTS homepage_project_clicks (
  activity_date DATE NOT NULL,
  project_id VARCHAR(32) NOT NULL,
  visitor_key VARCHAR(128) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip VARCHAR(64) NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  click_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (activity_date, project_id, visitor_key)
);

CREATE INDEX IF NOT EXISTS idx_homepage_project_clicks_date ON homepage_project_clicks (activity_date);
CREATE INDEX IF NOT EXISTS idx_homepage_project_clicks_project ON homepage_project_clicks (activity_date, project_id);
