import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { canEnterExamPrep, getAccessBlockReason } from "@/lib/examAccess";
import { defaultPostLoginPath, logoutAndRedirectToLogin, routes } from "@/lib/routes";
import { clearBankSessionCache } from "@/lib/bankSessionCache";
import { refreshBanksFromServer } from "@/lib/syncBanks";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

export function PendingAuthPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const logout = useAuthStore((s) => s.logout);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (canEnterExamPrep(user)) {
      navigate(defaultPostLoginPath(bankId), { replace: true });
    }
  }, [user, navigate, bankId]);

  const reason = searchParams.get("reason");
  const block = user ? getAccessBlockReason(user) : null;
  const isExpired = reason === "expired" || block === "expired";

  const title = isExpired ? "订阅已到期" : "等待授权";
  const body = isExpired
    ? "您的账号订阅已到期，暂无法使用顺序练习、模拟考试等功能。请联系管理员续期或调整到期日。"
    : "您的账号已登录，但尚未开通备考功能权限。请联系管理员为您授权后再使用顺序练习、模拟考试等功能。";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await bootstrap();
      const nextUser = useAuthStore.getState().user;
      if (nextUser && canEnterExamPrep(nextUser) && token && bankId) {
        clearBankSessionCache();
        await refreshBanksFromServer(bankId, token);
        navigate(defaultPostLoginPath(bankId), { replace: true });
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-lg font-bold text-neutral-900">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">{body}</p>
        <p className="mt-3 text-xs text-neutral-400">
          做题进度仍保存在本机浏览器内；权限恢复后本地数据不受影响。
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={refreshing}
            className="min-h-11 rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => void onRefresh()}
          >
            {refreshing ? "刷新中…" : "刷新权限状态"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700"
            onClick={() => logoutAndRedirectToLogin(logout)}
          >
            退出登录
          </button>
          <Link to={routes.settings} className="block text-center text-sm text-brand">
            设置（导出备份等）
          </Link>
        </div>
      </div>
    </div>
  );
}
