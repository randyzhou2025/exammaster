import type { Question, MockExamRecord } from "@/types/exam";

/** 备份文件格式版本，便于以后迁移 */
export const BACKUP_FORMAT_VERSION = 2;

export interface BackupPayload {
  formatVersion: number;
  exportedAt: string;
  /** 本地开发备份可含题库；API 模式导出不含题目正文 */
  bank?: Question[];
  byId: Record<string, unknown>;
  mockHistory: MockExamRecord[];
  prefs: {
    wrongBookAutoRemove: boolean;
  };
}

const DEFAULT_PREFS_IN_BACKUP: BackupPayload["prefs"] = {
  wrongBookAutoRemove: true,
};

export function parseBackupJson(raw: string): BackupPayload | null {
  try {
    const data = JSON.parse(raw) as Partial<BackupPayload>;
    if (!data || typeof data !== "object") return null;
    if (data.bank !== undefined && !Array.isArray(data.bank)) return null;
    if (!data.byId || typeof data.byId !== "object") return null;
    if (!Array.isArray(data.mockHistory)) data.mockHistory = [];
    const prefs: BackupPayload["prefs"] =
      data.prefs && typeof data.prefs === "object"
        ? {
            wrongBookAutoRemove:
              typeof (data.prefs as { wrongBookAutoRemove?: boolean }).wrongBookAutoRemove === "boolean"
                ? (data.prefs as { wrongBookAutoRemove: boolean }).wrongBookAutoRemove
                : DEFAULT_PREFS_IN_BACKUP.wrongBookAutoRemove,
          }
        : DEFAULT_PREFS_IN_BACKUP;
    return {
      formatVersion: typeof data.formatVersion === "number" ? data.formatVersion : BACKUP_FORMAT_VERSION,
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
      ...(Array.isArray(data.bank) ? { bank: data.bank } : {}),
      byId: data.byId as Record<string, unknown>,
      mockHistory: data.mockHistory,
      prefs,
    };
  } catch {
    return null;
  }
}

export function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
