import type { Question } from "@/types/exam";

/** 演示用子集 — 不足以开考 190，用于练习流与 UI 验证 */
export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "j1",
    type: "judgment",
    stem: "深度学习是机器学习的子领域。",
    options: [
      { key: "A", text: "正确" },
      { key: "B", text: "错误" },
    ],
    answer: "A",
    explanation: "深度学习使用多层神经网络，属于机器学习范畴。",
    tip: "神经网络多层 → 深度学习。",
  },
  {
    id: "j2",
    type: "judgment",
    stem: "训练数据越多，模型一定越准确。",
    options: [
      { key: "A", text: "正确" },
      { key: "B", text: "错误" },
    ],
    answer: "B",
    explanation: "数据质量、任务难度、模型与正则等都会影响效果，并非单调递增。",
  },
  {
    id: "s1",
    type: "single",
    stem: "下列哪项通常用于缓解过拟合？",
    options: [
      { key: "A", text: "增加模型复杂度" },
      { key: "B", text: "Dropout / 正则化" },
      { key: "C", text: "在测试集上调参" },
      { key: "D", text: "删除验证集" },
    ],
    answer: "B",
    explanation: "正则化、Dropout、早停、数据增强等常用于抑制过拟合。",
  },
  {
    id: "s2",
    type: "single",
    stem: "交叉验证的主要目的是？",
    options: [
      { key: "A", text: "加快训练速度" },
      { key: "B", text: "更稳健地估计泛化性能" },
      { key: "C", text: "减少参数数量" },
      { key: "D", text: "替代反向传播" },
    ],
    answer: "B",
    explanation: "K 折交叉验证通过多次划分训练/验证，降低偶然划分带来的评估方差。",
  },
  {
    id: "m1",
    type: "multiple",
    stem: "属于无监督学习常见任务的有？（多选）",
    options: [
      { key: "A", text: "聚类" },
      { key: "B", text: "降维" },
      { key: "C", text: "图像分类（有标签）" },
      { key: "D", text: "异常检测（仅正常样本训练）" },
    ],
    answer: ["A", "B", "D"],
    explanation: "有标签的分类属于监督学习；聚类、降维、一类异常检测常归为无监督或弱监督场景。",
    tip: "看有没有「标准答案标签」。",
  },
  {
    id: "m2",
    type: "multiple",
    stem: "模型部署前建议完成的工作包括？（多选）",
    options: [
      { key: "A", text: "离线评估与基线对比" },
      { key: "B", text: "监控与回滚预案" },
      { key: "C", text: "仅在训练集上报告准确率" },
      { key: "D", text: "数据与模型版本管理" },
    ],
    answer: ["A", "B", "D"],
    explanation: "需独立测试集/验证集与线上指标；版本与运维保障是工程化关键。",
  },
];
