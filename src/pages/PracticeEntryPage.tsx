import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLevelRoutes } from "@/hooks/useLevelRoutes";

/** /practice/:kind 入口：错题/收藏跳转错题本（兼容旧链接） */
export function PracticeEntryPage() {
  const { kind } = useParams<{ kind?: string }>();
  const nav = useNavigate();
  const { levelId, routes: lr } = useLevelRoutes();

  useEffect(() => {
    const redirect: Record<string, string> = {
      wrong: lr.theoryWrongBook,
      favorite: `${lr.theoryWrongBook}?tab=favorite`,
    };
    const path = kind ? redirect[kind] : undefined;
    if (!path) {
      nav(lr.theoryHome, { replace: true });
      return;
    }
    nav(path, { replace: true });
  }, [kind, nav, levelId, lr.theoryHome, lr.theoryWrongBook]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-neutral-500">正在打开…</div>
  );
}
