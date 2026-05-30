import type { Question } from "@/types/exam";
import { THEORY_BANK } from "./theoryBank";
import { THEORY_BANK_L4 } from "./theoryBankL4";
import { DEFAULT_QUESTION_BANK_ID, QUESTION_BANKS } from "./questionBanks";

export function resolveTheoryBank(bankId: string | null | undefined): Question[] {
  switch (bankId) {
    case "ai-trainer-l4":
      return THEORY_BANK_L4;
    case "ai-trainer-l3":
      return THEORY_BANK;
    default:
      return THEORY_BANK;
  }
}

export function normalizeQuestionBankId(id: string | null | undefined): string {
  if (id && QUESTION_BANKS.some((b) => b.id === id)) return id;
  return DEFAULT_QUESTION_BANK_ID;
}
