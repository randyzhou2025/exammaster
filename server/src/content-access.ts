import type { UserRow } from "./db/schema.js";
import { hasExamAccess } from "./user-access.js";
import { isTrialModeEnabled, TRIAL_CODE_FILL_LIMIT, TRIAL_JUDGMENT_LIMIT } from "./trial-config.js";

export type ContentAccess = "full" | "trial" | "blocked";

export interface TypeEntitlement {
  allowed: number;
  total: number;
}

export interface ContentEntitlements {
  contentAccess: ContentAccess;
  trialModeEnabled: boolean;
  theory: {
    judgment: TypeEntitlement;
    single: TypeEntitlement;
    multiple: TypeEntitlement;
  };
  operate: TypeEntitlement;
  mockExam: boolean;
}

interface Counts {
  judgment: number;
  single: number;
  multiple: number;
  operate: number;
}

export function resolveContentAccess(user: Pick<UserRow, "role" | "isAuthorized" | "subscriptionExpiresOn">): ContentAccess {
  if (user.role === "admin") return "full";
  if (hasExamAccess(user)) return "full";
  if (isTrialModeEnabled()) return "trial";
  return "blocked";
}

export function buildEntitlements(
  access: ContentAccess,
  counts: Counts,
  operateEnabled: boolean
): ContentEntitlements {
  const trialModeEnabled = isTrialModeEnabled();
  if (access === "full") {
    return {
      contentAccess: "full",
      trialModeEnabled,
      theory: {
        judgment: { allowed: counts.judgment, total: counts.judgment },
        single: { allowed: counts.single, total: counts.single },
        multiple: { allowed: counts.multiple, total: counts.multiple },
      },
      operate: {
        allowed: operateEnabled ? counts.operate : 0,
        total: operateEnabled ? counts.operate : 0,
      },
      mockExam: true,
    };
  }
  if (access === "trial") {
    const jTotal = counts.judgment;
    const jAllowed = Math.min(TRIAL_JUDGMENT_LIMIT, jTotal);
    return {
      contentAccess: "trial",
      trialModeEnabled,
      theory: {
        judgment: { allowed: jAllowed, total: jTotal },
        single: { allowed: 0, total: counts.single },
        multiple: { allowed: 0, total: counts.multiple },
      },
      operate: {
        allowed: operateEnabled ? Math.min(TRIAL_CODE_FILL_LIMIT, counts.operate) : 0,
        total: operateEnabled ? counts.operate : 0,
      },
      mockExam: false,
    };
  }
  return {
    contentAccess: "blocked",
    trialModeEnabled,
    theory: {
      judgment: { allowed: 0, total: counts.judgment },
      single: { allowed: 0, total: counts.single },
      multiple: { allowed: 0, total: counts.multiple },
    },
    operate: { allowed: 0, total: operateEnabled ? counts.operate : 0 },
    mockExam: false,
  };
}
