import type { ReactNode } from "react";
import clsx from "clsx";

/** 勿加 `g`：全局正则在连续 `.test()` 时会因 lastIndex 错位，导致部分空位不渲染输入框 */
const BLANK_SPLIT = /_{5,}/;

const LINE_CLASS =
  "max-w-full font-mono text-[13px] text-neutral-800 [overflow-wrap:anywhere] [word-break:break-word]";

const BLANK_ROW_CLASS = "flex flex-wrap items-baseline gap-x-1 gap-y-1";

const INPUT_CLASS =
  "box-border max-w-full min-w-[5rem] rounded border bg-white px-1.5 py-0.5 font-mono text-[13px] leading-normal w-[min(14rem,calc(100%-0.5rem))]";

function lineHasBlank(line: string) {
  return /_{5,}/.test(line);
}

export function CodeFillLine({
  line,
  blanks,
  values,
  results,
  onChange,
  disabled,
}: {
  line: string;
  blanks: { id: string }[];
  values: Record<string, string>;
  results: Record<string, boolean> | null;
  onChange: (blankId: string, value: string) => void;
  disabled?: boolean;
}) {
  if (!lineHasBlank(line)) {
    return (
      <div className={clsx(LINE_CLASS, "whitespace-pre-wrap")}>
        {line || "\u00a0"}
      </div>
    );
  }

  const parts = line.split(BLANK_SPLIT);
  const nodes: ReactNode[] = [];
  let bi = 0;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      nodes.push(
        <span key={`t-${i}`} className="min-w-0 shrink break-words">
          {parts[i]}
        </span>
      );
    }
    if (i < parts.length - 1) {
      const blank = blanks[bi];
      bi++;
      if (!blank) continue;
      const val = values[blank.id] ?? "";
      const graded = results !== null;
      const ok = results?.[blank.id];
      nodes.push(
        <input
          key={blank.id}
          type="text"
          value={val}
          disabled={disabled}
          onChange={(e) => onChange(blank.id, e.target.value)}
          className={clsx(
            INPUT_CLASS,
            graded && ok && "border-emerald-500 bg-emerald-50",
            graded && !ok && "border-red-400 bg-red-50",
            !graded && "border-brand/40 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          )}
          spellCheck={false}
          autoComplete="off"
        />
      );
    }
  }

  return <div className={clsx(LINE_CLASS, BLANK_ROW_CLASS)}>{nodes}</div>;
}
