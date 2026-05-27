import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { isSubscriptionActive } from "@/lib/examAccess";
import { routes } from "@/lib/routes";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";
import { useAuthStore } from "@/stores/authStore";

interface AdminUserRow extends AuthUser {
  lastActiveAt: string | null;
}

interface UsersListResponse {
  error?: string;
  users?: AdminUserRow[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  } catch {
    return iso;
  }
}

export function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (query.trim()) params.set("q", query.trim());
      const res = await apiFetch(`/api/admin/users?${params}`, {}, token);
      const data = (await res.json()) as UsersListResponse;
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [token, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const applyUserPatch = (patched: AdminUserRow) => {
    setUsers((prev) => prev.map((x) => (x.id === patched.id ? patched : x)));
    const me = useAuthStore.getState().user;
    if (me?.id === patched.id) {
      setUser(patched);
    }
  };

  const toggleAuthorized = async (u: AdminUserRow) => {
    if (!token || u.role === "admin") return;
    setSavingId(u.id);
    try {
      const res = await apiFetch(
        `/api/admin/users/${u.id}`,
        { method: "PATCH", body: JSON.stringify({ isAuthorized: !u.isAuthorized }) },
        token
      );
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        window.alert(data.error ?? "更新失败");
        return;
      }
      if (data.user) applyUserPatch(data.user);
    } catch {
      window.alert("网络错误");
    } finally {
      setSavingId(null);
    }
  };

  const saveSubscription = async (u: AdminUserRow, value: string) => {
    if (!token || u.role === "admin") return;
    const next = value.trim() || null;
    if (next === (u.subscriptionExpiresOn ?? null)) return;
    setSavingId(u.id);
    try {
      const res = await apiFetch(
        `/api/admin/users/${u.id}`,
        { method: "PATCH", body: JSON.stringify({ subscriptionExpiresOn: next }) },
        token
      );
      const data = (await res.json()) as { error?: string; user?: AdminUserRow };
      if (!res.ok) {
        window.alert(data.error ?? "更新失败");
        return;
      }
      if (data.user) applyUserPatch(data.user);
    } catch {
      window.alert("网络错误");
    } finally {
      setSavingId(null);
    }
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <Link to={routes.theoryHome} className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">用户管理</h1>
      </header>

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-2">
          <Link
            to={routes.adminLoginLogs}
            className="rounded-xl border border-brand/25 bg-brand-light/50 px-3 py-2 text-sm font-medium text-brand-dark"
          >
            登录日志
          </Link>
          <Link
            to={routes.adminDailyActivity}
            className="rounded-xl border border-brand/25 bg-brand-light/50 px-3 py-2 text-sm font-medium text-brand-dark"
          >
            每日活跃用户
          </Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
          订阅到期日留空表示永不到期；设置日期后，用户在该日（含当日，上海时区）之后将无法访问练习功能，需与「授权」同时满足。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-neutral-600">
            {loading ? "加载中…" : `共 ${total} 位用户`}
          </p>
          <form onSubmit={onSearch} className="flex w-full gap-2 sm:max-w-md">
            <input
              type="search"
              placeholder="搜索邮箱、用户名"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
            >
              搜索
            </button>
          </form>
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="text-sm text-neutral-500">加载中…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-neutral-500">暂无用户</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[880px] border-collapse text-left text-sm md:min-w-0">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                    <th className="px-3 py-2 font-medium">邮箱</th>
                    <th className="px-3 py-2 font-medium">用户名</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">注册日期</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">最后访问</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">订阅到期日</th>
                    <th className="px-3 py-2 font-medium">管理</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const expired =
                      u.role !== "admin" &&
                      u.subscriptionExpiresOn != null &&
                      !isSubscriptionActive(u.subscriptionExpiresOn);
                    const busy = savingId === u.id;
                    return (
                      <tr key={u.id} className="border-b border-neutral-100 align-top">
                        <td className="px-3 py-2.5 font-medium text-neutral-900">{u.email}</td>
                        <td className="px-3 py-2.5 text-neutral-600">
                          {u.displayName ?? "—"}
                          {u.role === "admin" ? (
                            <span className="ml-1 text-xs text-neutral-400">（管理员）</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-neutral-600">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-neutral-600">
                          {formatDateTime(u.lastActiveAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.role === "admin" ? (
                            <span className="text-neutral-400">—</span>
                          ) : (
                            <div className="flex min-w-[10rem] flex-col gap-1">
                              <input
                                key={`${u.id}-${u.subscriptionExpiresOn ?? "permanent"}`}
                                type="date"
                                defaultValue={u.subscriptionExpiresOn ?? ""}
                                disabled={busy}
                                onBlur={(e) => void saveSubscription(u, e.target.value)}
                                className="w-full rounded-lg border border-neutral-200 px-2 py-1 text-sm disabled:opacity-50"
                              />
                              <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <span>{u.subscriptionExpiresOn ? (expired ? "已到期" : "有限期") : "永久"}</span>
                                {u.subscriptionExpiresOn ? (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void saveSubscription(u, "")}
                                    className="text-brand disabled:opacity-50"
                                  >
                                    设为永久
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.role === "admin" ? (
                            <span className="text-xs text-neutral-400">—</span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void toggleAuthorized(u)}
                              className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                u.isAuthorized
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "border border-neutral-200 bg-white text-neutral-700"
                              }`}
                            >
                              {u.isAuthorized ? "已授权" : "未授权"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-11 rounded-lg border border-neutral-200 px-3 py-1 disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="text-neutral-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="min-h-11 rounded-lg border border-neutral-200 px-3 py-1 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
