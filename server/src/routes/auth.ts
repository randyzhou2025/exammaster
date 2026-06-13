import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { loginLogs, users } from "../db/schema.js";
import { touchActivity } from "../activity.js";
import { clientIpFromRequest } from "../client-ip.js";
import { resolveLocationByIp } from "../ip-location.js";
import { hashPassword, verifyPassword } from "../hash.js";
import { buildAuthUserPayload } from "../auth-user-payload.js";
import { isTrialModeEnabled } from "../trial-config.js";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** 登录 / 注册成功后写入一条登录日志（与 POST /api/auth/login 字段一致） */
async function recordLoginLog(request: FastifyRequest, userId: string, username: string): Promise<void> {
  const ip = clientIpFromRequest(request.headers as Record<string, unknown>, request.ip);
  const location = await resolveLocationByIp(ip);
  try {
    await db.insert(loginLogs).values({
      userId,
      username,
      ip,
      location,
    });
  } catch {
    /* ignore */
  }
}

export async function registerAuthRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.post("/api/auth/register", async (request, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "请求参数无效", details: parsed.error.flatten() });
    }
    const { email: rawEmail, password, displayName } = parsed.data;
    const email = rawEmail.trim().toLowerCase();

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return reply.code(409).send({ error: "该邮箱已注册" });
    }

    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(password),
        displayName: displayName?.trim() || null,
        role: "user",
        isAuthorized: !isTrialModeEnabled(),
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        isAuthorized: users.isAuthorized,
        createdAt: users.createdAt,
        subscriptionExpiresOn: users.subscriptionExpiresOn,
      });

    const token = await reply.jwtSign({ sub: created.id, role: created.role });

    await recordLoginLog(request, created.id, created.email);

    return reply.send({ token, user: buildAuthUserPayload(created) });
  });

  app.post("/api/auth/login", async (request, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "请求参数无效" });
    }
    const email = parsed.data.email.trim().toLowerCase();

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return reply.code(401).send({ error: "邮箱或密码错误" });
    }

    const ok = await verifyPassword(parsed.data.password, row.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "邮箱或密码错误" });
    }

    const token = await reply.jwtSign({ sub: row.id, role: row.role });

    await recordLoginLog(request, row.id, row.email);

    return reply.send({
      token,
      user: buildAuthUserPayload(row),
    });
  });

  app.get("/api/auth/me", { preHandler: [authenticate] }, async (request, reply) => {
    const jwtUser = request.user as { sub: string };
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.id, jwtUser.sub))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return reply.code(401).send({ error: "用户不存在" });
    }

    const ip = clientIpFromRequest(request.headers as Record<string, unknown>, request.ip);
    void touchActivity(jwtUser.sub, ip);

    return reply.send({ user: buildAuthUserPayload(row) });
  });
}
