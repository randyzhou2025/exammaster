/** 试用模式总开关；false 时行为接近现网（注册即全量、API 返回全量） */
export function isTrialModeEnabled(): boolean {
  return process.env.TRIAL_MODE_ENABLED === "true";
}

export const TRIAL_JUDGMENT_LIMIT = 100;
export const TRIAL_CODE_FILL_LIMIT = 1;

export const KNOWN_BANK_IDS = ["ai-trainer-l3", "ai-trainer-l4", "fmo-live-l3", "fmo-traffic-l3", "fmo-av-l3"] as const;
export type KnownBankId = (typeof KNOWN_BANK_IDS)[number];

export function isKnownBankId(id: string): id is KnownBankId {
  return (KNOWN_BANK_IDS as readonly string[]).includes(id);
}
