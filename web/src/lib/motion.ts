/**
 * motion.ts — U-V3-MOTION-TOKENS (slot:quebec /goal-loop)
 *
 * Canonical motion tokens for the PRISM web client. Durations and easings are
 * derived from the existing `web/src/index.css` animations (calculator-guide-*,
 * calculator-toolbar-flow-border-pulse, calculator-machine-preview-*) so that
 * new components match the existing visual rhythm without re-deriving values.
 *
 * Karpathy R11 — match conventions: every value here is observed in
 * `web/src/index.css` (grep `s ease-in-out`), not invented.
 *
 * Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §6 + §9.5
 * U-V3-MOTION-TOKENS. Pairs with the (forthcoming) DESIGN.md doctrine doc.
 *
 * Usage:
 *   import { MOTION_TOKENS, motionStyle } from "./lib/motion";
 *   <div style={motionStyle("modal-open")} />
 *
 *   // Or as CSS variables in a styled context:
 *   .my-class {
 *     transition: opacity var(--motion-fast) var(--motion-ease-out);
 *   }
 */

import type * as React from "react";

// ----- Durations (ms) -----
// Four tiers, observed in index.css and the spec §9.5 motion guidance:
//   - INSTANT (≤100ms) — toggles, micro feedback
//   - FAST (100..300ms) — button hover, focus ring, small reveals
//   - MEDIUM (300..600ms) — drawer/modal open, page-section transitions
//   - SLOW (1.6s..4.8s) — ambient LED pulses, machine-preview loops
export const DURATION_MS = {
  instant: 80,
  fast: 200,
  medium: 480,
  slowPulseMin: 1600,
  slowPulseMax: 4800,
} as const;

// ----- Easing curves -----
// Mirror the index.css patterns:
//   - `ease-in-out` for ambient infinite loops + open/close
//   - `ease-out` for entrance ("decelerate-in")
//   - `ease-in` for exit ("accelerate-out")
//   - cubic-bezier(0.4, 0, 0.2, 1) — Material's "standard" curve, used by
//     existing Tailwind transition utilities in the codebase
export const EASE = {
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  accelerate: "cubic-bezier(0.4, 0, 1, 1)",
  inOut: "ease-in-out",
  linear: "linear",
} as const;

// ----- Token presets -----
// Pre-composed (duration, easing) pairs for common patterns. Use these
// instead of hand-picking — adding a new preset is the right way to grow this
// table; one-off values should go behind a feature flag if they materially
// change UX (per feedback_ui_ux_ai_mutations_flag_gated).
export const MOTION_TOKENS = {
  "button-hover": { duration: DURATION_MS.fast, easing: EASE.standard },
  "focus-ring": { duration: DURATION_MS.fast, easing: EASE.standard },
  "tooltip": { duration: DURATION_MS.fast, easing: EASE.decelerate },
  "modal-open": { duration: DURATION_MS.medium, easing: EASE.decelerate },
  "modal-close": { duration: DURATION_MS.medium, easing: EASE.accelerate },
  "drawer-open": { duration: DURATION_MS.medium, easing: EASE.decelerate },
  "drawer-close": { duration: DURATION_MS.medium, easing: EASE.accelerate },
  "panel-collapse": { duration: DURATION_MS.medium, easing: EASE.inOut },
  "page-fade": { duration: DURATION_MS.medium, easing: EASE.inOut },
  "led-pulse": { duration: 2800, easing: EASE.inOut },
  "heartbeat": { duration: 4200, easing: EASE.inOut },
  "machine-loop-slow": { duration: 4800, easing: EASE.inOut },
} as const;

export type MotionTokenName = keyof typeof MOTION_TOKENS;

// ----- React helpers -----
export function motionStyle(name: MotionTokenName, property = "all"): React.CSSProperties {
  const t = MOTION_TOKENS[name];
  return {
    transitionProperty: property,
    transitionDuration: `${t.duration}ms`,
    transitionTimingFunction: t.easing,
  };
}

// ----- CSS custom property map -----
// Spread into a :root selector to expose every token as a CSS var for use in
// stylesheets that prefer not to import this module.
export const MOTION_CSS_VARS: Record<string, string> = {
  "--motion-instant": `${DURATION_MS.instant}ms`,
  "--motion-fast": `${DURATION_MS.fast}ms`,
  "--motion-medium": `${DURATION_MS.medium}ms`,
  "--motion-ease-standard": EASE.standard,
  "--motion-ease-decelerate": EASE.decelerate,
  "--motion-ease-accelerate": EASE.accelerate,
  "--motion-ease-in-out": EASE.inOut,
};

// ----- Reduced-motion gate -----
// Honors prefers-reduced-motion: every entrypoint that uses motionStyle()
// should also call this to collapse durations to 0 when the user opts out.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
