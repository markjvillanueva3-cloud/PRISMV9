/**
 * cmm-uncertainty-emit.mjs — first-order linear uncertainty propagation
 * for CMM measurement chains, surfaced as dialect-aware G-code comments
 * alongside probing-cycle emits (G31/Renishaw/Heidenhain TCH PROBE).
 *
 * Why "CMM uncertainty propagation at emit":
 *   Standard probing emits report measured values without uncertainty:
 *     ( PROBE WCS origin = X100.0234 Y50.0456 Z-25.0089 )
 *   Operators read those as exact when they're really:
 *     X100.0234 ± 0.0035  Y50.0456 ± 0.0042  Z-25.0089 ± 0.0028
 *   This lib propagates probe-stylus σ + repeatability σ + WCS-origin σ
 *   through linear (first-order Taylor) uncertainty propagation to
 *   emit the calibrated band on every measured value.
 *
 *   Echo-soul: pure-linear-algebra observability. The σ INPUTS come
 *   from upstream (probe calibration, machine-specific repeatability
 *   spec, fixture-spec). This lib only propagates them through the
 *   linear chain + emits per dialect.
 *
 *   Failure mode the unit prevents: silent uncertainty-suppression on
 *   probing emits (R12 — never report a measurement without its band).
 *
 * Math (first-order linear propagation, independent inputs):
 *   y = f(x₁, x₂, ..., xₙ)
 *   σ_y² = Σᵢ (∂y/∂xᵢ)² · σ_xᵢ²
 *
 * Special cases pre-derived (closed-form):
 *   - Translation (y = x₁ + x₂):              σ_y² = σ₁² + σ₂²
 *   - Subtraction (y = x₁ - x₂):              σ_y² = σ₁² + σ₂² (signs squared)
 *   - Scaled sum (y = a·x₁ + b·x₂):           σ_y² = a²·σ₁² + b²·σ₂²
 *   - Tol stackup of N independent (σᵢ):       σ_stack = √Σ σᵢ²
 *   - Average of N readings:                  σ_mean = σ / √N
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-EMIT-CMM-UNCERTAINTY-PROPAGATION
 * @phase 6 EMIT-side · @row 42 · @effort 3d
 * @slot echo · @date 2026-05-27
 */

export const CMM_UNCERTAINTY_EMIT_SCHEMA_VERSION = 1;

export const DEFAULT_DECIMAL_PLACES = 4;

/** Default coverage factor k=2 (≈95% under Gaussian, ISO GUM convention). */
export const DEFAULT_COVERAGE_FACTOR = 2;

/** Max chain links — guards runaway propagation on bad input. */
export const MAX_CHAIN_LINKS = 64;

export const SUPPORTED_DIALECTS = ["fanuc", "haas", "heidenhain", "mitsubishi", "siemens"];

const COMMENT_DELIMITERS = {
  fanuc: { open: "( ", close: " )" },
  haas: { open: "( ", close: " )" },
  mitsubishi: { open: "( ", close: " )" },
  heidenhain: { open: "; ", close: "" },
  siemens: { open: "; ", close: "" },
};

/** Pure: dialect comment wrap (mirrors iter51-56 paren-strip pattern). */
export function formatComment(dialect, text) {
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  if (typeof text !== "string") return null;
  const d = COMMENT_DELIMITERS[dialect];
  const safe = (dialect === "fanuc" || dialect === "haas" || dialect === "mitsubishi")
    ? text.replace(/[()]/g, "")
    : text;
  return `${d.open}${safe}${d.close}`;
}

/**
 * Pure: propagate σ through a linear combination y = Σ aᵢ · xᵢ.
 *   σ_y² = Σᵢ aᵢ² · σ_xᵢ²
 * coefficients and sigmas must be same-length arrays of finite numbers.
 * sigmas must be ≥ 0 (variance is non-negative).
 * Returns σ_y on success, null on bad input.
 */
export function propagateLinearCombination(coefficients, sigmas) {
  if (!Array.isArray(coefficients) || !Array.isArray(sigmas)) return null;
  if (coefficients.length !== sigmas.length) return null;
  if (coefficients.length === 0 || coefficients.length > MAX_CHAIN_LINKS) return null;
  let varSum = 0;
  for (let i = 0; i < coefficients.length; i++) {
    const a = coefficients[i];
    const s = sigmas[i];
    if (!Number.isFinite(a) || !Number.isFinite(s)) return null;
    if (s < 0) return null;
    varSum += a * a * s * s;
  }
  return Math.sqrt(varSum);
}

/**
 * Pure: RSS tolerance stackup of N independent components.
 *   σ_stack = √(Σ σᵢ²)
 * Same as propagateLinearCombination with all coefficients = 1.
 */
export function tolerancestackupRSS(sigmas) {
  if (!Array.isArray(sigmas)) return null;
  return propagateLinearCombination(sigmas.map(() => 1), sigmas);
}

/**
 * Pure: σ of the sample mean of N independent readings.
 *   σ_mean = σ / √N
 * Returns null on n ≤ 0 or non-finite σ.
 */
export function sigmaOfMean(sigma, n) {
  if (!Number.isFinite(sigma) || sigma < 0) return null;
  if (!Number.isInteger(n) || n <= 0) return null;
  return sigma / Math.sqrt(n);
}

/**
 * Pure: σ of a difference of two independent measurements.
 *   σ_diff² = σ₁² + σ₂²
 */
export function sigmaOfDifference(sigma1, sigma2) {
  if (!Number.isFinite(sigma1) || !Number.isFinite(sigma2)) return null;
  if (sigma1 < 0 || sigma2 < 0) return null;
  return Math.sqrt(sigma1 * sigma1 + sigma2 * sigma2);
}

/**
 * Pure: expanded uncertainty U = k · σ.
 *   ISO GUM convention: k=2 ≈ 95% coverage interval under Gaussian.
 */
export function expandedUncertainty(sigma, k) {
  if (!Number.isFinite(sigma) || sigma < 0) return null;
  const kk = Number.isFinite(k) ? k : DEFAULT_COVERAGE_FACTOR;
  if (kk <= 0) return null;
  return kk * sigma;
}

/**
 * Pure: propagate σ through a 3-axis WCS-origin chain.
 *
 * Per-axis chain links: [{name, sigma}, {name, sigma}, ...]
 * Returns { x: σ_x, y: σ_y, z: σ_z } where each axis stacks its
 * own independent contributions via RSS.
 *
 * Returns null on bad input.
 */
export function propagateWCSOriginChain(chains) {
  if (!chains || typeof chains !== "object") return null;
  const out = {};
  for (const axis of ["x", "y", "z"]) {
    const links = chains[axis];
    if (!Array.isArray(links)) return null;
    if (links.length === 0 || links.length > MAX_CHAIN_LINKS) return null;
    const sigmas = [];
    for (const link of links) {
      if (!link || typeof link !== "object") return null;
      if (typeof link.name !== "string" || link.name.length === 0) return null;
      if (!Number.isFinite(link.sigma) || link.sigma < 0) return null;
      sigmas.push(link.sigma);
    }
    const stacked = tolerancestackupRSS(sigmas);
    if (stacked == null) return null;
    out[axis] = stacked;
  }
  return out;
}

/**
 * Pure: format a measurement value + ± uncertainty band.
 *   "X100.0234 ± 0.0035 (k=2)"
 */
export function formatValueWithUncertainty(value, sigma, label, options) {
  if (!Number.isFinite(value)) return null;
  if (!Number.isFinite(sigma) || sigma < 0) return null;
  if (typeof label !== "string" || label.length === 0) return null;
  const k = Number.isFinite(options?.coverageFactor) ? options.coverageFactor : DEFAULT_COVERAGE_FACTOR;
  const U = k * sigma;
  const dp = Number.isFinite(options?.decimalPlaces) && options.decimalPlaces >= 0
    ? Math.floor(options.decimalPlaces)
    : DEFAULT_DECIMAL_PLACES;
  return `${label}${value.toFixed(dp)} +/- ${U.toFixed(dp)} (k=${k})`;
}

/**
 * Pure: build a WCS-origin probing emit comment for the dialect.
 *
 * @param {Object} req — { wcs: {x, y, z}, sigmas: {x, y, z}, dialect, options }
 * @returns dialect-aware comment line (single line per dialect).
 */
export function buildWCSProbeUncertaintyComment(req) {
  if (!req || typeof req !== "object") return null;
  const { wcs, sigmas, dialect } = req;
  if (!wcs || !sigmas) return null;
  if (!Number.isFinite(wcs.x) || !Number.isFinite(wcs.y) || !Number.isFinite(wcs.z)) return null;
  if (!Number.isFinite(sigmas.x) || !Number.isFinite(sigmas.y) || !Number.isFinite(sigmas.z)) return null;
  if (sigmas.x < 0 || sigmas.y < 0 || sigmas.z < 0) return null;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const xText = formatValueWithUncertainty(wcs.x, sigmas.x, "X", req.options);
  const yText = formatValueWithUncertainty(wcs.y, sigmas.y, "Y", req.options);
  const zText = formatValueWithUncertainty(wcs.z, sigmas.z, "Z", req.options);
  if (xText == null || yText == null || zText == null) return null;
  const text = `WCS-PROBE  ${xText}  ${yText}  ${zText}`;
  return formatComment(dialect, text);
}

/**
 * Pure: full pipeline. Emits one header summarizing the chain + one
 * per-axis ± line for the propagated WCS-origin uncertainty.
 *
 * @param {Object} req
 * @param {Object} req.wcs — { x, y, z } measured WCS origin
 * @param {Object} req.chains — { x: [{name,sigma},...], y: [...], z: [...] }
 * @param {string} req.dialect
 * @param {Object} [req.options] — { decimalPlaces, coverageFactor }
 * @returns {Object|null} { lines, headerLine, sigmas, summary }
 */
export function emitCMMUncertainty(req) {
  if (!req || typeof req !== "object") return null;
  const { wcs, chains, dialect } = req;
  if (!SUPPORTED_DIALECTS.includes(dialect)) return null;
  const sigmas = propagateWCSOriginChain(chains);
  if (sigmas == null) return null;
  if (!wcs || typeof wcs !== "object") return null;
  if (!Number.isFinite(wcs.x) || !Number.isFinite(wcs.y) || !Number.isFinite(wcs.z)) return null;
  const k = Number.isFinite(req.options?.coverageFactor) ? req.options.coverageFactor : DEFAULT_COVERAGE_FACTOR;
  const headerText = `CMM-UNCERTAINTY chain-links X=${chains.x.length} Y=${chains.y.length} Z=${chains.z.length} k=${k}`;
  const headerLine = formatComment(dialect, headerText);
  if (headerLine == null) return null;
  const probeLine = buildWCSProbeUncertaintyComment({
    wcs, sigmas, dialect, options: req.options,
  });
  if (probeLine == null) return null;
  return {
    lines: [headerLine, probeLine],
    headerLine,
    sigmas,
    summary: {
      coverageFactor: k,
      linkCountX: chains.x.length,
      linkCountY: chains.y.length,
      linkCountZ: chains.z.length,
      dialect,
      schemaVersion: CMM_UNCERTAINTY_EMIT_SCHEMA_VERSION,
    },
  };
}
