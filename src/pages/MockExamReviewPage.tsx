import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { TypeTag } from "@/components/TypeTag";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import {
  formatChoiceKeys,
  resolveMockReviewData,
  wrongQuestionsInPaper,
} from "@/lib/mockExamReview";
import type { Question } from "@/types/exam";
import { useAppStore } from "@/stores/appStore";
import { useMemo } from "react";

interface LocationState {
  paper?: Question[];
  answers?: Record<string, string[]>;
  examId?: string;
}

export function MockExamReviewPage() {
  const { routes: lr } = useLevelRoutes();
  const nav = useNavigate();
  const loc = useLocation();
  const [searchParams] = useSearchParams();
  const bank = useAppStore((s) => s.bank);
  const mockHistory = useAppStore((s) => s.mockHistory);
  const state = loc.state as LocationState | null;
  const examId = state?.examId ?? searchParams.get("exam");

  const review = useMemo(
    () =>
      resolveMockReviewData({
        bank,
        paper: state?.paper,
        answers: state?.answers,
        examId,
        mockHistory,
      }),
    [bank, state?.paper, state?.answers, examId, mockHistory]
  );

  if (!review) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-neutral-600">暂无错题回顾数据</p>
        <Link to={lr.theoryMock} className="text-brand font-medium">
          返回模考
        </Link>
      </div>
    );
  }

  const { paper, answers } = review;
  const wrongList = wrongQuestionsInPaper(paper, answers);

  if (wrongList.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <header className="mb-4 flex items-center gap-2">
          <button type="button" className="min-h-11 text-brand" onClick={() => nav(-1)}>
            ← 返回
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-neutral-900">错题回顾</h1>
          <span className="w-10" />
        </header>
        <div className="rounded-2xl bg-white p-6 text-center shadow-card">
          <p className="text-sm text-emerald-700">本次模考没有错题，全部答对。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 border-b border-neutral-100 bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-11 min-w-11 flex items-center text-brand"
            onClick={() => nav(-1)}
          >
            ←
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-neutral-900">错题回顾</h1>
          <span className="min-w-11 text-right text-xs tabular-nums text-neutral-500">{wrongList.length} 题</span>
        </div>
        <p className="mt-1 text-center text-xs text-neutral-500">按试卷顺序展示错题与标准答案</p>
      </header>

      <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {wrongList.map((q) => {
          const paperIndex = paper.findIndex((x) => x.id === q.id);
          const selected = answers[q.id] ?? [];
          const correctKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
          const unanswered = selected.length === 0;

          return (
            <li
              key={q.id}
              className="rounded-2xl bg-white p-4 shadow-card"
            >
              <p className="text-xs font-medium tabular-nums text-neutral-400">
                第 {paperIndex + 1} 题
              </p>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-neutral-950">
                <TypeTag type={q.type} className="mr-1.5 translate-y-[-0.06em]" />
                {q.stem}
              </p>

              <div className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const isCorrect = correctKeys.includes(opt.key);
                  const isSelected = selected.includes(opt.key);
                  return (
                    <div
                      key={opt.key}
                      className={clsx(
                        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                        isCorrect && "border-brand/40 bg-brand-light/50",
                        isSelected && !isCorrect && "border-red-200 bg-red-50",
                        !isCorrect && !isSelected && "border-neutral-100 bg-neutral-50/80"
                      )}
                    >
                      <span
                        className={clsx(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                          isCorrect && "border-brand bg-brand text-white",
                          isSelected && !isCorrect && "border-red-400 bg-red-500 text-white",
                          !isCorrect && !isSelected && "border-neutral-300 text-neutral-500"
                        )}
                      >
                        {opt.key}
                      </span>
                      <span className="min-w-0 flex-1 leading-relaxed text-neutral-800">{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl bg-neutral-50 px-3 py-2.5 text-sm">
                <p>
                  <span className="text-neutral-500">你的答案：</span>
                  <span className={clsx("font-semibold", unanswered ? "text-neutral-400" : "text-red-600")}>
                    {formatChoiceKeys(selected)}
                  </span>
                </p>
                <p>
                  <span className="text-neutral-500">正确答案：</span>
                  <span className="font-semibold text-brand">{formatChoiceKeys(correctKeys)}</span>
                </p>
              </div>

              {q.explanation ? (
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{q.explanation}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
