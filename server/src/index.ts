import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { seedAdminFromEnv } from "./seed.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
  console.error("请设置 JWT_SECRET（至少 16 字符）");
  process.exit(1);
}
const jwtSecret = JWT_SECRET;

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: string };
    user: { sub: string; role: string };
  }
}

async function build() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: jwtSecret,
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  });

  const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: "未登录或令牌无效" });
    }
  };

  await registerAuthRoutes(app, authenticate);
  await registerAdminRoutes(app, authenticate);

  app.get("/api/health", async () => ({ ok: true }));

  return app;
}

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

build()
  .then(async (app) => {
    await seedAdminFromEnv();
    await app.listen({ port, host });
    console.log(`API listening on http://${host}:${port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
