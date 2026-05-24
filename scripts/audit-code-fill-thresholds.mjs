/**
 * 对照 HTML「工作任务」题干中的数值规则，校验 solution-lines 是否一致
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOLUTION_LINES } from "./solution-lines-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const QUESTION_IDS = [
  "1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5",
  "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
  "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5",
];

function resolveMaterialHtmlPath(dir, id) {
  const exact = path.join(dir, `${id}.html`);
  if (fs.existsSync(exact)) return exact;
  if (!fs.existsSync(dir)) return null;
  const candidates = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".html") && (name === `${id}.html` || name.startsWith(`${id}_`) || name.startsWith(`${id}-`)))
    .sort((a, b) => b.localeCompare(a));
  return candidates[0] ? path.join(dir, candidates[0]) : null;
}

function workTaskPlainText(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const startRe = /<h3[^>]*>\s*工作任务\s*<\/h3>/i;
  const startMatch = html.match(startRe);
  if (!startMatch || startMatch.index === undefined) return "";
  const afterStart = html.slice(startMatch.index + startMatch[0].length);
  const nextH3 = afterStart.search(/<h3[^>]*>/i);
  const sectionHtml = nextH3 === -1 ? afterStart : afterStart.slice(0, nextH3);
  return sectionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** @returns {{ id: string, message: string }[]} */
export function auditSolutionThresholds() {
  const issues = [];

  for (const id of QUESTION_IDS) {
    const dir = path.join(root, "PythonCode", `${id}-素材`);
    const htmlPath = resolveMaterialHtmlPath(dir, id);
    if (!htmlPath) continue;

    const stem = workTaskPlainText(htmlPath);
    const lines = SOLUTION_LINES[id] ?? [];

    const incomeRule = stem.match(/收入[^。；]{0,30}大于\s*(\d+)/);
    const incomeLine = lines.find((l) => /is_income_valid/.test(l) || (/\['Income'\]/.test(l) && />\s*\d+/.test(l)));
    if (incomeRule && incomeLine) {
      const got = incomeLine.match(/\[['"]Income['"]\]\s*>\s*(\d+)/);
      if (got && got[1] !== incomeRule[1]) {
        issues.push({
          id,
          message: `收入阈值：题干要求 >${incomeRule[1]}，solution-lines 为 >${got[1]}（${incomeLine.trim()}）`,
        });
      }
    }
  }

  return issues;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const issues = auditSolutionThresholds();
  if (issues.length) {
    console.error(JSON.stringify(issues, null, 2));
    process.exit(1);
  }
  console.log("audit-code-fill-thresholds: ok");
}
