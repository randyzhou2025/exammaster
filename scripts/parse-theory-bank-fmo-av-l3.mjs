/**
 * 从「全媒体运营师_视听运营三级_理论知识复习题.pdf」+ 答案速查 md 导入理论题库
 * 用法：npm run import-theory-bank-fmo-av-l3
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyAnswers,
  parseFmoPdfQuestions,
  parseTableAnswersMd,
} from "./fmo-theory-bank-pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PDF_PATH = path.join(root, "题库", "全媒体运营师_视听运营三级_理论知识复习题.pdf");
const ANSWERS_PATH = path.join(
  root,
  "题库",
  "全媒体运营师_视听运营三级_理论知识复习题_答案速查.md"
);

const ID_PREFIX = { judgment: "fmav-j", single: "fmav-s", multiple: "fmav-m" };

async function main() {
  const { judgment, single, multiple } = await parseFmoPdfQuestions(PDF_PATH, ID_PREFIX);
  const answers = parseTableAnswersMd(fs.readFileSync(ANSWERS_PATH, "utf8"));

  const missJ = applyAnswers(judgment, answers.judgment, "judgment");
  const missS = applyAnswers(single, answers.single, "single");
  const missM = applyAnswers(multiple, answers.multiple, "multiple");

  const bank = [...judgment, ...single, ...multiple].filter((q) => q.answer != null);
  const outPath = path.join(root, "src", "data", "theoryBankFmoAvL3.json");
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
