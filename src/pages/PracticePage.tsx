import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import clsx from "clsx";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TypeTag } from "@/components/TypeTag";
import type { Question } from "@/types/exam";
import { isAnswerCorrect } from "@/domain/scoring";
import { useAppStore, selectStats } from "@/stores/appStore";
import type { UiStudyMode } from "@/stores/appStore";

const CORRECT_FEEDBACK_MS = 500;

function formatChoiceKeys(keys: string[]): string {
  if (keys.length === 0) return "—";
  return [...keys].sort().join("、");
}

export function PracticePage() {
  const nav = useNavigate();
  const practice = useAppStore((s) => s.practice);
  const bank = useAppStore((s) => s.bank);
  const byId = useAppStore((s) => s.byId);
  const setPracticeUiMode = useAppStore((s) => s.setPracticeUiMode);
  const setPracticeIndex = useAppStore((s) => s.setPracticeIndex);
  const nextQuestion = useAppStore((s) => s.nextQuestion);
  const submitPracticeAnswer = useAppStore((s) => s.submitPracticeAnswer);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const exitPractice = useAppStore((s) => s.exitPractice);
  const stats = useAppStore(useShallow(selectStats));

  const [selected, setSelected] = useState<string[]>([]);
  const [graded, setGraded] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const correctAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = useMemo(() => {
    if (!practice || practice.orderedIds.length === 0) return null;
    const id = practice.orderedIds[practice.index];
    return bank.find((x) => x.id === id) ?? null;
  }, [practice, bank]);

  const uiMode = practice?.uiMode ?? "answer";

  const resetLocal = useCallback(() => {
    setSelected([]);
    setGraded(false);
    setLastCorrect(null);
  }, []);

  useEffect(() => {
    if (!practice || practice.orderedIds.length === 0 || !q) return;
    if (uiMode === "memorize") {
      const keys = Array.isArray(q.answer) ? [...q.answer] : [q.answer as string];
      setSelected(keys);
      setGraded(true);
      setLastCorrect(null);
    } else {
      resetLocal();
    }
  }, [practice, q, uiMode, resetLocal]);

  useEffect(() => {
    return () => {
      if (correctAdvanceTimerRef.current !== null) {
        window.clearTimeout(correctAdvanceTimerRef.current);
        correctAdvanceTimerRef.current = null;
      }
    };
  }, [q?.id]);

  const onChangeMode = (m: UiStudyMode) => {
    if (correctAdvanceTimerRef.current !== null) {
      window.clearTimeout(correctAdvanceTimerRef.current);
      correctAdvanceTimerRef.current = null;
    }
    setPracticeUiMode(m);
  };

  /** 答题模式：答对展示样式 500ms 后进入下一题；答错展示标答与解析 */
  const submitAnswerMode = useCallback(
    (question: Question, keys: string[]) => {
      const ok = isAnswerCorrect(question, keys);
      submitPracticeAnswer(question.id, keys, "answer");
      if (ok) {
        if (correctAdvanceTimerRef.current !== null) {
          window.clearTimeout(correctAdvanceTimerRef.current);
          correctAdvanceTimerRef.current = null;
        }
        setSelected(keys);
        setGraded(true);
        setLastCorrect(true);
        correctAdvanceTimerRef.current = window.setTimeout(() => {
          correctAdvanceTimerRef.current = null;
          const snap = useAppStore.getState().practice;
          if (!snap) return;
          const n = snap.orderedIds.length;
          const idx = snap.index;
          const isLast = idx >= n - 1;
          resetLocal();
          if (isLast) {
            exitPractice();
            nav("/sequential");
          } else {
            nextQuestion();
          }
        }, CORRECT_FEEDBACK_MS);
        return;
      }
      setSelected(keys);
      setLastCorrect(false);
      setGraded(true);
    },
    [submitPracticeAnswer, exitPractice, nav, nextQuestion, resetLocal]
  );

  if (!practice) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-neutral-600">没有进行中的练习</p>
        <Link to="/" className="text-brand font-medium">
          返回首页
        </Link>
      </div>
    );
  }

  if (practice.orderedIds.length === 0 || !q) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-neutral-600">当前模式暂无可用题目</p>
        <Link to="/sequential" className="text-brand font-medium">
          返回顺序练习
        </Link>
      </div>
    );
  }

  const index = practice.index;
  const total = practice.orderedIds.length;
  const rec = byId[q.id] ?? { firstAnswerMode: "unset" as const, favorite: false, remediated: false };
  const correctKeys = Array.isArray(q.answer) ? q.answer : [q.answer];

  const handlePick = (key: string) => {
    if (uiMode === "memorize") return;
    if (graded) return;
    if (q.type === "multiple") {
      setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
      return;
    }
    submitAnswerMode(q, [key]);
  };

  const handleConfirmMultiple = () => {
    if (graded || uiMode === "memorize") return;
    submitAnswerMode(q, selected);
  };

  const handleNext = () => {
    if (correctAdvanceTimerRef.current !== null) {
      window.clearTimeout(correctAdvanceTimerRef.current);
      correctAdvanceTimerRef.current = null;
    }
    if (index >= total - 1) {
      exitPractice();
      nav("/sequential");
      return;
    }
    resetLocal();
    nextQuestion();
  };

  const favorite = rec.favorite;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <header className="sticky top-0 z-10 flex flex-col gap-2 border-b border-neutral-100 bg-brand px-3 pb-3 pt-2 text-white">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="返回"
            onClick={() => {
              if (correctAdvanceTimerRef.current !== null) {
                window.clearTimeout(correctAdvanceTimerRef.current);
                correctAdvanceTimerRef.current = null;
              }
              exitPractice();
              nav(-1);
            }}
          >
            ←
          </button>
          <div className="flex flex-1 justify-center">
            <SegmentedControl<UiStudyMode>
              options={[
                { value: "answer", label: "答题模式" },
                { value: "memorize", label: "背题模式" },
              ]}
              value={uiMode}
              onChange={onChangeMode}
            />
          </div>
          <Link to="/settings" className="px-1 text-sm text-white/90">
            设置
          </Link>
        </div>
        <p className="text-center text-[11px] text-white/75">
          答题模式：答对展示反馈约 0.5s 后自动下一题；答错展示解析。背题模式不写首次统计与错题本
        </p>
      </header>

      <div className="border-b border-brand-light/40 bg-brand-light/30 px-4 py-2 text-xs text-brand-dark">
        安全学习 · 文明备考（示意横幅）
      </div>

      <main className="flex-1 space-y-4 px-4 py-4">
        <div className="flex gap-2">
          <TypeTag type={q.type} />
          <p className="text-base font-medium leading-relaxed text-neutral-900">{q.stem}</p>
        </div>

        <div className="space-y-2">
          {q.options.map((opt) => {
            const isSelected = selected.includes(opt.key);
            const isCorrect = correctKeys.includes(opt.key);
            const showSolution = uiMode === "memorize" || (graded && uiMode === "answer");
            const highlightCorrect = showSolution && isCorrect;
            const highlightWrong = showSolution && isSelected && !isCorrect;

            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => handlePick(opt.key)}
                className={clsx(
                  "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                  highlightCorrect && "border-brand bg-brand-light/80 text-brand-dark",
                  highlightWrong && "border-red-300 bg-red-50 text-red-700",
                  !highlightCorrect &&
                    !highlightWrong &&
                    isSelected &&
                    "border-brand/60 bg-brand-light/40",
                  !highlightCorrect && !highlightWrong && !isSelected && "border-neutral-200 bg-white"
                )}
              >
                <span
                  className={clsx(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    highlightCorrect && "border-brand bg-brand text-white",
                    highlightWrong && "border-red-400 bg-red-500 text-white",
                    !highlightCorrect && !highlightWrong && "border-neutral-300 text-neutral-600"
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1 leading-relaxed">{opt.text}</span>
                {showSolution && isCorrect ? (
                  <span className="text-brand" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {q.type === "multiple" && uiMode === "answer" && !graded ? (
          <button
            type="button"
            onClick={handleConfirmMultiple}
            disabled={selected.length === 0}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            确认答案（多选须全对才得分）
          </button>
        ) : null}

        {graded && uiMode === "answer" && lastCorrect === false ? (
          <div className="rounded-lg bg-neutral-100 px-4 py-3 text-sm leading-relaxed text-neutral-800">
            答案{" "}
            <span className="font-semibold text-brand">{formatChoiceKeys(correctKeys)}</span>
            {" "}您选择{" "}
            <span className="font-semibold text-red-600">{formatChoiceKeys(selected)}</span>
          </div>
        ) : null}

        {graded && uiMode === "answer" && lastCorrect === true ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="font-semibold">结果：</span>
            回答正确
          </div>
        ) : null}

        {(uiMode === "memorize" && graded) || (graded && uiMode === "answer" && lastCorrect === false) ? (
          <div className="space-y-3 rounded-xl border border-neutral-100 bg-surface p-4 text-sm text-neutral-800">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <span className="h-px flex-1 bg-neutral-200" />
              试题详解
              <span className="h-px flex-1 bg-neutral-200" />
            </div>
            {q.explanation ? <p>{q.explanation}</p> : <p className="text-neutral-500">暂无解析</p>}
            {q.tip ? (
              <div className="rounded-lg bg-orange-50 px-3 py-2 text-orange-900">
                <span className="font-semibold">本题技巧：</span>
                {q.tip}
              </div>
            ) : null}
          </div>
        ) : null}

        {(uiMode === "memorize" && graded) || (graded && uiMode === "answer" && lastCorrect === false) ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-xl border border-brand py-3 text-sm font-semibold text-brand"
          >
            {index >= total - 1 ? "结束练习" : "下一题"}
          </button>
        ) : null}
      </main>

      <footer className="safe-pb sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-3 py-2 text-xs text-neutral-600">
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-neutral-600"
          onClick={() => toggleFavorite(q.id)}
        >
          <span className={clsx("text-lg", favorite ? "text-amber-500" : "")}>{favorite ? "★" : "☆"}</span>
          收藏
        </button>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="text-brand">首对 {stats.correctFirst}</span>
          <Link
            to="/wrong-book"
            onClick={() => exitPractice()}
            className="text-red-500 underline-offset-2 hover:underline"
          >
            首错 {stats.wrongFirst}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center gap-0.5"
        >
          <span className="text-lg">⊞</span>
          <span>
            {index + 1}/{total}
          </span>
        </button>
      </footer>

      {sheetOpen ? (
        <QuestionSheet
          orderedIds={practice.orderedIds}
          byId={byId}
          index={index}
          onPick={(i) => {
            if (correctAdvanceTimerRef.current !== null) {
              window.clearTimeout(correctAdvanceTimerRef.current);
              correctAdvanceTimerRef.current = null;
            }
            setPracticeIndex(i);
            resetLocal();
            setSheetOpen(false);
          }}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function QuestionSheet({
  orderedIds,
  byId,
  index,
  onPick,
  onClose,
}: {
  orderedIds: string[];
  byId: Record<string, { firstAnswerMode: string }>;
  index: number;
  onPick: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black/40" role="dialog" aria-modal>
      <button type="button" className="flex-1" aria-label="关闭" onClick={onClose} />
      <div className="max-h-[55vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">题单</p>
          <button type="button" className="text-sm text-brand" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {orderedIds.map((id, i) => {
            const r = byId[id]?.firstAnswerMode ?? "unset";
            const tone =
              r === "correct" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r === "wrong"
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-neutral-50 text-neutral-600 border-neutral-200";
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPick(i)}
                className={clsx(
                  "rounded-lg border py-2 text-sm font-medium tabular-nums",
                  tone,
                  i === index && "ring-2 ring-brand"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
