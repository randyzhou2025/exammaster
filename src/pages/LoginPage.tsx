import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AuthShell, useMascotFieldHandlers } from "@/components/AuthShell";
import { AuthPasswordInput, inputClassName } from "@/components/auth/AuthPasswordInput";
import { apiFetch } from "@/lib/api";
import { assignSitePath, postLoginPathForReturn } from "@/lib/routes";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";

function goAfterAuth(path: string) {
  assignSitePath(path);
}

function LoginForm({ returnPath }: { returnPath: string }) {
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailHandlers = useMascotFieldHandlers("email");

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
      goAfterAuth(returnPath);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          className={inputClassName}
          {...emailHandlers}
        />
      </label>
      <AuthPasswordInput
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#111315] py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(17,19,21,0.65)] transition hover:bg-[#24282d] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
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
  );
}

export function LoginPage() {
  const loc = useLocation();
  const [searchParams] = useSearchParams();
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const [storeReady, setStoreReady] = useState(() => useAppStore.persist.hasHydrated());

  const returnPath = postLoginPathForReturn(
    searchParams.get("return") ?? (loc.state as { from?: string } | null)?.from ?? null,
    bankId
  );
  const ready = useAuthStore((s) => s.ready);
  const existingToken = useAuthStore((s) => s.token);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setStoreReady(true));
    if (useAppStore.persist.hasHydrated()) setStoreReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (ready && existingToken && storeReady) {
      goAfterAuth(returnPath);
    }
  }, [ready, existingToken, storeReady, returnPath]);

  return (
    <AuthShell
      cardTitle="欢迎回来"
      cardSubtitle="登录后即可同步练习记录，继续你的备考节奏"
    >
      <LoginForm returnPath={returnPath} />
    </AuthShell>
  );
}
