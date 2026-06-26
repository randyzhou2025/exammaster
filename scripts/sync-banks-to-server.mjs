#!/usr/bin/env node
/** 将前端题库 JSON 同步到 server/assets/banks/（本地 dev 与 Docker 构建用） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src/data");
const dest = path.join(root, "server/assets/banks");

const files = ["theoryBank.json", "theoryBankL4.json", "theoryBankFmoLiveL3.json", "theoryBankFmoTrafficL3.json", "theoryBankFmoAvL3.json", "codeFillBank.json"];

fs.mkdirSync(dest, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(src, f), path.join(dest, f));
  console.log("synced", f);
}
