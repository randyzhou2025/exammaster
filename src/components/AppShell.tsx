import { Outlet } from "react-router-dom";

/** 移动端视口约束 + 安全区 */
export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-surface shadow-none sm:shadow-card">
      <Outlet />
    </div>
  );
}
