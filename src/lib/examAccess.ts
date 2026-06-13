import type { AuthUser } from "@/stores/authStore";
import type { ContentAccess } from "@/types/contentAccess";
import { shanghaiToday } from "@/lib/shanghai-date";

/** 订阅到期日为空表示永不到期；有值则当日（上海）≤ 到期日 视为有效 */
export function isSubscriptionActive(expiresOn: string | null | undefined): boolean {
  if (!expiresOn) return true;
  return shanghaiToday() <= expiresOn.slice(0, 10);
}

/** 全量权限：admin / 已授权且订阅有效 */
export function hasFullAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.isAuthorized) return false;
  return isSubscriptionActive(user.subscriptionExpiresOn);
}

/** @deprecated 使用 hasFullAccess；保留别名避免大范围重命名 */
export const hasExamAccess = hasFullAccess;

function resolveContentAccess(user: AuthUser): ContentAccess {
  if (user.contentAccess) return user.contentAccess;
  if (user.role === "admin") return "full";
  if (hasFullAccess(user)) return "full";
  return "blocked";
}

/** 可进入备考区：全量或试用 */
export function canEnterExamPrep(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const access = resolveContentAccess(user);
  return access === "full" || access === "trial";
}

export type AccessBlockReason = "unauthorized" | "expired";

export function getAccessBlockReason(user: AuthUser): AccessBlockReason | null {
  if (canEnterExamPrep(user)) return null;
  if (user.role === "admin") return null;
  if (!user.isAuthorized) return "unauthorized";
  if (!isSubscriptionActive(user.subscriptionExpiresOn)) return "expired";
  return "unauthorized";
}
