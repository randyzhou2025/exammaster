import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

const inputClassName =
  "mt-1.5 w-full rounded-xl border border-neutral-200/90 bg-neutral-50/80 px-3.5 py-3 text-[15px] outline-none transition focus:border-brand/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,119,255,0.12)]";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ready = useAuthStore((s) => s.ready);
  const existingToken = useAuthStore((s) => s.token);

  useEffect(() => {
    if (ready && existingToken) {
      navigate("/", { replace: true });
    }
  }, [ready, existingToken, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; token?: string; user?: AuthUser };
      if (!res.ok) {
        setError(data.error ?? "注册失败");
        return;
      }
      if (!data.token || !data.user) {
        setError("响应无效");
        return;
      }
      setSession(data.token, data.user);
      navigate(data.user.isAuthorized || data.user.role === "admin" ? "/" : "/auth/pending", {
        replace: true,
      });
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      cardTitle="创建账号"
      cardSubtitle="开通后由管理员授权即可使用全量刷题与模考功能"
    >
      <form onSubmit={onSubmit} className="space-y-5 text-neutral-900">
        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-[13px] text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        ) : null}
        <label className="block text-[13px] font-medium text-neutral-600">
          邮箱
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className={`${inputClassName} text-neutral-900 placeholder:text-neutral-400`}
          />
        </label>
        <label className="block text-[13px] font-medium text-neutral-600">
          密码（至少 8 位）
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClassName} text-neutral-900`}
          />
        </label>
        <label className="block text-[13px] font-medium text-neutral-600">
          称呼<span className="font-normal text-neutral-400">（可选）</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={`${inputClassName} text-neutral-900`}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0958D9] py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-6px_rgba(22,119,255,0.55)] transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
        >
          {loading ? "提交中…" : "注册"}
        </button>
        <p className="text-center text-[13px] text-neutral-500">
          已有账号？{" "}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-dark">
            返回登录
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
