/** 题库目录（当前仅一套，预留多题库扩展） */

export const DEFAULT_QUESTION_BANK_ID = "ai-trainer-l3";

export interface QuestionBankMeta {
  id: string;
  title: string;
  subtitle: string;
}

export const QUESTION_BANKS: QuestionBankMeta[] = [
  {
    id: DEFAULT_QUESTION_BANK_ID,
    title: "人工智能训练师（3级）",
    subtitle: "理论知识 · 顺序练习与模拟考试均使用该题库",
  },
];

export function getQuestionBankMeta(id: string | null | undefined): QuestionBankMeta | undefined {
  if (!id) return undefined;
  return QUESTION_BANKS.find((b) => b.id === id);
}
