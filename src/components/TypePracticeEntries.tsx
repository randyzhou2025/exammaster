import clsx from "clsx";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import {
  QUESTION_TYPES,
  questionTypeToPracticeKind,
  typePracticeShortLabel,
  type TypePracticeOrder,
} from "@/lib/practice";
import type { QuestionType } from "@/types/exam";
import { computeStatsByType, useAppStore } from "@/stores/appStore";

const TYPE_CELL_STYLE: Record<QuestionType, { shell: string; badge: string; btn: string }> = {
  judgment: {
    shell: "border-sky-200 bg-sky-50/90",
    badge: "bg-sky-600 text-white",
    btn: "border-sky-200 bg-white text-sky-800 active:bg-sky-50",
  },
  single: {
    shell: "border-brand/35 bg-brand-light/40",
    badge: "bg-brand text-white",
    btn: "border-brand/30 bg-white text-brand-dark active:bg-brand-light/50",
  },
  multiple: {
    shell: "border-violet-200 bg-violet-50/90",
    badge: "bg-violet-600 text-white",
    btn: "border-violet-200 bg-white text-violet-800 active:bg-violet-50",
  },
};

/** 顺序练习页白卡片内：按题型入口（各题型可选顺序/随机） */
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

  const openType = (type: QuestionType, typeOrder: TypePracticeOrder) => {
    startPractice(questionTypeToPracticeKind(type), "answer", { typeOrder });
    nav(lr.theoryPracticeSession);
  };

  return (
    <div className="mt-5 border-t border-neutral-100 pt-4">
      <p className="text-center text-xs font-medium text-neutral-400">按题型练</p>
      <div
        className={clsx(
          "mt-2.5 grid gap-2 text-sm",
          entries.length === 2 ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {entries.map(({ type, stats }) => {
          const style = TYPE_CELL_STYLE[type];
          const label = typePracticeShortLabel(type);
          return (
            <div
              key={type}
              className={clsx(
                "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1.5 py-2.5 text-center",
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
              <span className="text-[11px] tabular-nums leading-none text-neutral-500">
                {stats.answered}/{stats.total}
              </span>
              <div className="mt-0.5 grid w-full grid-cols-2 gap-1">
                <button
                  type="button"
                  aria-label={`${label}顺序练习，已练 ${stats.answered} 题，共 ${stats.total} 题`}
                  onClick={() => openType(type, "sequential")}
                  className={clsx(
                    "min-h-11 rounded-lg border text-xs font-semibold",
                    "touch-manipulation [-webkit-tap-highlight-color:transparent] active:scale-[0.98]",
                    style.btn
                  )}
                >
                  顺序
                </button>
                <button
                  type="button"
                  aria-label={`${label}随机练习，已练 ${stats.answered} 题，共 ${stats.total} 题`}
                  onClick={() => openType(type, "random")}
                  className={clsx(
                    "min-h-11 rounded-lg border text-xs font-semibold",
                    "touch-manipulation [-webkit-tap-highlight-color:transparent] active:scale-[0.98]",
                    style.btn
                  )}
                >
                  随机
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
