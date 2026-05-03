import { useMemo, useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { TypeTag } from "@/components/TypeTag";
import { useAppStore } from "@/stores/appStore";
import { totalScoreForPaper } from "@/domain/scoring";
import { EXAM_TEMPLATE } from "@/types/exam";

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

  const handleSubmit = useCallback(
    (timedOut: boolean) => {
      if (submitted.current) return;
      const snap = useAppStore.getState().mockExam;
      if (!snap) return;
      submitted.current = true;
      const fullPaper = snap.paperIds
        .map((id) => useAppStore.getState().bank.find((x) => x.id === id))
        .filter(Boolean) as typeof bank;
      const { score, max } = totalScoreForPaper(fullPaper, snap.answers);
      const used = timedOut
        ? EXAM_TEMPLATE.durationMinutes * 60
        : Math.min(EXAM_TEMPLATE.durationMinutes * 60, Math.floor((Date.now() - snap.startedAt) / 1000));
      submitMockExam({
        startedAt: new Date(snap.startedAt).toISOString(),
        submittedAt: new Date().toISOString(),
        score,
        maxScore: max,
        passed: score >= EXAM_TEMPLATE.passScore,
        durationUsedSec: used,
        questionIds: snap.paperIds,
      });
      nav("/mock/result", {
        replace: true,
        state: { score, max, paper: fullPaper, answers: snap.answers },
      });
    },
    [nav, submitMockExam]
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
    return <Navigate to="/" replace />;
  }

  const idx = mock.currentIndex;
  const len = paper.length;
  const isLast = idx >= len - 1;
  const selected = mock.answers[q.id] ?? [];

  const goPrev = () => {
    if (idx <= 0) return;
    slideIntentRef.current = "prev";
    setMockIndex(idx - 1);
  };

  const goNext = () => {
    if (idx >= len - 1) return;
    slideIntentRef.current = "next";
    setMockIndex(idx + 1);
  };

  /** 判断 / 单选：选一即记录并自动进入下一题；末题不切题只保留答案 */
  const pick = (key: string) => {
    if (q.type === "multiple") {
      const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
      setMockAnswer(q.id, next);
      return;
    }
    setMockAnswer(q.id, [key]);
    if (!isLast) {
      slideIntentRef.current = "next";
      setMockIndex(idx + 1);
    }
  };

  /** 多选：确认后继续 */
  const confirmMultipleNext = () => {
    if (selected.length === 0) {
      window.alert("请至少选择一项后再进入下一题。");
      return;
    }
    if (!isLast) {
      slideIntentRef.current = "next";
      setMockIndex(idx + 1);
    }
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
              nav("/mock", { replace: true });
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
                    onClick={() => pick(opt.key)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm",
                      on ? "border-brand bg-brand-light/50" : "border-neutral-200"
                    )}
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
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
                onClick={confirmMultipleNext}
                className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white"
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
