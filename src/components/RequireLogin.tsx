import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { loginReturnParam } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

/** 需已登录；未登录时跳转站点 /login */
export function RequireLogin() {
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (ready && !token) {
      window.location.replace(`/login?return=${loginReturnParam()}`);
    }
  }, [ready, token]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (!token) {
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
