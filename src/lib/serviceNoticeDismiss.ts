import { SERVICE_NOTICE } from "@/content/serviceNotice";

const STORAGE_PREFIX = "exam-service-notice-banner-dismissed:";

function storageKey(noticeId: string = SERVICE_NOTICE.id): string {
  return `${STORAGE_PREFIX}${noticeId}`;
}

/** 当前通知横幅是否已被用户点过「查看详情」 */
export function isServiceNoticeBannerDismissed(noticeId: string = SERVICE_NOTICE.id): boolean {
  try {
    return localStorage.getItem(storageKey(noticeId)) === "1";
  } catch {
    return false;
  }
}

/** 用户点击查看详情后，不再显示首页横幅（按通知 id 区分，换新通知可再显示） */
export function dismissServiceNoticeBanner(noticeId: string = SERVICE_NOTICE.id): void {
  try {
    localStorage.setItem(storageKey(noticeId), "1");
  } catch {
    /* ignore */
  }
}
