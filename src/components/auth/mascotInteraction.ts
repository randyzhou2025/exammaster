export type MascotFocusField = "none" | "email" | "password" | "text";

export interface Pointer {
  x: number;
  y: number;
}

/** 瞳孔相对眼白中心的偏移（限制在半径内） */
export function pupilOffset(
  eyeCenter: Pointer,
  pointer: Pointer,
  maxRadius: number
): { x: number; y: number } {
  const dx = pointer.x - eyeCenter.x;
  const dy = pointer.y - eyeCenter.y;
  const dist = Math.hypot(dx, dy) || 1;
  const scale = Math.min(maxRadius, dist * 0.08);
  return {
    x: (dx / dist) * scale,
    y: (dy / dist) * scale,
  };
}

export function shouldHideEyes(focusField: MascotFocusField, passwordVisible: boolean): boolean {
  return focusField === "password" && !passwordVisible;
}

export function shouldPeek(focusField: MascotFocusField): boolean {
  return focusField === "email" || focusField === "text";
}
