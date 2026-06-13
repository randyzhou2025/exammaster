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

export interface TheoryBankResponse {
  bankId: string;
  contentAccess: ContentAccess;
  entitlements: ContentEntitlements;
  version: string;
  questions: import("@/types/exam").Question[];
}

export interface CodeFillBankResponse {
  bankId: string;
  contentAccess: ContentAccess;
  entitlements: ContentEntitlements;
  version: string;
  questions: import("@/types/codeFill").CodeFillQuestion[];
}
