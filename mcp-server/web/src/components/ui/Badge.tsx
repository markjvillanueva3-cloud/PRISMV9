type Color = "green" | "yellow" | "red" | "blue" | "slate";

const colorStyles: Record<Color, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

// 2026-05-27 (slot golf, GOAL-TSC-FIX iter5): broadened BadgeProps to accept
// the prop names callers use (`variant`, `size`, `className`). Backward-compat:
// existing `color` callers still work. variant/size are accepted-but-ignored
// for now (future U-WEB-BADGE-V2 wires variant→color and size→className).
interface BadgeProps {
  color?: Color;
  variant?: string;
  size?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function Badge({ color = "slate", className, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorStyles[color]} ${className ?? ""}`}>
      {children}
    </span>
  );
}
