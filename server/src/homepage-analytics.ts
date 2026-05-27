import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { homepageDailyVisits } from "./db/schema.js";
import { shanghaiDateString } from "./activity.js";

const lastHomepageViewAt = new Map<string, number>();
const MIN_INTERVAL_MS = 60_000;

function shouldRecordHomepageView(visitorKey: string): boolean {
  const now = Date.now();
  const prev = lastHomepageViewAt.get(visitorKey) ?? 0;
  if (now - prev < MIN_INTERVAL_MS) return false;
  lastHomepageViewAt.set(visitorKey, now);
  return true;
}

export function homepageVisitorKey(userId: string | null, ip: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${ip}`;
}

/** 记录根站主页访问；已登录用户按账号，否则按 IP */
export async function touchHomepageVisit(
  userId: string | null,
  ip: string
): Promise<{ recorded: boolean }> {
  const visitorKey = homepageVisitorKey(userId, ip);
  if (!shouldRecordHomepageView(visitorKey)) {
    return { recorded: false };
  }

  const activityDate = shanghaiDateString();
  const now = new Date();

  try {
    await db
      .insert(homepageDailyVisits)
      .values({
        activityDate,
        visitorKey,
        userId: userId ?? null,
        ip,
        firstSeenAt: now,
        lastSeenAt: now,
        visitCount: 1,
      })
      .onConflictDoUpdate({
        target: [homepageDailyVisits.activityDate, homepageDailyVisits.visitorKey],
        set: {
          lastSeenAt: now,
          ip,
          visitCount: sql`${homepageDailyVisits.visitCount} + 1`,
          ...(userId ? { userId } : {}),
        },
      });
    return { recorded: true };
  } catch {
    return { recorded: false };
  }
}
