import { DEFAULT_LEVEL_ID, getLevelIdForBank } from "@/data/questionBanks";

/** 应用内 path（不含 Vite basename） */
export { DEFAULT_LEVEL_ID };
export const EXAM_ID = "AITrainer";

/** React Router 等级段参数前缀 */
export const LEVEL_ROUTE_PREFIX = `/${EXAM_ID}/:levelId`;

export function levelBase(levelId: string = DEFAULT_LEVEL_ID): string {
  return `/${EXAM_ID}/${levelId}`;
}

export function levelRoutes(levelId: string = DEFAULT_LEVEL_ID) {
  const base = levelBase(levelId);
  return {
    levelHome: base,
    theoryHome: `${base}/theory`,
    theorySequential: `${base}/theory/sequential`,
    theoryPracticeKind: (kind: string) => `${base}/theory/practice/${kind}`,
    theoryPracticeSession: `${base}/theory/practice/session`,
    theoryMock: `${base}/theory/mock`,
    theoryMockSession: `${base}/theory/mock/session`,
    theoryMockResult: `${base}/theory/mock/result`,
    theoryWrongBook: `${base}/theory/wrong-book`,
    operateHome: `${base}/operate`,
    operateSession: `${base}/operate/session`,
  } as const;
}

/** 与等级无关的全局路由 */
export const routes = {
  banks: "/banks",
  settings: "/settings",
  login: "/login",
  register: "/register",
  pendingAuth: "/auth/pending",
  /** 站点根路径；考练部署在 /examprep 时须用 <a href> 跳转，勿用 React Router Link */
  adminUsers: "/admin/users",
  adminLoginLogs: "/admin/login-logs",
  adminDailyActivity: "/admin/daily-activity",
  adminHomepageActivity: "/admin/homepage-activity",
  examTrainerRoot: `/${EXAM_ID}`,
} as const;

export function theoryHomeForBank(bankId: string | null | undefined): string {
  return levelRoutes(getLevelIdForBank(bankId)).theoryHome;
}

/** 考练宝典完整 URL path（含 Vite basename），从 /admin 等站点根路径跳回时使用 */
export function examprepPath(inAppPath: string): string {
  const raw = import.meta.env.BASE_URL ?? "/";
  const base = raw === "/" || raw === "" ? "" : raw.replace(/\/$/, "");
  const path = inAppPath.startsWith("/") ? inAppPath : `/${inAppPath}`;
  return `${base}${path}`;
}

export function theoryHomeHrefForBank(bankId: string | null | undefined): string {
  return examprepPath(theoryHomeForBank(bankId));
}

/** 整页跳转到站点内绝对路径（跨 examprep basename 时使用） */
export function assignSitePath(path: string): void {
  window.location.assign(path.startsWith("/") ? path : `/${path}`);
}

/** 登录/注册后默认落地页：无题库则去选题 */
export function defaultPostLoginPath(bankId: string | null | undefined): string {
  if (!bankId) return routes.banks;
  return theoryHomeForBank(bankId);
}

/** 旧扁平路由 → 新理论路由（按当前 level） */
export function legacyRedirectTarget(pathname: string, levelId: string = DEFAULT_LEVEL_ID): string | null {
  const lr = levelRoutes(levelId);
  const LEGACY_REDIRECTS: Record<string, string> = {
    "/": lr.theoryHome,
    "/sequential": lr.theorySequential,
    "/wrong-book": lr.theoryWrongBook,
    "/mock": lr.theoryMock,
    "/mock/session": lr.theoryMockSession,
    "/mock/result": lr.theoryMockResult,
    "/practice/session": lr.theoryPracticeSession,
  };
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  if (pathname.startsWith("/practice/") && pathname !== "/practice/session") {
    return lr.theoryHome;
  }
  return null;
}
