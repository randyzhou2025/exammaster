import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/** 需已登录；做题进度等业务数据仍在本地 localStorage */
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
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
