import type { ReactNode } from "react";
import { AuthMascotProvider, useAuthMascot } from "@/components/auth/AuthMascotContext";
import { LoginMascots } from "@/components/auth/LoginMascots";

const BRAND_NAME = "考练宝典";
const BRAND_EN = "EXAM PREP SUITE";

function AuthMascotPanel() {
  const { focusField, passwordVisible } = useAuthMascot();

  return (
    <div className="relative flex min-h-[16.5rem] shrink-0 flex-col overflow-hidden bg-[#3f4852] lg:min-h-dvh lg:justify-between">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%),radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.08),transparent_28%)]" />
      <div className="relative z-10 px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] lg:px-8 lg:pt-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111315] shadow-[0_8px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/15">
            <svg className="h-5 w-5 text-white/90" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path
                d="M8 6h16v4H8V6zm0 7h12v3H8v-3zm0 6h16v3H8v-3z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">{BRAND_NAME}</span>
        </div>
      </div>

      <div className="relative mt-1 h-[13rem] w-full px-2 lg:mt-0 lg:h-auto lg:flex-1 lg:px-8">
        <LoginMascots focusField={focusField} passwordVisible={passwordVisible} />
      </div>

      <p className="relative z-10 hidden px-8 pb-8 text-xs leading-relaxed text-white/[0.38] lg:block">
        {BRAND_EN} / 题库练习 / 模考仿真 / 错题巩固
      </p>
    </div>
  );
}

function AuthFormPanel({
  cardTitle,
  cardSubtitle,
  children,
}: {
  cardTitle: string;
  cardSubtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fbfbfc] px-5 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] pt-7 lg:justify-center lg:px-10 lg:py-12">
      <div className="mx-auto w-full max-w-sm">
        <h2 className="text-center text-[1.55rem] font-bold tracking-tight text-neutral-950 lg:text-left">
          {cardTitle}
        </h2>
        {cardSubtitle ? (
          <p className="mt-1.5 text-center text-[13px] leading-relaxed text-neutral-500 lg:text-left">
            {cardSubtitle}
          </p>
        ) : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * 登录 / 注册：左（大屏）或上（手机）为交互小人，右侧为表单。
 * 子组件内用 useAuthMascot / useMascotFieldHandlers 绑定输入框 focus。
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
    <AuthMascotProvider>
      <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-[#fbfbfc] lg:grid lg:grid-cols-[minmax(0,1.03fr)_minmax(28rem,0.97fr)] lg:overflow-hidden">
        <AuthMascotPanel />
        <AuthFormPanel cardTitle={cardTitle} cardSubtitle={cardSubtitle}>
          {children}
        </AuthFormPanel>
      </div>
    </AuthMascotProvider>
  );
}

export { useAuthMascot, useMascotFieldHandlers } from "@/components/auth/AuthMascotContext";
