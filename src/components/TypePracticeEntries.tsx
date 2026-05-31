import clsx from "clsx";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import { QUESTION_TYPES, questionTypeToPracticeKind, typePracticeShortLabel } from "@/lib/practice";
import type { QuestionType } from "@/types/exam";
import { computeStatsByType, useAppStore } from "@/stores/appStore";

const TYPE_CELL_STYLE: Record<QuestionType, { shell: string; badge: string }> = {
  judgment: {
    shell: "border-sky-200 bg-sky-50/90 active:border-sky-300 active:bg-sky-100/90",
    badge: "bg-sky-600 text-white",
  },
  single: {
    shell: "border-brand/35 bg-brand-light/40 active:border-brand/50 active:bg-brand-light/60",
    badge: "bg-brand text-white",
  },
  multiple: {
    shell: "border-violet-200 bg-violet-50/90 active:border-violet-300 active:bg-violet-100/90",
    badge: "bg-violet-600 text-white",
  },
};

/** 顺序练习页白卡片内：按题型入口 */
export function TypePracticeEntries() {
  const nav = useNavigate();
  const { routes: lr } = useLevelRoutes();
  const startPractice = useAppStore((s) => s.startPractice);
  const bank = useAppStore((s) => s.bank);
  const byId = useAppStore((s) => s.byId);

  const entries = useMemo(() => {
    const byType = computeStatsByType(bank, byId);
    return QUESTION_TYPES.map((type) => ({ type, stats: byType[type] })).filter((e) => e.stats.total > 0);
  }, [bank, byId]);

  if (entries.length === 0) return null;

  const openType = (type: QuestionType) => {
    startPractice(questionTypeToPracticeKind(type));
    nav(lr.theoryPracticeSession);
  };

  return (
    <div className="mt-5 border-t border-neutral-100 pt-5">
      <p className="text-center text-xs text-neutral-500">按题型练 · 仅刷该题型，按题库顺序</p>
      <div
        className={clsx(
          "mt-3 grid gap-2.5 text-sm",
          entries.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {entries.map(({ type, stats }) => {
          const style = TYPE_CELL_STYLE[type];
          const label = typePracticeShortLabel(type);
          return (
            <button
              key={type}
              type="button"
              aria-label={`开始${label}，已练 ${stats.answered} 题，共 ${stats.total} 题`}
              onClick={() => openType(type)}
              className={clsx(
                "flex min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 py-3 text-center shadow-sm",
                "touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform active:scale-[0.98]",
                style.shell
              )}
            >
              <span
                className={clsx(
                  "inline-flex min-h-[1.25rem] items-center rounded-md px-2 text-[11px] font-semibold leading-none",
                  style.badge
                )}
              >
                {label.replace("题", "")}
              </span>
              <span className="text-lg font-bold tabular-nums leading-none text-neutral-900">
                {stats.answered}/{stats.total}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
