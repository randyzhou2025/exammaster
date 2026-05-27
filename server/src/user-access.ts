import { shanghaiDateString } from "./activity.js";

/** 订阅到期日为空表示永不到期；有值则上海时区当日 ≤ 到期日 视为有效 */
export function isSubscriptionActive(expiresOn: Date | string | null | undefined): boolean {
  if (expiresOn == null) return true;
  const expiry =
    typeof expiresOn === "string" ? expiresOn.slice(0, 10) : shanghaiDateString(expiresOn);
  return shanghaiDateString() <= expiry;
}

export function hasExamAccess(user: {
  role: string;
  isAuthorized: boolean;
  subscriptionExpiresOn?: Date | string | null;
}): boolean {
  if (user.role === "admin") return true;
  if (!user.isAuthorized) return false;
  return isSubscriptionActive(user.subscriptionExpiresOn);
}
