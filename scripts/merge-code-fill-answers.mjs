/**
 * 合并 PDF 高亮答案 + solution-lines 行对齐答案，输出每题按空位顺序的数组
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { SOLUTION_LINES } from "./solution-lines-data.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BLANK_RE = /_{5,}/;
const countBlanks = (line) => (line.match(/_{5,}/g) || []).length;

const QUESTION_IDS = [
  "1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5",
  "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
  "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5",
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function norm(s) {
  return s.replace(/\s*#.*$/, "").replace(/\s+/g, " ").trim();
}

/** 模板行与完整答案行对齐，抽取各空答案 */
export function extractFromPair(template, solution) {
  const t = norm(template);
  const sol = norm(solution);
  const parts = t.split(BLANK_RE);
  if (parts.length < 2) return null;
  let body = "^";
  for (let i = 0; i < parts.length; i++) {
    body += escapeRegExp(parts[i]);
    if (i < parts.length - 1) body += "(.*?)";
  }
  body += "$";
  const m = new RegExp(body).exec(sol);
  if (!m) return null;
  return m.slice(1).map((g) => g.trim());
}

function blankTemplates(ipynbPath) {
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

function countBlanksInIpynb(ipynbPath) {
  const nb = JSON.parse(fs.readFileSync(ipynbPath, "utf8"));
  let n = 0;
  for (const cell of nb.cells) {
    if (cell.cell_type !== "code") continue;
    for (const line of cell.source.join("").split("\n")) {
      n += countBlanks(line);
    }
  }
  return n;
}

function loadPdfAnswers() {
  const py = path.join(__dirname, "extract-pdf-code-answers.py");
  const r = spawnSync("python3", [py], { cwd: root, encoding: "utf8", timeout: 120000 });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    return {};
  }
  try {
    return JSON.parse(r.stdout);
  } catch {
    return {};
  }
}

function loadManual() {
  const p = path.join(__dirname, "code-fill-answer-manual.json");
  if (!fs.existsSync(p)) return {};
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function manualChunk(man, start, n) {
  if (!man) return null;
  if (Array.isArray(man)) {
    const slice = man.slice(start, start + n);
    return slice.length === n && slice.every((a) => a?.trim()) ? slice : null;
  }
  const chunk = [];
  for (let i = 0; i < n; i++) {
    const v = man[String(start + i)];
    if (!v?.trim()) return null;
    chunk.push(v);
  }
  return chunk;
}

/**
 * @returns {{ answers: Record<string, string[]>, unparsed: object[] }}
 */
export function mergeAllAnswers() {
  const pdfAnswers = loadPdfAnswers();
  const manual = loadManual();
  const answers = {};
  const unparsed = [];

  for (const qid of QUESTION_IDS) {
    const ipynb = path.join(root, "PythonCode", `${qid}-素材`, `${qid}.ipynb`);
    const templates = blankTemplates(ipynb);
    const solLines = SOLUTION_LINES[qid] ?? [];
    const pdf = pdfAnswers[qid] ?? [];
    const man = manual[qid] ?? null;

    const merged = [];
    let pdfCursor = 0;

    const blankTotal = countBlanksInIpynb(ipynb);

    let solCursor = 0;
    templates.forEach((tmpl, lineIdx) => {
      const n = countBlanks(tmpl);
      let chunk = null;
      let matchedSolLine = null;

      // 按空行模板在完整答案行中顺序匹配（勿用 lineIdx 对 solLines，二者常不对齐）
      for (let j = solCursor; j < solLines.length; j++) {
        const fromSol = extractFromPair(tmpl, solLines[j]);
        if (fromSol && fromSol.length === n && fromSol.every((a) => a)) {
          chunk = fromSol;
          matchedSolLine = solLines[j];
          solCursor = j + 1;
          break;
        }
      }

      if (!chunk) {
        chunk = manualChunk(man, merged.length, n);
      }

      if (!chunk) {
        chunk = Array(n).fill("");
        unparsed.push({
          questionId: qid,
          lineIndex: lineIdx + 1,
          blankCount: n,
          template: tmpl.trim(),
          solutionLine: matchedSolLine ?? solLines[solCursor] ?? null,
          pdfHint: pdf.slice(merged.length, merged.length + n),
        });
      }

      merged.push(...chunk);
    });

    while (merged.length < blankTotal) merged.push("");
    if (merged.length > blankTotal) merged.length = blankTotal;

    // 仅用 PDF 填补 solution-lines 未覆盖的空位（避免整题覆盖导致章节串题）
    if (pdf.length === blankTotal) {
      for (let i = 0; i < blankTotal; i++) {
        if (!merged[i]?.trim() && pdf[i]?.trim()) merged[i] = pdf[i];
      }
    }
    answers[qid] = merged;
  }

  return { answers, unparsed };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { answers, unparsed } = mergeAllAnswers();
  const out = { answers, unparsed, stats: {} };
  let total = 0;
  let filled = 0;
  for (const qid of QUESTION_IDS) {
    const a = answers[qid];
    total += a.length;
    filled += a.filter((x) => x?.trim()).length;
    out.stats[qid] = { blanks: a.length, filled: a.filter((x) => x?.trim()).length };
  }
  out.stats.total = { blanks: total, filled, rate: total ? filled / total : 0 };
  console.log(JSON.stringify(out, null, 2));
}
