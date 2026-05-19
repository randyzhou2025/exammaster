export interface CodeFillBlank {
  id: string;
  accepted: string[];
}

export interface CodeFillCell {
  cellIndex: number;
  source: string;
  lines: string[];
  blanks: CodeFillBlank[];
}

export interface CodeFillQuestion {
  id: string;
  title: string;
  stem: string;
  cells: CodeFillCell[];
  meta: {
    examId: string;
    levelId: string;
    blankCount: number;
    cellCount: number;
  };
}

export type CodeFillPracticeMode = "sequential" | "random" | "pick";

export interface CodeFillQuestionProgress {
  /** 检查答案且全对 */
  completed: boolean;
  answers: Record<string, string>;
  /** 显示答案后仍须检查才算完成 */
  revealed?: boolean;
  lastCheckedAt?: number;
}
