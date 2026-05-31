import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { formatExamTemplateBrief, getExamTemplateForBank, getQuestionBankMeta } from "@/data/questionBanks";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";
import { routes } from "@/lib/routes";
import { useAppStore, selectStats } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { selectCodeFillStats, useCodeFillStore, useCodeFillStoreHydrated } from "@/stores/codeFillStore";

const SEQ_ENTRY_CLASS =
  "flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg ring-4 ring-brand-light/60";

export function TheoryHomePage() {
  const { routes: lr } = useLevelRoutes();
  const user = useAuthStore((s) => s.user);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const bankMeta = getQuestionBankMeta(bankId);
  const bankTitle = bankMeta?.title ?? "备考题库";
  const levelLabel = bankMeta?.levelLabel ?? "三级";
  const showOperate = bankMeta?.operate !== false;
  const examTemplate = getExamTemplateForBank(bankId);
  const mockBrief = formatExamTemplateBrief(examTemplate);
  const stats = useAppStore(useShallow(selectStats));
  const codeFillHydrated = useCodeFillStoreHydrated();
  const codeStats = useCodeFillStore(useShallow(selectCodeFillStats));
  const seqDone = `${stats.answered}/${stats.total}`;
  const codeDone = codeFillHydrated
    ? `${codeStats.completed}/${codeStats.total}`
    : `—/${codeStats.total}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-brand to-brand-dark pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-white">
      <header className="flex min-w-0 items-start justify-between gap-2 px-4 pt-3">
        <span className="min-w-0 flex-1 text-lg font-semibold leading-snug">
          人工智能训练师 · {levelLabel}
        </span>
        <nav className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm text-white/90">
          {user?.role === "admin" ? (
            <Link to={routes.adminUsers} className="text-white/90">
              用户管理
            </Link>
          ) : null}
          <Link to={routes.banks} state={{ switching: true }} className="text-white/90" title={`当前题库：${bankTitle}`}>
            切换题库
          </Link>
          <Link to={routes.settings}>设置</Link>
        </nav>
      </header>
      <p className="mt-1 px-4 text-sm leading-relaxed text-white/80">
        做题进度、错题与收藏保存在本机浏览器；请勿清除本站缓存、Cookie 或站点数据，以免丢失记录。
      </p>

      <div className="mt-6 space-y-4 px-4">
        <section className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
          <h2 className="text-center text-base font-bold text-neutral-800">理论练习</h2>
          <p className="mt-2 text-center text-xs text-neutral-500">{bankTitle}</p>

          <div className="mt-8 flex flex-col items-center gap-6">
            <Link to={lr.theorySequential} className={SEQ_ENTRY_CLASS}>
              <span className="text-sm font-medium opacity-90">开始练习</span>
              <span className="mt-1 text-2xl font-bold tabular-nums">{seqDone}</span>
            </Link>

            <Link
              to={lr.theoryMock}
              className="relative inline-flex rounded-full p-1.5 shadow-sm outline-none ring-neutral-200/80 transition hover:ring-2"
              aria-label="进入模拟考试"
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-neutral-400/45"
                aria-hidden
              />
              <span className="relative flex h-[8.25rem] w-[8.25rem] flex-col items-center justify-center rounded-full bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-800 px-3 text-center text-white shadow-inner">
                <span className="text-sm font-bold tracking-wide">模拟考试</span>
                <span className="mt-2 text-xs font-medium tabular-nums text-white/95">{mockBrief}</span>
              </span>
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Link
              to={lr.theoryWrongBook}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-3 text-center font-medium text-neutral-800"
            >
              错题本
              <span className="mt-1 block text-xs font-normal text-neutral-500">{stats.wrongBookCount} 题</span>
            </Link>
            <Link
              to={`${lr.theoryWrongBook}?tab=favorite`}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-3 text-center font-medium text-neutral-800"
            >
              我的收藏
              <span className="mt-1 block text-xs font-normal text-neutral-500">{stats.favoriteCount} 题</span>
            </Link>
          </div>
        </section>

        {showOperate ? (
          <section className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
            <h2 className="text-center text-base font-bold text-neutral-800">实操练习</h2>
            <p className="mt-2 text-center text-xs text-neutral-500">Python 代码填空 · 20 题</p>
            <Link
              to={lr.operateHome}
              className="mt-6 flex flex-col items-center justify-center rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 py-8"
            >
              <span className="text-sm font-medium text-violet-800">代码填空练习</span>
              <span className="mt-2 text-2xl font-bold tabular-nums text-violet-900">{codeDone}</span>
              <span className="mt-1 text-xs text-violet-600">已完成 / 总题数</span>
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
