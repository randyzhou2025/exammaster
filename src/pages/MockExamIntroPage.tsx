import { Link, useNavigate } from "react-router-dom";
import { assembleMockExamPaper } from "@/domain/examAssembly";
import { EXAM_TEMPLATE } from "@/types/exam";
import { useAppStore } from "@/stores/appStore";
import { useMemo, useState } from "react";

export function MockExamIntroPage() {
  const nav = useNavigate();
  const bank = useAppStore((s) => s.bank);
  const startMockExam = useAppStore((s) => s.startMockExam);
  const [err, setErr] = useState<string | null>(null);

  const counts = useMemo(() => {
    const j = bank.filter((q) => q.type === "judgment").length;
    const s = bank.filter((q) => q.type === "single").length;
    const m = bank.filter((q) => q.type === "multiple").length;
    return { j, s, m };
  }, [bank]);

  const start = () => {
    const res = assembleMockExamPaper(bank);
    if (!res.ok) {
      const m = res.error.missing;
      const parts: string[] = [];
      if (m.judgment) parts.push(`判断缺 ${m.judgment}`);
      if (m.single) parts.push(`单选缺 ${m.single}`);
      if (m.multiple) parts.push(`多选缺 ${m.multiple}`);
      setErr(`题库不足以组卷（需 ${EXAM_TEMPLATE.sections.map((s) => `${s.count} 道${labelType(s.type)}`).join("、")}）。${parts.join("；")}`);
      return;
    }
    setErr(null);
    startMockExam(res.paper.map((q) => q.id));
    nav("/mock/session");
  };

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-brand to-brand-dark text-white">
      <header className="flex items-center gap-2 px-2 pt-2">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10">
          ←
        </Link>
        <h1 className="flex-1 text-center text-base font-semibold">资格证模拟考试</h1>
        <span className="w-10 text-right text-xs text-white/80">须知</span>
      </header>

      <div className="mt-4 px-4 text-sm text-white/90">
        <p className="text-lg font-bold">练习多一点，考试稳一点</p>
        <p className="mt-2 text-xs leading-relaxed text-white/75">
          满分 {EXAM_TEMPLATE.totalScore}，合格 {EXAM_TEMPLATE.passScore}；{EXAM_TEMPLATE.durationMinutes}{" "}
          分钟；共 190 题（判断 40×0.5 + 单选 140×0.5 + 多选 10×1）。多选判分：选项集合与标准答案完全一致才得分。
        </p>
      </div>

      <div className="mt-6 flex-1 px-4">
        <div className="rounded-2xl bg-white p-5 text-sm text-neutral-800 shadow-card">
          <p className="font-semibold text-neutral-900">当前演示题库</p>
          <p className="mt-2 text-neutral-600">
            判断 {counts.j} / 单选 {counts.s} / 多选 {counts.m}
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            正式环境需导入完整 190 题配比题库后方可开考；组卷失败时不缩卷、不换算满分，避免分数争议。
          </p>
          {err ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p> : null}
          <button
            type="button"
            onClick={start}
            className="mt-6 w-full rounded-xl bg-brand py-3 text-base font-semibold text-white"
          >
            开始考试
          </button>
          <Link
            to="/"
            className="mt-3 block w-full rounded-xl border border-neutral-200 py-3 text-center text-neutral-700"
          >
            返回
          </Link>
        </div>
      </div>
    </div>
  );
}

function labelType(t: string) {
  if (t === "judgment") return "判断";
  if (t === "single") return "单选";
  return "多选";
}
