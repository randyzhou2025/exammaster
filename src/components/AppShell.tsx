import { Outlet } from "react-router-dom";

/** 移动端视口约束 + 安全区；Outlet 子页面用 flex-1 铺满，避免底部露出 surface 灰边（尤其 iOS Safari） */
export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-surface shadow-none sm:shadow-card">
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
