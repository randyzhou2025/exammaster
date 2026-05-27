import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { routes } from "@/lib/routes";
import { shanghaiToday } from "@/lib/shanghai-date";
import { useAuthStore } from "@/stores/authStore";

interface HomepageVisitor {
  visitorKey: string;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  isRegistered: boolean;
  ip: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
}

const PAGE_SIZE = 20;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  } catch {
    return iso;
  }
}

function visitorLabel(v: HomepageVisitor): string {
  if (v.isRegistered && v.email) return v.email;
  return "匿名访客";
}

export function AdminHomepageActivityPage() {
  const token = useAuthStore((s) => s.token);
  const [date, setDate] = useState(shanghaiToday());
  const [visitors, setVisitors] = useState<HomepageVisitor[]>([]);
  const [summary, setSummary] = useState({ registeredCount: 0, anonymousCount: 0 });
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/admin/homepage-activity?date=${encodeURIComponent(date)}`,
        {},
        token
      );
      const data = (await res.json()) as {
        error?: string;
        visitors?: HomepageVisitor[];
        registeredCount?: number;
        anonymousCount?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setVisitors(data.visitors ?? []);
      setSummary({
        registeredCount: data.registeredCount ?? 0,
        anonymousCount: data.anonymousCount ?? 0,
      });
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
    if (!q) return visitors;
    return visitors.filter((v) => {
      return (
        visitorLabel(v).toLowerCase().includes(q) ||
        (v.displayName ?? "").toLowerCase().includes(q) ||
        v.ip.toLowerCase().includes(q) ||
        (v.isRegistered ? "已登录" : "匿名").includes(q)
      );
    });
  }, [visitors, query]);

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
        <h1 className="text-lg font-bold text-neutral-900">主页访问</h1>
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
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
          统计口径：访问 <strong>https://qiway.site/</strong> 根站主页的访客，与考练宝典内活跃分开。
          已登录用户按账号去重；未登录按 IP 去重。同一访客 60 秒内重复打开只计一次。
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-600">
            {loading ? (
              "加载中…"
            ) : (
              <>
                共 {filtered.length} 位访客
                {!loading ? (
                  <span className="text-neutral-500">
                    {" "}
                    （已登录 {summary.registeredCount} · 匿名 {summary.anonymousCount}）
                  </span>
                ) : null}
                {!loading && filtered.length !== visitors.length ? ` · 已筛选，总计 ${visitors.length}` : null}
              </>
            )}
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
          <p className="text-sm text-neutral-500">该日期暂无访问记录</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm md:min-w-0">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                    <th className="px-3 py-2 font-medium">访客</th>
                    <th className="px-3 py-2 font-medium">类型</th>
                    <th className="px-3 py-2 font-medium">昵称</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">首次访问</th>
                    <th className="whitespace-nowrap px-3 py-2 font-medium">末次访问</th>
                    <th className="px-3 py-2 font-medium">次数</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.visitorKey} className="border-b border-neutral-100">
                      <td className="px-3 py-2.5 font-medium text-neutral-900">{visitorLabel(v)}</td>
                      <td className="px-3 py-2.5 text-neutral-600">
                        {v.isRegistered ? "已登录用户" : "匿名"}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-600">{v.displayName ?? "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-neutral-600">
                        {formatTime(v.firstSeenAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-neutral-600">
                        {formatTime(v.lastSeenAt)}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{v.visitCount}</td>
                      <td className="px-3 py-2.5 font-mono text-[13px] text-neutral-600">{v.ip}</td>
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
