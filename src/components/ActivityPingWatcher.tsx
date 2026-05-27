import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { activityFlagsFromPath, sendActivityPing } from "@/lib/activityPing";
import { useAuthStore } from "@/stores/authStore";

/** 登录态下上报活跃；模块进入次数仅在路由变化时 +1 */
export function ActivityPingWatcher() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!token || !user) return;

    const ping = () => sendActivityPing(token);

    ping();
    const onVis = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = window.setInterval(ping, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(id);
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!token || !user) return;
    if (!activityFlagsFromPath(pathname)) return;
    sendActivityPing(token, pathname);
  }, [token, user?.id, pathname]);

  return null;
}
