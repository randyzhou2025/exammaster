import { Navigate, Outlet } from "react-router-dom";
import { canEnterExamPrep, getAccessBlockReason } from "@/lib/examAccess";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

/** 模考/练习等：全量、试用或管理员可进；blocked 进 pending */
export function RequireExamAccess() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (!canEnterExamPrep(user)) {
    const block = getAccessBlockReason(user) ?? "unauthorized";
    return <Navigate to={`${routes.pendingAuth}?reason=${block}`} replace />;
  }

  return <Outlet />;
}
