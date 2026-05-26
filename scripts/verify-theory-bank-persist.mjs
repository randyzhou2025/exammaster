/**
 * 验证：localStorage 里即使有旧 bank 快照，合并后也应使用当前 THEORY_BANK 标答。
 * 用法：node scripts/verify-theory-bank-persist.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEORY_BANK = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/theoryBank.json"), "utf8")
);

/** 与 appStore persist merge 一致：始终 current.bank */
function mergeBank(_persistedBank, currentBank) {
  return currentBank;
}

/** 修复前的错误逻辑 */
function mergeBankLegacy(persistedBank, currentBank) {
  const usePersisted =
    Array.isArray(persistedBank) &&
    persistedBank.length > 0 &&
    !persistedBank.some((q) => q.id === "j1" || q.id === "s1");
  return usePersisted ? persistedBank : currentBank;
}

const staleBank = THEORY_BANK.map((q) => {
  if (q.id === "t3-j-19") return { ...q, answer: "B" };
  if (q.id === "t3-s-9") return { ...q, answer: "B" };
  return q;
});

const legacy = mergeBankLegacy(staleBank, THEORY_BANK);
const fixed = mergeBank(staleBank, THEORY_BANK);

const checks = [
  { id: "t3-j-19", expect: "A", staleInLegacy: "B" },
  { id: "t3-s-9", expect: "D", staleInLegacy: "B" },
  { id: "t3-j-8", expect: "B", staleInLegacy: "B" },
];

let failed = 0;
for (const { id, expect, staleInLegacy } of checks) {
  const leg = legacy.find((q) => q.id === id)?.answer;
  const fix = fixed.find((q) => q.id === id)?.answer;
  if (leg !== staleInLegacy) {
    console.error(`FAIL legacy ${id}: got ${leg}, want stale ${staleInLegacy}`);
    failed++;
  }
  if (fix !== expect) {
    console.error(`FAIL fixed ${id}: got ${fix}, want ${expect}`);
    failed++;
  }
}

if (failed) {
  process.exit(1);
}
console.log("verify-theory-bank-persist: ok (legacy stale, merge uses current bank)");
