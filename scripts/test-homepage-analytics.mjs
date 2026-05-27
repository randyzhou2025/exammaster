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

const VALID_PROJECT_IDS = ["examprep", "prompt-tool", "privacy-blur-online", "privacy-blur-download"];

assert(homepageVisitorKey("abc-123", "1.2.3.4") === "user:abc-123", "logged-in key");
assert(homepageVisitorKey(null, "1.2.3.4") === "ip:1.2.3.4", "anonymous key");
assert(homepageVisitorKey(null, "unknown") === "ip:unknown", "unknown ip key");
assert(VALID_PROJECT_IDS.length === 4, "four project ids");

const apiBase = (process.env.API_BASE ?? "http://127.0.0.1:4000").replace(/\/$/, "");

async function testApi() {
  const health = await fetch(`${apiBase}/api/health`);
  if (!health.ok) {
    console.log("SKIP: API 未运行，仅通过单元测试（设置 API_BASE 可测接口）");
    return;
  }

  const viewRes = await fetch(`${apiBase}/api/analytics/homepage-view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert(viewRes.ok, `homepage-view 应返回 2xx，实际 ${viewRes.status}`);
  const viewData = await viewRes.json();
  assert(viewData.ok === true, "响应应含 ok: true");
  assert(typeof viewData.recorded === "boolean", "响应应含 recorded 布尔值");
  console.log(`PASS: POST /api/analytics/homepage-view (recorded=${viewData.recorded})`);

  for (const projectId of VALID_PROJECT_IDS) {
    const res = await fetch(`${apiBase}/api/analytics/homepage-project-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    assert(res.ok, `${projectId} click 应返回 2xx，实际 ${res.status}`);
    const data = await res.json();
    assert(data.ok === true, `${projectId} 响应应含 ok: true`);
    console.log(`PASS: POST homepage-project-click (${projectId})`);
  }

  const bad = await fetch(`${apiBase}/api/analytics/homepage-project-click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "invalid" }),
  });
  assert(bad.status === 400, "无效 projectId 应返回 400");
  console.log("PASS: invalid projectId rejected");
}

await testApi();
console.log("PASS: homepage analytics tests");
