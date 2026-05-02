import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Question } from "@/types/exam";
import type { MockExamRecord } from "@/types/exam";
import { THEORY_BANK } from "@/data/theoryBank";
import { isAnswerCorrect } from "@/domain/scoring";
import type { BackupPayload } from "@/lib/backup";
import { BACKUP_FORMAT_VERSION } from "@/lib/backup";

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
  | "favorite";

export interface AppPrefs {
  /** 答对后是否自动移出错题本（开启时 MVP 固定为答对 1 次即移除） */
  wrongBookAutoRemove: boolean;
}

export interface QuestionRecord {
  firstAnswerMode: "unset" | "correct" | "wrong";
  favorite: boolean;
  remediated: boolean;
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

interface AppState {
  bank: Question[];
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

  setPrefs: (partial: Partial<AppPrefs>) => void;
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

  resetAll: () => void;
}

export function defaultRecord(): QuestionRecord {
  return {
    firstAnswerMode: "unset",
    favorite: false,
    remediated: false,
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
    out[id] = {
      firstAnswerMode: first,
      favorite: Boolean(o.favorite),
      remediated,
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

function buildOrderedIds(kind: PracticeKind, bank: Question[], byId: Record<string, QuestionRecord>): string[] {
  const all = bank.map((q) => q.id);
  if (kind === "sequential") return all;
  if (kind === "random") return shuffleIds(all);
  if (kind === "unanswered") return all.filter((id) => (byId[id] ?? defaultRecord()).firstAnswerMode === "unset");
  if (kind === "wrong")
    return all.filter((id) => {
      const r = byId[id] ?? defaultRecord();
      return r.firstAnswerMode === "wrong" && !r.remediated;
    });
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      bank: THEORY_BANK,
      prefs: { ...DEFAULT_PREFS },
      practice: null,
      mockExam: null,
      byId: {},
      mockHistory: [],

      setPrefs: (partial) =>
        set((s) => ({
          prefs: { ...s.prefs, ...partial },
        })),

      setBank: (bank) => set({ bank }),

      startPractice: (kind, uiMode = "answer", opts) => {
        const { bank, byId } = get();
        const orderedIds = buildOrderedIds(kind, bank, byId);
        let index = 0;
        if (opts?.startQuestionId) {
          const i = orderedIds.indexOf(opts.startQuestionId);
          if (i >= 0) index = i;
        }
        set({
          practice: {
            kind,
            orderedIds,
            index,
            uiMode,
          },
        });
      },

      clearWrongBook: () => {
        const { bank, byId } = get();
        const next = { ...byId };
        for (const q of bank) {
          const r = next[q.id] ?? defaultRecord();
          if (r.firstAnswerMode === "wrong" && !r.remediated) {
            next[q.id] = { ...r, remediated: true, wrongStreakWhileInBook: 0 };
          }
        }
        set({ byId: next });
      },

      setPracticeUiMode: (uiMode) => {
        const p = get().practice;
        if (!p) return;
        set({ practice: { ...p, uiMode } });
      },

      setPracticeIndex: (index) => {
        const p = get().practice;
        if (!p) return;
        const clamped = Math.max(0, Math.min(p.orderedIds.length - 1, index));
        set({ practice: { ...p, index: clamped } });
      },

      nextQuestion: () => {
        const p = get().practice;
        if (!p) return;
        const next = Math.min(p.index + 1, p.orderedIds.length - 1);
        set({ practice: { ...p, index: next } });
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
          if (prev.firstAnswerMode === "wrong" && !prev.remediated) {
            nextRec.wrongStreakWhileInBook = 0;
          }
        }

        set({
          byId: {
            ...get().byId,
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

      exitPractice: () => set({ practice: null }),

      startMockExam: (paperIds) => {
        const now = Date.now();
        const deadline = now + 60 * 60 * 1000;
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
        set({
          bank: payload.bank.length > 0 ? payload.bank : get().bank,
          byId: normalizeById(payload.byId),
          mockHistory: Array.isArray(payload.mockHistory) ? payload.mockHistory : [],
          prefs: normalizePrefs(payload.prefs),
        });
      },

      resetAll: () =>
        set({
          byId: {},
          mockHistory: [],
          practice: null,
          mockExam: null,
          prefs: { ...DEFAULT_PREFS },
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: safePersistStorage,
      version: 2,
      partialize: (s) => ({
        byId: s.byId,
        mockHistory: s.mockHistory,
        bank: s.bank,
        prefs: s.prefs,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const p = persisted as Partial<Pick<AppState, "byId" | "mockHistory" | "bank" | "prefs">>;
        const pb = p.bank as Question[] | undefined;
        const usePersisted =
          Array.isArray(pb) &&
          pb.length > 0 &&
          !pb.some((q) => q.id === "j1" || q.id === "s1");
        return {
          ...current,
          bank: usePersisted ? pb : current.bank,
          byId: normalizeById(p.byId),
          mockHistory: Array.isArray(p.mockHistory) ? p.mockHistory : current.mockHistory,
          prefs: normalizePrefs(p.prefs ?? current.prefs),
        };
      },
    }
  )
);

export function selectStats(state: AppState) {
  const bank = state.bank;
  let unanswered = 0;
  let answered = 0;
  let wrongFirst = 0;
  let correctFirst = 0;
  for (const q of bank) {
    const r = state.byId[q.id] ?? defaultRecord();
    if (r.firstAnswerMode === "unset") unanswered += 1;
    else {
      answered += 1;
      if (r.firstAnswerMode === "correct") correctFirst += 1;
      else wrongFirst += 1;
    }
  }
  const firstAccuracy = answered === 0 ? null : correctFirst / answered;
  const wrongBookCount = bank.filter((q) => {
    const r = state.byId[q.id] ?? defaultRecord();
    return r.firstAnswerMode === "wrong" && !r.remediated;
  }).length;
  return { unanswered, answered, wrongFirst, correctFirst, firstAccuracy, wrongBookCount, total: bank.length };
}
