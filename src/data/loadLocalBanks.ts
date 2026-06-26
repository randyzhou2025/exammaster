import type { CodeFillQuestion } from "@/types/codeFill";
import type { Question } from "@/types/exam";

const LOCAL_BANKS =
  import.meta.env.VITE_USE_LOCAL_BANKS === "true" || import.meta.env.DEV;

/** 仅本地开发 / VITE_USE_LOCAL_BANKS=true 时使用；生产 false 时构建可剔除 JSON chunk */
export async function loadLocalTheoryBank(bankId: string): Promise<Question[]> {
  if (!LOCAL_BANKS) return [];
  switch (bankId) {
    case "ai-trainer-l4":
      return (await import("./theoryBankL4.json")).default as Question[];
    case "fmo-live-l3":
      return (await import("./theoryBankFmoLiveL3.json")).default as Question[];
    case "fmo-traffic-l3":
      return (await import("./theoryBankFmoTrafficL3.json")).default as Question[];
    case "fmo-av-l3":
      return (await import("./theoryBankFmoAvL3.json")).default as Question[];
    case "ai-trainer-l3":
    default:
      return (await import("./theoryBank.json")).default as Question[];
  }
}

export async function loadLocalCodeFillBank(): Promise<CodeFillQuestion[]> {
  if (!LOCAL_BANKS) return [];
  return (await import("./codeFillBank.json")).default as CodeFillQuestion[];
}
