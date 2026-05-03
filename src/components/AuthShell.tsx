import type { ReactNode } from "react";

const BRAND_NAME = "考练宝典";
const BRAND_EN = "EXAM PREP SUITE";
const TAGLINE = "专业备考与智能刷题平台";

/**
 * 登录 / 注册共用：深色质感背景 + 品牌区 + 玻璃拟态卡片，突出「备考工具」定位。
 */
export function AuthShell({
  cardTitle,
  cardSubtitle,
  children,
}: {
  cardTitle: string;
  cardSubtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0a1628] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(22,119,255,0.45),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand/25 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[22rem] w-[22rem] rounded-full bg-cyan-500/20 blur-[90px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] pt-[max(2.5rem,env(safe-area-inset-top,0px))]">
        <header className="shrink-0 text-center">
          <div className="mx-auto flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 shadow-lg ring-1 ring-white/15 backdrop-blur-md">
            <svg
              className="h-8 w-8 text-white/95"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M8 6h16v4H8V6zm0 7h12v3H8v-3zm0 6h16v3H8v-3z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M22 10V6l4 4h-4z" fill="currentColor" fillOpacity="0.35" />
            </svg>
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.42em] text-sky-200/80">
            {BRAND_EN}
          </p>
          <h1 className="mt-1.5 text-[1.65rem] font-bold tracking-tight text-white sm:text-[1.75rem]">
            {BRAND_NAME}
          </h1>
          <p className="mx-auto mt-2 max-w-[17rem] text-[13px] leading-relaxed text-slate-300/95">
            {TAGLINE}
          </p>
          <p className="mx-auto mt-3 max-w-[19rem] text-[12px] leading-relaxed text-slate-400/90">
            题库练习 · 模考仿真 · 错题巩固 · 进度可视
          </p>
        </header>

        <div className="mt-10 w-full flex-1">
          <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.97] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-md">
            <h2 className="text-center text-lg font-semibold tracking-tight text-neutral-900">
              {cardTitle}
            </h2>
            {cardSubtitle ? (
              <p className="mt-1.5 text-center text-[13px] leading-relaxed text-neutral-500">
                {cardSubtitle}
              </p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
