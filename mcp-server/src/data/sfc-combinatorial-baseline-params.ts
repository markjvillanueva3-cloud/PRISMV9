/**
 * SFC combinatorial BASELINE GENERIC PARAMS -- the moat. Folds the COMPARE report
 * (U-CSFH-07) into per-regime baseline parameters: a vc/fz envelope (from PRISM's
 * gate-pass driven cells) + a vendor BIAS and CONTAINMENT (from the feed-eligible
 * cited subset) + provenance, with thin / non-calibratable (e.g. tapping) / divergent regimes SEGREGATED or
 * flagged so a degenerate regime never silently feeds calibration (U-OSC9-CALIB-*).
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-08-BASELINE-PARAMS (slot:oscar, 2026-06-11).
 *
 * Regime = (iso_group, operation, cut_type) -- resolves the CutType the DL calibration loop keys on
 * (segment key iso|_|cut_type). (Finer keys -- tool_material, diameter buckets -- are a future [SCOPED] extension.)
 *
 * Honesty is the whole point (plan line 27: thin/degenerate/broken regimes
 * SEGREGATED, never feed calibration):
 *   - operations whose cutting-physics is not a validated calibration basis are SEGREGATED
 *     outright via the data-driven NON_CALIBRATABLE_OPERATIONS registry (U-CSFH-11). Today that
 *     is TAPPING (pitch-locked feed -> degenerate fz envelope + torque-dominated force proxy).
 *     Drilling was here while real_drilling_physics=0 (ap=[0,0,0]); U-OSC9-DRILL-CHIPGEOM fixed its
 *     chip geometry, so drilling is now an ELIGIBLE regime (removed from the default segregation).
 *   - a regime with < minRegimeN gate-pass driven cells is insufficient_data (no params).
 *   - a regime with NO vendor citations emits a PRISM-only envelope with confidence
 *     `prism_only` -- never `vendor_corroborated` (you cannot corroborate against data
 *     you do not have). This is the dominant real case (most cells are uncited).
 *   - a divergent-dominated regime is `low_confidence`, not silently trusted.
 *
 * Pure + deterministic (a fold over the compare report; no I/O). The dated artifact
 * `baseline-generic-params-<date>.json` is written at the dispatcher-wire (U-CSFH-10);
 * this module returns the serializable report (schemaVersion'd) so it stays testable
 * + out of the engine orphan-block. No physics CONSTANTS here.
 */
import type { ISOGroup, Operation, CutType } from "./sfc-combinatorial-axes.js";
import type { CompareReport, CompareVerdict } from "./sfc-combinatorial-compare.js";

export type BaselineStatus = "baseline" | "segregated_operation" | "insufficient_data";

/**
 *   vendor_corroborated -- enough cited cells AND most within the vendor envelope.
 *   prism_only           -- a real PRISM envelope but NO (or too few) vendor citations.
 *   low_confidence       -- cited but divergent-dominated or poor containment.
 *   none                 -- the regime was segregated / insufficient (no envelope).
 */
export type BaselineConfidence = "vendor_corroborated" | "prism_only" | "low_confidence" | "none";

/** A value envelope over a regime's cells. */
export interface BaselineEnvelope {
  n: number;
  min: number;
  max: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
}

/**
 * One regime's baseline. SERIALIZATION NOTE for consumers reading this THROUGH a
 * dispatcher (prism_calc:sfc_baseline_generic_params): the MCP result serializer
 * STRIPS null-valued fields, so every `| null` field below (vc_mpm / fz_mm /
 * bias_vc_pct / bias_fz_pct / containment_frac / divergent_frac) arrives ABSENT
 * (undefined), NOT explicit null. Treat undefined as null (e.g. `v ?? null`).
 * Engine-direct callers (deriveBaseline) get explicit null. (Flag for U-OSC9-CALIB.)
 */
export interface RegimeBaseline {
  regime: string; // "<iso>:<operation>:<cut_type>"
  iso_group: ISOGroup;
  operation: Operation;
  /** CutType (roughing/semi_finishing/finishing) -- the axis the DL calibration loop keys on
   *  (segment key iso|_|cut_type). Split out so sfc-calib-sync feeds per-cut_type regimes (U-FT-11-PRE). */
  cut_type: CutType;
  status: BaselineStatus;
  /** PRISM vc/fz envelope over the gate-pass driven cells; null when segregated/insufficient. */
  vc_mpm: BaselineEnvelope | null;
  /** As vc_mpm; can ALSO be null on a 'baseline' regime if PRISM fz was underivable (zero rpm/flutes) for every clean cell. */
  fz_mm: BaselineEnvelope | null;
  /** mean signed vc delta vs vendor over the feed-eligible subset; null => no_vendor_prior. */
  bias_vc_pct: number | null;
  bias_fz_pct: number | null;
  /** fraction of feed-eligible cells with verdict 'match' (within the vendor envelope). */
  containment_frac: number | null;
  /** fraction of feed-eligible cells with verdict 'divergent'. */
  divergent_frac: number | null;
  confidence: BaselineConfidence;
  provenance: { n_total: number; n_clean: number; n_cited: number; citation_coverage: number };
  /** why segregated / insufficient (null when status === "baseline"). */
  reason: string | null;
}

export interface BaselineParamsReport {
  schemaVersion: string;
  regimes: RegimeBaseline[];
  /** status === "baseline". */
  emittedCount: number;
  /** status === "segregated_operation". */
  segregatedCount: number;
  /** status === "insufficient_data". */
  insufficientCount: number;
  generatedFrom: { total_cells: number; driven: number; feed_eligible: number };
}

export interface BaselineParamsOptions {
  /** gate-pass driven cells a regime needs to characterize an envelope (default 5). */
  minRegimeN?: number;
  /** feed-eligible cited cells needed to claim vendor_corroborated (default 3). */
  minCitedForCorroboration?: number;
  /** divergent fraction above which a cited regime is low_confidence (default 0.5). */
  divergentFracThreshold?: number;
  /** containment fraction at/above which a corroborated regime qualifies (default 0.6). */
  containmentThreshold?: number;
  /** operations segregated outright as non-calibratable (default = NON_CALIBRATABLE_OPERATIONS keys, today ["tapping"]). */
  segregateOperations?: Operation[];
}

/**
 * U-CSFH-11-DRILLING-SEGREGATE: operations whose cutting-physics model is NOT a validated basis for a
 * speed/feed CALIBRATION baseline, each with the HONEST reason. Data-driven so the guard cannot rot as
 * physics is fixed: drilling lived here while `real_drilling_physics=0` (ap=[0,0,0]) made it degenerate,
 * but `U-OSC9-DRILL-CHIPGEOM` (commit 81a3eb72c8, S(x)=0.92) gave drilling real operation-specific chip
 * geometry, so its vc/fz are now a genuine derivation -- drilling is REMOVED from segregation and is now
 * an eligible regime (its thrust force remains a lower-bound proxy, but the baseline characterizes vc/fz,
 * not force; and calibration apply stays flag-gated OFF until an operator validates a regime).
 *
 * Tapping is the remaining degenerate regime: it is thread-FORMING, so its feed is PITCH-LOCKED
 * (fn = thread pitch, an INPUT -- not a derived cutting feed), which makes its fz envelope a reflection
 * of the input pitch distribution rather than physics; and its cutting force is a first-order Kienzle
 * proxy (the regime is torque-dominated). Neither vc nor fz is a validated calibration basis -> segregate.
 */
const NON_CALIBRATABLE_OPERATIONS: Partial<Record<Operation, string>> = {
  tapping:
    "tapping is thread-FORMING: feed is pitch-locked (fn = thread pitch, an INPUT, not a derived cutting feed) so its fz envelope is degenerate, and its cutting force is a first-order Kienzle proxy (torque-dominated). Not a validated basis for a speed/feed calibration baseline.",
};

/** Default segregation set: the keys of the non-calibratable registry (today: tapping; drilling FIXED + removed). */
const DEFAULT_SEGREGATE_OPERATIONS: Operation[] = Object.keys(NON_CALIBRATABLE_OPERATIONS) as Operation[];

const SCHEMA_VERSION = "1.1.0";

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN; // unreachable via envelope() (it guards empty); defensive for any direct caller
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx]!;
}

function envelope(vals: number[]): BaselineEnvelope | null {
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    n,
    min: sorted[0]!,
    max: sorted[n - 1]!,
    mean: sorted.reduce((s, x) => s + x, 0) / n,
    p10: pct(sorted, 10),
    p50: pct(sorted, 50),
    p90: pct(sorted, 90),
  };
}

function mean(vals: number[]): number | null {
  return vals.length === 0 ? null : vals.reduce((s, x) => s + x, 0) / vals.length;
}

function frac(vals: CompareVerdict[], match: CompareVerdict): number | null {
  return vals.length === 0 ? null : vals.filter((v) => v === match).length / vals.length;
}

export class SpeedFeedBaselineGenericParamsEngine {
  /**
   * Derive per-regime baseline generic params from a COMPARE report.
   * Uncited / non-calibratable (e.g. tapping) / thin regimes are segregated or flagged -- never a fabricated
   * baseline. The result feeds U-OSC9-CALIB-* (and only its feed-eligible regimes do).
   */
  static deriveBaseline(report: CompareReport, opts: BaselineParamsOptions = {}): BaselineParamsReport {
    const minRegimeN = Math.max(1, opts.minRegimeN ?? 5);
    const minCited = Math.max(1, opts.minCitedForCorroboration ?? 3);
    const divThresh = opts.divergentFracThreshold ?? 0.5;
    const contThresh = opts.containmentThreshold ?? 0.6;
    const segregateOps = new Set<Operation>(opts.segregateOperations ?? DEFAULT_SEGREGATE_OPERATIONS);

    // Group the comparisons by regime key (iso, operation, cut_type). The DL calibration loop keys
    // on cut_type (segment key iso|_|cut_type), so the baseline MUST resolve cut_type or roughing /
    // finishing cells average into one bucket the loop cannot read (U-FT-11-PRE).
    const groups = new Map<string, { iso: ISOGroup; op: Operation; ct: CutType; rows: CompareReport["comparisons"] }>();
    for (const c of report.comparisons) {
      const key = `${c.sample.iso_group}:${c.sample.operation}:${c.sample.cut_type}`;
      let g = groups.get(key);
      if (!g) {
        g = { iso: c.sample.iso_group, op: c.sample.operation, ct: c.sample.cut_type, rows: [] };
        groups.set(key, g);
      }
      g.rows.push(c);
    }

    const regimes: RegimeBaseline[] = [];
    let emittedCount = 0;
    let segregatedCount = 0;
    let insufficientCount = 0;

    // Deterministic order (sorted by regime key) so the artifact diff is stable.
    for (const key of [...groups.keys()].sort()) {
      const g = groups.get(key)!;
      const nTotal = g.rows.length;
      // clean = gate-pass driven => contributes to the PRISM vc/fz envelope.
      const clean = g.rows.filter((r) => r.driven && r.gatePass);
      // feed-eligible = a real cited delta AND gate-pass => contributes bias/containment.
      const fe = g.rows.filter((r) => r.vc_delta_pct !== null && r.gatePass);
      const nClean = clean.length;
      const nCited = fe.length;
      const provenance = {
        n_total: nTotal,
        n_clean: nClean,
        n_cited: nCited,
        citation_coverage: nClean > 0 ? nCited / nClean : 0,
      };

      let status: BaselineStatus;
      let reason: string | null = null;
      if (segregateOps.has(g.op)) {
        status = "segregated_operation";
        reason = NON_CALIBRATABLE_OPERATIONS[g.op]
          ?? `operation '${g.op}' segregated by configuration as a non-validated regime for a calibration baseline`;
      } else if (nClean < minRegimeN) {
        status = "insufficient_data";
        reason = `only ${nClean} gate-pass driven cell(s) (< minRegimeN ${minRegimeN}); too thin to characterize an envelope`;
      } else {
        status = "baseline";
      }

      if (status !== "baseline") {
        if (status === "segregated_operation") segregatedCount++;
        else insufficientCount++;
        regimes.push({
          regime: key, iso_group: g.iso, operation: g.op, cut_type: g.ct, status,
          vc_mpm: null, fz_mm: null, bias_vc_pct: null, bias_fz_pct: null,
          containment_frac: null, divergent_frac: null, confidence: "none", provenance, reason,
        });
        continue;
      }

      const vc = envelope(clean.map((r) => r.prism_vc_mpm).filter((v): v is number => v !== null));
      const fz = envelope(clean.map((r) => r.prism_fz_mm).filter((v): v is number => v !== null));
      const biasVc = mean(fe.map((r) => r.vc_delta_pct!).filter((v): v is number => v !== null));
      const biasFz = mean(fe.map((r) => r.fz_delta_pct).filter((v): v is number => v !== null));
      const feVerdicts = fe.map((r) => r.verdict);
      const containment = frac(feVerdicts, "match");
      const divergent = frac(feVerdicts, "divergent");

      let confidence: BaselineConfidence;
      if (nCited < minCited) {
        confidence = "prism_only"; // a real PRISM envelope but no vendor prior to corroborate
      } else if (divergent !== null && divergent > divThresh) {
        confidence = "low_confidence";
      } else if (containment !== null && containment >= contThresh) {
        confidence = "vendor_corroborated";
      } else {
        confidence = "low_confidence";
      }

      emittedCount++;
      regimes.push({
        regime: key, iso_group: g.iso, operation: g.op, cut_type: g.ct, status,
        vc_mpm: vc, fz_mm: fz, bias_vc_pct: biasVc, bias_fz_pct: biasFz,
        containment_frac: containment, divergent_frac: divergent, confidence, provenance, reason: null,
      });
    }

    return {
      schemaVersion: SCHEMA_VERSION,
      regimes,
      emittedCount,
      segregatedCount,
      insufficientCount,
      generatedFrom: {
        total_cells: report.total,
        driven: report.drivenCount,
        feed_eligible: report.feedEligibleCount,
      },
    };
  }
}
