import { useEffect } from "react";

/** /examprep/login 等 → 站点根 /login?return=完整路径 */
export function SiteLoginRedirect() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/login" || path === "/register") return;
    const returnTo = encodeURIComponent(
      path + window.location.search + window.location.hash
    );
    window.location.replace(`/login?return=${returnTo}`);
  }, []);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
      正在跳转到登录页…
    </div>
  );
}
