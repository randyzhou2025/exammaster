import type { Question, QuestionType } from "@/types/exam";
import { EXAM_TEMPLATE } from "@/types/exam";

export type AssemblyError =
  | { code: "INSUFFICIENT_BANK"; missing: Partial<Record<QuestionType, number>> };

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 按官方模板从题库分层随机抽题。不足则返回错误（不缩卷，避免分数争议）。
 */
export function assembleMockExamPaper(
  bank: Question[],
  random: () => number = Math.random
): { ok: true; paper: Question[] } | { ok: false; error: AssemblyError } {
  const byType = (t: QuestionType) => bank.filter((q) => q.type === t);
  const missing: Partial<Record<QuestionType, number>> = {};

  const paper: Question[] = [];
  for (const sec of EXAM_TEMPLATE.sections) {
    const pool = byType(sec.type);
    if (pool.length < sec.count) {
      missing[sec.type] = sec.count - pool.length;
    }
  }

  if (Object.keys(missing).length > 0) {
    return { ok: false, error: { code: "INSUFFICIENT_BANK", missing } };
  }

  for (const sec of EXAM_TEMPLATE.sections) {
    const pool = byType(sec.type);
    const picked = shuffle(pool, random).slice(0, sec.count);
    paper.push(...picked);
  }

  return { ok: true, paper };
}
