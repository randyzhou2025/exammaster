import type { ReactNode } from "react";
import clsx from "clsx";

/** 勿加 `g`：全局正则在连续 `.test()` 时会因 lastIndex 错位，导致部分空位不渲染输入框 */
const BLANK_SPLIT = /_{5,}/;

const LINE_CLASS =
  "max-w-full font-mono text-[13px] text-neutral-800";

/** 含填空：单行展示，过长时横向滑动，避免 (X) 等后缀被 flex-wrap 挤到下一行 */
const BLANK_ROW_CLASS =
  "flex max-w-full flex-nowrap items-baseline gap-x-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]";

const TEXT_SEGMENT_CLASS = "shrink-0 whitespace-pre";

const INPUT_CLASS =
  "box-border min-w-[5rem] max-w-[14rem] shrink-0 rounded border bg-white px-1.5 py-0.5 font-mono text-[13px] leading-normal";

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
        <span key={`t-${i}`} className={TEXT_SEGMENT_CLASS}>
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
      const inputSize = Math.max(8, Math.min(28, Math.max(val.length, 8) + 1));
      nodes.push(
        <input
          key={blank.id}
          type="text"
          size={inputSize}
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
