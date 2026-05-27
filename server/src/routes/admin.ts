import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { shanghaiDateString } from "../activity.js";
import { db } from "../db/index.js";
import { loginLogs, userDailyActivity, users } from "../db/schema.js";

const patchSchema = z.object({
  isAuthorized: z.boolean().optional(),
  subscriptionExpiresOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});

function formatDateOnly(d: Date | string | null): string | null {
  if (d == null) return null;
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function publicUser(u: {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
  lastActiveIp: string | null;
  subscriptionExpiresOn: Date | string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    isAuthorized: u.isAuthorized,
    createdAt: u.createdAt.toISOString(),
    lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
    lastActiveIp: u.lastActiveIp ?? null,
    subscriptionExpiresOn: formatDateOnly(u.subscriptionExpiresOn),
  };
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const u = request.user as { role?: string } | undefined;
  if (u?.role !== "admin") {
    await reply.code(403).send({ error: "需要管理员权限" });
    return false;
  }
  return true;
}

const userSelect = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  isAuthorized: users.isAuthorized,
  createdAt: users.createdAt,
  lastActiveAt: users.lastActiveAt,
  lastActiveIp: users.lastActiveIp,
  subscriptionExpiresOn: users.subscriptionExpiresOn,
};

async function getTodayUserStats() {
  const today = shanghaiDateString();
  const [activeRow, registeredRow] = await Promise.all([
    db
      .select({ total: count() })
      .from(userDailyActivity)
      .where(eq(userDailyActivity.activityDate, today)),
    db
      .select({ total: count() })
      .from(users)
      .where(sql`(${users.createdAt} AT TIME ZONE 'Asia/Shanghai')::date = ${today}::date`),
  ]);
  return {
    todayActiveCount: activeRow[0]?.total ?? 0,
    todayRegisteredCount: registeredRow[0]?.total ?? 0,
  };
}

export async function registerAdminRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.get("/api/admin/users", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;

    const parsed = listQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "查询参数无效" });
    }
    const { page, pageSize, q } = parsed.data;
    const search = q?.trim();
    const where: SQL | undefined = search
      ? or(ilike(users.email, `%${search}%`), ilike(users.displayName, `%${search}%`))
      : undefined;

    const [{ total }] = await db.select({ total: count() }).from(users).where(where);
    const offset = (page - 1) * pageSize;
    const [rows, todayStats] = await Promise.all([
      db
        .select(userSelect)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      getTodayUserStats(),
    ]);

    return reply.send({
      users: rows.map(publicUser),
      total,
      ...todayStats,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  });

  app.patch("/api/admin/users/:id", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const id = (request.params as { id: string }).id;
    const parsed = patchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "请求参数无效" });
    }
    const { isAuthorized, subscriptionExpiresOn } = parsed.data;
    if (isAuthorized === undefined && subscriptionExpiresOn === undefined) {
      return reply.code(400).send({ error: "无可更新字段" });
    }

    const rows = await db
      .update(users)
      .set({
        ...(isAuthorized !== undefined ? { isAuthorized } : {}),
        ...(subscriptionExpiresOn !== undefined
          ? { subscriptionExpiresOn: subscriptionExpiresOn === null ? null : subscriptionExpiresOn }
          : {}),
      })
      .where(eq(users.id, id))
      .returning();

    const row = rows[0];
    if (!row) {
      return reply.code(404).send({ error: "用户不存在" });
    }
    return reply.send({ user: publicUser(row) });
  });

  app.get("/api/admin/login-logs", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const rows = await db
      .select({
        id: loginLogs.id,
        userId: loginLogs.userId,
        username: loginLogs.username,
        ip: loginLogs.ip,
        location: loginLogs.location,
        loginAt: loginLogs.loginAt,
      })
      .from(loginLogs)
      .orderBy(desc(loginLogs.loginAt))
      .limit(200);
    return reply.send({
      logs: rows.map((x) => ({
        ...x,
        loginAt: x.loginAt.toISOString(),
      })),
    });
  });
}
