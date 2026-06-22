import { useState } from "react";
import { Link } from "react-router-dom";
import { SERVICE_NOTICE } from "@/content/serviceNotice";
import {
  dismissServiceNoticeBanner,
  isServiceNoticeBannerDismissed,
} from "@/lib/serviceNoticeDismiss";
import { routes } from "@/lib/routes";

/** 刷题首页服务调整横幅；用户点击查看详情后本机不再显示 */
export function ServiceNoticeBanner() {
  const [visible, setVisible] = useState(() => !isServiceNoticeBannerDismissed());

  if (!visible) return null;

  const handleViewDetails = () => {
    dismissServiceNoticeBanner();
    setVisible(false);
  };

  return (
    <Link
      to={routes.serviceNotice}
      onClick={handleViewDetails}
      className="mx-4 mt-3 flex min-h-11 items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/95 px-4 py-3 text-left text-amber-950 shadow-sm active:bg-amber-100/90"
    >
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-xs font-bold text-amber-900"
        aria-hidden
      >
        !
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{SERVICE_NOTICE.bannerTitle}</span>
        <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
          {SERVICE_NOTICE.bannerSummary}
          <span className="ml-1 inline font-medium whitespace-nowrap text-amber-800">
            查看详情
            <span aria-hidden> →</span>
          </span>
        </p>
      </span>
    </Link>
  );
}
