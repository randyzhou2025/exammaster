/** 去掉 Python 字符串字面量外的空白（引号内保留，便于 `> 7` 与 `>7` 等价） */
function stripWhitespaceOutsideStrings(source: string): string {
  let result = "";
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      result += ch;
      if (ch === "\\" && i + 1 < source.length) {
        result += source[++i];
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      result += ch;
      continue;
    }
    if (!/\s/.test(ch)) result += ch;
  }
  return result;
}

/** 填空答案规范化后比对 */
export function normalizeCodeFillAnswer(raw: string): string {
  const unified = raw
    .trim()
    .replace(/\u3000/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
  return stripWhitespaceOutsideStrings(unified);
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
