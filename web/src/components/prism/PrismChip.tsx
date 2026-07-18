/**
 * PrismChip — Calculator Studio "prism-chip" status-badge primitive.
 *
 * Wraps the `prism-chip` base class (web/src/index.css line 3685) + adds a
 * tonal color modifier per the same 5-color palette as PrismGlowCard.
 *
 * Status-chip use-cases per Calculator Studio:
 *   - <PrismChip tone="emerald">READY</PrismChip>          (success)
 *   - <PrismChip tone="amber">DRAFT</PrismChip>            (warning)
 *   - <PrismChip tone="red">BLOCKED</PrismChip>            (error)
 *   - <PrismChip tone="cyan">RUNNING</PrismChip>           (info/active)
 *   - <PrismChip tone="violet">QUEUED</PrismChip>          (pending)
 *
 * Letter-spacing + uppercase styling is baked into the .prism-chip class.
 *
 * Quebec /goal-loop 2026-05-26 / U-Q-PRISM-PRIMITIVES.
 */
import type { ReactNode } from "react";

export type PrismChipTone = "cyan" | "violet" | "emerald" | "amber" | "red" | "slate";

interface Props {
  tone?: PrismChipTone;
  children?: ReactNode;
  className?: string;
  title?: string;
}

const TONE_CLASSES: Record<PrismChipTone, string> = {
  cyan: "text-cyan-200 bg-cyan-500/10 ring-1 ring-cyan-400/40",
  violet: "text-violet-200 bg-violet-500/10 ring-1 ring-violet-400/40",
  emerald: "text-emerald-200 bg-emerald-500/10 ring-1 ring-emerald-400/40",
  amber: "text-amber-200 bg-amber-500/10 ring-1 ring-amber-400/40",
  red: "text-rose-200 bg-rose-500/10 ring-1 ring-rose-400/40",
  slate: "text-slate-200 bg-slate-500/10 ring-1 ring-slate-400/30",
};

export function PrismChip({ tone = "slate", children, className, title }: Props) {
  const cls = ["prism-chip", TONE_CLASSES[tone], className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={title}>
      {children}
    </span>
  );
}
