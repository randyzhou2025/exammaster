import type { AuthUser } from "@/stores/authStore";
import { shanghaiToday } from "@/lib/shanghai-date";

/** 订阅到期日为空表示永不到期；有值则当日（上海）≤ 到期日 视为有效 */
export function isSubscriptionActive(expiresOn: string | null | undefined): boolean {
  if (!expiresOn) return true;
  return shanghaiToday() <= expiresOn.slice(0, 10);
}

export function hasExamAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.isAuthorized) return false;
  return isSubscriptionActive(user.subscriptionExpiresOn);
}

export type AccessBlockReason = "unauthorized" | "expired";

export function getAccessBlockReason(user: AuthUser): AccessBlockReason | null {
  if (user.role === "admin") return null;
  if (!user.isAuthorized) return "unauthorized";
  if (!isSubscriptionActive(user.subscriptionExpiresOn)) return "expired";
  return null;
}
