import { Link, useLocation, useNavigate } from "react-router-dom";
import { EXAM_TEMPLATE } from "@/types/exam";
import type { Question } from "@/types/exam";
import { isAnswerCorrect } from "@/domain/scoring";

interface LocationState {
  score: number;
  max: number;
  paper: Question[];
  answers: Record<string, string[]>;
}

export function MockExamResultPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as LocationState | null;

  if (!state || typeof state.score !== "number" || !state.paper) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-neutral-600">暂无成绩数据</p>
        <Link to="/mock" className="text-brand font-medium">
          返回模考
        </Link>
      </div>
    );
  }

  const wrongCount = state.paper.filter((q) => !isAnswerCorrect(q, state.answers[q.id] ?? [])).length;

  return (
    <div className="flex min-h-full flex-col bg-surface p-4">
      <h1 className="text-center text-lg font-bold text-neutral-900">成绩单</h1>
      <div className="mt-6 rounded-2xl bg-white p-6 text-center shadow-card">
        <p className="text-sm text-neutral-500">得分</p>
        <p className="mt-2 text-4xl font-bold text-brand tabular-nums">
          {state.score}
          <span className="text-lg text-neutral-400">/{state.max}</span>
        </p>
        <p className="mt-4 text-sm">
          {state.score >= EXAM_TEMPLATE.passScore ? (
            <span className="font-semibold text-emerald-600">合格</span>
          ) : (
            <span className="font-semibold text-red-600">不合格</span>
          )}
          <span className="text-neutral-500">（合格线 {EXAM_TEMPLATE.passScore}）</span>
        </p>
        <p className="mt-3 text-xs text-neutral-500">错题 {wrongCount} 道（按多选全对才得分规则判定）</p>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          to="/mock"
          className="block w-full rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white"
        >
          再考一次
        </Link>
        <button
          type="button"
          onClick={() => nav("/", { replace: true })}
          className="block w-full rounded-xl border border-neutral-200 bg-white py-3 text-sm text-neutral-800"
        >
          返回首页
        </button>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-neutral-400">
        完整版可下钻逐题回顾与解析；当前原型展示总分、合格判定与错题数量。
      </p>
    </div>
  );
}
