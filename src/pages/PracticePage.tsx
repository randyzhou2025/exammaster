import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import clsx from "clsx";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TypeTag } from "@/components/TypeTag";
import type { Question } from "@/types/exam";
import { isAnswerCorrect } from "@/domain/scoring";
import {
  useAppStore,
  selectStats,
  effectiveLatestOutcome,
  defaultRecord,
  type QuestionRecord,
} from "@/stores/appStore";
import type { UiStudyMode } from "@/stores/appStore";

const CORRECT_FEEDBACK_MS = 500;
/** 切题横向滑入时长（驾考类 App 常见的整页滑动感） */
const SLIDE_IN_MS = 300;
const SWIPE_MIN_PX = 56;
const SWIPE_DOMINANCE = 1.2;
const DRAG_CLAMP_PX = 132;
const HORIZONTAL_DRAG_LOCK_PX = 14;

function formatChoiceKeys(keys: string[]): string {
  if (keys.length === 0) return "—";
  return [...keys].sort().join("、");
}

type AnswerUiSnapshot = { selected: string[]; lastCorrect: boolean };

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
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedHorizRef = useRef(false);
  /** 题目切换方向：用于滑入动画（下一题从右侧入、上一题从左侧入） */
  const slideIntentRef = useRef<"next" | "prev" | null>(null);
  const slideInnerRef = useRef<HTMLDivElement>(null);
  /** 新会话第一题不做滑入，避免进场瞬间飘移 */
  const skipSlideInRef = useRef(true);
  /** 本轮练习内已提交题目的选项与对错（本地不入库；用于返回上一题时还原高亮） */
  const answerSnapshotsRef = useRef<Record<string, AnswerUiSnapshot>>({});

  const [dragX, setDragX] = useState(0);
  const [dragSmooth, setDragSmooth] = useState(true);

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
    if (!practice) answerSnapshotsRef.current = {};
  }, [practice]);

  useEffect(() => {
    if (!practice || practice.orderedIds.length === 0 || !q) return;
    if (uiMode === "memorize") {
      const keys = Array.isArray(q.answer) ? [...q.answer] : [q.answer as string];
      setSelected(keys);
      setGraded(true);
      setLastCorrect(null);
    } else {
      const snap = answerSnapshotsRef.current[q.id];
      if (snap) {
        setSelected(snap.selected);
        setGraded(true);
        setLastCorrect(snap.lastCorrect);
      } else {
        resetLocal();
      }
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
      answerSnapshotsRef.current[question.id] = {
        selected: [...keys],
        lastCorrect: ok,
      };
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
            slideIntentRef.current = "next";
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

  const [persistReady, setPersistReady] = useState(() => useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setPersistReady(true));
    if (useAppStore.persist.hasHydrated()) setPersistReady(true);
    return unsub;
  }, []);

  /** 须放在任意条件 return 之前，否则离开时 practice=null 会导致 hooks 次数不一致 */
  useLayoutEffect(() => {
    const el = slideInnerRef.current;
    if (!el || !q) return;

    const intent = slideIntentRef.current;
    slideIntentRef.current = null;

    if (skipSlideInRef.current) {
      skipSlideInRef.current = false;
      el.style.transition = "none";
      el.style.transform = "translateX(0)";
      return;
    }

    if (!intent) {
      el.style.transition = "none";
      el.style.transform = "translateX(0)";
      return;
    }

    const from = intent === "next" ? "100%" : "-100%";
    el.style.transition = "none";
    el.style.transform = `translateX(${from})`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `transform ${SLIDE_IN_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        el.style.transform = "translateX(0)";
      });
    });
  }, [q?.id]);

  if (!persistReady) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-white text-sm text-neutral-500">
        加载中…
      </div>
    );
  }

  /** 无进行中的会话时回首页（持久化未完成前由 persistReady 挡掉，避免误判） */
  if (!practice) {
    return <Navigate to="/" replace />;
  }

  if (practice.orderedIds.length === 0 || !q) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-neutral-600">当前模式暂无可用题目</p>
        <Link to="/sequential" className="text-brand font-medium">
          返回顺序练习
        </Link>
      </div>
    );
  }

  const index = practice.index;
  const total = practice.orderedIds.length;
  const rec = byId[q.id] ?? defaultRecord();
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

  const clearCorrectAdvanceTimer = () => {
    if (correctAdvanceTimerRef.current !== null) {
      window.clearTimeout(correctAdvanceTimerRef.current);
      correctAdvanceTimerRef.current = null;
    }
  };

  const handlePrev = () => {
    clearCorrectAdvanceTimer();
    if (index <= 0) return;
    slideIntentRef.current = "prev";
    setPracticeIndex(index - 1);
  };

  const handleNext = () => {
    clearCorrectAdvanceTimer();
    if (index >= total - 1) {
      exitPractice();
      nav("/sequential");
      return;
    }
    slideIntentRef.current = "next";
    nextQuestion();
  };

  function clampDragDx(dx: number): number {
    let x = Math.max(Math.min(dx, DRAG_CLAMP_PX), -DRAG_CLAMP_PX);
    if (index <= 0 && x > 0) x *= 0.38;
    if (index >= total - 1 && x < 0) x *= 0.38;
    return x;
  }

  /** 左滑下一题、右滑上一题：跟手位移 + 释放后滑入动画（驾考宝典类交互） */
  const onSwipePointerDown = (e: React.PointerEvent) => {
    if (sheetOpen) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest("button,a,input,textarea,select,[role='dialog'],[role='button']")) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    swipeLockedHorizRef.current = false;
    setDragSmooth(false);
    if (e.pointerType !== "mouse") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onSwipePointerMove = (e: React.PointerEvent) => {
    const start = swipeStartRef.current;
    if (!start || sheetOpen) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!swipeLockedHorizRef.current) {
      if (
        Math.abs(dx) >= HORIZONTAL_DRAG_LOCK_PX &&
        Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE
      ) {
        swipeLockedHorizRef.current = true;
      } else {
        return;
      }
    }
    setDragX(clampDragDx(dx));
  };

  const endSwipeIfAny = (clientX: number, clientY: number) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || sheetOpen) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (!swipeLockedHorizRef.current) {
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return;
      if (dx < 0) handleNext();
      else handlePrev();
      return;
    }
    swipeLockedHorizRef.current = false;
    if (dx < -SWIPE_MIN_PX && index < total - 1) {
      setDragX(0);
      handleNext();
      return;
    }
    if (dx > SWIPE_MIN_PX && index > 0) {
      setDragX(0);
      handlePrev();
      return;
    }
  };

  const finishPointerGesture = (e: React.PointerEvent) => {
    setDragSmooth(true);
    endSwipeIfAny(e.clientX, e.clientY);
    setDragX(0);
    if (e.pointerType !== "mouse") {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onSwipePointerCancel = () => {
    swipeStartRef.current = null;
    swipeLockedHorizRef.current = false;
    setDragSmooth(true);
    setDragX(0);
  };

  const favorite = rec.favorite;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white pb-[env(safe-area-inset-bottom,0px)]">
      <header className="sticky top-0 z-10 flex flex-col border-b border-neutral-100 bg-brand px-3 pb-2.5 pt-2 text-white">
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
      </header>

      <div className="border-b border-brand-light/50 bg-gradient-to-r from-brand-light/25 via-brand-light/35 to-brand-light/25 px-5 py-2 text-center text-[13px] font-medium tracking-wide text-brand-dark">
        高效学习 · 文明备考
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
        <div
          className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overflow-x-hidden"
          style={{
            transform: `translate3d(${dragX}px,0,0)`,
            transition: dragSmooth ? "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
          }}
          onPointerDown={onSwipePointerDown}
          onPointerMove={onSwipePointerMove}
          onPointerUp={finishPointerGesture}
          onPointerCancel={onSwipePointerCancel}
        >
          <div
            ref={slideInnerRef}
            className="space-y-5 px-5 py-5 font-sans text-neutral-900 antialiased"
          >
        <p className="text-[1.125rem] font-medium leading-[1.55] text-neutral-950 sm:text-[1.1875rem]">
          <TypeTag type={q.type} className="mr-1.5 translate-y-[-0.06em]" />
          {q.stem}
        </p>

        <div className="space-y-3">
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
                  "flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left text-[1rem] font-normal leading-[1.5] text-neutral-950 transition-colors sm:text-[1.0625rem]",
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
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold tabular-nums",
                    highlightCorrect && "border-brand bg-brand text-white",
                    highlightWrong && "border-red-400 bg-red-500 text-white",
                    !highlightCorrect && !highlightWrong && "border-neutral-300 text-neutral-600"
                  )}
                >
                  {opt.key}
                </span>
                <span className="flex-1 leading-[1.5]">{opt.text}</span>
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
            className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            确认答案（多选须全对才得分）
          </button>
        ) : null}

        {graded && uiMode === "answer" && lastCorrect === false ? (
          <div className="rounded-lg bg-neutral-100 px-4 py-3 text-[15px] leading-relaxed text-neutral-800">
            答案{" "}
            <span className="font-semibold text-brand">{formatChoiceKeys(correctKeys)}</span>
            {" "}您选择{" "}
            <span className="font-semibold text-red-600">{formatChoiceKeys(selected)}</span>
          </div>
        ) : null}

        {graded && uiMode === "answer" && lastCorrect === true ? (
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[15px] leading-snug text-emerald-900">
            <span className="font-semibold">结果：</span>
            回答正确
          </div>
        ) : null}

        {(uiMode === "memorize" && graded) || (graded && uiMode === "answer" && lastCorrect === false) ? (
          <div className="space-y-3 rounded-xl border border-neutral-100 bg-surface p-4 text-[15px] leading-relaxed text-neutral-800">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-neutral-500">
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
            className="w-full rounded-xl border border-brand py-3.5 text-[15px] font-semibold text-brand"
          >
            {index >= total - 1 ? "结束练习" : "下一题"}
          </button>
        ) : null}
          </div>
        </div>
      </main>

      <footer className="safe-pb sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-2.5 text-[13px] text-neutral-600">
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-neutral-600"
          onClick={() => toggleFavorite(q.id)}
        >
          <span className={clsx("text-lg", favorite ? "text-amber-500" : "")}>{favorite ? "★" : "☆"}</span>
          收藏
        </button>
        <div className="flex items-center gap-3 tabular-nums">
          <span className="leading-snug text-brand">答对 {stats.attemptCorrect}</span>
          <button
            type="button"
            className="m-0 border-0 bg-transparent p-0 leading-snug font-normal text-red-500 underline-offset-2 hover:underline"
            onClick={() => {
              exitPractice();
              nav("/wrong-book");
            }}
          >
            答错 {stats.attemptWrong}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center gap-0.5"
        >
          <span className="text-lg">⊞</span>
          <span className="tabular-nums text-neutral-700">
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
            if (i !== index) {
              slideIntentRef.current = i > index ? "next" : "prev";
              setPracticeIndex(i);
            }
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
  byId: Record<string, QuestionRecord>;
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
            const o = effectiveLatestOutcome(byId[id] ?? defaultRecord());
            const tone =
              o === "correct" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : o === "wrong"
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
