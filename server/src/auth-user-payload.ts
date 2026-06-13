import type { UserRow } from "./db/schema.js";
import { buildEntitlements, resolveContentAccess, type ContentEntitlements } from "./content-access.js";
import { countTheoryByType, loadCodeFillBank, loadTheoryBank } from "./bank-loader.js";

function publicUserBase(u: {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: Date;
  subscriptionExpiresOn?: Date | string | null;
}) {
  const expires =
    u.subscriptionExpiresOn == null
      ? null
      : typeof u.subscriptionExpiresOn === "string"
        ? u.subscriptionExpiresOn.slice(0, 10)
        : u.subscriptionExpiresOn.toISOString().slice(0, 10);
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    isAuthorized: u.isAuthorized,
    createdAt: u.createdAt.toISOString(),
    subscriptionExpiresOn: expires,
  };
}

/** /me 与登录响应：附带 contentAccess（entitlements 以三级题为摘要） */
export function buildAuthUserPayload(
  u: Pick<
    UserRow,
    "id" | "email" | "displayName" | "role" | "isAuthorized" | "createdAt" | "subscriptionExpiresOn"
  >
): {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isAuthorized: boolean;
  createdAt: string;
  subscriptionExpiresOn: string | null;
  contentAccess: ReturnType<typeof resolveContentAccess>;
  entitlements: ContentEntitlements;
} {
  const access = resolveContentAccess(u);
  const theory = loadTheoryBank("ai-trainer-l3");
  const typeCounts = countTheoryByType(theory);
  const operate = loadCodeFillBank("ai-trainer-l3");
  const entitlements = buildEntitlements(access, { ...typeCounts, operate: operate.length }, true);
  return {
    ...publicUserBase(u),
    contentAccess: access,
    entitlements,
  };
}
