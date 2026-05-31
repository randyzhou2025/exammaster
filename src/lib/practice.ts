import type { QuestionType } from "@/types/exam";

export type TypePracticeKind = "type-judgment" | "type-single" | "type-multiple";

export const TYPE_PRACTICE_KINDS: readonly TypePracticeKind[] = [
  "type-judgment",
  "type-single",
  "type-multiple",
];

export const QUESTION_TYPES: readonly QuestionType[] = ["judgment", "single", "multiple"];

export function questionTypeToPracticeKind(type: QuestionType): TypePracticeKind {
  return `type-${type}`;
}

export function practiceKindToQuestionType(kind: string): QuestionType | null {
  if (kind === "type-judgment") return "judgment";
  if (kind === "type-single") return "single";
  if (kind === "type-multiple") return "multiple";
  return null;
}

export function isTypePracticeKind(kind: string): kind is TypePracticeKind {
  return TYPE_PRACTICE_KINDS.includes(kind as TypePracticeKind);
}

export function typePracticeShortLabel(type: QuestionType): string {
  if (type === "judgment") return "判断题";
  if (type === "single") return "单选题";
  return "多选题";
}

export function practiceKindLabel(kind: string): string {
  const t = practiceKindToQuestionType(kind);
  if (t === "judgment") return "判断题专项";
  if (t === "single") return "单选题专项";
  if (t === "multiple") return "多选题专项";
  switch (kind) {
    case "sequential":
      return "顺序练习";
    case "random":
      return "随机练习";
    case "unanswered":
      return "未做题";
    case "wrong":
      return "错题练习";
    case "favorite":
      return "收藏练习";
    default:
      return "练习";
  }
}
