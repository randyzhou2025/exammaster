import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CODE_FILL_BANK } from "@/data/codeFillBank";
import { gradeCodeFillQuestion } from "@/domain/codeFillScoring";
import type {
  CodeFillPracticeMode,
  CodeFillQuestion,
  CodeFillQuestionProgress,
} from "@/types/codeFill";

export type { CodeFillPracticeMode } from "@/types/codeFill";

const STORAGE_KEY = "codeFillProgress-v1";
const QUESTION_IDS = CODE_FILL_BANK.map((q) => q.id);

const safeStorage = {
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    } catch {
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

export interface CodeFillPracticeSession {
  mode: CodeFillPracticeMode;
  orderedIds: string[];
  index: number;
  pickedIds?: string[];
}

interface CodeFillState {
  bank: CodeFillQuestion[];
  byId: Record<string, CodeFillQuestionProgress>;
  practice: CodeFillPracticeSession | null;
  operateResumeQuestionId: string | null;
  startPractice: (mode: CodeFillPracticeMode, pickedIds?: string[]) => void;
  exitPractice: () => void;
  setPracticeIndex: (index: number) => void;
  setBlankAnswer: (questionId: string, blankId: string, value: string) => void;
  clearQuestionAnswers: (questionId: string) => void;
  checkQuestion: (questionId: string) => boolean;
  revealQuestionAnswers: (questionId: string) => void;
  resetOperateProgress: () => void;
  resetAllCodeFill: () => void;
}

function defaultProgress(): CodeFillQuestionProgress {
  return { completed: false, answers: {} };
}

function orderIds(mode: CodeFillPracticeMode, picked?: string[]): string[] {
  if (mode === "pick" && picked && picked.length > 0) {
    return [...picked].sort();
  }
  const ids = [...QUESTION_IDS];
  if (mode === "random") {
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
  }
  return ids;
}

export function selectCodeFillStats(state: Pick<CodeFillState, "byId" | "bank">) {
  const total = state.bank.length;
  const completed = state.bank.filter((q) => state.byId[q.id]?.completed).length;
  return { total, completed };
}

export const useCodeFillStore = create<CodeFillState>()(
  persist(
    (set, get) => ({
      bank: CODE_FILL_BANK,
      byId: {},
      practice: null,
      operateResumeQuestionId: null,

      startPractice: (mode, pickedIds) => {
        const orderedIds = orderIds(mode, pickedIds);
        const byId = get().byId;
        let index = 0;
        if (mode === "random") {
          // 每次开始重新洗牌，从随机序列第一题做起
          index = 0;
        } else {
          // 按顺序 / 选题：定位列表中第一个未完成题，全部完成则从第一题开始
          const firstIncomplete = orderedIds.findIndex((id) => !byId[id]?.completed);
          index = firstIncomplete >= 0 ? firstIncomplete : 0;
        }
        const startId = orderedIds[index];
        set({
          practice: { mode, orderedIds, index, pickedIds },
          operateResumeQuestionId: startId,
        });
      },

      exitPractice: () => set({ practice: null }),

      setPracticeIndex: (index) => {
        const p = get().practice;
        if (!p) return;
        const id = p.orderedIds[index];
        set({
          practice: { ...p, index },
          operateResumeQuestionId: id ?? get().operateResumeQuestionId,
        });
      },

      setBlankAnswer: (questionId, blankId, value) => {
        const prev = get().byId[questionId] ?? defaultProgress();
        set({
          byId: {
            ...get().byId,
            [questionId]: {
              ...prev,
              answers: { ...prev.answers, [blankId]: value },
            },
          },
        });
      },

      clearQuestionAnswers: (questionId) => {
        const prev = get().byId[questionId] ?? defaultProgress();
        set({
          byId: {
            ...get().byId,
            [questionId]: {
              ...prev,
              completed: false,
              answers: {},
              revealed: false,
            },
          },
        });
      },

      checkQuestion: (questionId) => {
        const q = get().bank.find((x) => x.id === questionId);
        if (!q) return false;
        const blanks = q.cells.flatMap((c) => c.blanks);
        const progress = get().byId[questionId] ?? defaultProgress();
        const { allCorrect } = gradeCodeFillQuestion(blanks, progress.answers);
        set({
          byId: {
            ...get().byId,
            [questionId]: {
              ...progress,
              completed: allCorrect,
              lastCheckedAt: Date.now(),
            },
          },
        });
        return allCorrect;
      },

      /** 仅标记「曾点过显示答案」；参考答案由做题页会话态展示，不写入持久化 answers */
      revealQuestionAnswers: (questionId) => {
        const prev = get().byId[questionId] ?? defaultProgress();
        set({
          byId: {
            ...get().byId,
            [questionId]: { ...prev, revealed: true },
          },
        });
      },

      resetOperateProgress: () =>
        set({
          byId: {},
          practice: null,
          operateResumeQuestionId: null,
        }),

      resetAllCodeFill: () =>
        set({
          byId: {},
          practice: null,
          operateResumeQuestionId: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: safeStorage,
      partialize: (s) => ({
        byId: s.byId,
        operateResumeQuestionId: s.operateResumeQuestionId,
        practice: s.practice,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CodeFillState>;
        const byId = { ...current.byId, ...p.byId };
        for (const [id, prog] of Object.entries(byId)) {
          if (prog && prog.revealed && !prog.completed) {
            byId[id] = { ...prog, answers: {}, revealed: false };
          }
        }
        return { ...current, ...p, byId };
      },
    }
  )
);
