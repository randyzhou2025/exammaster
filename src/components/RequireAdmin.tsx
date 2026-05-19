import { Navigate, Outlet } from "react-router-dom";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (user.role !== "admin") {
    return <Navigate to={routes.theoryHome} replace />;
  }

  return <Outlet />;
}
