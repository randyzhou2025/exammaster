import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { loginLogs, users } from "../db/schema.js";

const patchSchema = z.object({
  isAuthorized: z.boolean().optional(),
});

function publicUser(u: {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    isAuthorized: u.isAuthorized,
    createdAt: u.createdAt.toISOString(),
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

export async function registerAdminRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.get("/api/admin/users", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        isAuthorized: users.isAuthorized,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt));
    return reply.send({ users: rows.map(publicUser) });
  });

  app.patch("/api/admin/users/:id", { preHandler: [authenticate] }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const id = (request.params as { id: string }).id;
    const parsed = patchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "请求参数无效" });
    }
    if (parsed.data.isAuthorized === undefined) {
      return reply.code(400).send({ error: "无可更新字段" });
    }

    const rows = await db.update(users).set({ isAuthorized: parsed.data.isAuthorized }).where(eq(users.id, id)).returning();
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
