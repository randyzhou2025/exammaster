/** 应用内 path（不含 Vite basename） */
export const EXAM_ID = "AITrainer";
export const LEVEL_ID = "level3";

const levelBase = `/${EXAM_ID}/${LEVEL_ID}`;

export const routes = {
  levelHome: levelBase,
  theoryHome: `${levelBase}/theory`,
  theorySequential: `${levelBase}/theory/sequential`,
  theoryPracticeKind: (kind: string) => `${levelBase}/theory/practice/${kind}`,
  theoryPracticeSession: `${levelBase}/theory/practice/session`,
  theoryMock: `${levelBase}/theory/mock`,
  theoryMockSession: `${levelBase}/theory/mock/session`,
  theoryMockResult: `${levelBase}/theory/mock/result`,
  theoryWrongBook: `${levelBase}/theory/wrong-book`,
  operateHome: `${levelBase}/operate`,
  operateSession: `${levelBase}/operate/session`,
  banks: "/banks",
  settings: "/settings",
  login: "/login",
  register: "/register",
  pendingAuth: "/auth/pending",
  adminUsers: "/admin/users",
  adminLoginLogs: "/admin/login-logs",
  adminDailyActivity: "/admin/daily-activity",
} as const;

/** 旧扁平路由 → 新理论路由 */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/": routes.theoryHome,
  "/sequential": routes.theorySequential,
  "/wrong-book": routes.theoryWrongBook,
  "/mock": routes.theoryMock,
  "/mock/session": routes.theoryMockSession,
  "/mock/result": routes.theoryMockResult,
  "/practice/session": routes.theoryPracticeSession,
};

export function legacyRedirectTarget(pathname: string): string | null {
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  if (pathname.startsWith("/practice/") && pathname !== "/practice/session") {
    return routes.theoryHome;
  }
  return null;
}
