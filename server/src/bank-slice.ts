import type { ContentAccess } from "./content-access.js";
import { TRIAL_CODE_FILL_LIMIT, TRIAL_JUDGMENT_LIMIT } from "./trial-config.js";
import type { CodeFillQuestion, TheoryQuestion } from "./bank-loader.js";

export function sliceTheoryBank(full: TheoryQuestion[], access: ContentAccess): TheoryQuestion[] {
  if (access === "blocked") return [];
  if (access === "full") return full;
  return full.filter((q) => q.type === "judgment").slice(0, TRIAL_JUDGMENT_LIMIT);
}

export function sliceCodeFillBank(full: CodeFillQuestion[], access: ContentAccess): CodeFillQuestion[] {
  if (access === "blocked") return [];
  if (access === "full") return full;
  return full.slice(0, TRIAL_CODE_FILL_LIMIT);
}
