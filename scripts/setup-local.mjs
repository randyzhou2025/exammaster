/**
 * 一键本地环境：Docker Postgres → server/.env → drizzle db:push
 * 用法：在项目根目录执行  node scripts/setup-local.mjs
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(root, "server");
const envPath = path.join(serverDir, ".env");

const ENV_TEMPLATE = `# 本地开发（docker-compose 默认账号，勿用于生产）
DATABASE_URL=postgresql://exam:exam_dev_password@127.0.0.1:5433/exam_master
JWT_SECRET=dev-only-change-me-32chars-min
JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@local.test
ADMIN_PASSWORD=Admin123456

PORT=4000
HOST=0.0.0.0
`;

function hasDocker() {
  const r = spawnSync("docker", ["info"], { encoding: "utf8" });
  return r.status === 0;
}

function composeUp() {
  execSync("docker compose up -d", { cwd: root, stdio: "inherit" });
}

async function waitForPostgres() {
  console.log("等待 PostgreSQL 就绪…");
  for (let i = 0; i < 45; i++) {
    const r = spawnSync(
      "docker",
      ["compose", "exec", "-T", "postgres", "pg_isready", "-U", "exam", "-d", "exam_master"],
      { cwd: root, encoding: "utf8" }
    );
    if (r.status === 0) {
      console.log("数据库已就绪。");
      return;
    }
    await delay(1000);
  }
  throw new Error("PostgreSQL 在超时时间内未就绪，请执行: docker compose logs postgres");
}

function writeEnvIfMissing() {
  if (fs.existsSync(envPath)) {
    console.log("已存在 server/.env，跳过写入。");
    return;
  }
  fs.writeFileSync(envPath, ENV_TEMPLATE, "utf8");
  console.log("已生成 server/.env（本地开发默认值）。");
}

function dbPush() {
  console.log("执行 drizzle db:push …");
  execSync("npm run db:push", { cwd: serverDir, stdio: "inherit" });
}

async function main() {
  if (!hasDocker()) {
    writeEnvIfMissing();
    console.error("\n未检测到可用 Docker（或未启动 Docker Desktop）。");
    console.error("已尝试生成 server/.env（若原本不存在）。请任选其一：");
    console.error("  1) 安装并启动 Docker 后执行: npm run docker:up && cd server && npm run db:push");
    console.error("  2) 使用本机 PostgreSQL：编辑 server/.env 的 DATABASE_URL，再执行: cd server && npm run db:push");
    process.exit(1);
  }
  composeUp();
  await waitForPostgres();
  writeEnvIfMissing();
  dbPush();
  console.log("\n完成。启动方式二选一：");
  console.log("  A) 两个终端: npm run dev  与  npm run dev:api");
  console.log("  B) 单终端: npm run dev:full");
  console.log("\n默认管理员（首次启动 API 时写入库）: admin@local.test / Admin123456");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
