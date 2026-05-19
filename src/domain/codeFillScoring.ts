/** 填空答案规范化后比对 */
export function normalizeCodeFillAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ");
}

export function isCodeFillBlankCorrect(user: string, accepted: string[]): boolean {
  const u = normalizeCodeFillAnswer(user);
  if (!u) return false;
  return accepted.some((a) => normalizeCodeFillAnswer(a) === u);
}

export function gradeCodeFillQuestion(
  blanks: { id: string; accepted: string[] }[],
  answers: Record<string, string>
): { allCorrect: boolean; results: Record<string, boolean> } {
  const results: Record<string, boolean> = {};
  let allCorrect = true;
  for (const b of blanks) {
    const ok = isCodeFillBlankCorrect(answers[b.id] ?? "", b.accepted);
    results[b.id] = ok;
    if (!ok) allCorrect = false;
  }
  return { allCorrect, results };
}
