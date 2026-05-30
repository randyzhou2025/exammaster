import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { defaultPostLoginPath } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";

/** 根路径 / 404 等：按已选题库跳到对应 level 理论首页，否则去选题 */
export function DefaultTheoryRedirect() {
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

  return <Navigate to={defaultPostLoginPath(bankId)} replace />;
}
