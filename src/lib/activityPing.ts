import { apiFetch } from "@/lib/api";

export type ActivityFlags = {
  theory?: boolean;
  operate?: boolean;
  mock?: boolean;
};

/** 根据当前路径推断活跃模块（用于管理后台「模块」列） */
export function activityFlagsFromPath(pathname: string): ActivityFlags | undefined {
  if (pathname.includes("/operate")) return { operate: true };
  if (pathname.includes("/mock")) return { mock: true };
  if (
    pathname.includes("/theory") ||
    pathname.includes("/sequential") ||
    pathname.includes("/wrong-book") ||
    pathname.includes("/practice")
  ) {
    return { theory: true };
  }
  return undefined;
}

/** 页面可见/定时心跳；失败静默，不阻塞主流程 */
export function sendActivityPing(token: string, pathname?: string): void {
  const flags = pathname ? activityFlagsFromPath(pathname) : undefined;
  const body = flags ? JSON.stringify({ flags }) : "{}";
  void apiFetch("/api/activity/ping", { method: "POST", body }, token).catch(() => {});
}
