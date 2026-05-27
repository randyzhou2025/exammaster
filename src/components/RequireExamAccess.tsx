import { Navigate, Outlet } from "react-router-dom";
import { getAccessBlockReason } from "@/lib/examAccess";
import { useAuthStore } from "@/stores/authStore";

/** 模考/练习等：需已授权且订阅未过期，或管理员 */
export function RequireExamAccess() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  const block = getAccessBlockReason(user);
  if (block) {
    return <Navigate to={`/auth/pending?reason=${block}`} replace />;
  }

  return <Outlet />;
}
