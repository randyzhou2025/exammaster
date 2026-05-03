import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAppStore, selectStats } from "@/stores/appStore";

export function SequentialDashboardPage() {
  const nav = useNavigate();
  const stats = useAppStore(useShallow(selectStats));
  const startPractice = useAppStore((s) => s.startPractice);
  const acc =
    stats.practiceAccuracy === null ? "—" : `${Math.round(stats.practiceAccuracy * 100)}%`;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-brand to-brand-dark pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-white">
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
          智慧题库 · 本地进度 · 背题模式不写最新作答统计
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
              <p className="text-2xl font-bold text-brand tabular-nums">{acc}</p>
              <p className="text-xs text-neutral-500">正确率（按最新作答）</p>
              <p className="mt-1 text-[11px] text-neutral-400 tabular-nums">
                答对 {stats.attemptCorrect} · 答错 {stats.attemptWrong}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
            <StatGridCell value={stats.unanswered} label="未做题" />
            <StatGridCell value={stats.answered} label="已做题" />
            <StatGridCell
              value={stats.attemptWrong}
              label="答错"
              valueClassName="text-red-500"
              interactive
              onClick={() => nav("/wrong-book")}
            />
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

const STAT_CELL_SHELL =
  "flex min-h-[52px] w-full flex-col items-center justify-center gap-0.5 rounded-lg text-center";

function StatGridCell({
  value,
  label,
  valueClassName = "text-neutral-900",
  interactive,
  onClick,
}: {
  value: ReactNode;
  label: string;
  valueClassName?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className={`text-lg font-bold tabular-nums leading-none ${valueClassName}`}>{value}</span>
      <span className="block text-xs leading-tight text-neutral-500">{label}</span>
    </>
  );
  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${STAT_CELL_SHELL} ring-brand/30 transition active:bg-red-50 hover:ring-2`}
      >
        {inner}
      </button>
    );
  }
  return <div className={STAT_CELL_SHELL}>{inner}</div>;
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
