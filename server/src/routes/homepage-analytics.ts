import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { shanghaiDateString } from "../activity.js";
import { clientIpFromRequest } from "../client-ip.js";
import { db } from "../db/index.js";
import { homepageDailyVisits, users } from "../db/schema.js";
import { touchHomepageVisit } from "../homepage-analytics.js";

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

  app.get("/api/admin/homepage-activity", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const q = request.query as { date?: string };
    const dateStr = q.date?.trim() || shanghaiDateString();
    if (!dateQuerySchema.safeParse(dateStr).success) {
      return reply.code(400).send({ error: "date 须为 YYYY-MM-DD" });
    }

    const rows = await db
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
      .orderBy(desc(homepageDailyVisits.lastSeenAt));

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
    });
  });
}
