import { and, eq } from "drizzle-orm";
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

export type ModuleVisitCounts = Partial<{
  theory: number;
  operate: number;
  mock: number;
}>;

const MODULE_KEYS = ["theory", "operate", "mock"] as const;

export function pingFlagsToIncrements(flags?: ActivityFlags): ModuleVisitCounts | null {
  if (!flags) return null;
  const out: ModuleVisitCounts = {};
  if (flags.theory) out.theory = 1;
  if (flags.operate) out.operate = 1;
  if (flags.mock) out.mock = 1;
  return Object.keys(out).length > 0 ? out : null;
}

/** 兼容旧数据 boolean true 与新的 number 计数 */
export function normalizeModuleCounts(raw: Record<string, unknown> | null | undefined): ModuleVisitCounts {
  const out: ModuleVisitCounts = {};
  if (!raw) return out;
  for (const key of MODULE_KEYS) {
    const v = raw[key];
    if (typeof v === "number" && v > 0) out[key] = v;
    else if (v === true) out[key] = 1;
  }
  return out;
}

export function mergeModuleCounts(
  existing: Record<string, unknown> | null | undefined,
  increments: ModuleVisitCounts
): ModuleVisitCounts {
  const prev = normalizeModuleCounts(existing);
  const out: ModuleVisitCounts = { ...prev };
  for (const key of MODULE_KEYS) {
    const inc = increments[key] ?? 0;
    if (inc <= 0) continue;
    out[key] = (prev[key] ?? 0) + inc;
  }
  return out;
}

export async function touchActivity(
  userId: string,
  ip: string,
  flags?: ActivityFlags
): Promise<void> {
  const activityDate = shanghaiDateString();
  const now = new Date();
  const increments = pingFlagsToIncrements(flags);

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(userDailyActivity)
        .where(and(eq(userDailyActivity.userId, userId), eq(userDailyActivity.activityDate, activityDate)));

      if (row) {
        await tx
          .update(userDailyActivity)
          .set({
            lastSeenAt: now,
            lastIp: ip,
            pingCount: row.pingCount + 1,
            ...(increments ? { flags: mergeModuleCounts(row.flags, increments) } : {}),
          })
          .where(
            and(eq(userDailyActivity.userId, userId), eq(userDailyActivity.activityDate, activityDate))
          );
      } else {
        await tx.insert(userDailyActivity).values({
          userId,
          activityDate,
          firstSeenAt: now,
          lastSeenAt: now,
          pingCount: 1,
          lastIp: ip,
          flags: increments,
        });
      }
    });

    await db.update(users).set({ lastActiveAt: now, lastActiveIp: ip }).where(eq(users.id, userId));
  } catch {
    /* 活跃统计失败不影响主流程 */
  }
}
