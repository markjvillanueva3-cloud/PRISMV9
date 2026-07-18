/**
 * web/src/components/prism — Calculator Studio design-system primitives
 *
 * The cross-domain reusable component kit for applying Calculator Studio's
 * visual language to every other PRISM app domain. Other chats (echo
 * post-processors, foxtrot mill wizard, mike wire wizard, oscar speed/feed,
 * hotel ERP, lima academy, etc.) import from this barrel so the entire app
 * surface synergizes around one design system without each domain
 * re-implementing the prism-glow / prism-chip / prism-led-sweep CSS classes.
 *
 * Calculator Studio is the source-of-truth — see `web/DESIGN.md`. Every
 * primitive here wraps an existing CSS class from `web/src/index.css` in a
 * typed React component, so the JSX surface is portable across chats and the
 * styling source-of-truth stays in one stylesheet.
 *
 * Quebec /goal-loop 2026-05-26 — shipped by slot quebec (frontend owner per
 * fleet-status.md). U-Q-PRISM-PRIMITIVES.
 */
export { PrismGlowCard } from "./PrismGlowCard";
export { PrismChip } from "./PrismChip";
export { PrismSpectrumFill } from "./PrismSpectrumFill";
export { PrismLedSweep } from "./PrismLedSweep";
export { PrismResourceCard } from "./PrismResourceCard";
export { PrismMetricStat } from "./PrismMetricStat";
export type { PrismGlowColor } from "./PrismGlowCard";
export type { PrismChipTone } from "./PrismChip";
