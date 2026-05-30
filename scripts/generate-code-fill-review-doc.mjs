/**
 * 从 codeFillBank + solution-lines 生成新手复习文档（HTML + PDF）
 * 用法：node scripts/generate-code-fill-review-doc.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "output", "code-fill-review");
const DOC_TITLE = "Python 实操填空宝典";
const DOC_BASENAME = "Python 实操填空宝典";

const BLANK_RE = /_{5,}/g;

const GROUP_META = {
  "1.1": { title: "1.1 业务数据分析", desc: "数据读取、清洗、分组统计与可视化准备" },
  "2.1": { title: "2.1 机器学习数据预处理", desc: "缺失值、异常值、标准化与特征选择" },
  "2.2": { title: "2.2 机器学习模型开发", desc: "训练/测试划分、模型训练、评估与持久化" },
  "3.2": { title: "3.2 ONNX 模型应用", desc: "图像预处理、推理会话与后处理" },
};

const STOP_TOKENS = new Set([
  "data", "df", "X", "y", "f", "file", "model", "print", "len", "int", "float",
  "str", "list", "dict", "True", "False", "None", "axis", "inplace", "errors",
  "method", "kind", "index", "columns", "subset", "random_state", "test_size",
  "labels", "bins", "right", "coerce", "mean", "sum", "any", "apply", "lambda",
]);

/** 常见库别名 — 保留「库.方法」展示形式 */
const LIB_ALIASES = new Set([
  "pd", "np", "plt", "scipy", "xgb", "ort", "onnxruntime", "pickle", "joblib", "pandas",
]);

/** 泛化对象名 — 统计时只保留方法名（dropna 而非 data.dropna） */
const GENERIC_RECEIVERS = new Set([
  "data", "df", "model", "pipeline", "file", "f", "cleaned_data", "data_cleaned",
  "rf_model", "xgb_model", "dt_model", "session", "ort_session", "results_df",
  "image", "orig_image", "results", "pipeline", "label_encoder",
]);

/** 展示名优先级：库.方法 > 有意义对象.方法 > 裸方法名 */
function displayScore(token) {
  const m = token.match(/^([a-zA-Z_][\w]*)\.(.+)$/);
  if (m) {
    const [, recv] = m;
    if (LIB_ALIASES.has(recv)) return 10;
    if (GENERIC_RECEIVERS.has(recv)) return 0;
    if (recv === "scaler") return 8;
    return 5;
  }
  return 3;
}

function displayLabelForKey(key, variants) {
  let best = key;
  let bestScore = displayScore(key);
  for (const v of variants) {
    const s = displayScore(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  // 泛化对象链（data.dropna）不作为展示名，回退到方法名本身
  if (/^([a-zA-Z_][\w]*)\./.test(best)) {
    const recv = best.split(".")[0];
    if (GENERIC_RECEIVERS.has(recv)) return key;
  }
  return bestScore > 0 ? best : key;
}

/** 合并键：库前缀/泛化对象下的同名方法算同一考点 */
function unifiedKey(token) {
  const m = token.match(/^([a-zA-Z_][\w]*)\.(.+)$/);
  if (!m) return token;
  const [, recv, rest] = m;
  if (LIB_ALIASES.has(recv) || GENERIC_RECEIVERS.has(recv)) return rest;
  return token;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function compareQid(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

function groupKey(qid) {
  const [a, b] = qid.split(".");
  return `${a}.${b}`;
}

/** 从答案文本提取函数/方法名（不含列名 ['Age'] 等） */
function extractTokens(text) {
  const raw = new Set();
  const dotted = text.match(/[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)+/g) ?? [];
  for (const d of dotted) raw.add(d.trim());

  const calls = text.match(/[a-zA-Z_][\w]*(?=\()/g) ?? [];
  for (const c of calls) {
    const covered = [...raw].some((t) => t.endsWith(`.${c}`));
    if (!covered) raw.add(c.trim());
  }

  return [...raw].filter(Boolean);
}

function isColumnBracketToken(token) {
  return /^\[(?:'[^']*'|"[^"]*")\]$/.test(token);
}

function shouldSkipToken(token) {
  if (token.length < 3) return true;
  if (isColumnBracketToken(token)) return true;
  if (STOP_TOKENS.has(token)) return true;
  const key = unifiedKey(token);
  if (STOP_TOKENS.has(key)) return true;
  return false;
}

function collectAllAnswers(bank) {
  const answers = [];
  for (const q of bank) {
    for (const cell of q.cells) {
      for (const blank of cell.blanks ?? []) {
        for (const a of blank.accepted ?? []) {
          if (a?.trim()) answers.push(a.trim());
        }
      }
    }
  }
  return answers;
}

function buildTopTokens(answers, topN = 25) {
  const counts = new Map();
  const displays = new Map();
  const highlightVariants = new Map();

  for (const ans of answers) {
    const seenKeys = new Set();
    for (const tok of extractTokens(ans)) {
      if (shouldSkipToken(tok)) continue;
      const key = unifiedKey(tok);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      counts.set(key, (counts.get(key) ?? 0) + 1);

      if (!highlightVariants.has(key)) highlightVariants.set(key, new Set());
      highlightVariants.get(key).add(tok);
      if (key !== tok) highlightVariants.get(key).add(key);
    }
  }

  for (const key of counts.keys()) {
    displays.set(key, displayLabelForKey(key, highlightVariants.get(key) ?? new Set()));
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (displays.get(a[0]) ?? a[0]).localeCompare(displays.get(b[0]) ?? b[0]))
    .slice(0, topN);

  return {
    list: top.map(([key, cnt]) => [displays.get(key) ?? key, cnt]),
  };
}

function renderLine(line, blanks, state) {
  if (!line.trim()) return "";
  BLANK_RE.lastIndex = 0;
  if (!BLANK_RE.test(line)) return "";
  BLANK_RE.lastIndex = 0;
  const segments = line.split(BLANK_RE);
  const blankMatches = line.match(BLANK_RE) ?? [];
  let html = "";
  for (let i = 0; i < segments.length; i++) {
    html += escapeHtml(segments[i]);
    if (i < blankMatches.length) {
      const blank = blanks[state.i++];
      const ans = blank?.accepted?.[0] ?? "???";
      html += `<span class="answer">${escapeHtml(ans)}</span>`;
    }
  }
  return `<div class="code-line">${html}</div>`;
}

function renderQuestion(q) {
  const blocks = [];
  for (const cell of q.cells) {
    const blanks = cell.blanks ?? [];
    const state = { i: 0 };
    const lines = cell.lines ?? [];
    if (!lines.length) continue;
    const codeHtml = lines
      .map((line) => renderLine(line, blanks, state))
      .filter(Boolean)
      .join("\n");
    if (codeHtml) blocks.push(`<div class="cell"><pre class="code">${codeHtml}</pre></div>`);
  }
  const blankCount = q.cells.reduce((n, c) => n + (c.blanks?.length ?? 0), 0);
  return `
    <section class="question" id="q-${q.id.replace(/\./g, "-")}">
      <h3>${escapeHtml(q.id)} ${escapeHtml((q.title ?? "").replace(/^\d+\.\d+\.\d+\s*/, ""))}</h3>
      <p class="meta">共 ${blankCount} 处填空</p>
      ${blocks.join("\n")}
    </section>`;
}

function buildHtml(bank, topTokensResult) {
  const { list: topTokens } = topTokensResult;
  const grouped = new Map();
  for (const q of bank) {
    const gk = groupKey(q.id);
    if (!grouped.has(gk)) grouped.set(gk, []);
    grouped.get(gk).push(q);
  }
  for (const qs of grouped.values()) qs.sort((a, b) => compareQid(a.id, b.id));

  const groupOrder = [...grouped.keys()].sort(compareQid);

  const topListHtml = topTokens
    .map(
      ([tok, cnt], i) =>
        `<li><span class="rank">${i + 1}</span><code class="top-word">${escapeHtml(tok)}</code><span class="cnt">${cnt} 题次</span></li>`
    )
    .join("\n");

  const sectionsHtml = groupOrder
    .map((gk) => {
      const meta = GROUP_META[gk] ?? { title: gk, desc: "" };
      const qs = grouped.get(gk) ?? [];
      return `
        <section class="group" id="group-${gk.replace(".", "-")}">
          <h2>${escapeHtml(meta.title)}</h2>
          ${meta.desc ? `<p class="group-desc">${escapeHtml(meta.desc)}</p>` : ""}
          ${qs.map((q) => renderQuestion(q)).join("\n")}
        </section>`;
    })
    .join("\n");

  const tocHtml = groupOrder
    .map((gk) => {
      const meta = GROUP_META[gk] ?? { title: gk };
      const qs = grouped.get(gk) ?? [];
      const links = qs.map((q) => `<a href="#q-${q.id.replace(/\./g, "-")}">${q.id}</a>`).join(" · ");
      return `<li><strong>${escapeHtml(meta.title)}</strong><br>${links}</li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(DOC_TITLE)}</title>
  <style>
    @page { margin: 18mm 16mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 12mm 14mm;
    }
    h1 { font-size: 20pt; margin: 0 0 8px; color: #0f172a; }
    .subtitle { color: #475569; margin-bottom: 20px; font-size: 10.5pt; }
    .top-box {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .top-box h2 { font-size: 13pt; margin: 0 0 10px; color: #92400e; }
    .top-box ul { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 24px; }
    .top-box li { break-inside: avoid; margin: 4px 0; font-size: 9.5pt; }
    .top-box .rank { display: inline-block; width: 1.6em; color: #78716c; }
    .top-box .top-word { background: #fef3c7; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }
    .top-box .cnt { color: #78716c; margin-left: 6px; font-size: 9pt; }
    .toc { margin-bottom: 28px; page-break-after: always; }
    .toc h2 { font-size: 13pt; }
    .toc ul { padding-left: 1.2em; }
    .toc li { margin: 8px 0; font-size: 10pt; }
    .toc a { color: #2563eb; text-decoration: none; }
    .group { margin-top: 32px; page-break-before: always; }
    .group:first-of-type { page-break-before: auto; }
    .group h2 {
      font-size: 16pt;
      color: #0f172a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .group-desc { color: #64748b; margin: 0 0 20px; font-size: 10pt; }
    .question {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .question h3 {
      font-size: 12pt;
      margin: 0 0 4px;
      color: #1e40af;
    }
    .meta { font-size: 9pt; color: #94a3b8; margin: 0 0 8px; }
    .cell { margin-bottom: 8px; }
    pre.code {
      margin: 0;
      padding: 10px 12px;
      background: #f1f5f9;
      border-radius: 6px;
      border-left: 4px solid #94a3b8;
      overflow-x: auto;
      font-family: "SF Mono", "Menlo", "Consolas", "Courier New", monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .code-line { min-height: 1.2em; }
    .answer {
      background: #fef08a;
      padding: 0 2px;
      border-radius: 2px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(DOC_TITLE)}</h1>
  <p class="subtitle">共 20 题，按模块 1.1 / 2.1 / 2.2 / 3.2 分组（每组 5 题）；每题仅展示含填空的代码行，黄色高亮为标答。</p>

  <div class="top-box">
    <h2>高频函数/方法 Top ${topTokens.length}</h2>
    <ul>${topListHtml}</ul>
  </div>

  <nav class="toc">
    <h2>目录</h2>
    <ul>${tocHtml}</ul>
  </nav>

  ${sectionsHtml}
</body>
</html>`;
}

async function htmlToPdf(htmlPath, pdfPath) {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const bankPath = path.join(root, "src/data/codeFillBank.json");
  const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  bank.sort((a, b) => compareQid(a.id, b.id));

  const answers = collectAllAnswers(bank);
  const topTokensResult = buildTopTokens(answers, 25);
  const html = buildHtml(bank, topTokensResult);

  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, `${DOC_BASENAME}.html`);
  const pdfPath = path.join(outDir, `${DOC_BASENAME}.pdf`);
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log(`HTML: ${htmlPath}`);
  console.log(
    `Top tokens: ${topTokensResult.list.slice(0, 8).map(([t, c]) => `${t}(${c})`).join(", ")}...`
  );

  await htmlToPdf(htmlPath, pdfPath);
  console.log(`PDF:  ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
