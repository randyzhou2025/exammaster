import { apiFetch } from "@/lib/api";

/** 页面可见时心跳；失败静默，不阻塞主流程 */
export function sendActivityPing(token: string): void {
  void apiFetch("/api/activity/ping", { method: "POST", body: "{}" }, token).catch(() => {});
}
