import type { Question } from "@/types/exam";
import { EXAM_TEMPLATE } from "@/types/exam";

/** 多选：选项集合完全一致才视为正确（全对才得分） */
export function isAnswerCorrect(q: Question, selected: string[]): boolean {
  const correct = Array.isArray(q.answer) ? [...q.answer].sort() : [q.answer as string];
  const sel = [...selected].sort();
  if (correct.length !== sel.length) return false;
  return correct.every((k, i) => k === sel[i]);
}

export function scoreForQuestion(
  q: Question,
  selected: string[]
): { correct: boolean; points: number } {
  const correct = isAnswerCorrect(q, selected);
  const section = EXAM_TEMPLATE.sections.find((s) => s.type === q.type);
  const per = section?.perScore ?? 0;
  return { correct, points: correct ? per : 0 };
}

export function totalScoreForPaper(
  questions: Question[],
  answersById: Record<string, string[]>
): { score: number; max: number; detail: { id: string; points: number }[] } {
  let score = 0;
  let max = 0;
  const detail: { id: string; points: number }[] = [];
  for (const q of questions) {
    const section = EXAM_TEMPLATE.sections.find((s) => s.type === q.type);
    const per = section?.perScore ?? 0;
    max += per;
    const sel = answersById[q.id] ?? [];
    const { points } = scoreForQuestion(q, sel);
    score += points;
    detail.push({ id: q.id, points });
  }
  return { score, max, detail };
}
