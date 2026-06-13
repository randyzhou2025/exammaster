import type { ContentAccess } from "@/types/contentAccess";

const PREFIX = "exam-bank-cache:";

function cacheKey(kind: "theory" | "code-fill", bankId: string, access: ContentAccess, version: string) {
  return `${PREFIX}${kind}:${bankId}:${access}:${version}`;
}

export function readBankSessionCache<T>(
  kind: "theory" | "code-fill",
  bankId: string,
  access: ContentAccess,
  version: string
): T | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(kind, bankId, access, version));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeBankSessionCache<T>(
  kind: "theory" | "code-fill",
  bankId: string,
  access: ContentAccess,
  version: string,
  payload: T
): void {
  try {
    sessionStorage.setItem(cacheKey(kind, bankId, access, version), JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function clearBankSessionCache(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
