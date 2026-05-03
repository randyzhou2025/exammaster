import { Link, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { getQuestionBankMeta } from "@/data/questionBanks";
import { useAppStore, selectStats } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

const SEQ_ENTRY_CLASS =
  "flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg ring-4 ring-brand-light/60";

export function HomePage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const bankTitle = getQuestionBankMeta(bankId)?.title ?? "备考题库";
  const startPractice = useAppStore((s) => s.startPractice);
  /** selectStats 返回新对象；须 shallow 比较，否则 useSyncExternalStore 会无限更新 */
  const stats = useAppStore(useShallow(selectStats));
  const seqDone = `${stats.answered}/${stats.total}`;
  const neverPracticed = stats.answered === 0;

  const openSequential = () => {
    startPractice("sequential");
    nav("/practice/session");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-brand to-brand-dark pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] text-white">
      <header className="flex items-center justify-between px-4 pt-3">
        <span className="text-lg font-semibold leading-snug">{bankTitle}</span>
        <div className="flex items-center gap-3 text-sm text-white/90">
          {user?.role === "admin" ? (
            <Link to="/admin/users" className="text-white/90">
              用户管理
            </Link>
          ) : null}
          <Link to="/settings">设置</Link>
        </div>
      </header>
      <p className="mt-1 px-4 text-sm leading-relaxed text-white/80">
        做题进度、错题与收藏保存在本机浏览器；请勿清除本站缓存、Cookie 或站点数据，以免丢失记录。
      </p>

      <div className="mt-6 px-4">
        <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
          <h2 className="text-center text-base font-bold text-neutral-800">考试</h2>
          <p className="mt-2 text-center text-xs text-neutral-500">顺序练习 · 模拟考试 · 错题收藏</p>

          <div className="mt-8 flex flex-col items-center gap-6">
            {neverPracticed ? (
              <button type="button" className={`${SEQ_ENTRY_CLASS} cursor-pointer border-0`} onClick={openSequential}>
                <span className="text-sm font-medium opacity-90">顺序练习</span>
                <span className="mt-1 text-2xl font-bold tabular-nums">{seqDone}</span>
              </button>
            ) : (
              <Link to="/sequential" className={SEQ_ENTRY_CLASS}>
                <span className="text-sm font-medium opacity-90">顺序练习</span>
                <span className="mt-1 text-2xl font-bold tabular-nums">{seqDone}</span>
              </Link>
            )}

            <Link
              to="/mock"
              className="relative inline-flex rounded-full p-1.5 shadow-sm outline-none ring-neutral-200/80 transition hover:ring-2"
              aria-label="进入模拟考试"
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-neutral-400/45"
                aria-hidden
              />
              <span className="relative flex h-[8.25rem] w-[8.25rem] flex-col items-center justify-center rounded-full bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-800 px-3 text-center text-white shadow-inner">
                <span className="text-sm font-bold tracking-wide">模拟考试</span>
                <span className="mt-1.5 text-[11px] font-normal leading-snug text-white/95">
                  限时仿真 · 190 题 / 60 分
                </span>
              </span>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
            <Link
              to="/wrong-book"
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-3 text-center font-medium text-neutral-800"
            >
              错题本
              <span className="mt-1 block text-xs font-normal text-neutral-500">{stats.wrongBookCount} 题</span>
            </Link>
            <Link
              to="/wrong-book?tab=favorite"
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-3 text-center font-medium text-neutral-800"
            >
              我的收藏
              <span className="mt-1 block text-xs font-normal text-neutral-500">{stats.favoriteCount} 题</span>
            </Link>
          </div>

          <Link
            to="/banks"
            state={{ switching: true }}
            className="mt-3 flex w-full flex-col rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm transition active:bg-neutral-50"
          >
            <span className="font-medium text-neutral-900">切换题库</span>
            <span className="mt-1 text-xs text-neutral-500">当前：{bankTitle}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
