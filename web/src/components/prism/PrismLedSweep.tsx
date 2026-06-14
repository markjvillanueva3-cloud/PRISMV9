/**
 * PrismLedSweep — Calculator Studio "prism-led-sweep" animated highlight.
 *
 * The diagonal white-band sweep that runs across an element on a 5.8s loop.
 * Used as a subtle "this thing is active / live / streaming" affordance — NOT
 * a loading spinner (Suspense fallbacks handle that). Calculator Studio uses
 * it on toolbar brand marks, live-status borders, and tracked-job rows.
 *
 * CSS source: web/src/index.css line 3670 (.prism-led-sweep).
 *
 * Wraps the inner content in a positioned container; the sweep is
 * absolutely-positioned + pointer-events-none so it never blocks
 * interaction. Honors prefers-reduced-motion via the existing reduced-motion
 * CSS hook in index.css.
 *
 * Quebec /goal-loop 2026-05-26 / U-Q-PRISM-PRIMITIVES.
 */
import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  className?: string;
  /**
   * When false, render the children but omit the sweep band — used to toggle
   * the animation off without unmounting the surrounding chrome. Honors a
   * page's own "is this thing actually live?" condition.
   */
  active?: boolean;
}

export function PrismLedSweep({ children, className, active = true }: Props) {
  const cls = ["relative overflow-hidden", className].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      {children}
      {active ? <span className="prism-led-sweep" aria-hidden="true" /> : null}
    </span>
  );
}
