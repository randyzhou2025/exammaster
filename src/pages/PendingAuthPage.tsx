import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function PendingAuthPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin" || user.isAuthorized) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-lg font-bold text-neutral-900">等待授权</h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
          您的账号已登录，但尚未开通备考功能权限。请联系管理员为您授权后再使用顺序练习、模拟考试等功能。
        </p>
        <p className="mt-3 text-xs text-neutral-400">
          做题进度仍保存在本机浏览器内；授权不影响本地数据。
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            className="rounded-xl bg-brand py-3 text-sm font-semibold text-white"
            onClick={() => {
              void bootstrap();
            }}
          >
            我已联系管理员，刷新权限
          </button>
          <button
            type="button"
            className="rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            退出登录
          </button>
          <Link to="/settings" className="block text-center text-sm text-brand">
            设置（导出备份等）
          </Link>
        </div>
      </div>
    </div>
  );
}
