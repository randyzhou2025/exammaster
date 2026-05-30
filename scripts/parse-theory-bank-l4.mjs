/**
 * 从「第3部分-人工智能训练师_4级_理论知识复习题_匹配答案版.docx」导入四级理论题库
 * 用法：npm run import-theory-bank-l4
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const DOCX_PATH = path.join(
  root,
  "题库",
  "第3部分-人工智能训练师_4级_理论知识复习题_匹配答案版.docx"
);

const PY_EXTRACT = `
import json, sys, zipfile, xml.etree.ElementTree as ET
path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    xml = z.read("word/document.xml")
root = ET.fromstring(xml)
NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
paras = []
for p in root.iter(NS + "p"):
    texts = [t.text or "" for t in p.iter(NS + "t")]
    line = "".join(texts).strip()
    if line:
        paras.append(line)
print(json.dumps(paras, ensure_ascii=False))
`;

function readDocxParagraphs(docxPath) {
  const out = execFileSync("python3", ["-c", PY_EXTRACT, docxPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function parseJudgmentAnswer(line) {
  const m = line.match(/^答案[：:]\s*([√×✓✗])/);
  if (!m) return null;
  return m[1] === "√" || m[1] === "✓" ? "A" : "B";
}

function parseChoiceAnswer(line) {
  const multi = line.match(/^答案[：:]\s*([A-D]{2,})/);
  if (multi) {
    return {
      type: "multiple",
      answer: [...multi[1]].filter((c) => /[A-D]/.test(c)).sort(),
    };
  }
  const single = line.match(/^答案[：:]\s*([A-D])/);
  if (single) return { type: "single", answer: single[1] };
  return null;
}

/** @param {string[]} paras */
function parseJudgment(paras) {
  const questions = [];
  for (let i = 0; i < paras.length; i++) {
    const m = paras[i].match(/^\(\s*\)\s*(\d+)\.\s*(.+)$/);
    if (!m) continue;
    const qn = parseInt(m[1], 10);
    const stem = m[2].replace(/\s+/g, " ").trim();
    const ansLine = paras[i + 1];
    const answer = ansLine ? parseJudgmentAnswer(ansLine) : null;
    if (!answer) {
      console.warn(`[判断] 题 ${qn} 缺少答案:`, ansLine);
      continue;
    }
    questions.push({
      id: `t4-j-${qn}`,
      type: "judgment",
      stem,
      options: [
        { key: "A", text: "正确" },
        { key: "B", text: "错误" },
      ],
      answer,
    });
  }
  return questions;
}

/** @param {string[]} paras */
function parseSingle(paras) {
  const questions = [];
  let i = 0;
  while (i < paras.length) {
    const m = paras[i].match(/^(\d+)\.\s*(.+)$/);
    if (!m) {
      i++;
      continue;
    }
    const qn = parseInt(m[1], 10);
    const stemParts = [m[2]];
    i++;
    const options = [];
    while (i < paras.length) {
      const line = paras[i];
      if (/^答案[：:]/.test(line)) break;
      if (/^\d+\.\s/.test(line)) break;
      const om = line.match(/^（([A-D])）\s*(.*)$/);
      if (om) {
        options.push({ key: om[1], text: om[2].replace(/\s+/g, " ").trim() });
      } else if (options.length > 0 && stemParts.length > 0) {
        options[options.length - 1].text += line.replace(/\s+/g, " ").trim();
      } else {
        stemParts.push(line);
      }
      i++;
    }
    if (i >= paras.length || !/^答案[：:]/.test(paras[i])) {
      console.warn(`[单选] 题 ${qn} 缺少答案`);
      continue;
    }
    const parsed = parseChoiceAnswer(paras[i]);
    i++;
    if (!parsed) {
      console.warn(`[单选] 题 ${qn} 无法解析答案`);
      continue;
    }
    if (options.length < 4) {
      console.warn(`[单选] 题 ${qn} 选项不足:`, options.length);
      continue;
    }
    questions.push({
      id: parsed.type === "multiple" ? `t4-m-${qn}` : `t4-s-${qn}`,
      type: parsed.type,
      stem: stemParts.join(" ").replace(/\s+/g, " ").trim(),
      options: options.slice(0, 4),
      answer: parsed.answer,
    });
  }
  return questions;
}

function main() {
  if (!fs.existsSync(DOCX_PATH)) {
    console.error("未找到 docx:", DOCX_PATH);
    process.exit(1);
  }
  const paras = readDocxParagraphs(DOCX_PATH);
  const judgeStart = paras.findIndex((p) => p.startsWith("判断题"));
  const singleStart = paras.findIndex((p) => p.includes("二、单选题"));
  if (judgeStart === -1 || singleStart === -1) {
    console.error("docx 结构异常：未找到判断/单选分区");
    process.exit(1);
  }

  const judgment = parseJudgment(paras.slice(judgeStart + 1, singleStart));
  const choice = parseSingle(paras.slice(singleStart + 1));
  const bank = [...judgment, ...choice];
  const singleN = choice.filter((q) => q.type === "single").length;
  const multipleN = choice.filter((q) => q.type === "multiple").length;

  const outPath = path.join(root, "src", "data", "theoryBankL4.json");
  fs.writeFileSync(outPath, JSON.stringify(bank, null, 0), "utf8");

  console.log(`写入 ${outPath}`);
  console.log(`判断 ${judgment.length} · 单选 ${singleN} · 多选 ${multipleN} · 合计 ${bank.length}`);
  if (judgment.length !== 250 || singleN !== 499 || multipleN !== 1) {
    console.warn(`⚠ 题量与预期（250+499+1）不一致：判断${judgment.length} 单选${singleN} 多选${multipleN}`);
    process.exitCode = 1;
  }
}

main();
