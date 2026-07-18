/**
 * CrossSourceDimensionReconciliationEngine — determine a part's TRUE dimensions by
 * reconciling candidates from the THREE independent JM data sources (xray cross-source
 * dimension determination, 2026-06-02):
 *
 *   - print : OCR'd dimension from the engineering drawing      (what the engineer SPECIFIED) — DIMENSIONAL
 *   - cad   : measured from the STEP / solid-model geometry     (what was MODELED)            — DIMENSIONAL
 *   - cnc   : extracted from the G-code toolpath coordinates    (what actually gets CUT)      — PRESENCE-ONLY
 *
 * SOURCE MODEL (grounded in corpus reality, NOT naive — mirrors the proven sibling
 * `scripts/lib/dimension-corroborate.mjs` (U-XCSD), which is the per-part pure-lib surface of
 * this same idea; THIS engine is the flat-DimCandidate[] dispatcher surface — same model, two APIs):
 *   • CAD geometry  → DIMENSIONAL. STEP/BRep gives exact nominal values (bbox, hole Ø, depths).
 *   • Print OCR     → DIMENSIONAL. What the drawing states (the thing being trained/graded).
 *   • CNC G-code    → PRESENCE-ONLY. A raw G-code coordinate is a POSITION, not a SIZE; recovering a
 *                     correct nominal needs full modal-state simulation (G90/91, canned-cycle R-plane,
 *                     lathe radius/Ø mode, work datum). Voting a G-code "value" into the consensus would
 *                     POISON the gradient (R12). So CNC CORROBORATES that a dimensioned feature was
 *                     actually machined (cnc_presence) — it NEVER pulls the consensus value, and a
 *                     CNC-only cluster yields a `presence_only` dim whose value is `value_trusted:false`.
 *
 * The three are mutually independent observations of the same physical feature, so cross-source
 * AGREEMENT among the DIMENSIONAL sources is strong corroborating evidence of the true value, and
 * DISAGREEMENT is a real discrepancy worth operator attention — surfaced as a flagged conflict,
 * NEVER silently averaged away (R12, xray-soul: per-field confidence mandatory, mm canonical, no
 * fabrication).
 *
 * This composes with BlueprintProgramJoinEngine (which links print↔program by part number):
 * the join answers "which sources belong to the same part", this engine answers "what is the
 * consensus dimension across those sources, and where do they conflict".
 *
 * PURE + deterministic (no I/O, no VLM): candidates in → reconciliation report out. The
 * dispatcher/runner sources candidates from the OCR extraction, the STEP parser, and the
 * G-code coordinate analysis. This engine is the reconciliation MATH.
 *
 * @milestone XRAY cross-source dimension determination
 */

export type DimSource = "print" | "cad" | "cnc";
export type DimType =
  | "linear" | "diameter" | "radius" | "angular" | "depth"
  | "chamfer" | "thread" | "counterbore" | "countersink" | "unknown";

/** A single dimension candidate from one source. value_mm is canonical mm (angular in degrees). */
export interface DimCandidate {
  value_mm: number;
  type: DimType;
  source: DimSource;
  /** source's own confidence in [0,1]; falls back to the per-source prior when absent. */
  confidence?: number;
  /** optional feature label (e.g. "bore", "overall_length") — enables cross-source conflict detection. */
  label?: string;
  raw?: string;
}

export interface DimContribution {
  source: DimSource;
  value_mm: number;
  confidence: number;
  /** "metric" sources (print/cad) vote the nominal; "presence" sources (cnc) corroborate existence only. */
  role: "metric" | "presence";
}

export interface ReconciledDimension {
  value_mm: number;                 // confidence-weighted consensus value (from METRIC sources only)
  type: DimType;
  status: "confirmed" | "single_source" | "presence_only";
  sources: DimSource[];             // ALL distinct sources touching this cluster (metric + presence)
  // distinct DIMENSIONAL sources that voted the value (print/cad). NOTE: over the dispatcher wire
  // this is serialized through slimResponse(), which STRIPS the empty-array form — so for a
  // presence_only dim it arrives ABSENT, not []. The canonical, wire-safe presence signal is
  // `status === "presence_only"` / `value_trusted === false` (both survive slimming); read those,
  // not `metric_sources.length`, on a slimmed payload.
  metric_sources: DimSource[];
  cnc_presence: boolean;            // a CNC toolpath corroborated this feature was machined (survives slimming)
  value_trusted: boolean;           // false for a presence_only (CNC-only) dim — value is a coordinate, not a nominal
  confidence: number;               // combined confidence in [0, 0.99]
  spread_mm: number;                // max−min across the value-basis (0 if single)
  contributions: DimContribution[];
  label?: string;
}

export interface DimConflict {
  type: DimType;
  label: string;
  values: Array<{ source: DimSource; value_mm: number; confidence: number }>;
  spread_mm: number;
  reason: string;
}

export interface ReconciliationReport {
  dimensions: ReconciledDimension[];
  conflicts: DimConflict[];
  coverage: {
    total: number;
    confirmed: number;          // ≥2 distinct DIMENSIONAL sources agree within tolerance
    single_source: number;      // exactly 1 dimensional source (CNC presence may still corroborate)
    presence_only: number;      // CNC-only cluster — feature seen, value NOT trusted
    multi_source_rate: number;  // confirmed / total
    sources_present: DimSource[];
    candidates_in: number;
    candidates_dropped: number; // non-finite / unknown-source, surfaced not hidden
  };
}

// Tolerance for "same value" clustering — mirrors the proven OCR scorer band
// (scripts/lib/dimension-set-score.mjs): 1% relative + 0.05mm absolute floor so a
// 0.5mm feature is not held to an impossible 0.005mm window. NOT physics constants.
export const DEFAULT_TOL_PCT = 1.0;
export const DEFAULT_TOL_ABS_MM = 0.05;
export const DEFAULT_ANGULAR_TOL_DEG = 0.5;

// Per-source confidence priors when a candidate omits its own confidence. CAD geometry is the
// authoritative model (highest); print OCR sits at the operator-confirm floor. CNC is PRESENCE-ONLY
// — its prior reflects confidence that a feature EXISTS (the toolpath is real), NOT that its
// coordinate is the nominal; it never enters the value-confidence combine. Caller can override.
export const DEFAULT_SOURCE_CONFIDENCE: Readonly<Record<DimSource, number>> = Object.freeze({
  cad: 0.95,
  cnc: 0.90,
  print: 0.70,
});

const VALID_SOURCES = new Set<DimSource>(["print", "cad", "cnc"]);
// Source classes: METRIC sources measure the nominal; PRESENCE sources corroborate existence only.
const METRIC_SOURCES = new Set<DimSource>(["print", "cad"]);
const PRESENCE_SOURCES = new Set<DimSource>(["cnc"]);

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}
function round(n: number, dp = 4): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** True if two values of a given type match within the type-appropriate tolerance band. */
export function valuesMatch(a: number, b: number, type: DimType, opts: { pct?: number; absMm?: number; angularDeg?: number } = {}): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (type === "angular") {
    const tol = Number.isFinite(opts.angularDeg) ? (opts.angularDeg as number) : DEFAULT_ANGULAR_TOL_DEG;
    return Math.abs(a - b) <= tol;
  }
  const pct = Number.isFinite(opts.pct) ? (opts.pct as number) : DEFAULT_TOL_PCT;
  const absMm = Number.isFinite(opts.absMm) ? (opts.absMm as number) : DEFAULT_TOL_ABS_MM;
  const tol = Math.max(absMm, (pct / 100) * Math.max(Math.abs(a), Math.abs(b)));
  return Math.abs(a - b) <= tol;
}

/** Combined confidence from independent corroborating sources (noisy-OR), capped at 0.99. */
export function combineConfidence(confs: number[]): number {
  const cs = confs.map(clamp01).filter((c) => c > 0);
  if (cs.length === 0) return 0;
  if (cs.length === 1) return round(cs[0], 4);
  // 1 − Π(1 − c_i): independent agreement compounds toward (but never reaches) certainty.
  const product = cs.reduce((p, c) => p * (1 - c), 1);
  return round(Math.min(0.99, 1 - product), 4);
}

type CleanCandidate = { value_mm: number; type: DimType; source: DimSource; confidence: number; label?: string };

export class CrossSourceDimensionReconciliationEngine {
  /**
   * Reconcile dimension candidates from print / CAD / CNC into a consensus dimension set.
   * @param candidates  per-source dimension candidates
   * @param opts        tolerance overrides
   */
  reconcile(candidates: DimCandidate[], opts: { pct?: number; absMm?: number; angularDeg?: number } = {}): ReconciliationReport {
    const list = Array.isArray(candidates) ? candidates : [];
    const sourcesPresent = new Set<DimSource>();
    let dropped = 0;

    // 1. Sanitize: keep only finite values from a valid source. Drop+count the rest (never silently include garbage).
    const clean: CleanCandidate[] = [];
    for (const c of list) {
      const v = Number(c?.value_mm);
      const src = c?.source as DimSource;
      if (!Number.isFinite(v) || !VALID_SOURCES.has(src)) { dropped++; continue; }
      const type: DimType = (typeof c.type === "string" && c.type ? c.type : "unknown") as DimType;
      const conf = c.confidence != null ? clamp01(c.confidence) : DEFAULT_SOURCE_CONFIDENCE[src];
      clean.push({ value_mm: v, type, source: src, confidence: conf, label: typeof c.label === "string" && c.label.trim() ? c.label.trim() : undefined });
      sourcesPresent.add(src);
    }

    // 2. Cluster within (type) by value-within-tolerance, closest-first single linkage. Each cluster
    //    is one reconciled dimension. CNC values participate in clustering ASSOCIATION (so a toolpath
    //    feature attaches to the right print/cad dim), but never vote the value (handled in buildDimension).
    //    Sort by value so clustering is deterministic + order-independent.
    const byType = new Map<DimType, CleanCandidate[]>();
    for (const c of clean) {
      const arr = byType.get(c.type) ?? [];
      arr.push(c);
      byType.set(c.type, arr);
    }

    const dimensions: ReconciledDimension[] = [];
    for (const [type, arr] of byType) {
      const sorted = [...arr].sort((a, b) => a.value_mm - b.value_mm);
      let cluster: CleanCandidate[] = [];
      const flush = () => {
        if (!cluster.length) return;
        dimensions.push(this.buildDimension(type, cluster));
        cluster = [];
      };
      for (const c of sorted) {
        if (cluster.length === 0) { cluster.push(c); continue; }
        // chain to the cluster if within tolerance of the most-recent (sorted) member
        const last = cluster[cluster.length - 1];
        if (valuesMatch(last.value_mm, c.value_mm, type, opts)) cluster.push(c);
        else { flush(); cluster.push(c); }
      }
      flush();
    }

    // 3. Conflict detection: a label that appears in ≥2 DISTINCT clusters means the same named
    //    feature got divergent values across sources — a real discrepancy. Flag it (never merge).
    const conflicts = this.detectConflicts(dimensions, opts);

    const confirmed = dimensions.filter((d) => d.status === "confirmed").length;
    const presenceOnly = dimensions.filter((d) => d.status === "presence_only").length;
    const total = dimensions.length;
    // trusted, multi-metric dims first; presence-only (untrusted value) last.
    dimensions.sort((a, b) =>
      (Number(b.value_trusted) - Number(a.value_trusted)) ||
      (b.metric_sources.length - a.metric_sources.length) ||
      (b.confidence - a.confidence) ||
      (a.value_mm - b.value_mm),
    );

    return {
      dimensions,
      conflicts,
      coverage: {
        total,
        confirmed,
        single_source: total - confirmed - presenceOnly,
        presence_only: presenceOnly,
        multi_source_rate: total ? round(confirmed / total, 4) : 0,
        sources_present: [...sourcesPresent],
        candidates_in: list.length,
        candidates_dropped: dropped,
      },
    };
  }

  private buildDimension(type: DimType, cluster: CleanCandidate[]): ReconciledDimension {
    const metric = cluster.filter((c) => METRIC_SOURCES.has(c.source));
    const presence = cluster.filter((c) => PRESENCE_SOURCES.has(c.source));
    const hasMetric = metric.length > 0;
    const cncPresence = presence.length > 0;

    // The consensus value, spread, and confidence derive from METRIC (print/cad) sources only —
    // a CNC G-code coordinate is a position, not a nominal, so it must NEVER vote the value. For a
    // CNC-only cluster there is no metric basis: we still report the coordinate (for association /
    // operator review) but flag value_trusted:false so it is never mistaken for a measured nominal.
    const valueBasis = hasMetric ? metric : presence;
    const wsum = valueBasis.reduce((s, c) => s + c.confidence, 0);
    const value = wsum > 0
      ? valueBasis.reduce((s, c) => s + c.value_mm * c.confidence, 0) / wsum
      : valueBasis.reduce((s, c) => s + c.value_mm, 0) / valueBasis.length;
    const values = valueBasis.map((c) => c.value_mm);
    const spread = Math.max(...values) - Math.min(...values);

    const distinctMetricSources = [...new Set(metric.map((c) => c.source))];
    const distinctAllSources = [...new Set(cluster.map((c) => c.source))];

    // confidence: noisy-OR over DISTINCT value-basis sources only (independent measurement evidence).
    // CNC presence never inflates the value-confidence of a metric dim.
    const perSourceBest = [...new Set(valueBasis.map((c) => c.source))].map((src) =>
      Math.max(...valueBasis.filter((c) => c.source === src).map((c) => c.confidence)),
    );

    const status: ReconciledDimension["status"] = hasMetric
      ? (distinctMetricSources.length >= 2 ? "confirmed" : "single_source")
      : "presence_only";
    const label = cluster.map((c) => c.label).find(Boolean);
    return {
      value_mm: round(value, 4),
      type,
      status,
      sources: distinctAllSources,
      metric_sources: distinctMetricSources,
      cnc_presence: cncPresence,
      value_trusted: hasMetric,
      confidence: combineConfidence(perSourceBest),
      spread_mm: round(spread, 4),
      contributions: cluster.map((c) => ({
        source: c.source,
        value_mm: round(c.value_mm, 4),
        confidence: round(c.confidence, 4),
        role: METRIC_SOURCES.has(c.source) ? "metric" : "presence",
      })),
      label,
    };
  }

  private detectConflicts(dimensions: ReconciledDimension[], _opts: { pct?: number; absMm?: number; angularDeg?: number }): DimConflict[] {
    const conflicts: DimConflict[] = [];
    // group reconciled dims by (type,label); a label landing in ≥2 distinct clusters = conflict.
    // Only value_trusted (metric-backed) dims participate — a presence_only CNC coordinate is not a
    // nominal, so it must never raise a false value-conflict against a real dimension.
    const byKey = new Map<string, ReconciledDimension[]>();
    for (const d of dimensions) {
      if (!d.label || !d.value_trusted) continue;
      const key = `${d.type}::${d.label}`;
      const arr = byKey.get(key) ?? [];
      arr.push(d);
      byKey.set(key, arr);
    }
    for (const [key, dims] of byKey) {
      if (dims.length < 2) continue;
      const [type, label] = key.split("::");
      const values = dims.flatMap((d) => d.contributions
        .filter((c) => c.role === "metric")
        .map((c) => ({ source: c.source, value_mm: c.value_mm, confidence: c.confidence })));
      const vs = values.map((v) => v.value_mm);
      conflicts.push({
        type: type as DimType,
        label,
        values,
        spread_mm: round(Math.max(...vs) - Math.min(...vs), 4),
        reason: `feature "${label}" has divergent ${type} values across sources beyond tolerance — operator review required`,
      });
    }
    return conflicts;
  }
}

export const crossSourceDimensionReconciliationEngine = new CrossSourceDimensionReconciliationEngine();
