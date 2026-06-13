import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { KnownBankId } from "./trial-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TheoryQuestion {
  id: string;
  type: "judgment" | "single" | "multiple";
  stem: string;
  options: { key: string; text: string }[];
  answer: string | string[];
  explanation?: string;
  tip?: string;
}

export interface CodeFillQuestion {
  id: string;
  [key: string]: unknown;
}

const theoryCache = new Map<KnownBankId, TheoryQuestion[]>();
const codeFillCache = new Map<KnownBankId, CodeFillQuestion[]>();

function resolveBankFile(filename: string): string {
  const candidates = [
    path.join(__dirname, "../assets/banks", filename),
    path.join(__dirname, "../../assets/banks", filename),
    path.join(process.cwd(), "assets/banks", filename),
    path.join(process.cwd(), "../src/data", filename),
    path.join(process.cwd(), "src/data", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`题库文件不存在: ${filename}`);
}

function readJsonFile<T>(filename: string): T {
  const raw = fs.readFileSync(resolveBankFile(filename), "utf8");
  return JSON.parse(raw) as T;
}

function theoryFilename(bankId: KnownBankId): string {
  return bankId === "ai-trainer-l4" ? "theoryBankL4.json" : "theoryBank.json";
}

export function loadTheoryBank(bankId: KnownBankId): TheoryQuestion[] {
  const cached = theoryCache.get(bankId);
  if (cached) return cached;
  const bank = readJsonFile<TheoryQuestion[]>(theoryFilename(bankId));
  theoryCache.set(bankId, bank);
  return bank;
}

export function loadCodeFillBank(bankId: KnownBankId): CodeFillQuestion[] {
  if (bankId === "ai-trainer-l4") return [];
  const cached = codeFillCache.get(bankId);
  if (cached) return cached;
  const bank = readJsonFile<CodeFillQuestion[]>("codeFillBank.json");
  codeFillCache.set(bankId, bank);
  return bank;
}

export function countTheoryByType(bank: TheoryQuestion[]) {
  return {
    judgment: bank.filter((q) => q.type === "judgment").length,
    single: bank.filter((q) => q.type === "single").length,
    multiple: bank.filter((q) => q.type === "multiple").length,
  };
}

export function bankContentVersion(bankId: KnownBankId): string {
  const theoryPath = resolveBankFile(theoryFilename(bankId));
  const stat = fs.statSync(theoryPath);
  return `${bankId}-${stat.mtimeMs}`;
}
