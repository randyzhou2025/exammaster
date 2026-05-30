import { Navigate, Outlet } from "react-router-dom";
import { defaultPostLoginPath } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (user.role !== "admin") {
    return <Navigate to={defaultPostLoginPath(bankId)} replace />;
  }

  return <Outlet />;
}
