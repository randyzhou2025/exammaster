import { create } from "zustand";
import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "exam-auth-token";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: string;
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
      set({ user: data.user, ready: true });
    } catch {
      get().logout();
      set({ ready: true });
    }
  },
}));
