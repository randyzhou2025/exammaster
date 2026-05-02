import { useMemo, useRef, useState } from "react";
import type { ChangeEventHandler } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import clsx from "clsx";
import { useAppStore, selectStats, defaultRecord } from "@/stores/appStore";
import type { Question } from "@/types/exam";
import { isTimestampToday } from "@/domain/dateUtils";
import { downloadJson, parseBackupJson } from "@/lib/backup";

type BookTab = "wrong" | "favorite";

type WrongSort = "bank" | "wrongDesc" | "wrongAsc";
type FavoriteSort = "bank" | "favDesc" | "favAsc";

function truncate(s: string, max: number) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function sortQuestionsWrong(list: Question[], byId: Record<string, ReturnType<typeof defaultRecord>>, mode: WrongSort) {
  const arr = [...list];
  if (mode === "bank") return arr;
  const getT = (id: string) => byId[id]?.lastWrongAt ?? 0;
  arr.sort((a, b) =>
    mode === "wrongDesc" ? getT(b.id) - getT(a.id) : getT(a.id) - getT(b.id)
  );
  return arr;
}

function sortQuestionsFavorite(list: Question[], byId: Record<string, ReturnType<typeof defaultRecord>>, mode: FavoriteSort) {
  const arr = [...list];
  if (mode === "bank") return arr;
  const getT = (id: string) => byId[id]?.favoritedAt ?? 0;
  arr.sort((a, b) =>
    mode === "favDesc" ? getT(b.id) - getT(a.id) : getT(a.id) - getT(b.id)
  );
  return arr;
}

export function WrongBookPage() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: BookTab = searchParams.get("tab") === "favorite" ? "favorite" : "wrong";
  const setTab = (t: BookTab) => {
    if (t === "favorite") setSearchParams({ tab: "favorite" });
    else setSearchParams({});
  };

  const bank = useAppStore((s) => s.bank);
  const byId = useAppStore((s) => s.byId);
  const prefs = useAppStore((s) => s.prefs);
  const setPrefs = useAppStore((s) => s.setPrefs);
  const stats = useAppStore(useShallow(selectStats));
  const startPractice = useAppStore((s) => s.startPractice);
  const clearWrongBook = useAppStore((s) => s.clearWrongBook);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);

  const [wrongSort, setWrongSort] = useState<WrongSort>("wrongDesc");
  const [favSort, setFavSort] = useState<FavoriteSort>("favDesc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wrongQuestions = useMemo(
    () =>
      bank.filter((q) => {
        const r = byId[q.id] ?? defaultRecord();
        return r.firstAnswerMode === "wrong" && !r.remediated;
      }),
    [bank, byId]
  );

  const favoriteQuestions = useMemo(
    () => bank.filter((q) => (byId[q.id] ?? defaultRecord()).favorite),
    [bank, byId]
  );

  const todayWrongCount = useMemo(
    () =>
      wrongQuestions.filter((q) => {
        const t = byId[q.id]?.lastWrongAt;
        return t !== undefined && isTimestampToday(t);
      }).length,
    [wrongQuestions, byId]
  );

  const todayFavoriteCount = useMemo(
    () =>
      favoriteQuestions.filter((q) => {
        const t = byId[q.id]?.favoritedAt;
        return t !== undefined && isTimestampToday(t);
      }).length,
    [favoriteQuestions, byId]
  );

  const sortedWrong = useMemo(
    () => sortQuestionsWrong(wrongQuestions, byId, wrongSort),
    [wrongQuestions, byId, wrongSort]
  );

  const sortedFavorite = useMemo(
    () => sortQuestionsFavorite(favoriteQuestions, byId, favSort),
    [favoriteQuestions, byId, favSort]
  );

  const list = tab === "wrong" ? sortedWrong : sortedFavorite;

  const wrongRatio =
    stats.answered === 0 ? "—" : `${Math.round((stats.wrongBookCount / stats.answered) * 100)}%`;
  const favoriteRatio =
    bank.length === 0 ? "—" : `${Math.round((favoriteQuestions.length / bank.length) * 100)}%`;

  const openPracticeFromRow = (questionId: string) => {
    if (tab === "wrong") {
      if (wrongQuestions.length === 0) return;
      startPractice("wrong", "answer", { startQuestionId: questionId });
    } else {
      if (favoriteQuestions.length === 0) return;
      startPractice("favorite", "answer", { startQuestionId: questionId });
    }
    nav("/practice/session");
  };

  const handleClear = () => {
    if (wrongQuestions.length === 0) return;
    if (!window.confirm("确定清空错题本？题目将移出复习列表（不影响首次答题统计）。")) return;
    clearWrongBook();
  };

  const handleExport = () => {
    const json = exportBackup();
    downloadJson(`exam-master-backup-${Date.now()}.json`, json);
  };

  const handlePickImportFile: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const parsed = parseBackupJson(raw);
      if (!parsed) {
        window.alert("无法解析备份文件，请选择由本应用导出的 JSON。");
        return;
      }
      if (
        !window.confirm(
          "导入将覆盖当前题库快照、进度与设置（练习会话除外）。是否继续？"
        )
      ) {
        return;
      }
      importBackup(parsed);
      window.alert("备份已恢复。");
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white px-2 pt-2 shadow-sm">
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100"
            aria-label="返回"
          >
            ←
          </button>
          <div className="flex flex-1 justify-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab("wrong")}
              className={clsx(
                "relative pb-2 pt-1",
                tab === "wrong" ? "text-brand" : "text-neutral-500"
              )}
            >
              错题本
              {tab === "wrong" ? (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setTab("favorite")}
              className={clsx(
                "relative pb-2 pt-1",
                tab === "favorite" ? "text-brand" : "text-neutral-500"
              )}
            >
              收藏题目
              {tab === "favorite" ? (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand" />
              ) : null}
            </button>
          </div>
          <div className="flex w-[72px] shrink-0 flex-col gap-1 text-right">
            <button
              type="button"
              className="text-xs font-medium text-brand"
              onClick={handleExport}
            >
              导出备份
            </button>
            <button
              type="button"
              className="text-xs font-medium text-neutral-600"
              onClick={() => fileInputRef.current?.click()}
            >
              导入备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handlePickImportFile}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4">
        <section className="rounded-xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              {tab === "wrong" ? "错题统计" : "收藏统计"}
            </h2>
            {tab === "wrong" ? (
              <button
                type="button"
                onClick={handleClear}
                disabled={wrongQuestions.length === 0}
                className="flex items-center gap-1 text-xs text-neutral-500 disabled:opacity-40"
              >
                <span aria-hidden>🗑</span>
                清空
              </button>
            ) : (
              <span className="text-xs text-neutral-400">—</span>
            )}
          </div>

          {tab === "wrong" ? (
            <div className="mt-4 space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-700">答对后自动移出错题本</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs.wrongBookAutoRemove}
                  onClick={() =>
                    setPrefs({ wrongBookAutoRemove: !prefs.wrongBookAutoRemove })
                  }
                  className={clsx(
                    "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                    prefs.wrongBookAutoRemove ? "bg-brand" : "bg-neutral-300"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                      prefs.wrongBookAutoRemove ? "left-5" : "left-0.5"
                    )}
                  />
                </button>
              </div>
              {/*
                post-MVP：答对 1 次 / 答对 3 次才移除（prefs.wrongRemovalThreshold）
                <fieldset className="space-y-2 border-0 p-0">
                  <legend className="sr-only">移除条件</legend>
                  ...
                </fieldset>
              */}
              <p className="text-xs leading-relaxed text-neutral-500">
                开启时答对 1 次即从错题本移除；关闭后答对仍保留，直至清空或导入备份。后续将支持「连续答对多次才移除」。
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2 divide-x divide-neutral-100 rounded-lg border border-neutral-100 bg-white py-3 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-neutral-900 tabular-nums">
                {tab === "wrong" ? wrongQuestions.length : favoriteQuestions.length}
              </p>
              <p className="mt-0.5 text-neutral-500">{tab === "wrong" ? "错题总数" : "收藏总数"}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900 tabular-nums">
                {tab === "wrong" ? todayWrongCount : todayFavoriteCount}
              </p>
              <p className="mt-0.5 text-neutral-500">{tab === "wrong" ? "今日错题" : "今日收藏"}</p>
            </div>
            <div>
              <p
                className={clsx(
                  "text-lg font-bold tabular-nums",
                  tab === "wrong" ? "text-red-500" : "text-brand"
                )}
              >
                {tab === "wrong" ? wrongRatio : favoriteRatio}
              </p>
              <p className="mt-0.5 text-neutral-500">
                {tab === "wrong" ? "错题/已做题" : "收藏/全库"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">
              {tab === "wrong" ? "错题分布" : "收藏题目"}
            </h2>
            {tab === "wrong" ? (
              <select
                value={wrongSort}
                onChange={(e) => setWrongSort(e.target.value as WrongSort)}
                className="max-w-[220px] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
              >
                <option value="bank">题库顺序</option>
                <option value="wrongDesc">按答错时间由近到远</option>
                <option value="wrongAsc">按答错时间由远到近</option>
              </select>
            ) : (
              <select
                value={favSort}
                onChange={(e) => setFavSort(e.target.value as FavoriteSort)}
                className="max-w-[220px] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
              >
                <option value="bank">题库顺序</option>
                <option value="favDesc">按收藏时间由近到远</option>
                <option value="favAsc">按收藏时间由远到近</option>
              </select>
            )}
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              {tab === "wrong" ? "暂无错题，去顺序练习里答题吧" : "暂无收藏题目"}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {list.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => openPracticeFromRow(q.id)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-neutral-800 active:bg-neutral-50"
                  >
                    <span className="min-w-0 flex-1 leading-relaxed">{truncate(q.stem, 56)}</span>
                    <span className="shrink-0 text-neutral-400" aria-hidden>
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-center text-[11px] text-neutral-400">
          点击题目进入答题模式：范围为当前列表全部题目，并从所选题目开始。
        </p>

        <Link to="/" className="block pb-6 text-center text-sm text-brand">
          返回首页
        </Link>
      </main>
    </div>
  );
}
