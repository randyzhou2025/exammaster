-- 每日活跃统计（若 drizzle-kit push 显示 No changes 但 API 登录 500，可手动执行本脚本）
-- 在 Postgres 容器内：psql -U exam -d exam_master -f /path/001-user-daily-activity.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_ip VARCHAR(64);

CREATE TABLE IF NOT EXISTS user_daily_activity (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  ping_count INTEGER NOT NULL DEFAULT 1,
  last_ip VARCHAR(64) NOT NULL DEFAULT 'unknown',
  flags JSONB,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_activity_date ON user_daily_activity (activity_date);
