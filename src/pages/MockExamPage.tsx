import { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { TypeTag } from "@/components/TypeTag";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import { getExamTemplateForBank } from "@/data/questionBanks";
import { useAppStore } from "@/stores/appStore";
import { totalScoreForPaper } from "@/domain/scoring";

function formatMmSs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const SLIDE_IN_MS = 280;
const SWIPE_MIN_PX = 56;
const SWIPE_DOMINANCE = 1.2;
const DRAG_CLAMP_PX = 120;
const HORIZONTAL_DRAG_LOCK_PX = 14;
/** 判断/单选：先展示选中样式，再自动下一题 */
const AUTO_ADVANCE_MS = 380;

function countUnanswered(
  paperIds: string[],
  answers: Record<string, string[]>
): number {
  let n = 0;
  for (const id of paperIds) {
    if ((answers[id] ?? []).length === 0) n += 1;
  }
  return n;
}

export function MockExamPage() {
  const nav = useNavigate();
  const { routes: lr } = useLevelRoutes();
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const examTemplate = getExamTemplateForBank(bankId);
  const mock = useAppStore((s) => s.mockExam);
  const examStartedAt = useAppStore((s) => s.mockExam?.startedAt ?? 0);
  const bank = useAppStore((s) => s.bank);
  const setMockAnswer = useAppStore((s) => s.setMockAnswer);
  const setMockIndex = useAppStore((s) => s.setMockIndex);
  const submitMockExam = useAppStore((s) => s.submitMockExam);

  const [remain, setRemain] = useState(0);
  const [sheet, setSheet] = useState(false);
  const submitted = useRef(false);

  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeLockedHorizRef = useRef(false);
  const slideIntentRef = useRef<"next" | "prev" | null>(null);
  const slideInnerRef = useRef<HTMLDivElement>(null);
  const skipSlideInRef = useRef(true);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dragX, setDragX] = useState(0);
  const [dragSmooth, setDragSmooth] = useState(true);

  const paper = useMemo(() => {
    if (!mock) return [];
    return mock.paperIds.map((id) => bank.find((q) => q.id === id)).filter(Boolean) as typeof bank;
  }, [mock, bank]);

  const q =
    mock && paper.length && mock.currentIndex >= 0
      ? paper[mock.currentIndex] ?? null
      : null;

  useEffect(() => {
    skipSlideInRef.current = true;
  }, [mock?.startedAt]);

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

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearAdvanceTimer();
    return clearAdvanceTimer;
  }, [q?.id, clearAdvanceTimer]);

  const scheduleAutoNext = useCallback(() => {
    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      const snap = useAppStore.getState().mockExam;
      if (!snap || snap.currentIndex >= snap.paperIds.length - 1) return;
      slideIntentRef.current = "next";
      setMockIndex(snap.currentIndex + 1);
    }, AUTO_ADVANCE_MS);
  }, [clearAdvanceTimer, setMockIndex]);

  const handleSubmit = useCallback(
    (timedOut: boolean) => {
      if (submitted.current) return;
      const snap = useAppStore.getState().mockExam;
      if (!snap) return;
      submitted.current = true;
      const fullPaper = snap.paperIds
        .map((id) => useAppStore.getState().bank.find((x) => x.id === id))
        .filter(Boolean) as typeof bank;
      const { score, max } = totalScoreForPaper(fullPaper, snap.answers, examTemplate);
      const used = timedOut
        ? examTemplate.durationMinutes * 60
        : Math.min(examTemplate.durationMinutes * 60, Math.floor((Date.now() - snap.startedAt) / 1000));
      const examId = submitMockExam({
        startedAt: new Date(snap.startedAt).toISOString(),
        submittedAt: new Date().toISOString(),
        score,
        maxScore: max,
        passed: score >= examTemplate.passScore,
        durationUsedSec: used,
        questionIds: snap.paperIds,
        answers: { ...snap.answers },
      });
      nav(lr.theoryMockResult, {
        replace: true,
        state: { score, max, paper: fullPaper, answers: snap.answers, examId },
      });
    },
    [nav, submitMockExam, examTemplate]
  );

  useEffect(() => {
    if (!examStartedAt) return;
    submitted.current = false;
    const tick = () => {
      const m = useAppStore.getState().mockExam;
      if (!m) return;
      const left = Math.max(0, Math.floor((m.deadlineAt - Date.now()) / 1000));
      setRemain(left);
      if (left === 0 && !submitted.current) handleSubmit(true);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [examStartedAt, handleSubmit]);

  if (!mock || !q) {
    return <Navigate to={lr.theoryHome} replace />;
  }

  const idx = mock.currentIndex;
  const len = paper.length;
  const isLast = idx >= len - 1;
  const selected = mock.answers[q.id] ?? [];

  const goPrev = () => {
    clearAdvanceTimer();
    if (idx <= 0) return;
    slideIntentRef.current = "prev";
    setMockIndex(idx - 1);
  };

  const goNext = () => {
    clearAdvanceTimer();
    if (idx >= len - 1) return;
    slideIntentRef.current = "next";
    setMockIndex(idx + 1);
  };

  const stopSwipeBubble = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  /** 判断 / 单选：先高亮选中项，短暂停留后自动下一题；末题不切题 */
  const pick = (key: string) => {
    if (q.type === "multiple") {
      const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
      setMockAnswer(q.id, next);
      return;
    }
    if (advanceTimerRef.current !== null) return;
    setMockAnswer(q.id, [key]);
    if (!isLast) scheduleAutoNext();
  };

  /** 多选：确认后短暂展示再下一题 */
  const confirmMultipleNext = () => {
    if (selected.length === 0) {
      window.alert("请至少选择一项后再进入下一题。");
      return;
    }
    if (advanceTimerRef.current !== null) return;
    if (!isLast) scheduleAutoNext();
  };

  const trySubmit = () => {
    const snap = useAppStore.getState().mockExam;
    if (!snap) return;
    const n = countUnanswered(snap.paperIds, snap.answers);
    if (n > 0) {
      window.alert(`尚有 ${n} 道题未作答，请完成后再交卷。`);
      return;
    }
    handleSubmit(false);
  };

  function clampDrag(dx: number): number {
    let x = Math.max(Math.min(dx, DRAG_CLAMP_PX), -DRAG_CLAMP_PX);
    if (idx <= 0 && x > 0) x *= 0.38;
    if (idx >= len - 1 && x < 0) x *= 0.38;
    return x;
  }

  const onSwipePointerDown = (e: React.PointerEvent) => {
    if (sheet) return;
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
    if (!start || sheet) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!swipeLockedHorizRef.current) {
      if (
        Math.abs(dx) >= HORIZONTAL_DRAG_LOCK_PX &&
        Math.abs(dx) >= Math.abs(dy) * SWIPE_DOMINANCE
      ) {
        swipeLockedHorizRef.current = true;
      } else return;
    }
    setDragX(clampDrag(dx));
  };

  const endSwipeIfAny = (clientX: number, clientY: number) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || sheet) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;

    const tryHorizSwipe = () => {
      if (dx < -SWIPE_MIN_PX && idx < len - 1) {
        setDragX(0);
        slideIntentRef.current = "next";
        setMockIndex(idx + 1);
        return true;
      }
      if (dx > SWIPE_MIN_PX && idx > 0) {
        setDragX(0);
        slideIntentRef.current = "prev";
        setMockIndex(idx - 1);
        return true;
      }
      return false;
    };

    if (!swipeLockedHorizRef.current) {
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return;
      tryHorizSwipe();
      return;
    }
    swipeLockedHorizRef.current = false;
    tryHorizSwipe();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white pb-[env(safe-area-inset-bottom,0px)]">
      <header className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("确定退出考试？本次成绩将作废。")) {
              useAppStore.getState().abortMockExam();
              nav(lr.theoryMock, { replace: true });
            }
          }}
          className="text-sm text-neutral-600"
        >
          退出
        </button>
        <span className="font-mono text-sm font-semibold text-red-600">{formatMmSs(remain)}</span>
        <button type="button" className="text-sm text-brand" onClick={() => setSheet(true)}>
          答题卡
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden">
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
          <main ref={slideInnerRef} className="space-y-4 px-4 py-4 pb-36">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>
                第 {mock.currentIndex + 1} / {paper.length} 题
              </span>
              <span>考试中 · 多选须全对才得分</span>
            </div>
            <p className="text-base font-medium leading-relaxed text-neutral-900">
              <TypeTag type={q.type} className="mr-1.5 translate-y-[-0.06em]" />
              {q.stem}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const on = selected.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onPointerDown={stopSwipeBubble}
                    onClick={() => pick(opt.key)}
                    className={clsx(
                      "flex w-full touch-manipulation items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors [-webkit-tap-highlight-color:transparent]",
                      on
                        ? "border-brand bg-brand-light/60 ring-2 ring-brand/25"
                        : "border-neutral-200 bg-white"
                    )}
                  >
                    <span
                      className={clsx(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                        on ? "border-brand bg-brand text-white" : "border-neutral-300 text-neutral-600"
                      )}
                    >
                      {opt.key}
                    </span>
                    <span className="flex-1">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {q.type === "multiple" && !isLast ? (
              <button
                type="button"
                onPointerDown={stopSwipeBubble}
                onClick={confirmMultipleNext}
                disabled={selected.length === 0}
                className="min-h-11 w-full touch-manipulation rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-40 [-webkit-tap-highlight-color:transparent]"
              >
                确认本题并下一题
              </button>
            ) : null}
          </main>
        </div>
      </div>

      <footer className="safe-pb sticky bottom-0 z-20 flex gap-2 border-t border-neutral-100 bg-white/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm font-medium text-neutral-800"
          onClick={goPrev}
          disabled={mock.currentIndex === 0}
        >
          上一题
        </button>
        {!isLast ? (
          <button
            type="button"
            className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm font-medium text-neutral-800"
            onClick={goNext}
          >
            下一题
          </button>
        ) : (
          <button
            type="button"
            className="flex-[1.2] rounded-xl bg-brand py-2 text-sm font-semibold text-white"
            onClick={trySubmit}
          >
            交卷
          </button>
        )}
      </footer>

      {sheet ? (
        <div className="fixed inset-0 z-30 bg-black/40" role="dialog">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-transparent"
            aria-label="关闭"
            onClick={() => setSheet(false)}
          />
          <div className="absolute bottom-0 max-h-[60vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex justify-between">
              <p className="text-sm font-semibold">答题卡</p>
              <button type="button" className="text-sm text-brand" onClick={() => setSheet(false)}>
                关闭
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {paper.map((pq, i) => {
                const answered = (mock.answers[pq.id] ?? []).length > 0;
                return (
                  <button
                    key={pq.id}
                    type="button"
                    onClick={() => {
                      clearAdvanceTimer();
                      slideIntentRef.current = i > mock.currentIndex ? "next" : i < mock.currentIndex ? "prev" : null;
                      setMockIndex(i);
                      setSheet(false);
                    }}
                    className={clsx(
                      "rounded-md border py-2 text-xs font-medium",
                      answered ? "border-brand bg-brand-light text-brand" : "border-neutral-200",
                      i === mock.currentIndex && "ring-2 ring-brand"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
