import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { loginLogs, users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../hash.js";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

function normalizeClientIp(raw: string | undefined): string {
  if (!raw) return "unknown";
  const ip = raw.split(",")[0]?.trim() ?? "unknown";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const seg = Number(ip.split(".")[1] ?? "0");
    if (seg >= 16 && seg <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

async function resolveLocationByIp(ip: string): Promise<string> {
  if (isPrivateIp(ip)) return "内网IP";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,country,regionName,city`, {
      signal: controller.signal,
    });
    if (!res.ok) return "未知";
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status !== "success") return "未知";
    const parts = [data.country, data.regionName, data.city].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "未知";
  } catch {
    return "未知";
  } finally {
    clearTimeout(timer);
  }
}

/** 登录 / 注册成功后写入一条登录日志（与 POST /api/auth/login 字段一致） */
async function recordLoginLog(request: FastifyRequest, userId: string, username: string): Promise<void> {
  const ip = normalizeClientIp(
    (request.headers["x-forwarded-for"] as string | undefined) ?? request.ip
  );
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
        /** 注册后即可使用备考功能；管理员仍可后台撤销授权 */
        isAuthorized: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        isAuthorized: users.isAuthorized,
        createdAt: users.createdAt,
      });

    const token = await reply.jwtSign({ sub: created.id, role: created.role });

    await recordLoginLog(request, created.id, created.email);

    return reply.send({ token, user: publicUser(created) });
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
      user: publicUser(row),
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
    return reply.send({ user: publicUser(row) });
  });
}
