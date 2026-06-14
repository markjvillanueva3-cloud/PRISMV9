/**
 * PrismMetricStat — Calculator Studio big-number / KPI primitive.
 *
 * The "label · value · unit · delta-chip · spectrum-progress" composition that
 * appears in Calculator Studio's hero stats, the Dashboard cards, the Speed/Feed
 * top-of-page summary, and any other surface that surfaces a single numeric
 * KPI. Every domain dashboard reaches for this pattern; quebec ships the
 * primitive so chats don't reinvent it.
 *
 * Composes PrismGlowCard + PrismChip + (optional) PrismSpectrumFill.
 *
 * Quebec /goal frontend (U-Q-PRISM-METRIC-STAT).
 */
import type { ReactNode } from "react";
import { PrismChip, type PrismChipTone } from "./PrismChip";
import { PrismGlowCard, type PrismGlowColor } from "./PrismGlowCard";
import { PrismSpectrumFill } from "./PrismSpectrumFill";

interface Props {
  /** The short identifier above the value (e.g. "Spindle Load", "Cycle Time"). */
  label: string;
  /** Primary numeric / text content; rendered large. Pass formatted strings,
   *  not raw floats — formatting is the caller's job (locale, precision, unit
   *  spelling all vary per surface). Accepts ReactNode so callers can compose
   *  inline subscripts / icons / unit spans inside the big-number slot. */
  value: ReactNode;
  /** Trailing unit suffix on the same line (e.g. "%", "min", "RPM"). */
  unit?: string;
  /** Optional descriptor shown below the value (e.g. "vs Mon", "5min avg"). */
  caption?: string;
  /** Glow color of the surrounding card. */
  color?: PrismGlowColor;
  /** Optional delta chip rendered to the right of the value. Tone is auto-derived
   *  from sign unless `deltaTone` overrides it. */
  delta?: string;
  /** Override the auto-tone for the delta chip. */
  deltaTone?: PrismChipTone;
  /** When set, renders a 0..1 PrismSpectrumFill under the value (progress / quota
   *  / SLA visualization). */
  progress?: number;
  /** Tooltip / aria descriptor for the whole card. */
  title?: string;
  /** Append an icon / mini-chart to the right of the label row. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Sign-derived delta tone — green for positive ("up is good"), red for negative,
 * slate for zero / no-change. Callers in "lower is better" contexts (latency,
 * cycle time, error rate) should pass deltaTone="red" for positive deltas to
 * flip the semantic.
 */
function defaultDeltaTone(delta: string): PrismChipTone {
  const trimmed = delta.trim();
  if (trimmed.startsWith("+")) return "emerald";
  if (trimmed.startsWith("-")) return "red";
  if (/^0(?:\.0+)?[a-z%]*$/i.test(trimmed)) return "slate";
  return "cyan";
}

export function PrismMetricStat({
  label,
  value,
  unit,
  caption,
  color = "cyan",
  delta,
  deltaTone,
  progress,
  title,
  trailing,
  className,
}: Props) {
  const cls = ["prism-metric-stat", className].filter(Boolean).join(" ");
  const deltaTag = delta ? <PrismChip tone={deltaTone ?? defaultDeltaTone(delta)}>{delta}</PrismChip> : null;
  return (
    <PrismGlowCard color={color} className={cls} aria-label={title ?? label}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          padding: "1rem 1.1rem",
          minWidth: "10rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            {label}
          </span>
          {trailing}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.875rem", fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            {value}
          </span>
          {unit ? (
            <span style={{ fontSize: "0.875rem", opacity: 0.6, fontWeight: 500 }}>{unit}</span>
          ) : null}
          {deltaTag ? <span style={{ marginLeft: "auto" }}>{deltaTag}</span> : null}
        </div>
        {progress !== undefined ? (
          <PrismSpectrumFill value={progress} aria-label={`${label} progress`} />
        ) : null}
        {caption ? (
          <span style={{ fontSize: "0.75rem", opacity: 0.55 }}>{caption}</span>
        ) : null}
      </div>
    </PrismGlowCard>
  );
}
