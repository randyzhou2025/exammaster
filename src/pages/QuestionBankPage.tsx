import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { DEFAULT_QUESTION_BANK_ID, QUESTION_BANKS, type QuestionBankMeta } from "@/data/questionBanks";
import { useAppStore } from "@/stores/appStore";

export function QuestionBankPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const switching = Boolean((loc.state as { switching?: boolean } | null)?.switching);
  const persistedId = useAppStore((s) => s.selectedQuestionBankId);
  const setSelectedQuestionBankId = useAppStore((s) => s.setSelectedQuestionBankId);

  const [chosenId, setChosenId] = useState(() => persistedId ?? DEFAULT_QUESTION_BANK_ID);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSelectedQuestionBankId(chosenId);
    nav("/", { replace: true });
  };

  const allowLeaveBack = switching || Boolean(persistedId);

  return (
    <form onSubmit={onSubmit} className="relative isolate w-full bg-surface">
      {/* 预留底部给 fixed 操作条；内容变多时可整页滚动 */}
      <div className="overflow-y-auto overscroll-y-contain px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <header className="flex min-h-[1.75rem] items-center">
          {allowLeaveBack ? (
            <Link to="/" className="text-sm font-medium text-brand">
              ← 返回
            </Link>
          ) : null}
        </header>

        <h1 className="mt-4 text-xl font-bold text-neutral-900">选择题库</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          请确认备考题库。当前仅开放一套题库，后续将在本页增加更多工种与级别。
        </p>

        <ul className="mt-6 space-y-3">
          {QUESTION_BANKS.map((b: QuestionBankMeta) => {
            const on = chosenId === b.id;
            return (
              <li key={b.id}>
                <label
                  className={clsx(
                    "flex cursor-pointer rounded-2xl border-2 px-4 py-4 transition-colors",
                    on ? "border-brand bg-brand-light/35" : "border-neutral-200 bg-white"
                  )}
                >
                  <input
                    type="radio"
                    name="bank"
                    className="mt-1 h-4 w-4 shrink-0 accent-brand"
                    checked={on}
                    onChange={() => setChosenId(b.id)}
                  />
                  <span className="ml-3 min-w-0">
                    <span className="block font-semibold text-neutral-900">{b.title}</span>
                    <span className="mt-1 block text-sm text-neutral-600">{b.subtitle}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 相对视口固定，不依赖父级 flex 高度（iOS Safari 上链式 flex-1 常把主按钮挤出屏外） */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center">
        <div className="pointer-events-auto w-full max-w-md border-t border-neutral-100 bg-surface/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm supports-[backdrop-filter]:bg-surface/80 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white shadow-md active:opacity-90"
          >
            {persistedId ? "确定" : "进入备考首页"}
          </button>
        </div>
      </div>
    </form>
  );
}
