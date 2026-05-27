import { boolean, date, integer, jsonb, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isAuthorized: boolean("is_authorized").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  lastActiveIp: varchar("last_active_ip", { length: 64 }),
  /** 订阅到期日（上海日历日）；NULL 表示永不到期 */
  subscriptionExpiresOn: date("subscription_expires_on"),
});

/** 按用户 + 日历日汇总活跃（上海时区日期） */
export const userDailyActivity = pgTable(
  "user_daily_activity",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityDate: date("activity_date").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    pingCount: integer("ping_count").notNull().default(1),
    lastIp: varchar("last_ip", { length: 64 }).notNull().default("unknown"),
    /** 各模块当日进入次数：{ theory: 3, operate: 1, mock: 2 } */
    flags: jsonb("flags").$type<Record<string, number>>(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.activityDate] })]
);

export const loginLogs = pgTable("login_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 64 }).notNull(),
  location: varchar("location", { length: 255 }).notNull().default("未知"),
  loginAt: timestamp("login_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type LoginLogRow = typeof loginLogs.$inferSelect;
export type UserDailyActivityRow = typeof userDailyActivity.$inferSelect;

/** 根站主页 qiway.site/ 每日访问（与 examprep 活跃分开） */
export const homepageDailyVisits = pgTable(
  "homepage_daily_visits",
  {
    activityDate: date("activity_date").notNull(),
    visitorKey: varchar("visitor_key", { length: 128 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ip: varchar("ip", { length: 64 }).notNull().default("unknown"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    visitCount: integer("visit_count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.activityDate, t.visitorKey] })]
);

export type HomepageDailyVisitRow = typeof homepageDailyVisits.$inferSelect;

/** 主页项目入口点击（按日 + 项目 + 访客去重，可累计次数） */
export const homepageProjectClicks = pgTable(
  "homepage_project_clicks",
  {
    activityDate: date("activity_date").notNull(),
    projectId: varchar("project_id", { length: 32 }).notNull(),
    visitorKey: varchar("visitor_key", { length: 128 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ip: varchar("ip", { length: 64 }).notNull().default("unknown"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    clickCount: integer("click_count").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.activityDate, t.projectId, t.visitorKey] })]
);

export type HomepageProjectClickRow = typeof homepageProjectClicks.$inferSelect;
