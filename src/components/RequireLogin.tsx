import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

function redirectToSiteLogin() {
  const returnTo = encodeURIComponent(
    window.location.pathname + window.location.search + window.location.hash
  );
  window.location.replace(`/login?return=${returnTo}`);
}

/** 需已登录；未登录时跳转技能考站点 /login */
export function RequireLogin() {
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.token);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (!token) {
    redirectToSiteLogin();
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
