import type { Question } from "@/types/exam";
import type { MockExamRecord } from "@/types/exam";
import { isAnswerCorrect } from "@/domain/scoring";

export function formatChoiceKeys(keys: string[]): string {
  if (keys.length === 0) return "未作答";
  return [...keys].sort().join("、");
}

export function paperFromQuestionIds(bank: Question[], questionIds: string[]): Question[] {
  return questionIds
    .map((id) => bank.find((q) => q.id === id))
    .filter((q): q is Question => q != null);
}

export function wrongQuestionsInPaper(
  paper: Question[],
  answers: Record<string, string[]>
): Question[] {
  return paper.filter((q) => !isAnswerCorrect(q, answers[q.id] ?? []));
}

export function resolveMockReviewData(opts: {
  bank: Question[];
  paper?: Question[] | null;
  answers?: Record<string, string[]> | null;
  examId?: string | null;
  mockHistory: MockExamRecord[];
}): { paper: Question[]; answers: Record<string, string[]> } | null {
  if (opts.paper && opts.paper.length > 0 && opts.answers) {
    return { paper: opts.paper, answers: opts.answers };
  }
  if (!opts.examId) return null;
  const record = opts.mockHistory.find((r) => r.id === opts.examId);
  if (!record) return null;
  const answers = record.answers ?? {};
  const paper = paperFromQuestionIds(opts.bank, record.questionIds);
  if (paper.length === 0) return null;
  return { paper, answers };
}
