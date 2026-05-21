import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { userDailyActivity, users } from "./db/schema.js";

/** 上海时区日历日 YYYY-MM-DD */
export function shanghaiDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(d);
}

export type ActivityFlags = Partial<{
  theory: boolean;
  operate: boolean;
  mock: boolean;
}>;

export async function touchActivity(
  userId: string,
  ip: string,
  flags?: ActivityFlags
): Promise<void> {
  const activityDate = shanghaiDateString();
  const now = new Date();
  const flagsJson = flags && Object.keys(flags).length > 0 ? flags : null;

  try {
    await db
      .insert(userDailyActivity)
      .values({
        userId,
        activityDate,
        firstSeenAt: now,
        lastSeenAt: now,
        pingCount: 1,
        lastIp: ip,
        flags: flagsJson,
      })
      .onConflictDoUpdate({
        target: [userDailyActivity.userId, userDailyActivity.activityDate],
        set: {
          lastSeenAt: now,
          lastIp: ip,
          pingCount: sql`${userDailyActivity.pingCount} + 1`,
          ...(flagsJson
            ? {
                flags: sql`COALESCE(${userDailyActivity.flags}, '{}'::jsonb) || ${JSON.stringify(flagsJson)}::jsonb`,
              }
            : {}),
        },
      });

    await db.update(users).set({ lastActiveAt: now, lastActiveIp: ip }).where(eq(users.id, userId));
  } catch {
    /* 活跃统计失败不影响主流程 */
  }
}
