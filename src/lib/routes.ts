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
    theoryMockReview: `${base}/theory/mock/review`,
    theoryWrongBook: `${base}/theory/wrong-book`,
    operateHome: `${base}/operate`,
    operateSession: `${base}/operate/session`,
  } as const;
}

/** 与等级无关的全局路由 */
export const routes = {
  banks: "/banks",
  serviceNotice: "/notice/service",
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

/** 整页跳转站点根 /login（须离开 ExamPrepApp 的 React Router，否则 dev 下会卡在占位页） */
export function redirectToSiteLogin(options?: { returnTo?: string | null }): void {
  if (options?.returnTo === null) {
    window.location.replace("/login");
    return;
  }
  const param =
    options?.returnTo != null ? encodeURIComponent(options.returnTo) : loginReturnParam();
  window.location.replace(`/login?return=${param}`);
}

const LOGOUT_REDIRECT_KEY = "exam-auth-logout";

/** 退出登录：避免 RequireLogin 竞态写入 return=当前页（如在 /settings 退出后又回到设置） */
export function logoutAndRedirectToLogin(logout: () => void): void {
  try {
    sessionStorage.setItem(LOGOUT_REDIRECT_KEY, "1");
  } catch {
    /* ignore */
  }
  logout();
  redirectToSiteLogin({ returnTo: null });
}

export function consumeLogoutRedirect(): boolean {
  try {
    if (sessionStorage.getItem(LOGOUT_REDIRECT_KEY)) {
      sessionStorage.removeItem(LOGOUT_REDIRECT_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

const AUTH_PATH_RE = /\/(login|register)\/?$/;

/** 登录/注册成功后禁止跳回 auth 页，避免 /examprep/login ↔ /login 死循环 */
export function sanitizePostLoginReturn(raw: string | null | undefined): string {
  if (!raw) return examprepPath("/banks");
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return examprepPath("/banks");

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  if (pathOnly === "/" || AUTH_PATH_RE.test(pathOnly)) {
    return examprepPath("/banks");
  }
  return trimmed;
}

/** 跳转站点登录页时使用的 return 参数（排除 auth 路径本身） */
export function loginReturnParam(): string {
  const full = window.location.pathname + window.location.search + window.location.hash;
  const pathOnly = window.location.pathname;
  if (pathOnly === "/login" || pathOnly === "/register" || AUTH_PATH_RE.test(pathOnly)) {
    return encodeURIComponent(examprepPath("/banks"));
  }
  return encodeURIComponent(full);
}

/** 登录/注册后默认落地页：无题库则去选题 */
export function defaultPostLoginPath(bankId: string | null | undefined): string {
  if (!bankId) return routes.banks;
  return theoryHomeForBank(bankId);
}

/** 是否为「选题库」落地页（含 examprep basename 变体） */
export function isBanksLandingPath(path: string): boolean {
  const pathOnly = path.split("?")[0]?.split("#")[0] ?? path;
  return pathOnly === routes.banks || pathOnly === examprepPath(routes.banks);
}

/** 去掉 Vite basename，得到应用内 path */
export function stripExamprepBase(path: string): string {
  const pathOnly = path.split("?")[0]?.split("#")[0] ?? path;
  const base = examprepPath("/").replace(/\/$/, "");
  if (base && (pathOnly === base || pathOnly.startsWith(`${base}/`))) {
    const rest = pathOnly.slice(base.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

/** 登录后不应回到的辅助页（设置、待授权、管理后台等） */
function isNonExamPrepReturnPath(sanitizedFullPath: string): boolean {
  const inApp = stripExamprepBase(sanitizedFullPath);
  return (
    inApp === routes.settings ||
    inApp.startsWith(routes.pendingAuth) ||
    inApp.startsWith("/admin")
  );
}

/**
 * 登录/注册成功后的跳转目标：已记住题库则进理论首页；return 为选题/设置等待定页则按默认落地。
 */
export function postLoginPathForReturn(
  rawReturn: string | null | undefined,
  selectedBankId: string | null | undefined
): string {
  if (!rawReturn?.trim()) {
    return examprepPath(defaultPostLoginPath(selectedBankId));
  }
  const sanitized = sanitizePostLoginReturn(rawReturn);
  if (isNonExamPrepReturnPath(sanitized) || (selectedBankId && isBanksLandingPath(sanitized))) {
    return examprepPath(defaultPostLoginPath(selectedBankId));
  }
  return sanitized;
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
    "/mock/review": lr.theoryMockReview,
    "/practice/session": lr.theoryPracticeSession,
  };
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];
  if (pathname.startsWith("/practice/") && pathname !== "/practice/session") {
    return lr.theoryHome;
  }
  return null;
}
