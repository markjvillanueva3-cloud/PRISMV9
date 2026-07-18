/**
 * wedm-job-cascade.ts — the JM Die print->program CASCADE COMPOSITION layer.
 *
 * This is the "write the program" core the operator's accuracy test exercises:
 * given a job's print parameters (material / thickness / taper / tolerance), it
 * selects the shop-calibrated E-code family AND applies the physics scaling that
 * the raw oracle tables (jm-die-wedm-tech-tables.ts) do NOT — so the emitted
 * cascade actually RESPONDS to the print instead of echoing one frozen family.
 *
 * Why a separate module (not folded into the oracle data file): the oracle stays
 * a pure data + lookup surface (no behavioral deps); the scaling physics live in
 * their own one-concern modules (wedm-thickness-feed-scale = P0-1, thickness;
 * wedm-hardness-feed-scale = P0-2, hardness de-rate above 55 HRC). This module
 * COMPOSES them: every pass feed is multiplied by thickness_factor × hardness_factor
 * (both dimensionless), so a thick + hardened job slows on both axes at once. It closes the WEDM-P2P-COMPREHENSIVE-VALIDATION P0-1 finding that
 * `scaledPassFeed`/`thicknessFeedFactor` shipped with ZERO consumers — generated
 * programs still emitted constant feeds because nothing wired the thickness curve
 * into the generation path. THIS is that wiring.
 *
 * Thickness scaling is applied as the SAME dimensionless factor to both feed
 * representations (feed_ipm and feed_mm_min), so no inch<->mm conversion constant
 * is inlined and the pair stays internally consistent (they start consistent in
 * the oracle table and are scaled by one unitless multiplier).
 *
 * PHYSICS CAVEAT (R12 — fail loud about what is NOT validated): the thickness
 * factor is derived from the FA-Advance ROUGH-pass curve (estimateRoughingSpeed =
 * passes[0]) and applied UNIFORMLY to skim passes. Real WEDM skim feeds are
 * servo/spark-gap-limited and scale with thickness FAR LESS than the rough pass
 * (FA-Advance data: rough 6.2->0.4 mm/min over 5..100 mm ~15x, skims ~2.6x), so
 * this OVER-scales skim feeds at thickness extremes. A per-pass skim curve is the
 * correct model, but PRISM has NO held-out thick-part JM program to validate it
 * against (only ~3 in-sample calibration programs exist on disk), so adding that
 * sophistication would claim accuracy we cannot prove. The cascade therefore
 * carries a `caveats[]` so callers never mistake a scaled cascade for a validated
 * one. Tracked: U-WEDM-P2P-PERPASS-SKIM (gated on acquiring real thick-part programs).
 *
 * Pure + deterministic. No inlined discharge/feed constants — every feed number
 * originates in the oracle table or the FA-Advance thickness curve.
 *
 * @module data/wedm-job-cascade
 */
import {
  selectECodeFamily,
  getECodeForPass,
  type ECodeFamily,
} from "./jm-die-wedm-tech-tables.js";
import {
  thicknessFeedFactor,
  isThicknessExtrapolated,
  MIN_THICKNESS_FACTOR,
  MAX_THICKNESS_FACTOR,
} from "./wedm-thickness-feed-scale.js";
import {
  hardnessFeedFactor,
  isHardnessExtrapolated,
  HARDNESS_DERATE_REF_HRC,
} from "./wedm-hardness-feed-scale.js";

/** One pass of a job-specific cascade — oracle pass values after job scaling. */
export interface JobCascadePass {
  pass_number: number;
  e_code: string;
  type: "rough" | "skim";
  h_register: string;
  /** Wire offset in inches — 0 for 4-axis taper (UV coords carry the taper). */
  offset_inches: number;
  /** Thickness-adjusted feed (inches/min); null when operator-set in the oracle. */
  feed_ipm: number | null;
  /** Thickness-adjusted feed (mm/min); null when operator-set in the oracle. */
  feed_mm_min: number | null;
}

/** A full job-specific pass cascade with the provenance needed to trust it. */
export interface JobCascade {
  family_id: string;
  axes: 2 | 4;
  num_passes: number;
  /** Job thickness fed in (mm); null when the caller gave none. */
  thickness_mm: number | null;
  /** The dimensionless thickness multiplier applied to every pass feed (1.0 = no scaling). */
  thickness_factor: number;
  /** True when thickness is outside the FA-Advance calibrated band — needs shop validation. */
  thickness_extrapolated: boolean;
  /** Workpiece hardness fed in (HRC); null when the caller gave none. */
  hardness_hrc: number | null;
  /** Dimensionless hardness de-rate applied to every pass feed (1.0 = at/below the 55-HRC anchor). */
  hardness_factor: number;
  /** True when hardness is above the model's calibrated tool-steel band (>65 HRC). */
  hardness_extrapolated: boolean;
  /** Combined thickness×hardness multiplier actually applied to feeds. */
  applied_feed_factor: number;
  /** True when the thickness factor hit the [MIN,MAX] clamp (raw curve ratio was more extreme). */
  thickness_factor_clamped: boolean;
  /** Fail-loud provenance flags — non-empty means the cascade is NOT a validated 1:1 reproduction. */
  caveats: string[];
  passes: JobCascadePass[];
}

function round(n: number, dp: number): number {
  const k = Math.pow(10, dp);
  return Math.round(n * k) / k;
}

/**
 * Generate the job-specific E-code/offset/feed cascade for a print. Returns null
 * when no shop-calibrated JM family matches the material (caller falls back to
 * generic E-codes + machine dial-in — same contract as selectECodeFamily).
 *
 * Thickness handling: the family's pass-1 (rough) feed anchors a reference
 * thickness via the FA-Advance curve; the resulting dimensionless factor (<1 for
 * thicker stock => slower, >1 thinner) scales every pass. When thickness is
 * absent/unusable the factor is 1.0 (the cascade equals the raw oracle family).
 */
export function generateJobCascade(params: {
  material: string;
  thickness_mm?: number;
  hardness_hrc?: number;
  taper_angle_deg?: number;
  tolerance_mm?: number;
  target_ra_um?: number;
}): JobCascade | null {
  const fam: ECodeFamily | null = selectECodeFamily(params);
  if (!fam) return null;

  const t = params.thickness_mm;
  const hasThickness = typeof t === "number" && Number.isFinite(t) && t > 0;
  const roughFeed = fam.passes.find((p) => p.pass_number === 1)?.feed_mm_min ?? null;
  // dimensionless multiplier from the calibrated FA-Advance thickness curve (P0-1).
  const thicknessFactor = hasThickness ? thicknessFeedFactor(roughFeed, t as number) : 1.0;

  const hrc = params.hardness_hrc;
  const hasHardness = typeof hrc === "number" && Number.isFinite(hrc) && hrc > 0;
  // dimensionless de-rate (<=1) above the 55-HRC calibration anchor (P0-2).
  const hardnessFactor = hasHardness ? hardnessFeedFactor(hrc as number) : 1.0;

  // both factors are unitless — compose multiplicatively onto every pass feed.
  const appliedFactor = thicknessFactor * hardnessFactor;
  const isTaper = fam.axes === 4;

  const passes: JobCascadePass[] = fam.passes.map((p) => ({
    pass_number: p.pass_number,
    e_code: getECodeForPass(fam, p.pass_number),
    type: p.type,
    h_register: p.h_register,
    offset_inches: isTaper ? 0 : p.offset_inches,
    feed_ipm: p.feed_ipm == null ? null : round(p.feed_ipm * appliedFactor, 3),
    feed_mm_min: p.feed_mm_min == null ? null : round(p.feed_mm_min * appliedFactor, 2),
  }));

  const tExtrapolated = hasThickness ? isThicknessExtrapolated(t as number) : false;
  const hExtrapolated = hasHardness ? isHardnessExtrapolated(hrc as number) : false;
  const clamped = hasThickness && (thicknessFactor <= MIN_THICKNESS_FACTOR || thicknessFactor >= MAX_THICKNESS_FACTOR);
  const hasSkim = fam.passes.some((p) => p.type === "skim");

  // Fail-loud: a non-empty caveats[] means this cascade is NOT a validated 1:1 reproduction.
  const caveats: string[] = [];
  if (hasThickness && thicknessFactor !== 1.0 && hasSkim) {
    caveats.push(
      "skim feeds scaled by the ROUGH-derived thickness factor (first-order; skims scale far less than rough — unvalidated vs JM skim ground truth; see U-WEDM-P2P-PERPASS-SKIM)",
    );
  }
  if (hasHardness && hardnessFactor !== 1.0) {
    caveats.push(
      "feed de-rated for " + hrc + " HRC (above the " + HARDNESS_DERATE_REF_HRC + "-HRC calibration anchor; physics model reusing the EDM hardness sensitivity — UNVALIDATED vs a JM hardened-part program)",
    );
  }
  if (tExtrapolated) {
    caveats.push("thickness outside FA-Advance calibrated band (5..100 mm) — shop-validate before cutting");
  }
  if (hExtrapolated) {
    caveats.push("hardness above the calibrated tool-steel band (>65 HRC) — shop-validate before cutting");
  }
  if (clamped) {
    caveats.push("thickness factor hit the [" + MIN_THICKNESS_FACTOR + "," + MAX_THICKNESS_FACTOR + "] clamp — raw curve ratio was more extreme");
  }

  return {
    family_id: fam.id,
    axes: fam.axes,
    num_passes: fam.num_passes,
    thickness_mm: hasThickness ? (t as number) : null,
    thickness_factor: round(thicknessFactor, 4),
    thickness_extrapolated: tExtrapolated,
    thickness_factor_clamped: clamped,
    hardness_hrc: hasHardness ? (hrc as number) : null,
    hardness_factor: round(hardnessFactor, 4),
    hardness_extrapolated: hExtrapolated,
    applied_feed_factor: round(appliedFactor, 4),
    caveats,
    passes,
  };
}
