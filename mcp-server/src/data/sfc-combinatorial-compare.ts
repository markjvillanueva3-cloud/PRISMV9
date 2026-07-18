/**
 * SFC combinatorial COMPARE -- diffs each driven cell's PRISM result against its
 * CITED vendor row (U-CSFH-03) and classifies the per-cell agreement. Consumes the
 * DrivenCell[] the DRIVER (U-CSFH-06) emits; produces the per-cell verdicts +
 * delta distribution that BASELINE-PARAMS (U-CSFH-08) derives the per-regime moat
 * from. Reuse, not rewrite: the comparison tolerances + signed-percent delta come
 * from `SpeedFeedTriVendorBatchComparatorEngine` (whose threshold consts are
 * module-private there, so they are restated here with the SAME values).
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-07-COMPARE (slot:oscar, 2026-06-11).
 *
 * The driver gives ONE cited vendor row per cell (the romeo catalog), so this is a
 * 2-way PRISM-vs-vendor compare, NOT the full tri-vendor matrix. The honesty core:
 * most sampled cells carry NO resolved citation (the sampler is tool-agnostic) --
 * those ABSTAIN as `uncited` and NEVER count as agreement. A non-driven cell (engine
 * threw) is `error`. Only a driven + cited + vendor-vc-positive cell forms a real
 * delta. This segregation is what keeps a fabricated/absent benchmark out of the
 * baseline (plan line 27: thin/degenerate regimes segregated, never feed calibration).
 *
 * PRISM feed-per-tooth is DERIVED (fz = feed_rate / (rpm * flutes)) because the
 * engine summary carries feed_rate (mm/min) while vendor catalogs cite fz (mm/tooth).
 *
 * Pure + deterministic (a fold over the records; no I/O, no engine call). Lives in
 * `src/data/` with the CSFH family -- out of the engine orphan-block until the
 * dispatcher-wire (U-CSFH-10). No physics CONSTANTS here (the 25/30/40 are benchmark
 * tolerances, not kc/Taylor coefficients).
 */
import type { SampledCell } from "./sfc-combinatorial-sampler.js";
import type { DrivenCell, DriveResult } from "./sfc-combinatorial-driver.js";

/**
 * Per-cell agreement of the PRISM recommendation with the cited vendor row.
 *   match         -- within the vc (25%) + fz (30%) envelope; PRISM agrees.
 *   prism_higher  -- outside envelope, PRISM vc > vendor (directional; the known
 *                    N-aluminum pattern lands here, not silently in 'match').
 *   vendor_higher -- outside envelope, vendor vc > PRISM.
 *   divergent     -- |vc delta| > 40%; a hard disagreement (investigate, never auto-trust).
 *   uncited       -- no resolved vendor citation (or a non-positive vendor vc); ABSTAINS.
 *   error         -- the cell did not drive (engine threw); nothing to compare.
 */
export type CompareVerdict =
  | "match"
  | "prism_higher"
  | "vendor_higher"
  | "divergent"
  | "uncited"
  | "error";

/**
 * Comparison tolerances, reused from `SpeedFeedTriVendorBatchComparatorEngine`
 * (GWIZARD_VC_ENVELOPE_PCT / GWIZARD_FZ_ENVELOPE_PCT / DIVERGENT_THRESHOLD_PCT are
 * private there -- restated with identical values for a single source of truth on
 * the verdict thresholds). These are benchmark tolerances, NOT physics constants.
 */
const VC_ENVELOPE_PCT = 25;
const FZ_ENVELOPE_PCT = 30;
const DIVERGENT_THRESHOLD_PCT = 40;

/** One cell's PRISM-vs-vendor comparison. Nulls are honest "not available", never 0-fill. */
export interface CellComparison {
  sample: SampledCell;
  driven: boolean;
  cited: boolean;
  /** gate.overall !== "fail" -- the honesty-gate input U-CSFH-08 filters feed-eligibility on. */
  gatePass: boolean;
  verdict: CompareVerdict;
  prism_vc_mpm: number | null;
  prism_fz_mm: number | null;
  vendor_vc_mpm: number | null;
  vendor_fz_mm: number | null;
  /** signed percent (prism - vendor)/vendor*100; + => PRISM higher. null unless comparable. */
  vc_delta_pct: number | null;
  fz_delta_pct: number | null;
  /** provenance.detail from the citation -- why it cited (or why it abstained). */
  citation_detail: string;
}

/** Signed-delta distribution over the comparable subset. */
export interface DeltaStats {
  n: number;
  /** bias: + => PRISM systematically runs hotter than the vendor. */
  meanSigned: number;
  /** dispersion (mean magnitude regardless of direction). */
  meanAbs: number;
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Counter invariant: feedEligibleCount <= comparableCount <= drivenCount <= total.
 * `citedCount` is INDEPENDENT of drive success (it counts resolved citations even on
 * error cells, since the driver resolves citation BEFORE the engine call) -- do NOT
 * assume citedCount <= drivenCount. U-CSFH-08 derives the baseline from the comparable,
 * gate-passing subset (feedEligibleCount), never from citedCount.
 */
export interface CompareReport {
  comparisons: CellComparison[];
  total: number;
  drivenCount: number;
  /** cells with a resolved, non-null-vc vendor citation (counted even if the cell errored; a non-positive vendor vc still abstains from comparison). */
  citedCount: number;
  /** driven && cited && vendor-vc-positive -- a real delta exists. */
  comparableCount: number;
  /** comparable && gatePass -- the set U-CSFH-08 may derive a baseline from. */
  feedEligibleCount: number;
  verdictTally: Record<CompareVerdict, number>;
  /** signed vc deltas over the comparable subset (null when comparableCount === 0). */
  vcDelta: DeltaStats | null;
  fzDelta: DeltaStats | null;
}

/** Signed percent with PRISM as numerator: + => PRISM higher, - => vendor higher. */
function signedPct(prism: number, vendor: number): number {
  return ((prism - vendor) / vendor) * 100;
}

/**
 * PRISM feed-per-tooth derived from the driven summary: fz = feed_rate / (rpm * flutes).
 * Returns null (never NaN/Infinity) when the denominator is non-positive -- the fz
 * delta then simply abstains rather than poisoning the distribution.
 */
function prismFz(summary: NonNullable<DrivenCell["summary"]>, flutes: number): number | null {
  const denom = summary.spindle_rpm * flutes;
  if (!(denom > 0)) return null;
  return summary.feed_rate_mmmin / denom;
}

/**
 * Classify a comparable cell. Divergent is checked FIRST (|vc| > 40% is divergent
 * regardless of fz). Then match (vc within 25% AND fz within 30%, or fz absent).
 * Otherwise a directional disagreement keyed on the vc sign.
 */
function classify(vcDeltaPct: number, fzDeltaPct: number | null): CompareVerdict {
  const vcAbs = Math.abs(vcDeltaPct);
  if (vcAbs > DIVERGENT_THRESHOLD_PCT) return "divergent";
  const fzWithin = fzDeltaPct === null || Math.abs(fzDeltaPct) <= FZ_ENVELOPE_PCT;
  if (vcAbs <= VC_ENVELOPE_PCT && fzWithin) return "match";
  // Directional: key on the vc sign; when vc is EXACTLY equal the disagreement is
  // fz-driven, so fall back to the fz sign rather than misattribute an fz-only delta
  // to the vendor (a vcDeltaPct of 0 would otherwise always read 'vendor_higher').
  const direction = vcDeltaPct !== 0 ? vcDeltaPct : (fzDeltaPct ?? 0);
  return direction > 0 ? "prism_higher" : "vendor_higher";
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx]!;
}

function statsOf(deltas: number[]): DeltaStats | null {
  if (deltas.length === 0) return null;
  const sorted = [...deltas].sort((a, b) => a - b);
  const n = sorted.length;
  const meanSigned = sorted.reduce((s, x) => s + x, 0) / n;
  const meanAbs = sorted.reduce((s, x) => s + Math.abs(x), 0) / n;
  return { n, meanSigned, meanAbs, p10: pct(sorted, 10), p50: pct(sorted, 50), p90: pct(sorted, 90) };
}

export class SpeedFeedCombinatorialComparatorEngine {
  /** Convenience: compare the records straight off a DriveResult. */
  static compare(result: DriveResult): CompareReport {
    return SpeedFeedCombinatorialComparatorEngine.compareRecords(result.records);
  }

  /**
   * Fold the driven records into per-cell verdicts + delta distributions.
   * Uncited / non-driven / non-positive-vendor cells ABSTAIN (no fabricated delta).
   */
  static compareRecords(records: DrivenCell[]): CompareReport {
    const comparisons: CellComparison[] = [];
    const verdictTally: Record<CompareVerdict, number> = {
      match: 0, prism_higher: 0, vendor_higher: 0, divergent: 0, uncited: 0, error: 0,
    };
    const vcDeltas: number[] = [];
    const fzDeltas: number[] = [];
    let drivenCount = 0;
    let citedCount = 0;
    let comparableCount = 0;
    let feedEligibleCount = 0;

    for (const rec of records) {
      const driven = rec.driven;
      // A citation only counts if it RESOLVED and carries a number (the datasource
      // never fabricates -- vc_mpm is null on a miss).
      const cited = rec.citation.resolved && rec.citation.vc_mpm !== null;
      const gatePass = rec.gate ? rec.gate.overall !== "fail" : false;
      if (driven) drivenCount++;
      if (cited) citedCount++;

      let verdict: CompareVerdict;
      let prism_vc: number | null = null;
      let prism_fz: number | null = null;
      let vendor_vc: number | null = null;
      let vendor_fz: number | null = null;
      let vcDelta: number | null = null;
      let fzDelta: number | null = null;

      if (!driven) {
        verdict = "error";
      } else {
        prism_vc = rec.summary!.cutting_speed_mpm;
        prism_fz = prismFz(rec.summary!, rec.sample.flutes);
        if (!cited) {
          verdict = "uncited";
        } else {
          vendor_vc = rec.citation.vc_mpm; // number (cited guard above)
          vendor_fz = rec.citation.fz_mm; // number | null
          if (!(vendor_vc! > 0)) {
            // Cited but vendor vc is non-positive => no usable benchmark; abstain
            // rather than divide by zero or claim a spurious agreement.
            verdict = "uncited";
          } else {
            vcDelta = signedPct(prism_vc, vendor_vc!);
            if (prism_fz !== null && vendor_fz !== null && vendor_fz > 0) {
              fzDelta = signedPct(prism_fz, vendor_fz);
            }
            verdict = classify(vcDelta, fzDelta);
            comparableCount++;
            vcDeltas.push(vcDelta);
            if (fzDelta !== null) fzDeltas.push(fzDelta);
            if (gatePass) feedEligibleCount++;
          }
        }
      }

      verdictTally[verdict]++;
      comparisons.push({
        sample: rec.sample,
        driven,
        cited,
        gatePass,
        verdict,
        prism_vc_mpm: prism_vc,
        prism_fz_mm: prism_fz,
        vendor_vc_mpm: vendor_vc,
        vendor_fz_mm: vendor_fz,
        vc_delta_pct: vcDelta,
        fz_delta_pct: fzDelta,
        citation_detail: rec.citation.provenance.detail,
      });
    }

    return {
      comparisons,
      total: records.length,
      drivenCount,
      citedCount,
      comparableCount,
      feedEligibleCount,
      verdictTally,
      vcDelta: statsOf(vcDeltas),
      fzDelta: statsOf(fzDeltas),
    };
  }
}
