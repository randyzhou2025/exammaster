import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ActivityPingWatcher } from "@/components/ActivityPingWatcher";
import { AdminIndexRedirect, RequireLogin } from "@/components/RequireLogin";
import { RequireAdmin } from "@/components/RequireAdmin";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AdminDailyActivityPage } from "@/pages/AdminDailyActivityPage";
import { AdminHomepageActivityPage } from "@/pages/AdminHomepageActivityPage";
import { AdminLoginLogsPage } from "@/pages/AdminLoginLogsPage";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/authStore";

/** 管理后台挂载在站点根路径 /admin（非 /examprep/admin） */
export function AdminApp() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <ActivityPingWatcher />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireLogin />}>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminIndexRedirect />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/login-logs" element={<AdminLoginLogsPage />} />
            <Route path={routes.adminDailyActivity} element={<AdminDailyActivityPage />} />
            <Route path={routes.adminHomepageActivity} element={<AdminHomepageActivityPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export function isAdminSitePath(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}
