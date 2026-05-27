/**
 * 模块进入次数合并逻辑测试
 * 用法：node scripts/test-module-visit-counts.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function normalizeModuleCounts(raw) {
  const out = {};
  if (!raw) return out;
  for (const key of ["theory", "operate", "mock"]) {
    const v = raw[key];
    if (typeof v === "number" && v > 0) out[key] = v;
    else if (v === true) out[key] = 1;
  }
  return out;
}

function mergeModuleCounts(existing, increments) {
  const prev = normalizeModuleCounts(existing);
  const out = { ...prev };
  for (const key of ["theory", "operate", "mock"]) {
    const inc = increments[key] ?? 0;
    if (inc <= 0) continue;
    out[key] = (prev[key] ?? 0) + inc;
  }
  return out;
}

assert(JSON.stringify(normalizeModuleCounts({ theory: true })) === JSON.stringify({ theory: 1 }), "bool true");
assert(JSON.stringify(mergeModuleCounts({ theory: 2 }, { operate: 1 })) === JSON.stringify({ theory: 2, operate: 1 }), "merge new");
assert(JSON.stringify(mergeModuleCounts({ theory: true }, { theory: 1, mock: 1 })) === JSON.stringify({ theory: 2, mock: 1 }), "legacy bool + increment");

function hasModuleVisitFlags(flags) {
  return Boolean(flags && (flags.theory || flags.operate || flags.mock));
}

assert(hasModuleVisitFlags({ operate: true }) === true, "operate is module visit");
assert(hasModuleVisitFlags(undefined) === false, "empty is not module visit");

console.log("PASS: module visit counts tests");
