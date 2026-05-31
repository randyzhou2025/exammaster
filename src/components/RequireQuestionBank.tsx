import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { getBankIdForLevel, isKnownLevelId } from "@/data/questionBanks";
import { routes } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";

/** 需已选择题库后再进入首页与做题相关路由；URL :levelId 与 store 双向对齐 */
export function RequireQuestionBank() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  const { levelId } = useParams<{ levelId?: string }>();
  const selectedQuestionBankId = useAppStore((s) => s.selectedQuestionBankId);
  const setSelectedQuestionBankId = useAppStore((s) => s.setSelectedQuestionBankId);
  const lastSyncedBankIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const bankIdFromUrl = levelId && isKnownLevelId(levelId) ? getBankIdForLevel(levelId) : undefined;

  useEffect(() => {
    if (!hydrated || !bankIdFromUrl) return;
    if (selectedQuestionBankId === bankIdFromUrl) {
      lastSyncedBankIdRef.current = bankIdFromUrl;
      return;
    }
    if (lastSyncedBankIdRef.current === bankIdFromUrl) return;
    lastSyncedBankIdRef.current = bankIdFromUrl;
    setSelectedQuestionBankId(bankIdFromUrl);
  }, [hydrated, bankIdFromUrl, selectedQuestionBankId, setSelectedQuestionBankId]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  if (levelId && !isKnownLevelId(levelId)) {
    return <Navigate to={routes.banks} replace />;
  }

  if (!selectedQuestionBankId) {
    return <Navigate to={routes.banks} replace />;
  }

  return <Outlet />;
}
