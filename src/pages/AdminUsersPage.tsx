import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

export function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users", {}, token);
      const data = (await res.json()) as { error?: string; users?: AuthUser[] };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAuthorized = async (u: AuthUser) => {
    if (!token) return;
    try {
      const res = await apiFetch(
        `/api/admin/users/${u.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isAuthorized: !u.isAuthorized }),
        },
        token
      );
      const data = (await res.json()) as { error?: string; user?: AuthUser };
      if (!res.ok) {
        window.alert(data.error ?? "更新失败");
        return;
      }
      if (data.user) {
        setUsers((prev) => prev.map((x) => (x.id === data.user!.id ? data.user! : x)));
        const me = useAuthStore.getState().user;
        if (me?.id === data.user.id) {
          setUser(data.user);
        }
      }
    } catch {
      window.alert("网络错误");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="mb-6 flex items-center gap-2">
        <Link to="/" className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">用户管理</h1>
      </header>

      {loading ? (
        <p className="text-sm text-neutral-500">加载中…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-neutral-900">管理导航</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/admin/login-logs"
                className="rounded-xl border border-brand/25 bg-brand-light/50 px-3 py-2 text-sm font-medium text-brand-dark"
              >
                查看登录日志（表格）
              </Link>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900">用户授权</h2>
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-neutral-900">{u.email}</p>
                  <p className="text-xs text-neutral-500">
                    {u.displayName ?? "—"} · {u.role === "admin" ? "管理员" : "用户"}
                  </p>
                </div>
                {u.role === "admin" ? (
                  <span className="text-xs text-neutral-400">管理员无需授权开关</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleAuthorized(u)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      u.isAuthorized
                        ? "bg-emerald-100 text-emerald-800"
                        : "border border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    {u.isAuthorized ? "已授权 · 点击取消" : "未授权 · 点击开通"}
                  </button>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
