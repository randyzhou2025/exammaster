import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

interface LoginLogItem {
  id: string;
  userId: string;
  username: string;
  ip: string;
  location: string;
  loginAt: string;
}

const PAGE_SIZE = 20;

export function AdminLoginLogsPage() {
  const token = useAuthStore((s) => s.token);
  const [logs, setLogs] = useState<LoginLogItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/login-logs", {}, token);
      const data = (await res.json()) as { error?: string; logs?: LoginLogItem[] };
      if (!res.ok) {
        setError(data.error ?? "登录日志加载失败");
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      return (
        l.username.toLowerCase().includes(q) ||
        l.ip.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    });
  }, [logs, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="mb-4 flex items-center gap-2">
        <Link to="/admin/users" className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">登录日志</h1>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">记录字段：用户名、登录时间、登录地点、登录IP</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700"
          >
            刷新
          </button>
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索：用户名 / IP / 地点"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-neutral-500">加载中…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">用户名</th>
                    <th className="px-3 py-2 font-semibold">登录时间</th>
                    <th className="px-3 py-2 font-semibold">登录地点</th>
                    <th className="px-3 py-2 font-semibold">登录IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-neutral-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    rows.map((l) => (
                      <tr key={l.id} className="border-t border-neutral-100">
                        <td className="px-3 py-2 text-neutral-900">{l.username}</td>
                        <td className="px-3 py-2 text-neutral-700">
                          {new Date(l.loginAt).toLocaleString("zh-CN", { hour12: false })}
                        </td>
                        <td className="px-3 py-2 text-neutral-700">{l.location}</td>
                        <td className="px-3 py-2 font-mono text-[13px] text-neutral-700">{l.ip}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
              <span>
                共 {filtered.length} 条，当前第 {safePage}/{totalPages} 页
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-neutral-200 px-2.5 py-1 disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
