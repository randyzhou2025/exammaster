import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { canEnterExamPrep } from "@/lib/examAccess";
import { assignSitePath, defaultPostLoginPath, examprepPath, postLoginPathForReturn, routes } from "@/lib/routes";
import { AuthShell, useMascotFieldHandlers } from "@/components/AuthShell";
import { AuthPasswordInput, inputClassName } from "@/components/auth/AuthPasswordInput";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";

function RegisterForm() {
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailHandlers = useMascotFieldHandlers("email");
  const nameHandlers = useMascotFieldHandlers("text");

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
      assignSitePath(
        examprepPath(
          canEnterExamPrep(data.user) ? defaultPostLoginPath(null) : routes.pendingAuth
        )
      );
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
        autoComplete="new-password"
        minLength={8}
        label="密码（至少 8 位）"
      />
      <label className="block text-[13px] font-medium text-neutral-600">
        称呼<span className="font-normal text-neutral-400">（可选）</span>
        <input
          type="text"
          value={displayName}
          maxLength={10}
          onChange={(e) => setDisplayName(e.target.value.slice(0, 10))}
          className={inputClassName}
          {...nameHandlers}
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#111315] py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_26px_-14px_rgba(17,19,21,0.65)] transition hover:bg-[#24282d] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55"
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
  );
}

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const ready = useAuthStore((s) => s.ready);
  const existingToken = useAuthStore((s) => s.token);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const [storeReady, setStoreReady] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setStoreReady(true));
    if (useAppStore.persist.hasHydrated()) setStoreReady(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (ready && existingToken && storeReady) {
      assignSitePath(postLoginPathForReturn(searchParams.get("return"), bankId));
    }
  }, [ready, existingToken, storeReady, searchParams, bankId]);

  return (
    <AuthShell cardTitle="创建账号">
      <RegisterForm />
    </AuthShell>
  );
}
