import { useParams } from "react-router-dom";
import { getLevelIdForBank } from "@/data/questionBanks";
import { DEFAULT_LEVEL_ID, levelRoutes } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";

/** 当前备考域路由：优先 URL 的 :levelId，否则按已选题库推断 */
export function useLevelRoutes() {
  const { levelId: paramLevelId } = useParams<{ levelId?: string }>();
  const bankId = useAppStore((s) => s.selectedQuestionBankId);
  const levelId = paramLevelId ?? getLevelIdForBank(bankId) ?? DEFAULT_LEVEL_ID;
  return { levelId, routes: levelRoutes(levelId) };
}
