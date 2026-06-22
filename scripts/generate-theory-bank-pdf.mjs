/**
 * 从 src/data/theoryBank.json 生成三级理论题库 PDF（含答案），版式对齐参考 PDF。
 * 用法：npm run generate-theory-bank-pdf --prefix scripts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const bankPath = path.join(root, "src/data/theoryBank.json");
const outDir = path.join(root, "output", "theory-bank");
const DOC_BASENAME = "人工智能训练师三级理论知识题库（含答案）";

const SECTIONS = [
  {
    type: "judgment",
    title: "一、判断题（将判断结果填入括号中。正确的填“A”, 错误的填“B”。）",
  },
  {
    type: "single",
    title: "二、单选题（选择一个正确的答案，将相应的字母填入题内的括号中。）",
  },
  {
    type: "multiple",
    title: "三、多选题（选择多个正确的答案，将相应的字母填入题内的括号中。）",
  },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qIndex(id) {
  return parseInt(id.split("-").pop() ?? "0", 10);
}

function formatAnswer(q) {
  if (q.type === "multiple") {
    return [...q.answer].sort().join("|");
  }
  return String(q.answer);
}

function formatJudgmentOptions() {
  return `<span class="opt-pair">A.对</span><span class="opt-pair">B.错</span>`;
}

function formatParenOptions(options) {
  return options
    .map((o) => `<span class="opt-pair">(${o.key})${escapeHtml(o.text)}</span>`)
    .join("");
}

function formatDotOptions(options) {
  return options
    .map((o) => `<span class="opt-pair">${o.key}.${escapeHtml(o.text)}</span>`)
    .join("");
}

function renderQuestion(q, num) {
  const stem = escapeHtml(q.stem);
  let optionsHtml = "";
  if (q.type === "judgment") {
    optionsHtml = formatJudgmentOptions();
  } else if (q.type === "single") {
    optionsHtml = formatParenOptions(q.options);
  } else {
    optionsHtml = formatDotOptions(q.options);
  }
  const ans = formatAnswer(q);
  return `
    <div class="question">
      <p class="q-line"><span class="q-num">${num}.</span> ${stem}</p>
      <p class="q-options">${optionsHtml}</p>
      <p class="q-answer">[答案]${escapeHtml(ans)}</p>
    </div>`;
}

function buildHtml(bank) {
  const byType = {
    judgment: bank.filter((q) => q.type === "judgment").sort((a, b) => qIndex(a.id) - qIndex(b.id)),
    single: bank.filter((q) => q.type === "single").sort((a, b) => qIndex(a.id) - qIndex(b.id)),
    multiple: bank.filter((q) => q.type === "multiple").sort((a, b) => qIndex(a.id) - qIndex(b.id)),
  };

  const sectionsHtml = SECTIONS.map((sec) => {
    const list = byType[sec.type];
    const body = list.map((q, i) => renderQuestion(q, i + 1)).join("\n");
    return `
      <section class="section">
        <h2 class="section-title">${escapeHtml(sec.title)}</h2>
        ${body}
      </section>`;
  }).join("\n");

  const total = bank.length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(DOC_BASENAME)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SimSun", sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .cover {
      text-align: center;
      padding: 48mm 0 32mm;
      page-break-after: always;
    }
    .cover h1 {
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 12mm;
      letter-spacing: 0.05em;
    }
    .cover p {
      font-size: 14pt;
      margin: 0;
    }
    .meta {
      text-align: center;
      color: #555;
      font-size: 9.5pt;
      margin-bottom: 8mm;
    }
    .section { margin-top: 6mm; }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 5mm;
      page-break-after: avoid;
    }
    .question {
      margin: 0 0 4.5mm;
      page-break-inside: avoid;
    }
    .q-line {
      margin: 0 0 1.5mm;
      text-align: justify;
      text-indent: 0;
    }
    .q-num { font-weight: 600; }
    .q-options {
      margin: 0 0 1.5mm;
      line-height: 1.65;
    }
    .opt-pair {
      display: inline-block;
      margin-right: 1.2em;
      white-space: normal;
    }
    .q-answer {
      margin: 0;
      font-weight: 600;
      color: #111;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>人工智能训练师（三级）</h1>
    <p>理论知识复习题</p>
  </div>
  <p class="meta">共 ${total} 题（判断 ${byType.judgment.length} · 单选 ${byType.single.length} · 多选 ${byType.multiple.length}），每题含标准答案</p>
  ${sectionsHtml}
</body>
</html>`;
}

async function htmlToPdf(htmlPath, pdfPath) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "20mm", left: "16mm" },
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  if (!Array.isArray(bank) || bank.length === 0) {
    throw new Error("theoryBank.json 为空或格式无效");
  }

  const html = buildHtml(bank);
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, `${DOC_BASENAME}.html`);
  const pdfPath = path.join(outDir, `${DOC_BASENAME}.pdf`);
  fs.writeFileSync(htmlPath, html, "utf8");
  console.log("HTML:", htmlPath);

  await htmlToPdf(htmlPath, pdfPath);
  console.log("PDF: ", pdfPath);
  console.log(`题目：${bank.length} 道`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
