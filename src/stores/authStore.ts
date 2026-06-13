import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { clearBankSessionCache } from "@/lib/bankSessionCache";
import { clearSyncedBanks } from "@/lib/syncBanks";
import type { ContentAccess, ContentEntitlements } from "@/types/contentAccess";

const TOKEN_KEY = "exam-auth-token";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: string;
  /** YYYY-MM-DD；null 表示永不到期 */
  subscriptionExpiresOn: string | null;
  contentAccess?: ContentAccess;
  entitlements?: ContentEntitlements;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** 已完成启动校验（含 token 校验 / me） */
  ready: boolean;
  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  bootstrap: () => Promise<void>;
}

function clearBankStateOnAuthLoss(): void {
  clearSyncedBanks();
  clearBankSessionCache();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  user: null,
  ready: false,

  setSession: (token, user) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    set({ token, user });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    clearBankStateOnAuthLoss();
    set({ token: null, user: null });
  },

  bootstrap: async () => {
    const token = (() => {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    })();

    if (!token) {
      set({ token: null, user: null, ready: true });
      return;
    }

    set({ token });
    try {
      const res = await apiFetch("/api/auth/me", {}, token);
      if (!res.ok) {
        get().logout();
        set({ ready: true });
        return;
      }
      const data = (await res.json()) as { user: AuthUser };
      if (data.user.contentAccess === "blocked") {
        clearBankStateOnAuthLoss();
      }
      set({ user: data.user, ready: true });
    } catch {
      /* 网络错误保留 token，避免误退 */
      set({ ready: true });
    }
  },
}));
