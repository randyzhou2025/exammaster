import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import { getExamTemplateForBank } from "@/data/questionBanks";
import type { Question } from "@/types/exam";
import { wrongQuestionsInPaper } from "@/lib/mockExamReview";
import { useAppStore } from "@/stores/appStore";

interface LocationState {
  score: number;
  max: number;
  paper: Question[];
  answers: Record<string, string[]>;
  examId?: string;
}

export function MockExamResultPage() {
  const { routes: lr } = useLevelRoutes();
  const nav = useNavigate();
  const loc = useLocation();
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const examTemplate = getExamTemplateForBank(bankId);
  const state = loc.state as LocationState | null;

  if (!state || typeof state.score !== "number" || !state.paper) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-neutral-600">暂无成绩数据</p>
        <Link to={lr.theoryMock} className="text-brand font-medium">
          返回模考
        </Link>
      </div>
    );
  }

  const wrongCount = wrongQuestionsInPaper(state.paper, state.answers).length;
  const canReview = wrongCount > 0 && state.answers;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <h1 className="text-center text-lg font-bold text-neutral-900">成绩单</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-card">
        <p className="text-sm text-neutral-500">得分</p>
        <p className="mt-2 text-4xl font-bold text-brand tabular-nums">
          {state.score}
          <span className="text-lg text-neutral-400">/{state.max}</span>
        </p>
        <p className="mt-4 text-sm">
          {state.score >= examTemplate.passScore ? (
            <span className="font-semibold text-emerald-600">合格</span>
          ) : (
            <span className="font-semibold text-red-600">不合格</span>
          )}
          <span className="text-neutral-500">（合格线 {examTemplate.passScore}）</span>
        </p>
        <p className="mt-3 text-xs text-neutral-500">错题 {wrongCount} 道</p>
        {wrongCount > 0 ? (
          <p className="mt-2 text-xs text-brand">本次错题已加入错题本，可在首页进入错题本继续练习。</p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3">
        {canReview ? (
          <button
            type="button"
            onClick={() =>
              nav(
                state.examId
                  ? `${lr.theoryMockReview}?exam=${encodeURIComponent(state.examId)}`
                  : lr.theoryMockReview,
                {
                  state: {
                    paper: state.paper,
                    answers: state.answers,
                    examId: state.examId,
                  },
                }
              )
            }
            className="min-h-11 w-full rounded-xl border border-brand/30 bg-brand/5 py-3 text-center text-sm font-semibold text-brand"
          >
            查看错题（{wrongCount}）
          </button>
        ) : null}
        <Link
          to={lr.theoryMock}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white"
        >
          再考一次
        </Link>
        <button
          type="button"
          onClick={() => nav(lr.theoryHome, { replace: true })}
          className="min-h-11 w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm text-neutral-800"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
