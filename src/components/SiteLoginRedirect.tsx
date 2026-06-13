import { useEffect } from "react";
import { loginReturnParam } from "@/lib/routes";

/** /examprep/login 等 → 站点根 /login?return=…（return 不会是 login 本身） */
export function SiteLoginRedirect() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/login" || path === "/register") {
      // dev（BASE_URL=/）下客户端 navigate 到 /login 时仍在 ExamPrepApp，须整页加载以挂载 SiteAuthApp
      window.location.replace(`${path}${window.location.search}`);
      return;
    }
    window.location.replace(`/login?return=${loginReturnParam()}`);
  }, []);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
      正在跳转到登录页…
    </div>
  );
}
