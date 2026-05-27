import { Outlet, useLocation } from "react-router-dom";

/** 移动端视口约束 + 安全区；Outlet 子页面用 flex-1 铺满，避免底部露出 surface 灰边（尤其 iOS Safari） */
export function AppShell() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin/");

  return (
    <div
      className={`mx-auto flex min-h-dvh w-full flex-1 flex-col bg-surface shadow-none sm:shadow-card ${
        isAdminRoute ? "max-w-md md:max-w-6xl" : "max-w-md"
      }`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
