/**
 * 从 PythonCode 素材构建 src/data/codeFillBank.json
 * 答案：PDF 黄色高亮 + solution-lines-data 行对齐 + 人工兜底
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeAllAnswers } from "./merge-code-fill-answers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const QUESTION_IDS = [
  "1.1.1", "1.1.2", "1.1.3", "1.1.4", "1.1.5",
  "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.1.5",
  "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5",
  "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5",
];

const BLANK_RE = /_{5,}/;


function parseIpynb(ipynbPath) {
  const nb = JSON.parse(fs.readFileSync(ipynbPath, "utf8"));
  const cells = [];
  let cellIndex = 0;
  for (const cell of nb.cells) {
    if (cell.cell_type !== "code") continue;
    const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source ?? "");
    const lines = source.split("\n");
    const lineBlanks = [];
    lines.forEach((line, lineIndex) => {
      const count = (line.match(/_{5,}/g) || []).length;
      if (count === 0) return;
      lineBlanks.push({ lineIndex, template: line, count });
    });
    cells.push({ cellIndex, lines, lineBlanks });
    cellIndex++;
  }
  return cells;
}

function countBlanks(cells) {
  return cells.reduce((n, c) => n + c.lineBlanks.reduce((s, lb) => s + lb.count, 0), 0);
}

function htmlToPlainText(fragment) {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 仅提取 html 中「工作任务」小节正文（至下一 h3 为止） */
function extractWorkTaskSection(html) {
  const startRe = /<h3[^>]*>\s*工作任务\s*<\/h3>/i;
  const startMatch = html.match(startRe);
  if (!startMatch || startMatch.index === undefined) return null;
  const afterStart = html.slice(startMatch.index + startMatch[0].length);
  const nextH3 = afterStart.search(/<h3[^>]*>/i);
  const sectionHtml = nextH3 === -1 ? afterStart : afterStart.slice(0, nextH3);
  return htmlToPlainText(sectionHtml);
}

function parseHtmlStem(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(htmlPath, ".html");
  const stem = extractWorkTaskSection(html) ?? "";
  return { title, stem };
}

function buildCellsWithAnswers(cells, answers) {
  let ai = 0;
  return cells.map((cell) => {
    const lineEntries = cell.lines.map((line) => {
      const parts = line.split(BLANK_RE);
      const blankCount = parts.length - 1;
      const lineBlanks = [];
      for (let i = 0; i < blankCount; i++) {
        const ans = answers[ai] ?? "";
        lineBlanks.push({
          id: `b${ai}`,
          accepted: ans ? [ans] : [],
        });
        ai++;
      }
      return { line, lineBlanks };
    });
    return {
      cellIndex: cell.cellIndex,
      source: lineEntries.map((e) => e.line).join("\n"),
      lines: lineEntries.map((e) => e.line),
      blanks: lineEntries.flatMap((e) => e.lineBlanks),
    };
  });
}

async function main() {
  const report = { ok: true, questions: [], errors: [], unparsed: [] };
  const { answers: mergedAnswers, unparsed } = mergeAllAnswers();
  report.unparsed = unparsed;
  const bank = [];

  for (const id of QUESTION_IDS) {
    const dir = path.join(root, "PythonCode", `${id}-素材`);
    const ipynbPath = path.join(dir, `${id}.ipynb`);
    const htmlPath = path.join(dir, `${id}.html`);
    if (!fs.existsSync(ipynbPath)) {
      report.errors.push(`missing ipynb: ${id}`);
      continue;
    }
    const cells = parseIpynb(ipynbPath);
    const blankCount = countBlanks(cells);
    let answers = [...(mergedAnswers[id] ?? [])];

    const empty = answers.filter((a) => !a || !String(a).trim()).length;
    if (empty > 0) {
      report.errors.push(`${id}: ${empty}/${blankCount} answers empty`);
    }
    if (answers.length < blankCount) {
      while (answers.length < blankCount) answers.push("");
    } else if (answers.length > blankCount) {
      answers.length = blankCount;
    }

    const { title, stem } = fs.existsSync(htmlPath)
      ? parseHtmlStem(htmlPath)
      : { title: id, stem: "" };

    const outCells = buildCellsWithAnswers(cells, answers);

    bank.push({
      id,
      title,
      stem,
      cells: outCells,
      meta: {
        examId: "AITrainer",
        levelId: "level3",
        blankCount,
        cellCount: outCells.length,
      },
    });

    report.questions.push({
      id,
      blankCount,
      answersFound: answers.filter((a) => a?.trim()).length,
    });
  }

  if (bank.length !== 20) {
    report.ok = false;
    report.errors.push(`expected 20 questions, got ${bank.length}`);
  }
  const totalBlanks = report.questions.reduce((s, q) => s + q.blankCount, 0);
  const totalFound = report.questions.reduce((s, q) => s + q.answersFound, 0);
  const fillRate = totalBlanks > 0 ? totalFound / totalBlanks : 0;
  report.fillRate = fillRate;
  const MIN_FILL = Number(process.env.CODE_FILL_MIN_FILL ?? "0.99");
  if (fillRate < MIN_FILL) report.ok = false;
  if (unparsed.length > 0) {
    report.warnings = report.errors.filter((e) => e.includes("answers empty"));
    report.errors = report.errors.filter((e) => !e.includes("answers empty"));
  } else {
    report.warnings = [];
  }

  const outDir = path.join(root, "src", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const bankPath = path.join(outDir, "codeFillBank.json");
  fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2), "utf8");
  fs.writeFileSync(
    path.join(outDir, "codeFillBuildReport.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(outDir, "codeFillUnparsedBlanks.json"),
    JSON.stringify(unparsed, null, 2),
    "utf8"
  );

  console.log(JSON.stringify({ ok: report.ok, bankPath, report }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
