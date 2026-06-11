import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { shanghaiDateString } from "../activity.js";
import { clientIpFromRequest } from "../client-ip.js";
import { db } from "../db/index.js";
import { homepageDailyVisits, users } from "../db/schema.js";
import {
  getProjectClickStats,
  isHomepageProjectId,
  JK_EXAM_LABELS,
  JK_EXAM_PROJECT_IDS,
  touchHomepageVisit,
  touchProjectClick,
} from "../homepage-analytics.js";

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const projectClickSchema = z.object({
  projectId: z.string().min(1).max(32),
});

async function optionalUserId(request: FastifyRequest): Promise<string | null> {
  const auth = request.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    await request.jwtVerify();
    return (request.user as { sub: string }).sub;
  } catch {
    return null;
  }
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const u = request.user as { role?: string } | undefined;
  if (u?.role !== "admin") {
    await reply.code(403).send({ error: "需要管理员权限" });
    return false;
  }
  return true;
}

function buildProjectSummaries(stats: Awaited<ReturnType<typeof getProjectClickStats>>) {
  const byId = new Map(stats.map((s) => [s.projectId, s]));
  const pick = (id: string) => byId.get(id) ?? { projectId: id, uniqueVisitors: 0, totalClicks: 0 };

  const examprep = pick("examprep");
  const promptTool = pick("prompt-tool");
  const pbOnline = pick("privacy-blur-online");
  const pbDownload = pick("privacy-blur-download");

  const jkExams = JK_EXAM_PROJECT_IDS.map((id) => {
    const s = pick(id);
    return {
      projectId: id,
      label: JK_EXAM_LABELS[id],
      uniqueVisitors: s.uniqueVisitors,
      totalClicks: s.totalClicks,
    };
  });
  const jkTotals = jkExams.reduce(
    (acc, s) => ({
      uniqueVisitors: acc.uniqueVisitors + s.uniqueVisitors,
      totalClicks: acc.totalClicks + s.totalClicks,
    }),
    { uniqueVisitors: 0, totalClicks: 0 }
  );

  return [
    {
      projectId: "jinengkao-exams",
      label: "技能考 · 考试详情（上海站）",
      uniqueVisitors: jkTotals.uniqueVisitors,
      totalClicks: jkTotals.totalClicks,
      breakdown: Object.fromEntries(jkExams.map((e) => [e.projectId, e])),
    },
    {
      projectId: "examprep",
      label: "考练宝典 · 备考刷题",
      uniqueVisitors: examprep.uniqueVisitors,
      totalClicks: examprep.totalClicks,
    },
    {
      projectId: "prompt-tool",
      label: "AI提示词生成助手",
      uniqueVisitors: promptTool.uniqueVisitors,
      totalClicks: promptTool.totalClicks,
    },
    {
      projectId: "privacy-blur",
      label: "PrivacyBlur · 图片隐私打码",
      uniqueVisitors: pbOnline.uniqueVisitors + pbDownload.uniqueVisitors,
      totalClicks: pbOnline.totalClicks + pbDownload.totalClicks,
      breakdown: {
        online: {
          label: "打开在线版",
          uniqueVisitors: pbOnline.uniqueVisitors,
          totalClicks: pbOnline.totalClicks,
        },
        download: {
          label: "下载本地版",
          uniqueVisitors: pbDownload.uniqueVisitors,
          totalClicks: pbDownload.totalClicks,
        },
      },
    },
  ];
}

export async function registerHomepageAnalyticsRoutes(
  app: FastifyInstance,
  authenticate: preHandlerHookHandler
) {
  app.post("/api/analytics/homepage-view", async (request, reply) => {
    const userId = await optionalUserId(request);
    const ip = clientIpFromRequest(request.headers as Record<string, unknown>, request.ip);
    const result = await touchHomepageVisit(userId, ip);
    return reply.send({ ok: true, recorded: result.recorded });
  });

  app.post("/api/analytics/homepage-project-click", async (request, reply) => {
    const parsed = projectClickSchema.safeParse(request.body ?? {});
    if (!parsed.success || !isHomepageProjectId(parsed.data.projectId)) {
      return reply.code(400).send({ error: "无效的 projectId" });
    }

    const userId = await optionalUserId(request);
    const ip = clientIpFromRequest(request.headers as Record<string, unknown>, request.ip);
    const result = await touchProjectClick(parsed.data.projectId, userId, ip);
    return reply.send({ ok: true, recorded: result.recorded });
  });

  app.get("/api/admin/homepage-activity", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const q = request.query as { date?: string };
    const dateStr = q.date?.trim() || shanghaiDateString();
    if (!dateQuerySchema.safeParse(dateStr).success) {
      return reply.code(400).send({ error: "date 须为 YYYY-MM-DD" });
    }

    const [rows, projectStats] = await Promise.all([
      db
        .select({
          visitorKey: homepageDailyVisits.visitorKey,
          userId: homepageDailyVisits.userId,
          email: users.email,
          displayName: users.displayName,
          ip: homepageDailyVisits.ip,
          firstSeenAt: homepageDailyVisits.firstSeenAt,
          lastSeenAt: homepageDailyVisits.lastSeenAt,
          visitCount: homepageDailyVisits.visitCount,
        })
        .from(homepageDailyVisits)
        .leftJoin(users, eq(users.id, homepageDailyVisits.userId))
        .where(eq(homepageDailyVisits.activityDate, dateStr))
        .orderBy(desc(homepageDailyVisits.lastSeenAt)),
      getProjectClickStats(dateStr),
    ]);

    const visitors = rows.map((r) => ({
      visitorKey: r.visitorKey,
      userId: r.userId,
      email: r.email,
      displayName: r.displayName,
      isRegistered: r.userId != null,
      ip: r.ip,
      firstSeenAt: r.firstSeenAt.toISOString(),
      lastSeenAt: r.lastSeenAt.toISOString(),
      visitCount: r.visitCount,
    }));

    const registeredCount = visitors.filter((v) => v.isRegistered).length;
    const anonymousCount = visitors.length - registeredCount;

    return reply.send({
      date: dateStr,
      count: visitors.length,
      registeredCount,
      anonymousCount,
      visitors,
      projects: buildProjectSummaries(projectStats),
    });
  });
}
