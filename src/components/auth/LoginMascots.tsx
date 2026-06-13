import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import clsx from "clsx";
import { shouldHideEyes, shouldPeek, type MascotFocusField } from "./mascotInteraction";

interface LoginMascotsProps {
  focusField: MascotFocusField;
  passwordVisible: boolean;
}

type EyeTone = "dark" | "light";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function useMascotLook(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setLook = (x: number, y: number) => {
      el.style.setProperty("--look-x", `${x}px`);
      el.style.setProperty("--look-y", `${y}px`);
    };

    setLook(0, 0);

    const onMove = (event: PointerEvent) => {
      if (reduceMotion.matches) return;

      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width * 0.56) / (rect.width * 0.5);
      const dy = (event.clientY - rect.top - rect.height * 0.46) / (rect.height * 0.45);
      setLook(clamp(dx, -1, 1) * 5, clamp(dy, -1, 1) * 4);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [ref]);
}

function EyePair({
  className,
  hidden,
  tone,
  small = false,
}: {
  className: string;
  hidden: boolean;
  tone: EyeTone;
  small?: boolean;
}) {
  const lineClassName = tone === "light" ? "bg-white/90" : "bg-[#111315]";

  if (hidden) {
    return (
      <div className={clsx("absolute flex items-center", small ? "gap-3" : "gap-3.5", className)}>
        <span className={clsx("block h-[3px] rounded-full", lineClassName, small ? "w-3.5" : "w-5")} />
        <span className={clsx("block h-[3px] rounded-full", lineClassName, small ? "w-3.5" : "w-5")} />
      </div>
    );
  }

  if (tone === "light") {
    return (
      <div className={clsx("absolute flex items-center", small ? "gap-3" : "gap-3.5", className)}>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={clsx(
              "relative block rounded-full bg-white shadow-[0_1px_0_rgba(0,0,0,0.12)]",
              small ? "h-3.5 w-3.5" : "h-[18px] w-[18px]"
            )}
          >
            <span
              className={clsx(
                "absolute rounded-full bg-[#111315] transition-transform duration-100 ease-out",
                small ? "left-[5px] top-[5px] h-1.5 w-1.5" : "left-[6px] top-[6px] h-2 w-2"
              )}
              style={{ transform: "translate(var(--look-x, 0px), var(--look-y, 0px))" }}
            />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={clsx("absolute flex items-center", small ? "gap-5" : "gap-7", className)}>
      {[0, 1].map((i) => (
        <span
          key={i}
          className={clsx(
            "block rounded-full bg-[#111315] transition-transform duration-100 ease-out",
            small ? "h-2 w-2" : "h-2.5 w-2.5"
          )}
          style={{ transform: "translate(var(--look-x, 0px), var(--look-y, 0px))" }}
        />
      ))}
    </div>
  );
}

export function LoginMascots({ focusField, passwordVisible }: LoginMascotsProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const hidden = shouldHideEyes(focusField, passwordVisible);
  const peek = shouldPeek(focusField);
  const focusLookX = hidden ? "0px" : peek ? "4px" : "0px";
  const focusLookY = hidden ? "0px" : peek ? "-1px" : "0px";

  useMascotLook(sceneRef);

  return (
    <div
      ref={sceneRef}
      className={clsx(
        "relative mx-auto h-full min-h-[9rem] w-full max-w-[34rem] touch-none select-none overflow-hidden",
        hidden && "[--look-x:0px] [--look-y:0px]"
      )}
      style={
        {
          "--look-x": focusLookX,
          "--look-y": focusLookY,
        } as CSSProperties
      }
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_26%,rgba(255,255,255,0.08),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_42%)]" />
      <div
        className={clsx(
          "absolute bottom-[10%] left-[4%] z-10 h-[30%] w-[34%] rounded-t-full bg-[#ef604d] shadow-[inset_0_0_0_2px_rgba(17,19,21,0.16),0_18px_34px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-out",
          peek && "translate-y-[-4%]",
          hidden && "translate-y-[3%]"
        )}
      >
        <EyePair className="left-[34%] top-[50%]" hidden={hidden} small tone="dark" />
      </div>

      <div
        className={clsx(
          "absolute bottom-[10%] left-[28%] z-20 h-[62%] w-[29%] origin-bottom rounded-t-[18px] bg-[#4d20e8] shadow-[inset_0_0_0_2px_rgba(17,19,21,0.2),0_20px_38px_rgba(0,0,0,0.22)] transition-transform duration-500 ease-out",
          peek && "translate-y-[-8%]",
          hidden && "translate-y-[4%]"
        )}
        style={{
          transform: `${peek ? "translateY(-8%) " : hidden ? "translateY(4%) " : ""}skewX(-10deg) rotate(1deg)`,
        }}
      >
        <div className="absolute inset-x-[6%] top-[2%] h-5 rounded-t-[14px] bg-white/[0.08]" />
        <EyePair className="left-[35%] top-[24%]" hidden={hidden} tone="light" />
      </div>

      <div
        className={clsx(
          "absolute bottom-[10%] left-[46%] z-30 h-[44%] w-[18%] origin-bottom rounded-t-[12px] bg-[#111315] shadow-[0_18px_30px_rgba(0,0,0,0.24)] transition-transform duration-500 ease-out",
          hidden && "translate-y-[5%]"
        )}
        style={{
          transform: `${hidden ? "translateY(5%) " : ""}skewX(-2deg) rotate(1deg)`,
        }}
      >
        <EyePair className="left-[23%] top-[24%]" hidden={hidden} small tone="light" />
      </div>

      <div
        className={clsx(
          "absolute bottom-[10%] left-[56%] z-40 h-[38%] w-[27%] rounded-t-full bg-[#cfc238] shadow-[inset_0_0_0_2px_rgba(17,19,21,0.14),0_18px_30px_rgba(0,0,0,0.18)] transition-transform duration-500 ease-out",
          peek && "translate-x-[3%]",
          hidden && "translate-x-[5%] translate-y-[2%]"
        )}
      >
        <EyePair className="left-[42%] top-[32%]" hidden={hidden} small tone="dark" />
        <span
          className={clsx(
            "absolute left-[39%] top-[56%] block h-[3px] w-[38%] rounded-full bg-[#111315] transition-opacity duration-300",
            hidden && "opacity-45"
          )}
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-50 h-[20%] border-t border-white/10 bg-[#343c45] shadow-[0_-16px_30px_rgba(25,31,38,0.18)]" />
    </div>
  );
}
