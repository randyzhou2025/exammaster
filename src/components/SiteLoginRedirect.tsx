import { useEffect } from "react";

/** 统一登录在技能考站点根路径 /login */
export function SiteLoginRedirect() {
  useEffect(() => {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?return=${returnTo}`);
  }, []);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
      正在跳转到登录页…
    </div>
  );
}
