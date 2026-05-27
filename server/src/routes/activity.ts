import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { touchActivity, shanghaiDateString, type ActivityFlags } from "../activity.js";
import { clientIpFromRequest } from "../client-ip.js";
import { resolveLocationsByIps } from "../ip-location.js";
import { db } from "../db/index.js";
import { userDailyActivity, users } from "../db/schema.js";

const pingSchema = z.object({
  flags: z
    .object({
      theory: z.boolean().optional(),
      operate: z.boolean().optional(),
      mock: z.boolean().optional(),
    })
    .optional(),
});

const lastPingAt = new Map<string, number>();
const PING_MIN_INTERVAL_MS = 60_000;

function shouldRecordPing(userId: string): boolean {
  const now = Date.now();
  const prev = lastPingAt.get(userId) ?? 0;
  if (now - prev < PING_MIN_INTERVAL_MS) return false;
  lastPingAt.set(userId, now);
  return true;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const u = request.user as { role?: string } | undefined;
  if (u?.role !== "admin") {
    await reply.code(403).send({ error: "需要管理员权限" });
    return false;
  }
  return true;
}

const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function registerActivityRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.post("/api/activity/ping", { preHandler: [authenticate] }, async (request, reply) => {
    const jwtUser = request.user as { sub: string };
    if (!shouldRecordPing(jwtUser.sub)) {
      return reply.send({ ok: true, skipped: true });
    }

    const parsed = pingSchema.safeParse(request.body ?? {});
    const flags = parsed.success ? parsed.data.flags : undefined;
    const ip = clientIpFromRequest(request.headers as Record<string, unknown>, request.ip);

    await touchActivity(jwtUser.sub, ip, flags as ActivityFlags | undefined);
    return reply.send({ ok: true });
  });

  app.get("/api/admin/daily-activity", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const q = request.query as { date?: string };
    const dateStr = q.date?.trim() || shanghaiDateString();
    if (!dateQuerySchema.safeParse(dateStr).success) {
      return reply.code(400).send({ error: "date 须为 YYYY-MM-DD" });
    }

    const rows = await db
      .select({
        userId: userDailyActivity.userId,
        email: users.email,
        displayName: users.displayName,
        registeredAt: users.createdAt,
        firstSeenAt: userDailyActivity.firstSeenAt,
        lastSeenAt: userDailyActivity.lastSeenAt,
        pingCount: userDailyActivity.pingCount,
        lastIp: userDailyActivity.lastIp,
        flags: userDailyActivity.flags,
      })
      .from(userDailyActivity)
      .innerJoin(users, eq(users.id, userDailyActivity.userId))
      .where(eq(userDailyActivity.activityDate, dateStr))
      .orderBy(desc(userDailyActivity.lastSeenAt));

    const locationByIp = await resolveLocationsByIps(rows.map((r) => r.lastIp));

    return reply.send({
      date: dateStr,
      count: rows.length,
      users: rows.map((r) => ({
        userId: r.userId,
        email: r.email,
        displayName: r.displayName,
        registeredAt: r.registeredAt.toISOString(),
        firstSeenAt: r.firstSeenAt.toISOString(),
        lastSeenAt: r.lastSeenAt.toISOString(),
        pingCount: r.pingCount,
        lastIp: r.lastIp,
        lastLocation: locationByIp.get(r.lastIp) ?? "未知",
        flags: r.flags ?? null,
      })),
    });
  });
}
