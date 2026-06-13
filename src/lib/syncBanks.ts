import type { CodeFillQuestion } from "@/types/codeFill";
import type { Question } from "@/types/exam";
import type { ContentAccess, ContentEntitlements } from "@/types/contentAccess";
import { loadLocalCodeFillBank, loadLocalTheoryBank } from "@/data/loadLocalBanks";
import { fetchCodeFillBankApi, fetchTheoryBankApi } from "@/lib/bankApi";
import { readBankSessionCache, writeBankSessionCache, clearBankSessionCache } from "@/lib/bankSessionCache";
import { useLocalBanks } from "@/lib/useLocalBanks";
import { getQuestionBankMeta } from "@/data/questionBanks";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { useCodeFillStore } from "@/stores/codeFillStore";

async function localEntitlements(bankId: string): Promise<ContentEntitlements> {
  const theory = await loadLocalTheoryBank(bankId);
  const j = theory.filter((q) => q.type === "judgment").length;
  const s = theory.filter((q) => q.type === "single").length;
  const m = theory.filter((q) => q.type === "multiple").length;
  const meta = getQuestionBankMeta(bankId);
  const codeFill = meta?.operate !== false ? await loadLocalCodeFillBank() : [];
  return {
    contentAccess: "full",
    trialModeEnabled: false,
    theory: {
      judgment: { allowed: j, total: j },
      single: { allowed: s, total: s },
      multiple: { allowed: m, total: m },
    },
    operate: { allowed: codeFill.length, total: codeFill.length },
    mockExam: true,
  };
}

export async function syncBanksForUser(opts: {
  bankId: string;
  token: string;
  contentAccess: ContentAccess;
}): Promise<{ entitlements: ContentEntitlements; theoryVersion: string }> {
  const { bankId, token } = opts;

  if (useLocalBanks()) {
    const theory = await loadLocalTheoryBank(bankId);
    const entitlements = await localEntitlements(bankId);
    useAppStore.getState().setBank(theory);
    useAppStore.getState().setBankMeta({ version: "local", entitlements });
    const codeBank =
      getQuestionBankMeta(bankId)?.operate !== false ? await loadLocalCodeFillBank() : [];
    useCodeFillStore.getState().setBank(codeBank);
    return { entitlements, theoryVersion: "local" };
  }

  const theoryRes = await fetchTheoryBankApi(bankId, token);
  const cached = readBankSessionCache<Question[]>(
    "theory",
    bankId,
    theoryRes.contentAccess,
    theoryRes.version
  );
  const theoryQuestions = cached ?? theoryRes.questions;
  if (!cached) {
    writeBankSessionCache("theory", bankId, theoryRes.contentAccess, theoryRes.version, theoryQuestions);
  }
  useAppStore.getState().setBank(theoryQuestions);
  useAppStore.getState().setBankMeta({ version: theoryRes.version, entitlements: theoryRes.entitlements });

  if (getQuestionBankMeta(bankId)?.operate !== false) {
    const codeRes = await fetchCodeFillBankApi(bankId, token);
    const codeCached = readBankSessionCache<CodeFillQuestion[]>(
      "code-fill",
      bankId,
      codeRes.contentAccess,
      codeRes.version
    );
    const codeQuestions = codeCached ?? codeRes.questions;
    if (!codeCached) {
      writeBankSessionCache("code-fill", bankId, codeRes.contentAccess, codeRes.version, codeQuestions);
    }
    useCodeFillStore.getState().setBank(codeQuestions);
  } else {
    useCodeFillStore.getState().setBank([]);
  }

  return { entitlements: theoryRes.entitlements, theoryVersion: theoryRes.version };
}

export function clearSyncedBanks(): void {
  useAppStore.getState().setBank([]);
  useAppStore.getState().setBankMeta(null);
  useCodeFillStore.getState().setBank([]);
}

/** 设置页「更新最新题库」：清 session 缓存后重拉 */
export async function refreshBanksFromServer(bankId: string, token: string): Promise<void> {
  clearBankSessionCache();
  const user = useAuthStore.getState().user;
  const access = user?.contentAccess ?? "full";
  await syncBanksForUser({ bankId, token, contentAccess: access });
}
