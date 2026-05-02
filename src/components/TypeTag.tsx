import type { QuestionType } from "@/types/exam";

const LABEL: Record<QuestionType, string> = {
  judgment: "判断",
  single: "单选",
  multiple: "多选",
};

export function TypeTag({ type }: { type: QuestionType }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
      {LABEL[type]}
    </span>
  );
}
