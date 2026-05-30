import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { CodeFillLine } from "@/components/codefill/CodeFillLine";
import { gradeCodeFillQuestion } from "@/domain/codeFillScoring";
import { routes } from "@/lib/routes";
import { useCodeFillStore } from "@/stores/codeFillStore";

function countBlanksInLine(line: string) {
  return (line.match(/_{5,}/g) ?? []).length;
}

function linesWithBlanks(cell: { lines: string[]; blanks: { id: string }[] }) {
  const queue = [...cell.blanks];
  return cell.lines.map((line) => {
    const n = countBlanksInLine(line);
    const lineBlanks = queue.splice(0, n);
    return { line, blanks: lineBlanks };
  });
}

/** 跳过 ipynb 里无代码、无空位的空 Cell */
function isRenderableCell(cell: { lines: string[]; blanks: { id: string }[]; source?: string }) {
  if (cell.blanks.length > 0) return true;
  const text = (cell.source ?? cell.lines.join("\n")).trim();
  return text.length > 0;
}

export function OperateSessionPage() {
  const nav = useNavigate();
  const practice = useCodeFillStore((s) => s.practice);
  const bank = useCodeFillStore((s) => s.bank);
  const byId = useCodeFillStore((s) => s.byId);
  const setPracticeIndex = useCodeFillStore((s) => s.setPracticeIndex);
  const setBlankAnswer = useCodeFillStore((s) => s.setBlankAnswer);
  const clearQuestionAnswers = useCodeFillStore((s) => s.clearQuestionAnswers);
  const checkQuestion = useCodeFillStore((s) => s.checkQuestion);
  const exitPractice = useCodeFillStore((s) => s.exitPractice);

  const [stemOpen, setStemOpen] = useState(false);
  const [gradeResults, setGradeResults] = useState<Record<string, boolean> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** 仅当前停留本题时有效；切题/退出后清空，不写入 localStorage */
  const [sessionReveal, setSessionReveal] = useState<Record<string, string> | null>(null);

  const q = useMemo(() => {
    if (!practice) return null;
    const id = practice.orderedIds[practice.index];
    return bank.find((x) => x.id === id) ?? null;
  }, [practice, bank]);

  useEffect(() => {
    setSessionReveal(null);
    setGradeResults(null);
  }, [q?.id]);

  const values = useMemo(() => {
    if (!q) return {};
    const p = byId[q.id];
    if (p?.completed) return p.answers ?? {};
    if (sessionReveal) return sessionReveal;
    return p?.answers ?? {};
  }, [q, byId, sessionReveal]);

  const visibleCells = useMemo(
    () => (q ? q.cells.filter(isRenderableCell) : []),
    [q]
  );

  const blankTotal = q?.meta.blankCount ?? 0;
  const blankFilled = q
    ? q.cells.flatMap((c) => c.blanks).filter((b) => (values[b.id] ?? "").trim()).length
    : 0;
  const codeLineCount = visibleCells.reduce((n, c) => n + c.lines.filter((l) => l.trim()).length, 0);

  if (!practice) {
    return <Navigate to={routes.operateHome} replace />;
  }

  if (!q) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <p className="text-neutral-600">未找到题目</p>
        <Link to={routes.operateHome} className="text-brand">
          返回配置
        </Link>
      </div>
    );
  }

  const idx = practice.index;
  const total = practice.orderedIds.length;
  const allBlanks = q.cells.flatMap((c) => c.blanks);

  const onCheck = () => {
    const { allCorrect, results } = gradeCodeFillQuestion(allBlanks, values);
    setGradeResults(results);
    checkQuestion(q.id, values);
    if (allCorrect) setSessionReveal(null);
    setToast(allCorrect ? "全部正确！" : "仍有错误，请修改后再次检查");
    window.setTimeout(() => setToast(null), 2000);
  };

  const onReveal = () => {
    const revealed: Record<string, string> = {};
    for (const b of allBlanks) {
      if (b.accepted[0]) revealed[b.id] = b.accepted[0];
    }
    setSessionReveal(revealed);
    setGradeResults(null);
  };

  const go = (next: number) => {
    setSessionReveal(null);
    setGradeResults(null);
    setPracticeIndex(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="flex items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => {
            exitPractice();
            nav(routes.operateHome);
          }}
          className="rounded-lg px-2 py-1 text-sm text-brand"
        >
          退出
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold text-neutral-900">{q.id}</p>
          <p className="text-[11px] text-neutral-500">
            第 {idx + 1}/{total} 题 · {visibleCells.length} 个代码块 · {blankFilled}/{blankTotal} 空
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStemOpen(true)}
          className="rounded-lg bg-brand/10 px-2 py-1 text-xs font-medium text-brand"
        >
          题干
        </button>
      </header>

      {codeLineCount > 35 ? (
        <p className="border-b border-neutral-100 bg-amber-50 px-3 py-1.5 text-center text-[11px] text-amber-900">
          本题为完整 Notebook 代码（约 {codeLineCount} 行），上下滑动查看；仅 {blankTotal} 处需填空
        </p>
      ) : null}

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
        {visibleCells.map((cell) => (
          <div
            key={cell.cellIndex}
            className="mb-4 min-w-0 max-w-full overflow-x-auto rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
          >
            {visibleCells.length > 1 ? (
              <p className="mb-2 text-[11px] font-medium text-neutral-400">Cell {cell.cellIndex + 1}</p>
            ) : null}
            <div className="space-y-0.5">
            {linesWithBlanks(cell).map(({ line, blanks }, li) => (
              <CodeFillLine
                key={`${cell.cellIndex}-${li}`}
                line={line}
                blanks={blanks}
                values={values}
                results={gradeResults}
                onChange={(blankId, v) => {
                  setGradeResults(null);
                  if (sessionReveal) {
                    setSessionReveal((prev) => ({ ...prev, [blankId]: v }));
                  } else {
                    setBlankAnswer(q.id, blankId, v);
                  }
                }}
              />
            ))}
            </div>
          </div>
        ))}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-neutral-900/90 px-4 py-2 text-sm text-white">
          {toast}
        </div>
      ) : null}

      <footer className="safe-pb grid grid-cols-2 gap-2 border-t border-neutral-200 bg-white p-3">
        <button type="button" onClick={onCheck} className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white">
          检查答案
        </button>
        <button
          type="button"
          onClick={onReveal}
          className="rounded-xl border border-neutral-200 py-2.5 text-sm font-medium text-neutral-800"
        >
          显示答案
        </button>
        <button
          type="button"
          onClick={() => {
            clearQuestionAnswers(q.id);
            setSessionReveal(null);
            setGradeResults(null);
          }}
          className="rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600"
        >
          清空本题
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={idx <= 0}
            onClick={() => go(idx - 1)}
            className={clsx(
              "flex-1 rounded-xl border py-2.5 text-sm",
              idx <= 0 ? "opacity-40" : "border-neutral-200 text-neutral-800"
            )}
          >
            上一题
          </button>
          <button
            type="button"
            disabled={idx >= total - 1}
            onClick={() => go(idx + 1)}
            className={clsx(
              "flex-1 rounded-xl border py-2.5 text-sm",
              idx >= total - 1 ? "opacity-40" : "border-neutral-200 text-neutral-800"
            )}
          >
            下一题
          </button>
        </div>
      </footer>

      {stemOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40">
          <button type="button" className="flex-1" aria-label="关闭" onClick={() => setStemOpen(false)} />
          <div className="max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <h2 className="text-base font-semibold text-neutral-900">{q.title}</h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{q.stem}</pre>
            <button
              type="button"
              onClick={() => setStemOpen(false)}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white"
            >
              关闭
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
