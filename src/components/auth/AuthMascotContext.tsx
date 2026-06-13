import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { MascotFocusField } from "./mascotInteraction";

interface AuthMascotContextValue {
  focusField: MascotFocusField;
  setFocusField: (field: MascotFocusField) => void;
  passwordVisible: boolean;
  setPasswordVisible: (visible: boolean) => void;
}

const AuthMascotContext = createContext<AuthMascotContextValue | null>(null);

export function AuthMascotProvider({ children }: { children: ReactNode }) {
  const [focusField, setFocusField] = useState<MascotFocusField>("none");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const value = useMemo(
    () => ({ focusField, setFocusField, passwordVisible, setPasswordVisible }),
    [focusField, passwordVisible]
  );

  return <AuthMascotContext.Provider value={value}>{children}</AuthMascotContext.Provider>;
}

export function useAuthMascot() {
  const ctx = useContext(AuthMascotContext);
  if (!ctx) {
    throw new Error("useAuthMascot must be used within AuthShell");
  }
  return ctx;
}

/** 绑定输入框 focus，供登录/注册页使用 */
export function useMascotFieldHandlers(field: MascotFocusField) {
  const { setFocusField } = useAuthMascot();
  return {
    onFocus: () => setFocusField(field),
    onBlur: () => setFocusField("none"),
  };
}
