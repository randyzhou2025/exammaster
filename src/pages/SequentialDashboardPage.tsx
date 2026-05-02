import { Link, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAppStore, selectStats } from "@/stores/appStore";

export function SequentialDashboardPage() {
  const nav = useNavigate();
  const stats = useAppStore(useShallow(selectStats));
  const startPractice = useAppStore((s) => s.startPractice);
  const acc =
    stats.firstAccuracy === null ? "—" : `${Math.round(stats.firstAccuracy * 100)}%`;

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-brand to-brand-dark pb-8 text-white">
      <header className="flex items-center gap-3 px-3 pt-2">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="返回"
        >
          ←
        </button>
        <h1 className="flex-1 text-center text-base font-semibold">顺序练习</h1>
        <span className="w-10" />
      </header>

      <div className="mt-4 px-4">
        <div className="rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
          智慧题库 · 本地进度 · 背题模式不参与首次统计
        </div>
      </div>

      <div className="mt-5 px-4">
        <div className="rounded-2xl bg-white p-5 text-neutral-900 shadow-card">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-brand-light text-center text-lg leading-[44px]">
                学
              </div>
              <div>
                <p className="text-sm font-semibold">学员</p>
                <p className="text-xs text-neutral-500">本地设备</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-500 tabular-nums">{acc}</p>
              <p className="text-xs text-neutral-500">首次答题正确率</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="text-lg font-bold text-neutral-900 tabular-nums">{stats.unanswered}</p>
              <p className="text-xs text-neutral-500">未做题</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 tabular-nums">{stats.answered}</p>
              <p className="text-xs text-neutral-500">已做题</p>
            </div>
            <button
              type="button"
              onClick={() => nav("/wrong-book")}
              className="rounded-lg py-1 text-center ring-brand/30 transition active:bg-red-50 hover:ring-2"
            >
              <p className="text-lg font-bold text-red-500 tabular-nums">{stats.wrongBookCount}</p>
              <p className="text-xs text-neutral-500">错题</p>
            </button>
            <div>
              <p className="text-lg font-bold text-brand tabular-nums">{acc}</p>
              <p className="text-xs text-neutral-500">首次正确率</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              startPractice("sequential");
              nav("/practice/session");
            }}
            className="mt-6 w-full rounded-xl bg-brand py-3 text-base font-semibold text-white active:bg-brand-dark"
          >
            继续练习
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 px-4 text-center text-xs text-white/95">
        <MiniMode
          label="随机练习"
          onClick={() => {
            startPractice("random");
            nav("/practice/session");
          }}
        />
        <MiniMode
          label="未做题"
          onClick={() => {
            startPractice("unanswered");
            nav("/practice/session");
          }}
        />
        <Link to="/" className="rounded-xl bg-white/10 py-3 backdrop-blur">
          首页
        </Link>
        <MiniMode
          label="错题"
          onClick={() => {
            nav("/wrong-book");
          }}
        />
      </div>
    </div>
  );
}

function MiniMode({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-white/10 py-3 font-medium backdrop-blur active:bg-white/20"
    >
      {label}
    </button>
  );
}
