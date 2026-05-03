import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";

/** 需已选择题库后再进入首页与做题相关路由；依赖 persist 完成再判定，避免误判闪屏 */
export function RequireQuestionBank() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  const selectedQuestionBankId = useAppStore((s) => s.selectedQuestionBankId);

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

  if (!selectedQuestionBankId) {
    return <Navigate to="/banks" replace />;
  }

  return <Outlet />;
}
