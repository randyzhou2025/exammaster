import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

  const paper = useMemo(() => {
    if (!mock) return [];
    return mock.paperIds.map((id) => bank.find((q) => q.id === id)).filter(Boolean) as typeof bank;
  }, [mock, bank]);

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

  const q = mock && paper.length ? paper[mock.currentIndex] : null;

  if (!mock || !q) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-neutral-600">没有进行中的考试</p>
        <button type="button" className="text-brand font-medium" onClick={() => nav("/mock")}>
          去组卷页
        </button>
      </div>
    );
  }

  const selected = mock.answers[q.id] ?? [];

  const pick = (key: string) => {
    if (q.type === "multiple") {
      const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
      setMockAnswer(q.id, next);
      return;
    }
    setMockAnswer(q.id, [key]);
  };

  return (
    <div className="flex min-h-full flex-col bg-white">
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

      <main className="flex-1 space-y-4 px-4 py-4">
        <div className="flex justify-between text-xs text-neutral-500">
          <span>
            第 {mock.currentIndex + 1} / {paper.length} 题
          </span>
          <span>考试中 · 多选须全对才得分</span>
        </div>
        <div className="flex gap-2">
          <TypeTag type={q.type} />
          <p className="text-base font-medium leading-relaxed text-neutral-900">{q.stem}</p>
        </div>
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
      </main>

      <footer className="safe-pb flex gap-2 border-t border-neutral-100 bg-white px-3 py-2">
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm"
          onClick={() => setMockIndex(mock.currentIndex - 1)}
          disabled={mock.currentIndex === 0}
        >
          上一题
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-neutral-200 py-2 text-sm"
          onClick={() => setMockIndex(mock.currentIndex + 1)}
          disabled={mock.currentIndex >= paper.length - 1}
        >
          下一题
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white"
          onClick={() => {
            if (window.confirm("确定交卷？")) handleSubmit(false);
          }}
        >
          交卷
        </button>
      </footer>

      {sheet ? (
        <div className="fixed inset-0 z-30 bg-black/40" role="dialog">
          <div className="absolute bottom-0 max-h-[60vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4">
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
