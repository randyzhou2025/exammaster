import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getLevelIdForBank } from "@/data/questionBanks";
import { DEFAULT_LEVEL_ID, levelRoutes } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";

type LevelRouteKey = Exclude<keyof ReturnType<typeof levelRoutes>, "theoryPracticeKind">;

/** 旧扁平书签 → 当前 level 下对应理论/实操路由 */
export function LegacyFlatRedirect({ target }: { target: LevelRouteKey }) {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  const bankId = useAppStore((s) => s.selectedQuestionBankId);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface text-neutral-600">
        加载中…
      </div>
    );
  }

  const levelId = getLevelIdForBank(bankId) ?? DEFAULT_LEVEL_ID;
  return <Navigate to={levelRoutes(levelId)[target]} replace />;
}
