import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { hashPassword } from "./hash.js";

/** 首次启动：若配置了 ADMIN_EMAIL / ADMIN_PASSWORD 则创建管理员账号 */
export async function seedAdminFromEnv(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return;

  await db.insert(users).values({
    email,
    passwordHash: await hashPassword(password),
    displayName: "管理员",
    role: "admin",
    isAuthorized: true,
  });
  console.log(`[seed] 已创建管理员账号: ${email}`);
}
