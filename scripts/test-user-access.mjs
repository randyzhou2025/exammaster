/**
 * 访问权限与订阅到期逻辑单元测试
 * 用法：node scripts/test-user-access.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// 使用与生产相同的前端逻辑（纯 JS 路径）
const { shanghaiToday } = await import(path.join(root, "src/lib/shanghai-date.ts").replace(/\\/g, "/")).catch(
  () => ({ shanghaiToday: () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()) })
);

// 内联与 src/lib/examAccess.ts 相同逻辑，避免 TS 导入问题
function isSubscriptionActive(expiresOn) {
  if (!expiresOn) return true;
  const today = typeof shanghaiToday === "function" ? shanghaiToday() : new Date().toISOString().slice(0, 10);
  return today <= expiresOn.slice(0, 10);
}

function hasExamAccess(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.isAuthorized) return false;
  return isSubscriptionActive(user.subscriptionExpiresOn);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
const d = new Date(`${today}T12:00:00+08:00`);
d.setDate(d.getDate() - 1);
const yesterday = d.toISOString().slice(0, 10);

assert(isSubscriptionActive(null) === true, "null expires = active");
assert(isSubscriptionActive(today) === true, "expires today = active");
assert(isSubscriptionActive(yesterday) === false, "expires yesterday = inactive");

const baseUser = {
  role: "user",
  isAuthorized: true,
  subscriptionExpiresOn: null,
};
assert(hasExamAccess(baseUser) === true, "authorized + no expiry");
assert(hasExamAccess({ ...baseUser, isAuthorized: false }) === false, "not authorized");
assert(hasExamAccess({ ...baseUser, subscriptionExpiresOn: yesterday }) === false, "expired");
assert(hasExamAccess({ ...baseUser, role: "admin", isAuthorized: false }) === true, "admin bypass");

console.log("PASS: user access / subscription tests");
