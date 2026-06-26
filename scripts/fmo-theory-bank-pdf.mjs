/**
 * 全媒体运营师三级 PDF 题目解析（直播运营 / 流量运营共用）
 */
import fs from "node:fs";
import { PDFParse } from "pdf-parse";

/** @param {{ judgment: string; single: string; multiple: string }} idPrefix */
export function createFmoPdfParsers(idPrefix) {
  function normalizeRaw(text) {
    return text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n").replace(/\r/g, "");
  }

  function toLines(text) {
    return normalizeRaw(text)
      .split("\n")
      .map((l) => l.replace(/\t/g, " ").replace(/[ \u00a0]+/g, " ").trim())
      .filter((l) => l.length > 0 && !/^第\s*\d+\s*部分/.test(l) && !/^理论知识复习题/.test(l));
  }

  function normalizeQuestionNumbers(lines) {
    return lines.map((l) =>
      // 「54 .」「1 . 题干…」→「54. …」；兼容题号单独占一行、题干在下一行
      l.replace(/^(\d+)\s+\.\s*/, "$1. ")
    );
  }

  function stripSectionHeader(lines) {
    return lines.filter((line) => !/^[一二三]、/.test(line));
  }

  function extractSection(fullText, startMarker, endMarker) {
    const s = fullText.indexOf(startMarker);
    if (s === -1) throw new Error(`missing section: ${startMarker}`);
    const e = endMarker ? fullText.indexOf(endMarker, s + startMarker.length) : fullText.length;
    if (endMarker && e === -1) throw new Error(`missing end: ${endMarker}`);
    return fullText.slice(s, e);
  }

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
        id: `${idPrefix.judgment}-${qn}`,
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
        id: `${idPrefix.single}-${qn}`,
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
        id: `${idPrefix.multiple}-${qn}`,
        type: "multiple",
        stem,
        options,
        answer: null,
      });
    }
    return questions;
  }

  return {
    toLines,
    normalizeQuestionNumbers,
    stripSectionHeader,
    extractSection,
    parseJudgment,
    parseSingle,
    parseMultiple,
  };
}

export async function parseFmoPdfQuestions(pdfPath, idPrefix) {
  const {
    toLines,
    normalizeQuestionNumbers,
    stripSectionHeader,
    extractSection,
    parseJudgment,
    parseSingle,
    parseMultiple,
  } = createFmoPdfParsers(idPrefix);

  const buf = fs.readFileSync(pdfPath);
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

  return {
    judgment: parseJudgment(judgeLines),
    single: parseSingle(singleLines),
    multiple: parseMultiple(multiLines),
  };
}

export function applyAnswers(questions, answers, type) {
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

/** 答案速查 md：1:A；2:B 格式 */
export function parseInlineAnswersMd(content) {
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

/** 答案速查 md：表格 | 题号 | 答案 | 置信度 | 格式 */
export function parseTableAnswersMd(content) {
  function parseTableSection(text, type) {
    const out = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      const cell = m[2].trim();
      if (type === "judgment") {
        out[n] = /正确|^A/i.test(cell) && !/^B/i.test(cell) ? "A" : "B";
        if (/^A（正确）|^A$/.test(cell)) out[n] = "A";
        if (/^B（错误）|^B$/.test(cell)) out[n] = "B";
        if (/正确/.test(cell) && !/错误/.test(cell)) out[n] = "A";
        if (/错误/.test(cell)) out[n] = "B";
      } else if (type === "single") {
        const letter = cell.match(/^[A-E]/)?.[0];
        if (letter) out[n] = letter;
      } else {
        const letters = cell.match(/[A-E]/g);
        if (letters?.length) out[n] = [...new Set(letters)].sort();
      }
    }
    return out;
  }

  const judgmentStart = content.indexOf("## 判断题");
  const singleStart = content.indexOf("## 单项选择题");
  const multiStart = content.indexOf("## 多项选择题");
  if (judgmentStart === -1 || singleStart === -1 || multiStart === -1) {
    throw new Error("答案 md 缺少章节标题");
  }
  return {
    judgment: parseTableSection(content.slice(judgmentStart, singleStart), "judgment"),
    single: parseTableSection(content.slice(singleStart, multiStart), "single"),
    multiple: parseTableSection(content.slice(multiStart), "multiple"),
  };
}
