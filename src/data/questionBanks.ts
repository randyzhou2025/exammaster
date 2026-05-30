/** 题库目录与模考配置 */

export const DEFAULT_QUESTION_BANK_ID = "ai-trainer-l3";

export type ExamTemplateId = "l3" | "l4";

export interface ExamTemplateSection {
  type: "judgment" | "single" | "multiple";
  count: number;
  score: number;
  perScore: number;
}

export interface ExamTemplate {
  id: ExamTemplateId;
  totalScore: number;
  passScore: number;
  durationMinutes: number;
  sections: ExamTemplateSection[];
}

/** 三级官方模考：190 题 / 60 分钟 */
export const EXAM_TEMPLATE_L3: ExamTemplate = {
  id: "l3",
  totalScore: 100,
  passScore: 60,
  durationMinutes: 60,
  sections: [
    { type: "judgment", count: 40, score: 20, perScore: 0.5 },
    { type: "single", count: 140, score: 70, perScore: 0.5 },
    { type: "multiple", count: 10, score: 10, perScore: 1 },
  ],
};

/** 四级官方模考：200 题 / 90 分钟（无多选） */
export const EXAM_TEMPLATE_L4: ExamTemplate = {
  id: "l4",
  totalScore: 100,
  passScore: 60,
  durationMinutes: 90,
  sections: [
    { type: "judgment", count: 50, score: 25, perScore: 0.5 },
    { type: "single", count: 150, score: 75, perScore: 0.5 },
  ],
};

export const EXAM_TEMPLATES: Record<ExamTemplateId, ExamTemplate> = {
  l3: EXAM_TEMPLATE_L3,
  l4: EXAM_TEMPLATE_L4,
};

export interface QuestionBankMeta {
  id: string;
  title: string;
  subtitle: string;
  /** 首页展示用，如「三级」「四级」 */
  levelLabel: string;
  examTemplateId: ExamTemplateId;
  /** 是否开放实操代码填空 */
  operate: boolean;
}

export const QUESTION_BANKS: QuestionBankMeta[] = [
  {
    id: "ai-trainer-l3",
    title: "人工智能训练师（3级）",
    subtitle: "理论知识 900 题 · 含 Python 实操填空 20 题",
    levelLabel: "三级",
    examTemplateId: "l3",
    operate: true,
  },
  {
    id: "ai-trainer-l4",
    title: "人工智能训练师（4级）",
    subtitle: "理论知识 750 题 · 暂无实操练习",
    levelLabel: "四级",
    examTemplateId: "l4",
    operate: false,
  },
];

export function getQuestionBankMeta(id: string | null | undefined): QuestionBankMeta | undefined {
  if (!id) return undefined;
  return QUESTION_BANKS.find((b) => b.id === id);
}

export function getExamTemplateForBank(bankId: string | null | undefined): ExamTemplate {
  const meta = getQuestionBankMeta(bankId);
  return EXAM_TEMPLATES[meta?.examTemplateId ?? "l3"];
}

export function formatExamTemplateSummary(template: ExamTemplate): string {
  const parts = template.sections.map((s) => {
    const label = s.type === "judgment" ? "判断" : s.type === "single" ? "单选" : "多选";
    return `${label} ${s.count}×${s.perScore}`;
  });
  const totalQ = template.sections.reduce((n, s) => n + s.count, 0);
  return `${totalQ} 题 / ${template.durationMinutes} 分 · ${parts.join(" + ")}`;
}
