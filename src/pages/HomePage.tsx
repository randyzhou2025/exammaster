import { Link } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAppStore, selectStats } from "@/stores/appStore";

export function HomePage() {
  const bankLen = useAppStore((s) => s.bank.length);
  /** selectStats 返回新对象；须 shallow 比较，否则 useSyncExternalStore 会无限更新 */
  const stats = useAppStore(useShallow(selectStats));
  const seqDone = `${stats.answered}/${stats.total}`;

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-brand to-brand-dark pb-6 text-white">
      <header className="flex items-center justify-between px-4 pt-3">
        <span className="text-lg font-semibold">人工智能训练师</span>
        <Link to="/settings" className="text-sm text-white/90">
          设置
        </Link>
      </header>
      <p className="mt-1 px-4 text-sm text-white/80">
        备考原型 · 本地存储 · 三级理论知识题库 {bankLen} 题
      </p>

      <div className="mt-6 px-4">
        <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
          <h2 className="text-center text-base font-bold text-neutral-800">考试</h2>
          <p className="mt-2 text-center text-xs text-neutral-500">顺序练习 · 模拟考试 · 错题收藏</p>

          <div className="mt-8 flex flex-col items-center gap-6">
            <Link
              to="/sequential"
              className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-white shadow-lg ring-4 ring-brand-light/60"
            >
              <span className="text-sm font-medium opacity-90">顺序练习</span>
              <span className="mt-1 text-2xl font-bold tabular-nums">{seqDone}</span>
            </Link>

            <Link
              to="/mock"
              className="flex h-36 w-36 flex-col items-center justify-center rounded-full border-2 border-dashed border-emerald-400 bg-white text-emerald-600 shadow-md"
            >
              <span className="text-sm font-semibold">模拟考试</span>
              <span className="mt-1 text-xs text-emerald-600/80">190 题 / 60 分钟</span>
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
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 px-6 text-center text-[11px] leading-relaxed text-white/70">
        正式题库需 190 题且题型配比符合模板方可开考。当前为交互原型。
      </p>
    </div>
  );
}
