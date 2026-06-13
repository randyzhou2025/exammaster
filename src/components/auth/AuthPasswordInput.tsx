import { useState } from "react";
import clsx from "clsx";
import { useAuthMascot, useMascotFieldHandlers } from "@/components/AuthShell";

const inputClassName =
  "mt-1.5 w-full rounded-full border border-neutral-200/90 bg-white px-4 py-3.5 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#26324f] focus:bg-white focus:shadow-[0_0_0_3px_rgba(38,50,79,0.12)]";

export function AuthPasswordInput({
  value,
  onChange,
  autoComplete,
  minLength,
  required = true,
  label = "密码",
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const { setPasswordVisible } = useAuthMascot();
  const handlers = useMascotFieldHandlers("password");

  const toggleVisible = () => {
    setVisible((v) => {
      const next = !v;
      setPasswordVisible(next);
      return next;
    });
  };

  return (
    <label className="block text-[13px] font-medium text-neutral-600">
      {label}
      <div className="relative mt-1.5">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(inputClassName, "mt-0 pr-11")}
          onFocus={() => {
            handlers.onFocus();
            setPasswordVisible(visible);
          }}
          onBlur={handlers.onBlur}
        />
        <button
          type="button"
          aria-label={visible ? "隐藏密码" : "显示密码"}
          className="absolute right-1 top-1/2 flex h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition hover:text-neutral-700 active:bg-neutral-100"
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleVisible}
        >
          {visible ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 3l18 18M10.58 10.58A2 2 0 0012 15a2 2 0 001.42-3.42M9.88 4.24A10.94 10.94 0 0112 5c5 0 9.27 3.11 10 7-.46 2.53-2.13 4.66-4.38 5.88M6.11 6.11A10.98 10.98 0 003 12c.73 3.89 5 7 10 7 1.05 0 2.05-.14 3-.4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}

export { inputClassName };
