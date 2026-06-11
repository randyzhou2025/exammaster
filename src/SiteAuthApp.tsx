import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ActivityPingWatcher } from "@/components/ActivityPingWatcher";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { useAuthStore } from "@/stores/authStore";

/** 站点根路径 /login、/register（无 examprep basename） */
export function SiteAuthApp() {
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
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export function isSiteAuthPath(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p === "/login" || p === "/register";
}
