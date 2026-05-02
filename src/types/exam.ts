export type QuestionType = "judgment" | "single" | "multiple";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  /** 判断/单选: 单个 key；多选: 多个 key，判分仅「全对得分」 */
  answer: string | string[];
  explanation?: string;
  tip?: string;
}

/** 官方模考结构（常量） */
export const EXAM_TEMPLATE = {
  totalScore: 100,
  passScore: 60,
  durationMinutes: 60,
  sections: [
    { type: "judgment" as const, count: 40, score: 20, perScore: 0.5 },
    { type: "single" as const, count: 140, score: 70, perScore: 0.5 },
    { type: "multiple" as const, count: 10, score: 10, perScore: 1 },
  ],
} as const;

export type FirstOutcome = "unset" | "correct" | "wrong";

export interface QuestionProgress {
  firstOutcome: FirstOutcome;
  favorite: boolean;
}

export interface ProgressState {
  byQuestionId: Record<string, QuestionProgress>;
}

export interface MockExamRecord {
  id: string;
  startedAt: string;
  submittedAt: string;
  score: number;
  maxScore: number;
  passed: boolean;
  durationUsedSec: number;
  questionIds: string[];
}
