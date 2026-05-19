import { Navigate, useLocation } from "react-router-dom";
import { legacyRedirectTarget } from "@/lib/routes";

/** 旧书签路径重定向到 AITrainer/level3/theory 下对应路由 */
export function LegacyRedirect() {
  const { pathname, search } = useLocation();
  const target = legacyRedirectTarget(pathname);
  if (!target) return <Navigate to="/" replace />;
  return <Navigate to={`${target}${search}`} replace />;
}
