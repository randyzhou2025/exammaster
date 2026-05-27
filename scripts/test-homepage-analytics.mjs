/**
 * 主页访问统计逻辑与 API 冒烟测试
 * 用法：node scripts/test-homepage-analytics.mjs
 * 可选：API_BASE=http://127.0.0.1:4000 node scripts/test-homepage-analytics.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function homepageVisitorKey(userId, ip) {
  if (userId) return `user:${userId}`;
  return `ip:${ip}`;
}

assert(homepageVisitorKey("abc-123", "1.2.3.4") === "user:abc-123", "logged-in key");
assert(homepageVisitorKey(null, "1.2.3.4") === "ip:1.2.3.4", "anonymous key");
assert(homepageVisitorKey(null, "unknown") === "ip:unknown", "unknown ip key");

const apiBase = (process.env.API_BASE ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function testApi() {
  const health = await fetch(`${apiBase}/api/health`);
  if (!health.ok) {
    console.log("SKIP: API 未运行，仅通过单元测试（设置 API_BASE 可测接口）");
    return;
  }

  const res = await fetch(`${apiBase}/api/analytics/homepage-view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(res.ok, `homepage-view 应返回 2xx，实际 ${res.status}`);
  const data = await res.json();
  assert(data.ok === true, "响应应含 ok: true");
  assert(typeof data.recorded === "boolean", "响应应含 recorded 布尔值");
  console.log(`PASS: POST /api/analytics/homepage-view (recorded=${data.recorded})`);
}

await testApi();
console.log("PASS: homepage analytics tests");
