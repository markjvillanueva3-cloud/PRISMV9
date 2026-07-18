/**
 * cadGeomEvalHarness.ts -- DELTA-CAD-COMPLETION / U-DELTA-EVAL-HARNESS (geometry modality).
 *
 * The GEOMETRY half of the CAD eval-harness: score a model's predicted B-Rep geometry against the
 * frozen geom-50 held-out split (the B-Rep eval set), COMPOSING CADGeometryComparisonEngine.compare
 * (delta's existing geometry scorer -- volume / bbox / topology-Jaccard / Hausdorff). Sibling of the
 * dimension modality (scripts/lib/cad-eval-harness-lib.mjs, which composes dimension-set-score).
 *
 * Held-out discipline (same as the dim modality): score ONLY parts in the frozen geom-50 split; a
 * prediction for a NON-held part is flagged as eval contamination (evaluating on a training part is the
 * train/test leak the leak-guard exists to prevent). The held key is the held part's TRUTH abs_path
 * itself (unique per the freezer's path-dedup -- no stem-collision coverage-inflation, the lesson from
 * the dim modality).
 *
 * compareFn is INJECTED (defaults to cadGeometryComparisonEngine.compare) so the pure aggregate/gate
 * logic is unit-testable with a mock AND live-validatable against the real engine (compare-to-self on a
 * real geom-50 file -> overallPassed true, passRate 1). It NEVER runs a model -- it consumes a map of
 * {held part -> predicted geometry file path}.
 */
import { cadGeometryComparisonEngine } from "../CADGeometryComparisonEngine.js";

/**
 * The subset of CADGeometryComparisonEngine's ComparisonResult that the harness actually reads. The
 * engine's full ComparisonResult is structurally assignable to this, so the real compare drops in; a
 * mock only needs these three fields (no double-cast).
 */
export interface ComparisonResultLike {
  overallPassed: boolean;
  passRate: number;
  topologySimilarity: number;
}

/** A pluggable geometry comparator: (truthPath, predictedPath) -> ComparisonResultLike. */
export type GeomCompareFn = (originalPath: string, generatedPath: string) => ComparisonResultLike;

export interface GeomPartScore {
  part: string;
  overallPassed: boolean;
  passRate: number;
  topologySimilarity: number;
}

export interface GeomEvalAggregate {
  scored: number;
  passed: number;
  passFraction: number | null;
  meanPassRate: number | null;
  meanTopologySimilarity: number | null;
}

export interface GeomEvalResult {
  aggregate: GeomEvalAggregate;
  perPart: GeomPartScore[];
  scored: number;
  heldTotal: number;
  missingPrediction: string[];  // held part with truth, no prediction supplied
  compareErrors: string[];      // held part whose compare() threw (unscorable -- surfaced, not silently dropped)
  nonHeldPredictions: string[]; // a prediction for a part NOT in the held split (eval contamination)
}

/** Normalize a file path to a stable comparison key (lowercase, forward-slash, collapsed). Full path,
 *  NOT the basename -- distinct files must never collide (the dim-modality coverage-inflation lesson). */
export function normGeomKey(p: string): string {
  if (typeof p !== "string") return "";
  return p.trim().toLowerCase().replace(/\\/g, "/").replace(/\/+/g, "/");
}

function heldEntries(splitOrEntries: unknown): Array<{ abs_path?: string }> {
  if (Array.isArray(splitOrEntries)) return splitOrEntries as Array<{ abs_path?: string }>;
  const held = (splitOrEntries as { held?: unknown })?.held;
  return Array.isArray(held) ? (held as Array<{ abs_path?: string }>) : [];
}

/**
 * Score predicted geometry against the held geom split.
 * @param predByPath  {heldKey -> predicted geometry file path}. heldKey is the truth abs_path (any case/sep).
 * @param splitOrEntries  the frozen geom split object (.held[]) or a bare entry array ({abs_path}).
 * @param opts.compareFn  geometry comparator (defaults to cadGeometryComparisonEngine.compare).
 */
export function geomEvalHeldOut(
  predByPath: Record<string, string> | Map<string, string> | null | undefined,
  splitOrEntries: unknown,
  opts: { compareFn?: GeomCompareFn } = {},
): GeomEvalResult {
  const compareFn: GeomCompareFn = opts.compareFn
    ?? ((a, b) => cadGeometryComparisonEngine.compare(a, b));

  const heldMap = new Map<string, string>(); // key -> truth abs_path
  for (const e of heldEntries(splitOrEntries)) {
    if (e && typeof e.abs_path === "string" && e.abs_path.trim()) {
      heldMap.set(normGeomKey(e.abs_path), e.abs_path);
    }
  }
  const preds = new Map<string, string>();
  const predEntries = predByPath instanceof Map ? predByPath.entries() : Object.entries(predByPath ?? {});
  for (const [k, v] of predEntries) {
    const nk = normGeomKey(String(k));
    if (nk && typeof v === "string" && v.trim()) preds.set(nk, v);
  }

  const nonHeldPredictions: string[] = [];
  for (const k of preds.keys()) if (!heldMap.has(k)) nonHeldPredictions.push(k);

  const perPart: GeomPartScore[] = [];
  const missingPrediction: string[] = [];
  const compareErrors: string[] = [];
  for (const [key, truthPath] of heldMap) {
    if (!preds.has(key)) { missingPrediction.push(key); continue; }
    let r: ComparisonResultLike;
    try {
      r = compareFn(truthPath, preds.get(key) as string);
    } catch {
      compareErrors.push(key); // R12: a compare failure is surfaced, never folded into "missing"
      continue;
    }
    perPart.push({
      part: key,
      overallPassed: !!r.overallPassed,
      passRate: Number.isFinite(r.passRate) ? r.passRate : 0,
      topologySimilarity: Number.isFinite(r.topologySimilarity) ? r.topologySimilarity : 0,
    });
  }

  const scored = perPart.length;
  const passed = perPart.filter((p) => p.overallPassed).length;
  const mean = (sel: (p: GeomPartScore) => number) =>
    scored ? +(perPart.reduce((s, p) => s + sel(p), 0) / scored).toFixed(4) : null;

  return {
    aggregate: {
      scored,
      passed,
      passFraction: scored ? +(passed / scored).toFixed(4) : null,
      meanPassRate: mean((p) => p.passRate),
      meanTopologySimilarity: mean((p) => p.topologySimilarity),
    },
    perPart,
    scored,
    heldTotal: heldMap.size,
    missingPrediction,
    compareErrors,
    nonHeldPredictions,
  };
}

export const DEFAULT_MIN_PASS_FRACTION = 0.9;   // fraction of scored held parts whose geometry overallPassed
export const DEFAULT_MIN_MEAN_TOPOLOGY = 0.9;   // mean topology Jaccard similarity floor
export const DEFAULT_MIN_COVERAGE = 0.5;        // fraction of held parts that are scorable

export interface GeomGateResult {
  pass: boolean;
  reasons: string[];
  passFraction: number | null;
  meanTopologySimilarity: number | null;
  coverage: number;
}

/** Deterministic PASS/FAIL gate over a geomEvalHeldOut result (R12 -- explicit, fail-loud). */
export function gateGeomEval(
  result: GeomEvalResult,
  opts: { minPassFraction?: number; minMeanTopology?: number; minCoverage?: number } = {},
): GeomGateResult {
  const minPass = Number.isFinite(opts.minPassFraction) ? (opts.minPassFraction as number) : DEFAULT_MIN_PASS_FRACTION;
  const minTopo = Number.isFinite(opts.minMeanTopology) ? (opts.minMeanTopology as number) : DEFAULT_MIN_MEAN_TOPOLOGY;
  const minCov = Number.isFinite(opts.minCoverage) ? (opts.minCoverage as number) : DEFAULT_MIN_COVERAGE;
  const agg = result?.aggregate ?? ({} as GeomEvalAggregate);
  const heldTotal = Number.isFinite(result?.heldTotal) ? result.heldTotal : 0;
  const scored = Number.isFinite(result?.scored) ? result.scored : 0;
  const coverage = heldTotal > 0 ? +(scored / heldTotal).toFixed(4) : 0;
  const reasons: string[] = [];

  if (scored === 0) reasons.push("no held parts were scorable (0 predictions compared) -- cannot evaluate");
  if (coverage < minCov) reasons.push(`coverage ${coverage} < ${minCov} (too few held parts have a prediction)`);
  const pf = agg.passFraction;
  if (pf === null || pf === undefined) reasons.push("passFraction is null (no scored parts)");
  else if (pf < minPass) reasons.push(`passFraction ${pf} < ${minPass}`);
  const topo = agg.meanTopologySimilarity;
  if (Number.isFinite(topo) && (topo as number) < minTopo) reasons.push(`meanTopologySimilarity ${topo} < ${minTopo}`);
  if (Array.isArray(result?.compareErrors) && result.compareErrors.length) {
    reasons.push(`${result.compareErrors.length} held part(s) errored during compare (unscorable)`);
  }
  if (Array.isArray(result?.nonHeldPredictions) && result.nonHeldPredictions.length) {
    reasons.push(`${result.nonHeldPredictions.length} prediction(s) for NON-held parts (eval contamination)`);
  }

  return {
    pass: reasons.length === 0,
    reasons,
    passFraction: pf ?? null,
    meanTopologySimilarity: Number.isFinite(topo) ? (topo as number) : null,
    coverage,
  };
}
