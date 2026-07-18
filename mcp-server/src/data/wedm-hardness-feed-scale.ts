/**
 * wedm-hardness-feed-scale.ts — P0-2 fix: make WEDM feeds HARDNESS-AWARE above the
 * hardened-die-steel threshold.
 *
 * The comprehensive validation (WEDM-P2P-COMPREHENSIVE-VALIDATION-2026-06-01.md)
 * found the JM oracle emits the SAME feed regardless of workpiece hardness. In EDM,
 * harder/higher-melting stock removes slower at a fixed spark energy (E-code), so the
 * servo holds feed back. The canonical EDMBiMaterialCompensationEngine models this on
 * the CURRENT side as `edmHardnessFactor = 1 + (HRC-40)*0.005` (more current to hold
 * MRR). This module reuses that EXACT coefficient (single source — imported, not
 * re-inlined) INVERSELY for the FEED side: at a fixed E-code the feed de-rates by the
 * inverse of the current boost the harder material would have needed.
 *
 * ANCHOR (R12 honesty — why 55 HRC, not 40): the JM oracle feeds were calibrated on
 * standard hardened die steel (D2/A2/S7/M2/H13, typically run ~50-55 HRC). Anchoring
 * the de-rate at 40 HRC would DOUBLE-COUNT — slowing a feed already measured on a
 * hardened part. So the de-rate is referenced to 55 HRC: at or below 55 the oracle
 * feed stands (factor 1.0); above 55 (the same threshold EDMBiMaterialCompensationEngine
 * flags hardened steel, "increased current factor applied") the feed de-rates. This
 * matches the operator directive ("skim-energy de-rate above ~55 HRC").
 *
 * This is a PHYSICS MODEL, NOT validated against JM ground truth (no hardened-part
 * program with a known HRC exists on disk to compare) — callers surface a caveat.
 *
 * @module data/wedm-hardness-feed-scale
 */
import { edmHardnessFactor } from "../engines/EDMBiMaterialCompensationEngine.js";

/** HRC at/below which the oracle feeds stand (their calibration hardness band). */
export const HARDNESS_DERATE_REF_HRC = 55;
/** Floor on the hardness de-rate — defensive guard only. With the 0.5%/HRC ratio it
 *  binds far above the tool-steel band (~90+ HRC), so it never triggers for real wire
 *  work (>65 HRC is already extrapolation-flagged); it exists to bound absurd input. */
export const MIN_HARDNESS_FACTOR = 0.5;
/** Upper practical hardness for tool steel; above this the model extrapolates. */
export const HARDNESS_EXTRAPOLATION_HRC = 65;

function isPos(x: unknown): x is number { return typeof x === "number" && Number.isFinite(x) && x > 0; }

/**
 * Feed de-rate factor for a workpiece hardness. Returns 1.0 (no-op) at/below the
 * calibration reference (55 HRC) or for unusable input; <1 above it (harder => slower).
 * Reuses the canonical edmHardnessFactor coefficient as a RATIO anchored at the
 * reference, so it never double-counts the hardness already baked into the oracle feed.
 */
export function hardnessFeedFactor(hardnessHrc: number | null | undefined): number {
  if (!isPos(hardnessHrc) || (hardnessHrc as number) <= HARDNESS_DERATE_REF_HRC) return 1.0;
  // current-boost ratio ref->target; feed de-rate is its inverse (fixed E-code => slower feed).
  const factor = edmHardnessFactor(HARDNESS_DERATE_REF_HRC) / edmHardnessFactor(hardnessHrc as number);
  return Math.max(MIN_HARDNESS_FACTOR, factor);
}

/**
 * Scale a single pass feed for workpiece hardness. null (operator-set) stays null.
 * Returns the hardness-adjusted feed rounded to the given decimal places (default 3).
 */
export function scaledPassFeedForHardness(
  passFeed: number | null,
  hardnessHrc: number | null | undefined,
  dp = 3,
): number | null {
  if (passFeed == null) return null;
  if (!isPos(passFeed)) return passFeed;
  const factor = hardnessFeedFactor(hardnessHrc);
  const k = Math.pow(10, dp);
  return Math.round((passFeed as number) * factor * k) / k;
}

/** Whether a hardness is above the model's calibrated tool-steel band (needs validation). */
export function isHardnessExtrapolated(hardnessHrc: number | null | undefined): boolean {
  return isPos(hardnessHrc) && (hardnessHrc as number) > HARDNESS_EXTRAPOLATION_HRC;
}
