import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** 考练宝典 basename 内 /admin/* → 站点根 /admin/*（AdminApp 独立挂载） */
export function SiteAdminRedirect() {
  const loc = useLocation();
  useEffect(() => {
    window.location.replace(`${loc.pathname}${loc.search}${loc.hash}`);
  }, [loc]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
      正在跳转到管理后台…
    </div>
  );
}
