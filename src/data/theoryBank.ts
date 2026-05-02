import type { Question } from "@/types/exam";
import raw from "./theoryBank.json";

/** 人工智能训练师（三级）理论知识复习题库（自 PDF 导入） */
export const THEORY_BANK = raw as Question[];
