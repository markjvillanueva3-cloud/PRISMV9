/**
 * wedm-thickness-feed-scale.ts — P0-1 fix: make WEDM feeds THICKNESS-AWARE.
 *
 * The comprehensive validation (WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md)
 * found the JM oracle (jm-die-wedm-tech-tables.ts) emits CONSTANT feeds from 1 mm
 * to 215 mm — physically wrong: sparking-frequency-limited feed scales inversely
 * with height (v_feed ~ MRR / (kerf x thickness)). Applying the CHOCTAW-calibrated
 * rough feed (1.52 mm/min) to a 12 mm plate is 3-5x too slow; applying a thin-stock
 * feed to a 150 mm block over-drives the gap -> debris packing -> wire break.
 *
 * The fix REUSES an asset already in the tree (R8): the FA-Advance rough-feed-vs-
 * thickness curve via `estimateRoughingSpeed(thicknessMm)` (11 calibrated points
 * 5..100 mm + inverse-thickness extrapolation above). A family's own base (pass-1)
 * feed implies a reference thickness — the point where the curve equals it — so the
 * thickness factor is `curve(target) / familyRoughFeed`, applied uniformly to every
 * pass (preserves the per-pass ratios, shifts the whole cascade for thickness).
 * NO inlined feed constants — all feed numbers come from the FA-Advance asset.
 *
 * @module data/wedm-thickness-feed-scale
 */
import { estimateRoughingSpeed } from "./mitsubishi-fa-advance-extracted.js";

/** Clamp on the thickness factor — guards absurd extrapolation outside the
 *  machine's real operating band (a 215 mm cut is ~16x slower than 5 mm, not 100x). */
export const MIN_THICKNESS_FACTOR = 0.1;
export const MAX_THICKNESS_FACTOR = 3.0;

function isPos(x: unknown): x is number { return typeof x === "number" && Number.isFinite(x) && x > 0; }

/**
 * Thickness scale factor for a family whose calibrated rough (pass-1) feed is
 * `familyRoughFeed_mm_min`, cut at `thickness_mm`. Returns 1.0 (no-op) when inputs
 * are unusable so callers degrade safely. <1 for thicker stock (slower), >1 thinner.
 */
export function thicknessFeedFactor(familyRoughFeed_mm_min: number | null | undefined, thickness_mm: number): number {
  if (!isPos(familyRoughFeed_mm_min) || !isPos(thickness_mm)) return 1.0;
  const curveAtTarget = estimateRoughingSpeed(thickness_mm); // FA-Advance asset (mm/min)
  if (!isPos(curveAtTarget)) return 1.0;
  const factor = curveAtTarget / (familyRoughFeed_mm_min as number);
  return Math.min(MAX_THICKNESS_FACTOR, Math.max(MIN_THICKNESS_FACTOR, factor));
}

/**
 * Scale a single pass feed for the target thickness. `passFeed_mm_min` null
 * (operator-set) stays null. `familyRoughFeed_mm_min` is the family's pass-1 feed
 * (the anchor). Returns the thickness-adjusted feed, rounded to 2 dp.
 */
export function scaledPassFeed(
  passFeed_mm_min: number | null,
  familyRoughFeed_mm_min: number | null | undefined,
  thickness_mm: number,
): number | null {
  if (passFeed_mm_min == null) return null;
  if (!isPos(passFeed_mm_min)) return passFeed_mm_min;
  const factor = thicknessFeedFactor(familyRoughFeed_mm_min, thickness_mm);
  return Math.round(passFeed_mm_min * factor * 100) / 100;
}

/** Whether a thickness is inside the FA-Advance calibrated band (5..100 mm) or
 *  in extrapolation territory (needs shop-floor validation per the report). */
export function isThicknessExtrapolated(thickness_mm: number): boolean {
  return !isPos(thickness_mm) || thickness_mm < 5 || thickness_mm > 100;
}
