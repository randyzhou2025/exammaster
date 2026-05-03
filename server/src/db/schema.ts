import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isAuthorized: boolean("is_authorized").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
