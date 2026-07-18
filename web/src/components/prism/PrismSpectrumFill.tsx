/**
 * PrismSpectrumFill — Calculator Studio "prism-spectrum-fill" progress-bar
 * primitive. The signature red→orange→yellow→lime→green gradient with the
 * outer-glow shadow.
 *
 * CSS source: web/src/index.css line 3672 (.prism-spectrum-fill).
 *
 * Visual contract: pages use this for ANY 0..1-bounded progress value —
 * cycle-time completion, machine utilization, tool-life remaining, quote
 * confidence, build progress, etc. The gradient itself ENCODES low→high
 * directionality (red = low/danger, green = high/good) so consumers don't
 * need to swap colors per status.
 *
 * Quebec /goal-loop 2026-05-26 / U-Q-PRISM-PRIMITIVES.
 */
import type { CSSProperties } from "react";

interface Props {
  /**
   * Progress value 0..1. Out-of-range values are clamped silently so a stale
   * API value never paints outside the track.
   */
  value: number;
  className?: string;
  /**
   * Height of the fill track. Calculator Studio uses 6-10px; pages that want
   * a chunkier bar (e.g. cycle-time hero stat) can override.
   */
  height?: number | string;
  /**
   * Show inline label (e.g. "82%") to the right of the bar. Defaults to off
   * since most consumers render their own label.
   */
  withPercent?: boolean;
  "aria-label"?: string;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function PrismSpectrumFill({
  value,
  className,
  height = 8,
  withPercent = false,
  "aria-label": ariaLabel,
}: Props) {
  const v = clamp01(value);
  const trackStyle: CSSProperties = {
    height: typeof height === "number" ? `${height}px` : height,
    background: "rgba(15,23,42,0.72)",
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.18)",
  };
  const fillStyle: CSSProperties = {
    height: "100%",
    width: `${v * 100}%`,
    borderRadius: 999,
    transition: "width 480ms cubic-bezier(0.4, 0, 0.2, 1)",
  };
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <span style={{ ...trackStyle, flex: 1 }}>
        <span className="prism-spectrum-fill" style={fillStyle} />
      </span>
      {withPercent ? (
        <span style={{ fontSize: 12, color: "rgba(226,232,240,0.86)", minWidth: "3ch", textAlign: "right" }}>
          {Math.round(v * 100)}%
        </span>
      ) : null}
    </span>
  );
}
