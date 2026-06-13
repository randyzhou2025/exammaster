import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getAccessBlockReason } from "@/lib/examAccess";
import { routes } from "@/lib/routes";
import { clearBankSessionCache } from "@/lib/bankSessionCache";
import { clearSyncedBanks, syncBanksForUser } from "@/lib/syncBanks";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

/** 按用户权限拉取理论/实操题库（sessionStorage 热缓存 + API） */
export function BankBootstrap() {
  const ready = useAuthStore((s) => s.ready);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const bankLen = useAppStore((s) => s.bank.length);
  const bankMeta = useAppStore((s) => s.bankMeta);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSyncKeyRef = useRef<string | null>(null);

  const block = user ? getAccessBlockReason(user) : null;
  const contentAccess = user?.contentAccess ?? (block ? "blocked" : "full");

  useEffect(() => {
    if (!ready || !token || !user || !bankId || block) return;

    const syncKey = `${bankId}:${contentAccess}:${user.id}`;
    if (lastSyncKeyRef.current === syncKey && bankLen > 0 && bankMeta) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        if (lastSyncKeyRef.current && lastSyncKeyRef.current !== syncKey) {
          clearBankSessionCache();
        }
        await syncBanksForUser({ bankId, token, contentAccess });
        if (!cancelled) lastSyncKeyRef.current = syncKey;
      } catch (e) {
        if (cancelled) return;
        const status = (e as { status?: number }).status;
        if (status === 403) {
          clearSyncedBanks();
          clearBankSessionCache();
        }
        setError(e instanceof Error ? e.message : "加载题库失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, user?.id, user?.contentAccess, bankId, block]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (block) {
    const reason = block === "expired" ? "expired" : "unauthorized";
    return <Navigate to={`${routes.pendingAuth}?reason=${reason}`} replace />;
  }

  if (loading && bankLen === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载题库…
      </div>
    );
  }

  if (error && bankLen === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white"
          onClick={() => {
            lastSyncKeyRef.current = null;
            setError(null);
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return <Outlet />;
}
