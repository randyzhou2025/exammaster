import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

function redirectToSiteLogin(from: string) {
  const returnTo = encodeURIComponent(from);
  window.location.replace(`/login?return=${returnTo}`);
}

/** 需已登录；未登录时跳转技能考站点 /login */
export function RequireLogin() {
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.token);
  const loc = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (!token) {
    redirectToSiteLogin(loc.pathname + loc.search);
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        正在跳转到登录页…
      </div>
    );
  }

  return <Outlet />;
}

/** Admin 根路径：/admin → /admin/users */
export function AdminIndexRedirect() {
  return <Navigate to="/admin/users" replace />;
}
