import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Question } from "@/types/exam";
import type { MockExamRecord, QuestionType } from "@/types/exam";
import { DEFAULT_QUESTION_BANK_ID, getExamTemplateForBank, QUESTION_BANKS } from "@/data/questionBanks";
import { normalizeQuestionBankId, resolveTheoryBank } from "@/data/resolveTheoryBank";
import { isAnswerCorrect } from "@/domain/scoring";
import type { BackupPayload } from "@/lib/backup";
import { BACKUP_FORMAT_VERSION } from "@/lib/backup";
import { isTypePracticeKind, practiceKindToQuestionType, type TypePracticeKind } from "@/lib/practice";

const STORAGE_KEY = "ai-trainer-exam-v2";

const safePersistStorage = {
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      return JSON.parse(raw) as { state: unknown; version?: number };
    } catch {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
      return null;
    }
  },
  setItem: (name: string, value: unknown) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export type UiStudyMode = "answer" | "memorize";

export type PracticeKind =
  | "sequential"
  | "random"
  | "unanswered"
  | "wrong"
  | "favorite"
  | TypePracticeKind;

export interface AppPrefs {
  /** 答对后是否自动移出错题本（开启时 MVP 固定为答对 1 次即移除） */
  wrongBookAutoRemove: boolean;
}

export interface QuestionRecord {
  firstAnswerMode: "unset" | "correct" | "wrong";
  favorite: boolean;
  remediated: boolean;
  /** 答题模式下最近一次判分结果（背题模式不写）；全库统计「答对/答错/未做」以此为准 */
  latestAnswerOutcome: "unset" | "correct" | "wrong";
  /** 最近一次答题模式下答错时间（用于今日错题、排序） */
  lastWrongAt?: number;
  /** 最近一次加入收藏的时间 */
  favoritedAt?: number;
  /** 仍在错题在册时，答题模式下连续答对次数（答错归零） */
  wrongStreakWhileInBook?: number;
}

const DEFAULT_PREFS: AppPrefs = {
  wrongBookAutoRemove: true,
};

/** 用于 UI / 排序：兼容旧数据中没有 `latestAnswerOutcome` 字段的记录 */
export function effectiveLatestOutcome(r: QuestionRecord): "unset" | "correct" | "wrong" {
  const l = r.latestAnswerOutcome;
  if (l === "correct" || l === "wrong" || l === "unset") return l;
  if (r.firstAnswerMode === "unset") return "unset";
  if (r.firstAnswerMode === "correct") return "correct";
  return r.remediated ? "correct" : "wrong";
}

/** 错题本收录规则：与仪表盘「答错」一致，只看最近一次答题模式判分是否为错 */
export function isWrongBookMember(r: QuestionRecord): boolean {
  return effectiveLatestOutcome(r) === "wrong";
}

interface AppState {
  bank: Question[];
  /** 已确认的备考题库；null 表示尚未完成首次选择题库 */
  selectedQuestionBankId: string | null;
  prefs: AppPrefs;
  practice: null | {
    kind: PracticeKind;
    orderedIds: string[];
    index: number;
    uiMode: UiStudyMode;
  };
  mockExam: null | {
    paperIds: string[];
    answers: Record<string, string[]>;
    startedAt: number;
    deadlineAt: number;
    currentIndex: number;
  };
  byId: Record<string, QuestionRecord>;
  mockHistory: MockExamRecord[];
  /** 顺序练习退出时的题目 id，用于「继续练习」恢复进度（非答题统计） */
  sequentialResumeQuestionId: string | null;

  setPrefs: (partial: Partial<AppPrefs>) => void;
  setSelectedQuestionBankId: (id: string) => void;
  setBank: (q: Question[]) => void;
  startPractice: (kind: PracticeKind, uiMode?: UiStudyMode, opts?: { startQuestionId?: string }) => void;
  clearWrongBook: () => void;
  setPracticeUiMode: (m: UiStudyMode) => void;
  setPracticeIndex: (i: number) => void;
  nextQuestion: () => void;
  submitPracticeAnswer: (questionId: string, selected: string[], explicitMode: UiStudyMode) => void;
  toggleFavorite: (questionId: string) => void;
  exitPractice: () => void;

  startMockExam: (paperIds: string[]) => void;
  setMockAnswer: (questionId: string, selected: string[]) => void;
  setMockIndex: (i: number) => void;
  submitMockExam: (payload: Omit<MockExamRecord, "id">) => void;
  abortMockExam: () => void;

  exportBackup: () => string;
  importBackup: (payload: BackupPayload) => void;

  /** 同步当前包内最新 THEORY_BANK；不清除 byId / 模考 / 偏好等进度 */
  syncLatestTheoryBank: () => void;

  resetAll: () => void;
}

export function defaultRecord(): QuestionRecord {
  return {
    firstAnswerMode: "unset",
    favorite: false,
    remediated: false,
    latestAnswerOutcome: "unset",
    wrongStreakWhileInBook: 0,
  };
}

function normalizeById(raw: unknown): Record<string, QuestionRecord> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, QuestionRecord> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const first =
      o.firstAnswerMode === "correct" || o.firstAnswerMode === "wrong" || o.firstAnswerMode === "unset"
        ? o.firstAnswerMode
        : "unset";
    let remediated = Boolean(o.remediated);
    if ("inWrongBook" in o && typeof o.inWrongBook === "boolean" && !("remediated" in o)) {
      remediated = first === "correct" ? true : !o.inWrongBook;
    }
    const streak =
      typeof o.wrongStreakWhileInBook === "number" ? o.wrongStreakWhileInBook : defaultRecord().wrongStreakWhileInBook;
    const rawLatest = o.latestAnswerOutcome;
    let latestAnswerOutcome: QuestionRecord["latestAnswerOutcome"];
    if (rawLatest === "correct" || rawLatest === "wrong" || rawLatest === "unset") {
      latestAnswerOutcome = rawLatest;
    } else {
      latestAnswerOutcome =
        first === "unset" ? "unset" : first === "correct" ? "correct" : remediated ? "correct" : "wrong";
    }
    out[id] = {
      firstAnswerMode: first,
      favorite: Boolean(o.favorite),
      remediated,
      latestAnswerOutcome,
      lastWrongAt: typeof o.lastWrongAt === "number" ? o.lastWrongAt : undefined,
      favoritedAt: typeof o.favoritedAt === "number" ? o.favoritedAt : undefined,
      wrongStreakWhileInBook: streak,
    };
  }
  return out;
}

function normalizePrefs(raw: unknown): AppPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const o = raw as Record<string, unknown>;
  const wrongBookAutoRemove =
    typeof o.wrongBookAutoRemove === "boolean" ? o.wrongBookAutoRemove : DEFAULT_PREFS.wrongBookAutoRemove;
  return { wrongBookAutoRemove };
}

/** 与 `partialize` 写入 localStorage 的字段一致；用于 persist `migrate` 的返回值 */
type PersistedSlice = Pick<
  AppState,
  | "byId"
  | "mockHistory"
  | "bank"
  | "prefs"
  | "sequentialResumeQuestionId"
  | "selectedQuestionBankId"
  | "practice"
>;

const PRACTICE_KINDS: readonly PracticeKind[] = [
  "sequential",
  "random",
  "unanswered",
  "wrong",
  "favorite",
  "type-judgment",
  "type-single",
  "type-multiple",
];

/**
 * 将本地存储中的 practice 还原为当前题库下可用的会话；题库更新或刷题列表变化时尽量保留「当时那道题」的位置。
 */
export function normalizePersistedPractice(
  raw: unknown,
  bank: Question[],
  byId: Record<string, QuestionRecord>
): AppState["practice"] {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (typeof kind !== "string" || !PRACTICE_KINDS.includes(kind as PracticeKind)) return null;

  const uiMode: UiStudyMode = o.uiMode === "memorize" ? "memorize" : "answer";
  const bankIds = new Set(bank.map((q) => q.id));
  let index = typeof o.index === "number" && Number.isFinite(o.index) ? Math.trunc(o.index) : 0;

  const savedOrdered: string[] = Array.isArray(o.orderedIds)
    ? (o.orderedIds as unknown[]).filter((id): id is string => typeof id === "string" && bankIds.has(id))
    : [];

  let orderedIds: string[];

  if (kind === "sequential") {
    orderedIds = bank.map((q) => q.id);
    if (savedOrdered.length === 0) {
      index = Math.max(0, Math.min(index, Math.max(orderedIds.length - 1, 0)));
    } else {
      const at = Math.max(0, Math.min(index, savedOrdered.length - 1));
      const focusId = savedOrdered[at];
      if (focusId && orderedIds.includes(focusId)) {
        index = orderedIds.indexOf(focusId);
      } else {
        index = Math.max(0, Math.min(index, orderedIds.length - 1));
      }
    }
  } else if (isTypePracticeKind(kind)) {
    orderedIds = buildOrderedIds(kind, bank, byId);
    if (orderedIds.length === 0) return null;
    if (savedOrdered.length > 0) {
      const at = Math.max(0, Math.min(index, savedOrdered.length - 1));
      const focusId = savedOrdered[at];
      if (focusId && orderedIds.includes(focusId)) {
        index = orderedIds.indexOf(focusId);
      }
    }
    index = Math.max(0, Math.min(index, orderedIds.length - 1));
  } else {
    orderedIds = savedOrdered;
    if ((kind === "unanswered" || kind === "wrong" || kind === "favorite") && orderedIds.length === 0) {
      orderedIds = buildOrderedIds(kind as PracticeKind, bank, byId);
    }
    if (orderedIds.length === 0) return null;
    index = Math.max(0, Math.min(index, orderedIds.length - 1));
  }

  if (orderedIds.length === 0) return null;

  index = Math.max(0, Math.min(index, orderedIds.length - 1));

  return {
    kind: kind as PracticeKind,
    orderedIds,
    index,
    uiMode,
  };
}

function migratePersistedSlice(persistedState: unknown): PersistedSlice {
  const p = (persistedState ?? {}) as Partial<PersistedSlice>;
  /** 标答以当前构建内嵌题库为准，不恢复 localStorage 里的旧 bank 快照 */
  const selectedQuestionBankId =
    p.selectedQuestionBankId === null
      ? null
      : normalizeQuestionBankId(p.selectedQuestionBankId as string | undefined);
  const bank = resolveTheoryBank(selectedQuestionBankId ?? DEFAULT_QUESTION_BANK_ID);
  const byId = normalizeById(p.byId);
  return {
    bank,
    byId,
    mockHistory: Array.isArray(p.mockHistory) ? p.mockHistory : [],
    prefs: normalizePrefs(p.prefs),
    sequentialResumeQuestionId:
      typeof p.sequentialResumeQuestionId === "string" || p.sequentialResumeQuestionId === null
        ? p.sequentialResumeQuestionId
        : null,
    selectedQuestionBankId,
    practice: normalizePersistedPractice(p.practice, bank, byId),
  };
}

function mergeSelectedQuestionBankId(p: Partial<PersistedSlice>, current: string | null): string | null {
  if (!Object.prototype.hasOwnProperty.call(p, "selectedQuestionBankId")) {
    return current ?? DEFAULT_QUESTION_BANK_ID;
  }
  const v = p.selectedQuestionBankId;
  if (v === null) return null;
  if (typeof v === "string" && QUESTION_BANKS.some((b) => b.id === v)) return v;
  return current ?? DEFAULT_QUESTION_BANK_ID;
}

function buildOrderedIds(kind: PracticeKind, bank: Question[], byId: Record<string, QuestionRecord>): string[] {
  const typeFilter = practiceKindToQuestionType(kind);
  const pool = typeFilter ? bank.filter((q) => q.type === typeFilter) : bank;
  const all = pool.map((q) => q.id);
  if (kind === "sequential" || isTypePracticeKind(kind)) return all;
  if (kind === "random") return shuffleIds(all);
  if (kind === "unanswered")
    return all.filter((id) => effectiveLatestOutcome(byId[id] ?? defaultRecord()) === "unset");
  if (kind === "wrong")
    return all.filter((id) => isWrongBookMember(byId[id] ?? defaultRecord()));
  if (kind === "favorite") return all.filter((id) => (byId[id] ?? defaultRecord()).favorite);
  return all;
}

function shuffleIds(ids: string[]): string[] {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 顺序练习当前题号 → `sequentialResumeQuestionId`。
 * 答题模式也必须同步：否则只依赖退出练习时的 `exitPractice` 写书签，若杀进程/丢会话后点「继续练习」，
 * `startPractice` 会按陈旧书签恢复，题序会远落后于真实进度（如已在第 229 题却回到第 205 题）。
 */
function sequentialResumeBookmarkPatch(
  p: NonNullable<AppState["practice"]>,
  index: number
): Pick<AppState, "sequentialResumeQuestionId"> | Record<string, never> {
  if (p.kind !== "sequential") return {};
  const id = p.orderedIds[index];
  if (!id) return {};
  return { sequentialResumeQuestionId: id };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      bank: resolveTheoryBank(DEFAULT_QUESTION_BANK_ID),
      selectedQuestionBankId: null,
      prefs: { ...DEFAULT_PREFS },
      practice: null,
      mockExam: null,
      byId: {},
      mockHistory: [],
      sequentialResumeQuestionId: null,

      setPrefs: (partial) =>
        set((s) => ({
          prefs: { ...s.prefs, ...partial },
        })),

      setSelectedQuestionBankId: (id) => {
        const normalized = normalizeQuestionBankId(id);
        const cur = get();
        if (cur.selectedQuestionBankId === normalized) return;
        set({
          selectedQuestionBankId: normalized,
          bank: resolveTheoryBank(normalized),
          practice: null,
          mockExam: null,
          sequentialResumeQuestionId: null,
        });
      },

      setBank: (bank) => set({ bank }),

      startPractice: (kind, uiMode = "answer", opts) => {
        const { bank, byId, sequentialResumeQuestionId } = get();
        const orderedIds = buildOrderedIds(kind, bank, byId);
        let index = 0;
        if (opts?.startQuestionId) {
          const i = orderedIds.indexOf(opts.startQuestionId);
          if (i >= 0) index = i;
        } else if (kind === "sequential" && sequentialResumeQuestionId) {
          const i = orderedIds.indexOf(sequentialResumeQuestionId);
          if (i >= 0) index = i;
        } else if (kind === "sequential") {
          // 兜底：若无显式恢复点（如移动端重载导致未写入 sequentialResumeQuestionId），从第一道未做题继续。
          const firstUnanswered = orderedIds.findIndex(
            (id) => effectiveLatestOutcome(byId[id] ?? defaultRecord()) === "unset"
          );
          if (firstUnanswered >= 0) index = firstUnanswered;
        } else if (isTypePracticeKind(kind)) {
          const firstUnanswered = orderedIds.findIndex(
            (id) => effectiveLatestOutcome(byId[id] ?? defaultRecord()) === "unset"
          );
          if (firstUnanswered >= 0) index = firstUnanswered;
        }
        const practice = { kind, orderedIds, index, uiMode };
        const bookmark =
          kind === "sequential" && orderedIds.length > 0
            ? sequentialResumeBookmarkPatch(
                practice as NonNullable<AppState["practice"]>,
                Math.min(Math.max(0, index), orderedIds.length - 1)
              )
            : {};
        set({
          practice,
          ...bookmark,
        });
      },

      clearWrongBook: () => {
        const { bank, byId } = get();
        const next = { ...byId };
        for (const q of bank) {
          const r = next[q.id] ?? defaultRecord();
          if (!isWrongBookMember(r)) continue;
          next[q.id] = {
            ...r,
            latestAnswerOutcome: "correct",
            remediated: true,
            wrongStreakWhileInBook: 0,
          };
        }
        set({ byId: next });
      },

      setPracticeUiMode: (uiMode) => {
        const p = get().practice;
        if (!p) return;
        const nextPractice = { ...p, uiMode };
        if (p.kind === "sequential") {
          set({
            practice: nextPractice,
            ...sequentialResumeBookmarkPatch(p, p.index),
          });
          return;
        }
        set({ practice: nextPractice });
      },

      setPracticeIndex: (index) => {
        const p = get().practice;
        if (!p) return;
        const clamped = Math.max(0, Math.min(p.orderedIds.length - 1, index));
        set({
          practice: { ...p, index: clamped },
          ...sequentialResumeBookmarkPatch(p, clamped),
        });
      },

      nextQuestion: () => {
        const p = get().practice;
        if (!p) return;
        const next = Math.min(p.index + 1, p.orderedIds.length - 1);
        set({
          practice: { ...p, index: next },
          ...sequentialResumeBookmarkPatch(p, next),
        });
      },

      submitPracticeAnswer: (questionId, selected, explicitMode) => {
        if (explicitMode === "memorize") return;

        const bank = get().bank;
        const q = bank.find((x) => x.id === questionId);
        if (!q) return;
        const correct = isAnswerCorrect(q, selected);
        const prev = get().byId[questionId] ?? defaultRecord();
        const prefs = get().prefs;
        const nextRec: QuestionRecord = { ...prev };

        if (prev.firstAnswerMode === "unset") {
          nextRec.firstAnswerMode = correct ? "correct" : "wrong";
          nextRec.remediated = correct;
          if (!correct) {
            nextRec.lastWrongAt = Date.now();
            nextRec.wrongStreakWhileInBook = 0;
          }
        } else if (correct) {
          const inWrongBook = prev.firstAnswerMode === "wrong" && !prev.remediated;
          if (inWrongBook) {
            const streak = (prev.wrongStreakWhileInBook ?? 0) + 1;
            nextRec.wrongStreakWhileInBook = streak;
            /** MVP：固定连续答对 1 次即移出；后续开放 prefs.wrongRemovalThreshold（1|3） */
            const removalStreakRequired = 1;
            if (prefs.wrongBookAutoRemove && streak >= removalStreakRequired) {
              nextRec.remediated = true;
            } else {
              nextRec.remediated = false;
            }
          } else {
            nextRec.remediated = prev.remediated;
          }
        } else {
          nextRec.lastWrongAt = Date.now();
          /** 任意一次答错：重新进入错题本可视状态（与 isWrongBookMember 基于 latest 一致） */
          nextRec.remediated = false;
          if (prev.firstAnswerMode === "wrong") {
            nextRec.wrongStreakWhileInBook = 0;
          }
        }

        nextRec.latestAnswerOutcome = correct ? "correct" : "wrong";

        const snap = get();
        set({
          byId: {
            ...snap.byId,
            [questionId]: nextRec,
          },
        });
      },

      toggleFavorite: (questionId) => {
        const prev = get().byId[questionId] ?? defaultRecord();
        const nextFav = !prev.favorite;
        set({
          byId: {
            ...get().byId,
            [questionId]: {
              ...prev,
              favorite: nextFav,
              favoritedAt: nextFav ? Date.now() : undefined,
            },
          },
        });
      },

      exitPractice: () => {
        const p = get().practice;
        if (p?.kind === "sequential" && p.orderedIds.length > 0) {
          const idx = Math.min(Math.max(0, p.index), p.orderedIds.length - 1);
          set({
            practice: null,
            sequentialResumeQuestionId: p.orderedIds[idx],
          });
          return;
        }
        set({ practice: null });
      },

      startMockExam: (paperIds) => {
        const now = Date.now();
        const template = getExamTemplateForBank(get().selectedQuestionBankId);
        const deadline = now + template.durationMinutes * 60 * 1000;
        set({
          mockExam: {
            paperIds,
            answers: {},
            startedAt: now,
            deadlineAt: deadline,
            currentIndex: 0,
          },
        });
      },

      setMockAnswer: (questionId, selected) => {
        const m = get().mockExam;
        if (!m) return;
        set({
          mockExam: {
            ...m,
            answers: { ...m.answers, [questionId]: selected },
          },
        });
      },

      setMockIndex: (i) => {
        const m = get().mockExam;
        if (!m) return;
        const clamped = Math.max(0, Math.min(m.paperIds.length - 1, i));
        set({ mockExam: { ...m, currentIndex: clamped } });
      },

      submitMockExam: (payload) => {
        const id = `exam_${Date.now()}`;
        set({
          mockHistory: [{ id, ...payload }, ...get().mockHistory],
          mockExam: null,
        });
      },

      abortMockExam: () => set({ mockExam: null }),

      exportBackup: () => {
        const s = get();
        const payload: BackupPayload = {
          formatVersion: BACKUP_FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          bank: s.bank,
          byId: s.byId as unknown as Record<string, unknown>,
          mockHistory: s.mockHistory,
          prefs: { ...s.prefs },
        };
        return JSON.stringify(payload, null, 2);
      },

      importBackup: (payload) => {
        const bank = payload.bank.length > 0 ? payload.bank : get().bank;
        const byId = normalizeById(payload.byId);
        set({
          bank,
          byId,
          mockHistory: Array.isArray(payload.mockHistory) ? payload.mockHistory : [],
          prefs: normalizePrefs(payload.prefs),
          practice: null,
        });
      },

      syncLatestTheoryBank: () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { state?: Record<string, unknown>; version?: number };
            if (parsed.state && "bank" in parsed.state) {
              delete parsed.state.bank;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
          }
        } catch {
          /* ignore */
        }
        set({
          bank: resolveTheoryBank(DEFAULT_QUESTION_BANK_ID),
          practice: null,
          mockExam: null,
        });
      },

      resetAll: () =>
        set({
          bank: resolveTheoryBank(DEFAULT_QUESTION_BANK_ID),
          byId: {},
          mockHistory: [],
          practice: null,
          mockExam: null,
          prefs: { ...DEFAULT_PREFS },
          sequentialResumeQuestionId: null,
          /** 与「选择题库」流程一致：清除备考数据后应重新选题库（否则 persist 仍会写回旧 id） */
          selectedQuestionBankId: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: safePersistStorage,
      version: 7,
      /**
       * 存储里的 `version` 与上方不一致时必须提供 migrate；否则 Zustand 会把 `undefined`
       * 交给 merge，等同于丢弃本地进度并立刻用空状态覆盖写入。
       */
      migrate: (persistedState, _fromVersion) => migratePersistedSlice(persistedState),
      partialize: (s) => ({
        byId: s.byId,
        mockHistory: s.mockHistory,
        prefs: s.prefs,
        sequentialResumeQuestionId: s.sequentialResumeQuestionId,
        selectedQuestionBankId: s.selectedQuestionBankId,
        practice: s.practice,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const p = persisted as Partial<PersistedSlice>;
        const resume =
          typeof p.sequentialResumeQuestionId === "string" || p.sequentialResumeQuestionId === null
            ? p.sequentialResumeQuestionId
            : current.sequentialResumeQuestionId;
        const mergedById =
          p.byId !== undefined && p.byId !== null ? normalizeById(p.byId) : normalizeById(current.byId);
        const bankId = mergeSelectedQuestionBankId(p, current.selectedQuestionBankId);
        const bankMerged = resolveTheoryBank(bankId ?? DEFAULT_QUESTION_BANK_ID);
        return {
          ...current,
          bank: bankMerged,
          byId: mergedById,
          mockHistory: Array.isArray(p.mockHistory) ? p.mockHistory : current.mockHistory,
          prefs: normalizePrefs(p.prefs ?? current.prefs),
          sequentialResumeQuestionId: resume ?? null,
          selectedQuestionBankId: mergeSelectedQuestionBankId(p, current.selectedQuestionBankId),
          practice: normalizePersistedPractice(
            Object.prototype.hasOwnProperty.call(p, "practice") ? p.practice : null,
            bankMerged,
            mergedById
          ),
        };
      },
    }
  )
);

export function selectStats(state: AppState) {
  const bank = state.bank;
  let unanswered = 0;
  let latestCorrect = 0;
  let latestWrong = 0;
  for (const q of bank) {
    const r = state.byId[q.id] ?? defaultRecord();
    const o = effectiveLatestOutcome(r);
    if (o === "unset") unanswered += 1;
    else if (o === "correct") latestCorrect += 1;
    else latestWrong += 1;
  }
  const answered = latestCorrect + latestWrong;
  const attemptCorrect = latestCorrect;
  const attemptWrong = latestWrong;
  const attemptsTotal = answered;
  const practiceAccuracy = answered === 0 ? null : latestCorrect / answered;
  const wrongBookCount = bank.filter((q) =>
    isWrongBookMember(state.byId[q.id] ?? defaultRecord())
  ).length;
  const favoriteCount = bank.filter((q) => {
    const r = state.byId[q.id] ?? defaultRecord();
    return r.favorite;
  }).length;
  return {
    unanswered,
    answered,
    attemptCorrect,
    attemptWrong,
    attemptsTotal,
    practiceAccuracy,
    wrongBookCount,
    favoriteCount,
    total: bank.length,
  };
}

export type TypePracticeStats = {
  total: number;
  answered: number;
  unanswered: number;
  attemptCorrect: number;
  attemptWrong: number;
};

export function computeStatsByType(
  bank: Question[],
  byId: Record<string, QuestionRecord>
): Record<QuestionType, TypePracticeStats> {
  const empty = (): TypePracticeStats => ({
    total: 0,
    answered: 0,
    unanswered: 0,
    attemptCorrect: 0,
    attemptWrong: 0,
  });
  const out: Record<QuestionType, TypePracticeStats> = {
    judgment: empty(),
    single: empty(),
    multiple: empty(),
  };
  for (const q of bank) {
    const bucket = out[q.type];
    bucket.total += 1;
    const o = effectiveLatestOutcome(byId[q.id] ?? defaultRecord());
    if (o === "unset") bucket.unanswered += 1;
    else if (o === "correct") {
      bucket.answered += 1;
      bucket.attemptCorrect += 1;
    } else {
      bucket.answered += 1;
      bucket.attemptWrong += 1;
    }
  }
  return out;
}

export function selectStatsByType(state: AppState): Record<QuestionType, TypePracticeStats> {
  return computeStatsByType(state.bank, state.byId);
}
