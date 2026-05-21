import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { routes } from "@/lib/routes";
import { shanghaiToday } from "@/lib/shanghai-date";
import { useAuthStore } from "@/stores/authStore";

interface DailyActivityUser {
  userId: string;
  email: string;
  displayName: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  pingCount: number;
  lastIp: string;
  flags: Record<string, boolean> | null;
}

const PAGE_SIZE = 20;

function formatFlags(flags: Record<string, boolean> | null): string {
  if (!flags) return "—";
  const parts: string[] = [];
  if (flags.theory) parts.push("理论");
  if (flags.operate) parts.push("实操");
  if (flags.mock) parts.push("模考");
  return parts.length > 0 ? parts.join("、") : "—";
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  } catch {
    return iso;
  }
}

export function AdminDailyActivityPage() {
  const token = useAuthStore((s) => s.token);
  const [date, setDate] = useState(shanghaiToday);
  const [users, setUsers] = useState<DailyActivityUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/daily-activity?date=${encodeURIComponent(date)}`, {}, token);
      const data = (await res.json()) as {
        error?: string;
        users?: DailyActivityUser[];
        count?: number;
      };
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
  }, [token, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q) ||
        u.lastIp.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, date]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="mb-4 flex items-center gap-2">
        <Link to={routes.adminUsers} className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">每日活跃用户</h1>
      </header>

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700">日期（上海时区）</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            查询
          </button>
          <button
            type="button"
            onClick={() => setDate(shanghaiToday())}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700"
          >
            今天
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          统计口径：当日登录态下至少访问过一次（打开站点触发 /api/auth/me，或心跳 /api/activity/ping）。
          打开页面即记为活跃，不代表一定刷题。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            {loading ? "加载中…" : `共 ${filtered.length} 人活跃`}
            {!loading && filtered.length !== users.length ? `（已筛选，总计 ${users.length}）` : null}
          </p>
          <input
            type="search"
            placeholder="搜索邮箱、昵称、IP"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm sm:max-w-xs"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="text-sm text-neutral-500">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-neutral-500">该日期暂无活跃记录</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                    <th className="py-2 pr-3 font-medium">邮箱</th>
                    <th className="py-2 pr-3 font-medium">昵称</th>
                    <th className="py-2 pr-3 font-medium">首次活跃</th>
                    <th className="py-2 pr-3 font-medium">末次活跃</th>
                    <th className="py-2 pr-3 font-medium">次数</th>
                    <th className="py-2 pr-3 font-medium">IP</th>
                    <th className="py-2 font-medium">模块</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.userId} className="border-b border-neutral-100">
                      <td className="py-2.5 pr-3 font-medium text-neutral-900">{u.email}</td>
                      <td className="py-2.5 pr-3 text-neutral-600">{u.displayName ?? "—"}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-neutral-600">{formatTime(u.firstSeenAt)}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-neutral-600">{formatTime(u.lastSeenAt)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{u.pingCount}</td>
                      <td className="py-2.5 pr-3 text-neutral-600">{u.lastIp}</td>
                      <td className="py-2.5 text-neutral-600">{formatFlags(u.flags)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-neutral-200 px-3 py-1 disabled:opacity-40"
                >
                  上一页
                </button>
                <span className="text-neutral-600">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-neutral-200 px-3 py-1 disabled:opacity-40"
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
