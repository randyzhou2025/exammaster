import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "缺少 DATABASE_URL。请在 server 目录复制 .env.example 为 .env，并填写 PostgreSQL 连接串（参见 server/.env.example）。"
  );
}

const client = postgres(url, { max: 10 });
export const db = drizzle(client, { schema });
