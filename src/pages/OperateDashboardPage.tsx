import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useShallow } from "zustand/react/shallow";
import { routes } from "@/lib/routes";
import { CODE_FILL_BANK } from "@/data/codeFillBank";
import {
  selectCodeFillStats,
  useCodeFillStore,
  useCodeFillStoreHydrated,
  type CodeFillPracticeMode,
} from "@/stores/codeFillStore";

const ALL_IDS = CODE_FILL_BANK.map((q) => q.id);

export function OperateDashboardPage() {
  const nav = useNavigate();
  const hydrated = useCodeFillStoreHydrated();
  const stats = useCodeFillStore(useShallow(selectCodeFillStats));
  const byId = useCodeFillStore((s) => s.byId);
  const startPractice = useCodeFillStore((s) => s.startPractice);
  const resetOperateProgress = useCodeFillStore((s) => s.resetOperateProgress);

  const [mode, setMode] = useState<CodeFillPracticeMode>("sequential");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [clearOpen, setClearOpen] = useState(false);

  const selectedCount = picked.size;
  const canStart = mode !== "pick" || selectedCount > 0;

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStart = () => {
    startPractice(mode, mode === "pick" ? [...picked].sort() : undefined);
    nav(routes.operateSession);
  };

  const completedSet = useMemo(
    () => new Set(ALL_IDS.filter((id) => byId[id]?.completed === true)),
    [byId]
  );

  const completedLabel = hydrated ? String(stats.completed) : "—";
  const completedRatio = hydrated ? `${stats.completed} / ${stats.total}` : `— / ${stats.total}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-violet-600 to-indigo-800 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-white">
      <header className="flex items-center gap-3 px-3 pt-2">
        <Link
          to={routes.theoryHome}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="返回"
        >
          ←
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold">代码填空练习</h1>
        <span className="w-10" />
      </header>

      <div className="mt-4 px-4">
        <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
          <p className="text-center text-sm text-neutral-500">题目总数 {stats.total} · 已完成 {completedLabel}</p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {(
              [
                ["sequential", "按顺序"],
                ["random", "随机"],
                ["pick", "选题"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  "rounded-lg py-2 font-medium",
                  mode === m ? "bg-violet-600 text-white" : "bg-neutral-100 text-neutral-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "pick" ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>已选 {selectedCount} 题</span>
                <div className="gap-2 flex">
                  <button type="button" className="text-brand" onClick={() => setPicked(new Set(ALL_IDS))}>
                    全选
                  </button>
                  <button type="button" className="text-brand" onClick={() => setPicked(new Set())}>
                    清除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ALL_IDS.map((id) => {
                  const on = picked.has(id);
                  const done = completedSet.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePick(id)}
                      className={clsx(
                        "relative rounded-lg border py-2 text-xs font-medium",
                        on ? "border-violet-500 bg-violet-50 text-violet-900" : "border-neutral-200 bg-neutral-50 text-neutral-600"
                      )}
                    >
                      {id}
                      {done ? (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="rounded-xl bg-violet-50 px-3 py-3 text-center text-sm leading-relaxed text-violet-900">
                {mode === "sequential"
                  ? "将按题号顺序练习全部 20 题（1.1.1 → 3.2.5）"
                  : "将随机打乱 20 题顺序后练习"}
              </p>
              <p className="mt-2 text-center text-xs text-neutral-500">
                已完成 {completedRatio} 题
                {hydrated && stats.completed > 0 ? " · 带 ✓ 表示已通过检查" : ""}
              </p>
              <details className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80">
                <summary className="cursor-pointer px-3 py-2 text-center text-xs text-neutral-500">
                  查看题号与完成状态（仅浏览，不可点选）
                </summary>
                <div
                  className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 border-t border-dashed border-neutral-200 px-3 pb-3 pt-2"
                  aria-label="题号列表，仅展示"
                >
                  {ALL_IDS.map((id) => {
                    const done = completedSet.has(id);
                    return (
                      <span
                        key={id}
                        className={clsx(
                          "select-none text-[11px] tabular-nums",
                          done ? "font-medium text-emerald-700" : "text-neutral-500"
                        )}
                      >
                        {id}
                        {done ? " ✓" : ""}
                      </span>
                    );
                  })}
                </div>
              </details>
            </div>
          )}

          <button
            type="button"
            disabled={!canStart}
            onClick={handleStart}
            className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-base font-semibold text-white disabled:opacity-40"
          >
            开始答题
          </button>

          <button
            type="button"
            onClick={() => setClearOpen(true)}
            className="mt-3 w-full rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600"
          >
            清空实操进度
          </button>
        </div>
      </div>

      {clearOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-neutral-900">
            <p className="font-semibold">清空实操进度？</p>
            <p className="mt-2 text-sm text-neutral-500">仅清除代码填空记录，不影响理论练习。</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-lg border py-2 text-sm"
                onClick={() => setClearOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm text-white"
                onClick={() => {
                  resetOperateProgress();
                  setClearOpen(false);
                }}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
