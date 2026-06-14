/**
 * TolerancePricingImpactEngine — U-QP-TOL-PRICING (Axis L)
 *
 * Operator-stated: "have adjustable pricing based off tolerances per dimension
 * based off callouts on the print."
 *
 * Pure cost-multiplier engine. Takes a list of per-dimension tolerance
 * callouts (band, datum scheme, surface-finish) and emits per-dimension
 * cost contribution + aggregate price multiplier.
 *
 * Math derived from ISO 2768 (general tolerances) + Machinery's Handbook
 * Ch 35 (cost-of-precision curve): cost scales roughly as 1/tolerance_band^k
 * with k≈0.6 for milling, k≈0.5 for turning, k≈0.7 for grinding-bracket ops.
 *
 * The engine intentionally uses CONSERVATIVE multipliers — operator can
 * tighten via override. Surface finish costs scale separately.
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-TOL-PRICING
 */

export type ToleranceClass =
  | "ISO_FINE"       // ±0.05mm — slip-fit precision
  | "ISO_MEDIUM"     // ±0.1mm — standard machining
  | "ISO_COARSE"     // ±0.3mm — saw cut / rough mill
  | "TIGHT_GRIND"    // ±0.005mm — grinding bracket
  | "ULTRA_PRECISION"; // ±0.001mm — diamond / lap / EDM

export interface ToleranceCallout {
  /** Dimension identifier (e.g., "BORE_A", "WIDTH_OAL", "FLATNESS_PAD"). */
  dimension: string;
  /** Tolerance band in mm, e.g. 0.025 for ±0.025mm. Use the +/- magnitude. */
  band_mm: number;
  /** GD&T datum scheme — bumps cost when multiple datums required. */
  datum_count?: number;
  /** Surface finish Ra in μm if specified for THIS dim. */
  surface_finish_ra_um?: number;
  /** Optional explicit class override (otherwise inferred from band_mm). */
  class_override?: ToleranceClass;
}

export interface DimensionImpact {
  dimension: string;
  band_mm: number;
  class: ToleranceClass;
  cost_multiplier: number;
  added_cost_usd: number;
  rationale: string;
}

export interface TolerancePricingInput {
  callouts: ToleranceCallout[];
  base_machining_cost_usd: number;
  /** Cost-of-precision exponent k (1/band^k). Default 0.6 (milling-typical). */
  precision_exponent?: number;
}

export interface TolerancePricingResult {
  ok: boolean;
  reason?: string;
  per_dimension: DimensionImpact[];
  total_multiplier: number;
  total_added_cost_usd: number;
  tightest_class: ToleranceClass | null;
}

// Reference cost multipliers vs ISO_MEDIUM = 1.0×
const CLASS_MULTIPLIER: Record<ToleranceClass, number> = {
  ISO_FINE: 1.35,
  ISO_MEDIUM: 1.00,
  ISO_COARSE: 0.85,
  TIGHT_GRIND: 2.10,
  ULTRA_PRECISION: 4.50,
};

const DEFAULT_K = 0.6;

export class TolerancePricingImpactEngine {
  /**
   * Infer tolerance class from band magnitude when class_override not given.
   * Ranges from Machinery's Handbook Ch 35 + ISO 2768 mapping.
   */
  classifyBand(band_mm: number): ToleranceClass {
    if (!Number.isFinite(band_mm) || band_mm <= 0) return "ISO_COARSE";
    if (band_mm < 0.003) return "ULTRA_PRECISION";
    if (band_mm < 0.015) return "TIGHT_GRIND";
    if (band_mm < 0.06)  return "ISO_FINE";
    if (band_mm < 0.20)  return "ISO_MEDIUM";
    return "ISO_COARSE";
  }

  /**
   * Price the impact of a set of per-dimension tolerance callouts.
   *
   * Cost multiplier per callout = CLASS_MULTIPLIER × precision_term × datum_term × finish_term
   * where precision_term ≈ (0.1/band)^k (normalized to ISO_MEDIUM band).
   */
  priceTolerances(input: TolerancePricingInput): TolerancePricingResult {
    const empty: TolerancePricingResult = {
      ok: false, per_dimension: [], total_multiplier: 1, total_added_cost_usd: 0, tightest_class: null,
    };
    if (!Array.isArray(input.callouts)) return { ...empty, reason: "callouts must be an array" };
    if (!Number.isFinite(input.base_machining_cost_usd) || input.base_machining_cost_usd < 0) {
      return { ...empty, reason: "base_machining_cost_usd must be non-negative finite" };
    }

    if (input.callouts.length === 0) {
      return { ok: true, per_dimension: [], total_multiplier: 1, total_added_cost_usd: 0, tightest_class: null };
    }

    const k = input.precision_exponent ?? DEFAULT_K;
    const baseBand = 0.10; // ISO_MEDIUM reference

    const per_dimension: DimensionImpact[] = [];
    let aggregate_multiplier = 1.0;
    let tightestRank = -1;
    let tightestClass: ToleranceClass | null = null;

    for (const c of input.callouts) {
      const cls = c.class_override ?? this.classifyBand(c.band_mm);
      const classMult = CLASS_MULTIPLIER[cls];
      const precisionTerm = c.band_mm > 0 ? Math.pow(baseBand / c.band_mm, k) : 1;
      const datumTerm = c.datum_count && c.datum_count > 1 ? 1 + (c.datum_count - 1) * 0.05 : 1;
      // Finish term: Ra ≤ 0.4 → extra cost (grind needed); Ra ≤ 1.6 → moderate; Ra > 3.2 → none
      let finishTerm = 1.0;
      if (c.surface_finish_ra_um !== undefined && Number.isFinite(c.surface_finish_ra_um)) {
        if (c.surface_finish_ra_um <= 0.4) finishTerm = 1.30;
        else if (c.surface_finish_ra_um <= 1.6) finishTerm = 1.10;
      }
      const cost_multiplier = round4(classMult * precisionTerm * datumTerm * finishTerm);
      const added_cost_usd = round2(input.base_machining_cost_usd * (cost_multiplier - 1));
      per_dimension.push({
        dimension: c.dimension,
        band_mm: c.band_mm,
        class: cls,
        cost_multiplier,
        added_cost_usd: Math.max(0, added_cost_usd),
        rationale: `${cls} band ±${c.band_mm}mm; precision^${k}=${precisionTerm.toFixed(3)}; datum×${datumTerm.toFixed(2)}; finish×${finishTerm.toFixed(2)}`,
      });
      // Track tightest class
      const rank = ["ISO_COARSE", "ISO_MEDIUM", "ISO_FINE", "TIGHT_GRIND", "ULTRA_PRECISION"].indexOf(cls);
      if (rank > tightestRank) { tightestRank = rank; tightestClass = cls; }
      // Multiplicative aggregation, dampened to avoid runaway when many tight callouts
      aggregate_multiplier *= 1 + (cost_multiplier - 1) * 0.5;
    }

    const total_multiplier = round4(aggregate_multiplier);
    const total_added_cost_usd = round2(input.base_machining_cost_usd * (total_multiplier - 1));

    return {
      ok: true,
      per_dimension,
      total_multiplier,
      total_added_cost_usd: Math.max(0, total_added_cost_usd),
      tightest_class: tightestClass,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const tolerancePricingImpactEngine = new TolerancePricingImpactEngine();
export default tolerancePricingImpactEngine;
