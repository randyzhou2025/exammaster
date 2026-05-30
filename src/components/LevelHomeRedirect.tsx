import { Navigate, useParams } from "react-router-dom";
import { isKnownLevelId } from "@/data/questionBanks";
import { levelRoutes, routes } from "@/lib/routes";

/** /AITrainer/:levelId → /AITrainer/:levelId/theory */
export function LevelHomeRedirect() {
  const { levelId } = useParams<{ levelId: string }>();
  if (!levelId || !isKnownLevelId(levelId)) {
    return <Navigate to={routes.banks} replace />;
  }
  return <Navigate to={levelRoutes(levelId).theoryHome} replace />;
}
