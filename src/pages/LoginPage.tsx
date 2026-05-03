import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "@/components/AuthShell";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

export function LoginPage() {
  const navigate = useNavigate();
  const loc = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (loc.state as { from?: string } | null)?.from ?? "/";
  const ready = useAuthStore((s) => s.ready);
  const existingToken = useAuthStore((s) => s.token);

  useEffect(() => {
    if (ready && existingToken) {
      navigate(from, { replace: true });
    }
  }, [ready, existingToken, navigate, from]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { error?: string; token?: string; user?: AuthUser };
      if (!res.ok) {
        setError(data.error ?? "登录失败");
        return;
      }
      if (!data.token || !data.user) {
        setError("响应无效");
        return;
      }
      setSession(data.token, data.user);
      navigate(from, { replace: true });
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      cardTitle="欢迎回来"
      cardSubtitle="登录后即可同步练习记录，继续你的备考节奏"
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
            className="mt-1.5 w-full rounded-xl border border-neutral-200/90 bg-neutral-50/80 px-3.5 py-3 text-[15px] text-neutral-900 outline-none ring-0 transition placeholder:text-neutral-400 focus:border-brand/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,119,255,0.12)]"
          />
        </label>
        <label className="block text-[13px] font-medium text-neutral-600">
          密码
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-neutral-200/90 bg-neutral-50/80 px-3.5 py-3 text-[15px] outline-none transition focus:border-brand/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(22,119,255,0.12)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-brand to-[#0958D9] py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_28px_-6px_rgba(22,119,255,0.55)] transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
        >
          {loading ? "登录中…" : "登录"}
        </button>
        <p className="text-center text-[13px] text-neutral-500">
          尚无账号？{" "}
          <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
            立即注册
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
