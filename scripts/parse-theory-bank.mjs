/**
 * 从「人工智能训练师三级理论知识题库.pdf」抽取题目，写入 src/data/theoryBank.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
function normalizeRaw(text) {
  return text
    .replace(/-- \d+ of \d+ --/g, "\n")
    .replace(/- \d+ -/g, "\n")
    .replace(/\r/g, "");
}

function toLines(text) {
  return normalizeRaw(text)
    .split("\n")
    .map((l) => {
      let x = l.replace(/\t/g, " ").replace(/[ \u00a0]+/g, " ").trim();
      if (/^答案\]/.test(x)) x = `[${x}`;
      if (/^\[答案\s/.test(x) && !/^\[答案\]/.test(x)) {
        x = x.replace(/^\[答案\s+/, "[答案]");
      }
      return x;
    })
    .filter(
      (l) =>
        l.length > 0 &&
        !/^以下内容仅作参考/.test(l) &&
        !/^人工智能训练师（三级）/.test(l) &&
        !/^理论知识复习题/.test(l)
    );
}

function stripSectionHeader(lines) {
  const out = [];
  let skip = true;
  for (const line of lines) {
    if (/^[一二三]、/.test(line)) {
      skip = false;
      continue;
    }
    if (!skip) out.push(line);
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
  const keys = ["A", "B", "C", "D"];
  const positions = [];
  for (const k of keys) {
    const re = new RegExp(`\\(${k}\\)`);
    const m = optText.match(re);
    if (m && m.index !== undefined) positions.push({ key: k, idx: m.index });
  }
  positions.sort((a, b) => a.idx - b.idx);
  if (positions.length === 0) {
    const fallback = optText.split(/\s+(?=[A-D]\))/);
    return keys.slice(0, 4).map((key, i) => ({
      key,
      text: (fallback[i] || "").replace(/^\(?[A-D]\)\s*/, "").trim(),
    }));
  }
  const options = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx + `(${positions[i].key})`.length;
    const end = i + 1 < positions.length ? positions[i + 1].idx : optText.length;
    let t = optText.slice(start, end).trim();
    t = t.replace(/\s*\([A-D]\)\s*$/, "").trim();
    options.push({ key: positions[i].key, text: t });
  }
  if (options.length < 4) {
    const loose = optText.split(/\([A-D]\)/).filter(Boolean);
    return keys.map((key, i) => ({
      key,
      text: (loose[i] || "").trim(),
    }));
  }
  return options;
}

/** 统一选项格式：D) 缺左括号、行首 A) 与 (A) 混用等 */
function fixSingleOptText(optText) {
  let t = optText;
  t = t.replace(/\)\s*D\)/g, ") (D)");
  t = t.replace(/([^\s(])\s+D\)\s*/g, "$1 (D) ");
  t = t.replace(/(?<!\()([A-D])\)/g, "($1)");
  return t;
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
    while (i < lines.length) {
      if (/^\[答案\]/.test(lines[i])) break;
      if (/^A\.对/.test(lines[i])) break;
      if (/^\d+\.\s/.test(lines[i])) break;
      stem += (stem && !/[：。；]$/.test(stem) ? " " : "") + lines[i];
      i++;
    }
    if (i < lines.length && /^A\.对/.test(lines[i])) i++;
    const al = lines[i];
    const am = al?.match(/^\[答案\]\s*([AB])/);
    if (!am) {
      console.warn(`[判断] 题 ${qn} 缺少答案，跳过行:`, al);
      i++;
      continue;
    }
    const answer = am[1];
    i++;
    questions.push({
      id: `t3-j-${qn}`,
      type: "judgment",
      stem: stem.replace(/\s+/g, " ").trim(),
      options: [
        { key: "A", text: "正确" },
        { key: "B", text: "错误" },
      ],
      answer,
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
    const block = [];
    block.push(lines[i]);
    i++;
    while (i < lines.length && !/^\[答案\]/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    if (i < lines.length && /^\[答案\]/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    const ansLine = block.find((l) => /^\[答案\]/.test(l));
    const ans = ansLine?.match(/^\[答案\]\s*([A-D])/)?.[1];
    if (!ans) {
      console.warn(`[单选] 题 ${qn} 无答案`, block.slice(0, 3));
      continue;
    }
    const body = block.filter((l) => !/^\[答案\]/.test(l)).join(" ");
    const bodyNoNum = body.replace(/^\d+\.\s*/, "");
    let optPart = fixSingleOptText(bodyNoNum);
    const idxA = optPart.indexOf("(A)");
    if (idxA === -1) {
      const idxB = optPart.search(/\([B-D]\)/);
      if (idxB !== -1) {
        console.warn(`[单选] 题 ${qn} 无(A)，尝试从不完整选项解析`);
      } else {
        console.warn(`[单选] 题 ${qn} 无法定位选项`, bodyNoNum.slice(0, 120));
        continue;
      }
    }
    const stem = idxA >= 0 ? optPart.slice(0, idxA).trim() : optPart.split(/\([A-D]\)/)[0]?.trim() || "";
    const fromA = idxA >= 0 ? optPart.slice(idxA) : optPart;
    let options = parseParenOptions(fromA);
    if (options.some((o) => !o.text || o.text.length < 1)) {
      options = parseParenOptions(optPart);
    }
    questions.push({
      id: `t3-s-${qn}`,
      type: "single",
      stem: stem.replace(/\s+/g, " ").trim(),
      options,
      answer: ans,
    });
  }
  return questions;
}

/** 按 PDF 中 A.-E. 标记分段，选项键依次标为 A–E（修正源文档重复字母等瑕疵） */
function parseMultiOptions(optChunk) {
  const chunk = optChunk.replace(/\s+/g, " ").trim();
  const starts = [];
  const re = /([A-E])\.\s*/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    starts.push({ pos: m.index, afterLabel: m.index + m[0].length });
  }
  if (starts.length === 0) return [];
  const keys = ["A", "B", "C", "D", "E"];
  const options = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].pos : chunk.length;
    const text = chunk.slice(starts[i].afterLabel, end).trim();
    options.push({ key: keys[i] ?? String.fromCharCode(65 + i), text });
  }
  return options.slice(0, 5);
}

function normalizeMultiAnswer(ansStr) {
  return ansStr
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^([A-E]).*/, "$1"))
    .filter((x) => /^[A-E]$/.test(x));
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
    const block = [];
    block.push(lines[i]);
    i++;
    while (i < lines.length && !/^\[答案\]/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    if (i < lines.length && /^\[答案\]/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    const ansLine = block.find((l) => /^\[答案\]/.test(l));
    const ansRaw = ansLine?.match(/^\[答案\](.+)/)?.[1]?.trim();
    if (!ansRaw) {
      console.warn(`[多选] 题 ${qn} 无答案`);
      continue;
    }
    const answer = normalizeMultiAnswer(ansRaw.replace(/\s*\|\s*/g, "|"));
    let bodyLines = block.filter((l) => !/^\[答案\]/.test(l));
    if (bodyLines[0]) {
      const fm = bodyLines[0].match(/^(\d+)\.\s*(.*)$/);
      if (fm) {
        const rest = fm[2];
        let cut = rest.search(/\s+A\.\s/);
        if (cut === -1) {
          const punctA = rest.match(/[。；]A\.\s/);
          if (punctA && punctA.index !== undefined) cut = punctA.index + 1;
        }
        if (cut !== -1) {
          const stemOnly = `${fm[1]}. ${rest.slice(0, cut).trim()}`;
          const optFirst = rest.slice(cut).trim();
          bodyLines = [stemOnly, optFirst, ...bodyLines.slice(1)];
        }
      }
    }
    const firstNum = bodyLines[0].match(/^(\d+)\.\s*(.*)$/);
    let stem = firstNum ? firstNum[2] : bodyLines[0];
    let optStart = 1;
    for (let j = 1; j < bodyLines.length; j++) {
      if (/^[A-E]\./.test(bodyLines[j])) {
        optStart = j;
        break;
      }
      stem += " " + bodyLines[j];
    }
    const optLines = bodyLines.slice(optStart);
    const optChunk = optLines.join(" ");
    let options = parseMultiOptions(optChunk);
    if (options.length === 0) {
      console.warn(`[多选] 题 ${qn} 未解析出选项`);
      continue;
    }
    questions.push({
      id: `t3-m-${qn}`,
      type: "multiple",
      stem: stem.replace(/\s+/g, " ").trim(),
      options,
      answer,
    });
  }
  return questions;
}

async function main() {
  const realPdf = path.join(root, "题库", "人工智能训练师三级理论知识题库.pdf");
  const buf = fs.readFileSync(realPdf);
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const data = await parser.getText();
  await parser.destroy();

  const raw = data.text;
  const judgeText = extractSection(raw, "一、判断题", "二、单选题");
  const singleText = extractSection(raw, "二、单选题", "三、多选题");
  const multiText = extractSection(raw, "三、多选题", null);

  const judgeLines = stripSectionHeader(toLines(judgeText));
  const singleLines = stripSectionHeader(toLines(singleText));
  const multiLines = stripSectionHeader(toLines(multiText));

  const judgment = parseJudgment(judgeLines);
  const single = parseSingle(singleLines);
  const multiple = parseMultiple(multiLines);

  const bank = [...judgment, ...single, ...multiple];
  const outPath = path.join(root, "src", "data", "theoryBank.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(bank, null, 0), "utf8");

  console.log(
    JSON.stringify(
      {
        judgment: judgment.length,
        single: single.length,
        multiple: multiple.length,
        total: bank.length,
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
