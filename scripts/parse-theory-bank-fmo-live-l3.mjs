/**
 * 从「全媒体运营师_直播运营三级_理论知识复习题.pdf」+ 答案速查 md 导入理论题库
 * 用法：npm run import-theory-bank-fmo-live-l3
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PDF_PATH = path.join(root, "题库", "全媒体运营师_直播运营三级_理论知识复习题.pdf");
const ANSWERS_PATH = path.join(
  root,
  "题库",
  "全媒体运营师_直播运营三级_理论知识复习题_答案速查.md"
);

const ID_PREFIX = { judgment: "fmo-j", single: "fmo-s", multiple: "fmo-m" };

function normalizeRaw(text) {
  return text
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n")
    .replace(/\r/g, "");
}

function toLines(text) {
  return normalizeRaw(text)
    .split("\n")
    .map((l) => l.replace(/\t/g, " ").replace(/[ \u00a0]+/g, " ").trim())
    .filter((l) => l.length > 0 && !/^第\s*\d+\s*部分/.test(l) && !/^理论知识复习题/.test(l));
}

/** PDF 题号「1 . 」→「1. 」 */
function normalizeQuestionNumbers(lines) {
  return lines.map((l) => l.replace(/^(\d+)\s+\.\s+/, "$1. "));
}

function stripSectionHeader(lines) {
  const out = [];
  for (const line of lines) {
    if (/^[一二三]、/.test(line)) continue;
    out.push(line);
  }
  return out;
}

function extractSection(fullText, startMarker, endMarker) {
  const s = fullText.indexOf(startMarker);
  if (s === -1) throw new Error(`missing section: ${startMarker}`);
  const e = endMarker ? fullText.indexOf(endMarker, s + startMarker.length) : fullText.length;
  if (endMarker && e === -1) throw new Error(`missing end: ${endMarker}`);
  return fullText.slice(s, e);
}

/** @returns {{ key: string, text: string }[]} */
function parseParenOptions(optText) {
  const keys = ["A", "B", "C", "D", "E"];
  const positions = [];
  for (const k of keys) {
    for (const re of [new RegExp(`（${k}）`), new RegExp(`\\(${k}\\)`)]) {
      const m = optText.match(re);
      if (m && m.index !== undefined) {
        positions.push({ key: k, idx: m.index, len: m[0].length });
        break;
      }
    }
  }
  positions.sort((a, b) => a.idx - b.idx);
  if (positions.length === 0) return [];
  const options = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx + positions[i].len;
    const end = i + 1 < positions.length ? positions[i + 1].idx : optText.length;
    options.push({
      key: positions[i].key,
      text: optText.slice(start, end).trim(),
    });
  }
  return options;
}

function firstOptionIndex(text) {
  const m = text.match(/[（(][A-E][）)]/);
  return m?.index ?? -1;
}

function parseJudgment(lines) {
  const questions = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^(\d+)\.\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const qn = parseInt(m[1], 10);
    let stem = m[2];
    i++;
    while (i < lines.length && !/^\d+\.\s/.test(lines[i])) {
      stem += (stem && !/[：。；]$/.test(stem) ? " " : "") + lines[i];
      i++;
    }
    questions.push({
      id: `${ID_PREFIX.judgment}-${qn}`,
      type: "judgment",
      stem: stem.replace(/\s+/g, " ").trim(),
      options: [
        { key: "A", text: "正确" },
        { key: "B", text: "错误" },
      ],
      answer: null,
    });
  }
  return questions;
}

function parseSingle(lines) {
  const questions = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^(\d+)\.\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const qn = parseInt(m[1], 10);
    let body = m[2];
    i++;
    while (i < lines.length && !/^\d+\.\s/.test(lines[i])) {
      body += " " + lines[i];
      i++;
    }
    body = body.replace(/\s+/g, " ").trim();
    const idx = firstOptionIndex(body);
    if (idx === -1) {
      console.warn(`[单选] 题 ${qn} 无法定位选项`, body.slice(0, 100));
      continue;
    }
    const stem = body.slice(0, idx).trim();
    const options = parseParenOptions(body.slice(idx));
    if (options.length < 4) {
      console.warn(`[单选] 题 ${qn} 选项不足`, options.length);
      continue;
    }
    questions.push({
      id: `${ID_PREFIX.single}-${qn}`,
      type: "single",
      stem,
      options: options.slice(0, 4),
      answer: null,
    });
  }
  return questions;
}

function parseMultiple(lines) {
  const questions = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^(\d+)\.\s*(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const qn = parseInt(m[1], 10);
    let body = m[2];
    i++;
    while (i < lines.length && !/^\d+\.\s/.test(lines[i])) {
      body += " " + lines[i];
      i++;
    }
    body = body.replace(/\s+/g, " ").trim();
    const idx = firstOptionIndex(body);
    if (idx === -1) {
      console.warn(`[多选] 题 ${qn} 无法定位选项`, body.slice(0, 100));
      continue;
    }
    const stem = body.slice(0, idx).trim();
    const options = parseParenOptions(body.slice(idx));
    if (options.length < 2) {
      console.warn(`[多选] 题 ${qn} 选项不足`, options.length);
      continue;
    }
    questions.push({
      id: `${ID_PREFIX.multiple}-${qn}`,
      type: "multiple",
      stem,
      options,
      answer: null,
    });
  }
  return questions;
}

/** @returns {Record<number, string | string[]>} */
function parseAnswerSection(text, type) {
  const out = {};
  const re = /(\d+)\s*[：:]\s*([A-E]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    const letters = m[2];
    if (type === "judgment") {
      out[n] = letters === "A" ? "A" : "B";
    } else if (type === "single") {
      out[n] = letters[0];
    } else {
      out[n] = [...letters].filter((c) => /[A-E]/.test(c)).sort();
    }
  }
  return out;
}

function parseAnswersMd(content) {
  const judgmentStart = content.indexOf("## 判断题");
  const singleStart = content.indexOf("## 单项选择题");
  const multiStart = content.indexOf("## 多项选择题");
  if (judgmentStart === -1 || singleStart === -1 || multiStart === -1) {
    throw new Error("答案 md 缺少章节标题");
  }
  return {
    judgment: parseAnswerSection(content.slice(judgmentStart, singleStart), "judgment"),
    single: parseAnswerSection(content.slice(singleStart, multiStart), "single"),
    multiple: parseAnswerSection(content.slice(multiStart), "multiple"),
  };
}

function applyAnswers(questions, answers, type) {
  let missing = 0;
  for (const q of questions) {
    if (q.type !== type) continue;
    const qn = parseInt(q.id.split("-").pop(), 10);
    const ans = answers[qn];
    if (ans == null) {
      missing++;
      console.warn(`[${type}] 题 ${qn} 缺少答案`);
      continue;
    }
    q.answer = ans;
  }
  return missing;
}

async function main() {
  const buf = fs.readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const data = await parser.getText();
  await parser.destroy();

  const raw = data.text;
  const judgeText = extractSection(raw, "一、 判断题", "二、单项选择题");
  const singleText = extractSection(raw, "二、单项选择题", "三、多项选择题");
  const multiText = extractSection(raw, "三、多项选择题", null);

  const judgeLines = normalizeQuestionNumbers(stripSectionHeader(toLines(judgeText)));
  const singleLines = normalizeQuestionNumbers(stripSectionHeader(toLines(singleText)));
  const multiLines = normalizeQuestionNumbers(stripSectionHeader(toLines(multiText)));

  const judgment = parseJudgment(judgeLines);
  const single = parseSingle(singleLines);
  const multiple = parseMultiple(multiLines);

  const answers = parseAnswersMd(fs.readFileSync(ANSWERS_PATH, "utf8"));
  const missJ = applyAnswers(judgment, answers.judgment, "judgment");
  const missS = applyAnswers(single, answers.single, "single");
  const missM = applyAnswers(multiple, answers.multiple, "multiple");

  const bank = [...judgment, ...single, ...multiple].filter((q) => q.answer != null);

  const outPath = path.join(root, "src", "data", "theoryBankFmoLiveL3.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(bank, null, 0), "utf8");

  console.log(
    JSON.stringify(
      {
        judgment: judgment.length,
        single: single.length,
        multiple: multiple.length,
        total: bank.length,
        missingAnswers: { judgment: missJ, single: missS, multiple: missM },
        outPath,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
