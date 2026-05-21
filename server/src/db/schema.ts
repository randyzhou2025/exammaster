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
    flags: jsonb("flags").$type<Record<string, boolean>>(),
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
