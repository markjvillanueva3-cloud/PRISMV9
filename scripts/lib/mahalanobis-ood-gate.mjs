/**
 * mahalanobis-ood-gate.mjs — refuse-hallucinated-emit gate via
 * Mahalanobis distance (diagonal-covariance approximation) against
 * the training-corpus reference state.
 *
 * Why "refuse hallucinated emits":
 *   When the SF / cycle-time / wear engines emit a recommendation for
 *   a feature point far outside the training distribution, the
 *   numerical value is *interpolation gone extrapolation*. The post
 *   should fail-loud-refuse rather than emit a confident-looking but
 *   unsupported S-word / F-word. Mahalanobis distance vs the corpus
 *   mean+stddev gives a calibrated χ² threshold (df = vector dim).
 *
 *   Failure mode the gate prevents: silent corpus-extrapolation
 *   confidence inflation (R12 — never hide uncertainty).
 *
 * Pipeline (reuses iter51 dialect-aware comment pattern):
 *   1. Build reference state from training corpus: {mean[], stddev[], n}
 *      via buildReferenceState(corpus). Sample variance (n-1 divisor).
 *   2. For each emit candidate, compute d² via mahalanobisDistanceSquared
 *      under the diagonal-covariance approximation:
 *        d² = Σᵢ ((xᵢ - μᵢ) / σᵢ)²
 *   3. Compare d² against χ² critical values at p=0.95 (PASS bound)
 *      and p=0.99 (WARN bound). Above p=0.99 → REFUSE.
 *   4. emitWithOodGate(...) wraps the decision: returns
 *      { allowed, classification, distance, comment, programLine }.
 *
 * Echo-soul: post-processor observability + refuse-gate ONLY. No
 * inline physics (Kc / Vc / Taylor C live upstream of the corpus
 * that feeds this lib). Diagonal-covariance keeps the math hand-
 * verifiable; full-covariance is intentionally out of scope.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-MAHALANOBIS-OOD-GATE
 * @slot echo · @date 2026-05-27
 */

export const MAHALANOBIS_OOD_SCHEMA_VERSION = 1;

/** Min corpus rows required to build a valid reference state (sample variance). */
export const MIN_CORPUS_ROWS = 2;

/** Default decimal precision for emitted distance values. */
export const DEFAULT_DECIMAL_PLACES = 3;

/** Default PASS / WARN p-levels (REFUSE = above WARN). */
export const DEFAULT_PASS_LEVEL = 0.95;
export const DEFAULT_WARN_LEVEL = 0.99;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

/**
 * χ² critical values for df=1..6 at p ∈ {0.95, 0.99, 0.999}.
 * Hand-verifiable from any standard χ² table; used to map d² → PASS/WARN/REFUSE.
 * Source: Abramowitz & Stegun Table 26.8, cross-checked vs scipy.stats.chi2.ppf.
 */
export const CHI_SQ_CRITICAL = {
  0.95: { 1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070, 6: 12.592 },
  0.99: { 1: 6.635, 2: 9.210, 3: 11.345, 4: 13.277, 5: 15.086, 6: 16.812 },
  0.999: { 1: 10.828, 2: 13.816, 3: 16.266, 4: 18.467, 5: 20.515, 6: 22.458 },
};

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/**
 * Look up χ² critical value for given p-level and degrees of freedom.
 * Returns null on unsupported (p, df) combination.
 */
export function chiSquareCritical(pLevel, df) {
  const table = CHI_SQ_CRITICAL[pLevel];
  if (!table) return null;
  if (!Number.isInteger(df) || df < 1 || df > 6) return null;
  return table[df];
}

/**
 * Pure: build a reference state {mean[], stddev[], dim, n} from a training corpus.
 * Corpus rows must all have the same dim and ≥ MIN_CORPUS_ROWS rows.
 * Uses sample variance (n-1 divisor) — the unbiased estimator.
 * Returns null on bad input or zero-variance dimension.
 */
export function buildReferenceState(corpus) {
  if (!Array.isArray(corpus) || corpus.length < MIN_CORPUS_ROWS) return null;
  const dim = Array.isArray(corpus[0]) ? corpus[0].length : 0;
  if (dim < 1 || dim > 6) return null;
  for (const row of corpus) {
    if (!Array.isArray(row) || row.length !== dim) return null;
    for (const v of row) {
      if (!Number.isFinite(v)) return null;
    }
  }
  const n = corpus.length;
  const mean = new Array(dim).fill(0);
  for (const row of corpus) {
    for (let i = 0; i < dim; i++) mean[i] += row[i];
  }
  for (let i = 0; i < dim; i++) mean[i] /= n;
  const variance = new Array(dim).fill(0);
  for (const row of corpus) {
    for (let i = 0; i < dim; i++) {
      const d = row[i] - mean[i];
      variance[i] += d * d;
    }
  }
  for (let i = 0; i < dim; i++) variance[i] /= (n - 1);
  const stddev = variance.map((v) => Math.sqrt(v));
  for (const s of stddev) {
    if (!Number.isFinite(s) || s <= 0) return null; // zero-variance dim is unsupported
  }
  return {
    mean,
    stddev,
    dim,
    n,
    schemaVersion: MAHALANOBIS_OOD_SCHEMA_VERSION,
  };
}

/**
 * Pure: compute squared Mahalanobis distance under diagonal covariance.
 *   d² = Σᵢ ((xᵢ - μᵢ) / σᵢ)²
 * Returns null on bad input (dim mismatch, non-finite, missing state).
 */
export function mahalanobisDistanceSquared(point, state) {
  if (!state || typeof state !== "object") return null;
  if (!Array.isArray(state.mean) || !Array.isArray(state.stddev)) return null;
  if (!Array.isArray(point) || point.length !== state.dim) return null;
  let d2 = 0;
  for (let i = 0; i < state.dim; i++) {
    if (!Number.isFinite(point[i])) return null;
    const z = (point[i] - state.mean[i]) / state.stddev[i];
    d2 += z * z;
  }
  return d2;
}

/** Pure: Mahalanobis distance (sqrt of squared). */
export function mahalanobisDistance(point, state) {
  const d2 = mahalanobisDistanceSquared(point, state);
  if (d2 == null) return null;
  return Math.sqrt(d2);
}

/**
 * Pure: classify a point against the reference state.
 * Returns { distance, distanceSquared, df, passThreshold, warnThreshold,
 *           classification: 'PASS'|'WARN'|'REFUSE', allowed: boolean }.
 * Returns null on bad input.
 *
 * Classification rules (default p=0.95 / 0.99):
 *   d² ≤ χ²(passLevel, df) → PASS
 *   passT < d² ≤ χ²(warnLevel, df) → WARN
 *   d² > warnT → REFUSE
 */
export function classifyPoint(point, state, options) {
  const d2 = mahalanobisDistanceSquared(point, state);
  if (d2 == null) return null;
  const passLevel = options?.passLevel ?? DEFAULT_PASS_LEVEL;
  const warnLevel = options?.warnLevel ?? DEFAULT_WARN_LEVEL;
  const passThreshold = chiSquareCritical(passLevel, state.dim);
  const warnThreshold = chiSquareCritical(warnLevel, state.dim);
  if (passThreshold == null || warnThreshold == null) return null;
  let classification;
  if (d2 <= passThreshold) classification = "PASS";
  else if (d2 <= warnThreshold) classification = "WARN";
  else classification = "REFUSE";
  return {
    distance: Math.sqrt(d2),
    distanceSquared: d2,
    df: state.dim,
    passLevel,
    warnLevel,
    passThreshold,
    warnThreshold,
    classification,
    allowed: classification !== "REFUSE",
  };
}

/**
 * Pure: format a comment string for the target dialect.
 * Mirrors iter51 conformal-pi-emit.formatComment — strips embedded
 * `(` and `)` from Fanuc-family dialects (nesting-illegal); ascii-safe
 * pass-through for Heidenhain/Siemens.
 */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safeText = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safeText}${d.close}`;
}

/**
 * Pure: format the gate verdict band as text (no comment wrapping).
 */
export function formatGateBandText(classification, options) {
  if (!classification || typeof classification !== "object") return null;
  if (!["PASS", "WARN", "REFUSE"].includes(classification.classification)) return null;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  const dStr = Number(classification.distance).toFixed(dp);
  const d2Str = Number(classification.distanceSquared).toFixed(dp);
  const wT = Number(classification.warnThreshold).toFixed(dp);
  return `OOD ${classification.classification}  d=${dStr}  d²=${d2Str}  χ²(${classification.warnLevel},df=${classification.df})=${wT}`;
}

/**
 * Pure: build a complete gate comment line for the target dialect.
 * Returns null on bad input.
 */
export function buildOodGateComment({ point, state, dialect, options }) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const cls = classifyPoint(point, state, options);
  if (cls == null) return null;
  const bandText = formatGateBandText(cls, options);
  if (bandText == null) return null;
  return formatComment(dialect, bandText);
}

/**
 * Pure: full emit-with-gate pipeline.
 *
 * @param {Object} req
 * @param {number[]} req.point — feature vector to evaluate
 * @param {Object} req.state — reference state from buildReferenceState
 * @param {string} req.dialect — one of SUPPORTED_DIALECTS
 * @param {string} [req.programLine] — the candidate emit line (S-word, F-word, etc.)
 * @param {Object} [req.options] — { passLevel, warnLevel, decimalPlaces }
 * @returns {Object|null} { allowed, classification, distance, comment, programLine, summary }
 *
 * When allowed=false (REFUSE), the gate emits the comment but suppresses
 * the programLine — caller MUST either skip emit or escalate to operator
 * approval. When allowed=true, both comment + programLine are returned.
 */
export function emitWithOodGate(req) {
  if (!req || typeof req !== "object") return null;
  const { point, state, dialect, programLine } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const cls = classifyPoint(point, state, req.options);
  if (cls == null) return null;
  const comment = buildOodGateComment({ point, state, dialect, options: req.options });
  if (comment == null) return null;
  const allowed = cls.allowed;
  return {
    allowed,
    classification: cls.classification,
    distance: cls.distance,
    distanceSquared: cls.distanceSquared,
    comment,
    programLine: (allowed && typeof programLine === "string") ? programLine : null,
    summary: {
      df: cls.df,
      passThreshold: cls.passThreshold,
      warnThreshold: cls.warnThreshold,
      dialect,
      schemaVersion: MAHALANOBIS_OOD_SCHEMA_VERSION,
    },
  };
}
