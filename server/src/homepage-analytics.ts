import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { homepageDailyVisits, homepageProjectClicks } from "./db/schema.js";
import { shanghaiDateString } from "./activity.js";

const lastHomepageViewAt = new Map<string, number>();
const MIN_INTERVAL_MS = 60_000;

export const HOMEPAGE_PROJECT_IDS = [
  "examprep",
  "prompt-tool",
  "privacy-blur-online",
  "privacy-blur-download",
] as const;

/** 技能考 · 上海站考试详情 projectId（jk-exam-{slug}） */
export const JK_EXAM_PROJECT_IDS = [
  "jk-exam-fire-operator",
  "jk-exam-special-operation",
  "jk-exam-ai-trainer",
  "jk-exam-network-security-admin",
  "jk-exam-omni-media-operator",
  "jk-exam-ecommerce-specialist",
  "jk-exam-internet-marketer",
  "jk-exam-elderly-care-worker",
  "jk-exam-domestic-worker",
] as const;

export const JK_EXAM_LABELS: Record<(typeof JK_EXAM_PROJECT_IDS)[number], string> = {
  "jk-exam-fire-operator": "消防设施操作员",
  "jk-exam-special-operation": "特种作业人员",
  "jk-exam-ai-trainer": "人工智能训练师",
  "jk-exam-network-security-admin": "网络与信息安全管理员",
  "jk-exam-omni-media-operator": "全媒体运营师",
  "jk-exam-ecommerce-specialist": "电子商务师",
  "jk-exam-internet-marketer": "互联网营销师",
  "jk-exam-elderly-care-worker": "养老护理员",
  "jk-exam-domestic-worker": "家政服务员",
};

export type HomepageProjectId =
  | (typeof HOMEPAGE_PROJECT_IDS)[number]
  | (typeof JK_EXAM_PROJECT_IDS)[number];

export function isHomepageProjectId(id: string): id is HomepageProjectId {
  if ((HOMEPAGE_PROJECT_IDS as readonly string[]).includes(id)) return true;
  if ((JK_EXAM_PROJECT_IDS as readonly string[]).includes(id)) return true;
  return false;
}

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

/** 记录主页项目入口点击 */
export async function touchProjectClick(
  projectId: HomepageProjectId,
  userId: string | null,
  ip: string
): Promise<{ recorded: boolean }> {
  const visitorKey = homepageVisitorKey(userId, ip);
  const activityDate = shanghaiDateString();
  const now = new Date();

  try {
    await db
      .insert(homepageProjectClicks)
      .values({
        activityDate,
        projectId,
        visitorKey,
        userId: userId ?? null,
        ip,
        firstSeenAt: now,
        lastSeenAt: now,
        clickCount: 1,
      })
      .onConflictDoUpdate({
        target: [
          homepageProjectClicks.activityDate,
          homepageProjectClicks.projectId,
          homepageProjectClicks.visitorKey,
        ],
        set: {
          lastSeenAt: now,
          ip,
          clickCount: sql`${homepageProjectClicks.clickCount} + 1`,
          ...(userId ? { userId } : {}),
        },
      });
    return { recorded: true };
  } catch {
    return { recorded: false };
  }
}

export interface ProjectClickStat {
  projectId: string;
  uniqueVisitors: number;
  totalClicks: number;
}

/** 按项目汇总某日点击（原始 project_id 粒度） */
export async function getProjectClickStats(activityDate: string): Promise<ProjectClickStat[]> {
  const rows = await db
    .select({
      projectId: homepageProjectClicks.projectId,
      uniqueVisitors: sql<number>`count(*)::int`,
      totalClicks: sql<number>`coalesce(sum(${homepageProjectClicks.clickCount}), 0)::int`,
    })
    .from(homepageProjectClicks)
    .where(eq(homepageProjectClicks.activityDate, activityDate))
    .groupBy(homepageProjectClicks.projectId);

  return rows.map((r) => ({
    projectId: r.projectId,
    uniqueVisitors: r.uniqueVisitors,
    totalClicks: r.totalClicks,
  }));
}
