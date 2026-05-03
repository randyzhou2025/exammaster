import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const REDIRECT: Record<string, string> = {
  wrong: "/wrong-book",
  favorite: "/wrong-book?tab=favorite",
};

/** /practice/:kind 入口：错题/收藏跳转错题本（兼容旧链接） */
export function PracticeEntryPage() {
  const { kind } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    const path = kind ? REDIRECT[kind] : undefined;
    if (!path) {
      nav("/", { replace: true });
      return;
    }
    nav(path, { replace: true });
  }, [kind, nav]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-neutral-500">正在打开…</div>
  );
}
