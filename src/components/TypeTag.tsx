import clsx from "clsx";
import type { QuestionType } from "@/types/exam";

const LABEL: Record<QuestionType, string> = {
  judgment: "判断",
  single: "单选",
  multiple: "多选",
};

/** 驾考类 App 常见样式：小标签、蓝底白字，与题干首行内联排版 */
export function TypeTag({ type, className }: { type: QuestionType; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center align-middle rounded px-2 py-0.5 text-[12px] font-medium leading-none text-white bg-brand",
        className
      )}
    >
      {LABEL[type]}
    </span>
  );
}
