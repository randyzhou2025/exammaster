import clsx from "clsx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={clsx(
        "inline-flex rounded-full bg-white/20 p-0.5 ring-1 ring-white/30 backdrop-blur-sm",
        className
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx(
              "min-h-[36px] min-w-[96px] rounded-full px-4 text-sm font-medium transition-colors",
              active ? "bg-white text-brand shadow-sm" : "text-white/90 hover:bg-white/10"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
