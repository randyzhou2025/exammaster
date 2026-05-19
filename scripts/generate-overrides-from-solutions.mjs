/**
 * 从 solution-lines-data.mjs 与 ipynb 空行对齐，生成 code-fill-answer-overrides.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SOLUTION_LINES } from "./solution-lines-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BLANK_RE = /_{5,}/;
const countBlanks = (line) => (line.match(/_{5,}/g) || []).length;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanLine(s) {
  return s.replace(/\s*#.*$/, "").trim();
}

function extractFromPair(template, solution) {
  const t = cleanLine(template);
  const sol = cleanLine(solution);
  const parts = t.split(BLANK_RE);
  if (parts.length < 2) return [];
  let body = "";
  for (let i = 0; i < parts.length; i++) {
    body += escapeRegExp(parts[i]);
    if (i < parts.length - 1) body += "(.*?)";
  }
  const re = new RegExp(`^${body}$`);
  const m = re.exec(sol.trim());
  if (!m) return null;
  return m.slice(1).map((g) => g.trim());
}

function blankLines(ipynbPath) {
  const nb = JSON.parse(fs.readFileSync(ipynbPath, "utf8"));
  const lines = [];
  for (const cell of nb.cells) {
    if (cell.cell_type !== "code") continue;
    for (const line of cell.source.join("").split("\n")) {
      if (countBlanks(line) > 0) lines.push(line);
    }
  }
  return lines;
}

const out = {};
let errors = 0;

for (const [qid, solutions] of Object.entries(SOLUTION_LINES)) {
  const ipynb = path.join(root, "PythonCode", `${qid}-素材`, `${qid}.ipynb`);
  const templates = blankLines(ipynb);
  const answers = [];

  if (templates.length !== solutions.length) {
    console.warn(
      `${qid}: template lines ${templates.length} != solution lines ${solutions.length}`
    );
  }

  const n = Math.max(templates.length, solutions.length);
  for (let i = 0; i < n; i++) {
    const tmpl = templates[i];
    const sol = solutions[i];
    if (!tmpl) {
      answers.push("");
      continue;
    }
    if (!sol) {
      answers.push("");
      errors++;
      continue;
    }
    const got = extractFromPair(tmpl, sol);
    if (!got || got.some((a) => !a)) {
      console.warn(`${qid} line ${i + 1} mismatch:\n  T: ${tmpl}\n  S: ${sol}`);
      errors++;
      if (got) answers.push(...got);
      else answers.push(...Array(countBlanks(tmpl)).fill(""));
    } else {
      answers.push(...got);
    }
  }
  out[qid] = answers;
}

const outPath = path.join(__dirname, "code-fill-answer-overrides.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("wrote", outPath, "errors", errors);
