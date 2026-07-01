/**
 * PrismGlowCard — Calculator Studio "prism-glow-*" card wrapper.
 *
 * Wraps the 5 PRISM glow-color classes (cyan/violet/emerald/amber/red) as a
 * typed React component. Every page that needs a state-bearing or focusable
 * card surface uses this instead of hand-typing `prism-glow-cyan` strings.
 *
 * CSS source: `web/src/index.css` lines 3673-3683 (.prism-glow-{cyan,amber,
 * emerald,red,violet}). Visual contract: dark vertical gradient + colored
 * border + soft outer glow; hover increases border opacity + glow.
 *
 * Quebec /goal-loop 2026-05-26 / U-Q-PRISM-PRIMITIVES.
 */
import type { CSSProperties, ReactNode } from "react";

export type PrismGlowColor = "cyan" | "violet" | "emerald" | "amber" | "red";

interface Props {
  color?: PrismGlowColor;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "aside";
  /**
   * Adds the rounded inner border + dark-translucent background that
   * Calculator Studio uses on top-level pane wrappers. Default true; set
   * false for nested cards that should NOT double the chrome.
   */
  withChrome?: boolean;
  /**
   * ARIA role / labelling. Pages render a card containing actionable content
   * pass role="region" + aria-label.
   */
  role?: string;
  "aria-label"?: string;
}

export function PrismGlowCard({
  color = "cyan",
  children,
  className,
  style,
  as = "div",
  withChrome = true,
  role,
  "aria-label": ariaLabel,
}: Props) {
  const Tag = as;
  const cls = [
    `prism-glow-${color}`,
    withChrome ? "border rounded-2xl px-5 py-4 backdrop-blur-sm" : "border rounded-xl px-3 py-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} style={style} role={role} aria-label={ariaLabel}>
      {children}
    </Tag>
  );
}
