-- 用户订阅到期日（NULL = 永不到期；有值则按上海时区日历日判断访问权限）
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_on DATE;
