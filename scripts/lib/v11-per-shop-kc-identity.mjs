/**
 * v11-per-shop-kc-identity.mjs — Bayesian per-shop Kienzle kc1.1 posterior.
 *
 * Fleet-default kc1.1 values (e.g., P=1800 N/mm² for steel) are general
 * priors; each shop's actual kc varies ±15-30% from canonical because of
 * machine condition, coolant chemistry, tool brand mix, programmer style,
 * and material lot drift. Today PRISM recommends 20-30% conservative
 * feeds because operators don't trust the calc.
 *
 * This pure-fn library carries a per-(shop,material) Normal-Normal
 * conjugate posterior over kc. Each measured cutting-force observation
 * is folded into the posterior; recommendKc() returns the fleet default
 * UNTIL the posterior is trusted (≥ MIN_OBSERVATIONS_FOR_TRUST samples),
 * then returns the shop-specific posterior mean. This closes the
 * conservative-feed gap → ~$12K/mo cycle-time savings at JM Die mix.
 *
 * Conjugate Normal-Normal update (known observation variance σ²_o):
 *   precision_post  = 1/σ₀² + N/σ²_o
 *   variance_post   = 1/precision_post
 *   mean_post       = variance_post × (μ₀/σ₀² + Σ(yᵢ)/σ²_o)
 *
 * Pure functions only. Caller persists JSON state per (shop, material).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-NOVEL-PER-SHOP-KC-IDENTITY
 * @slot echo · @iter 29 · @date 2026-05-27
 */

export const KC_POSTERIOR_SCHEMA_VERSION = 1;
export const DEFAULT_PRIOR_VARIANCE = 40000;
export const DEFAULT_OBS_VARIANCE = 10000;
export const MIN_OBSERVATIONS_FOR_TRUST = 5;
export const DEFAULT_CI_Z = 1.96;

/** Pure: create a fresh posterior anchored at the fleet-default kc. */
export function createKcPosterior(args) {
  const a = args || {};
  const fleetDefault = Number(a.fleetDefault);
  if (!Number.isFinite(fleetDefault) || fleetDefault <= 0) return null;
  const priorVar = Number.isFinite(Number(a.priorVariance)) && Number(a.priorVariance) > 0
    ? Number(a.priorVariance)
    : DEFAULT_PRIOR_VARIANCE;
  return {
    schemaVersion: KC_POSTERIOR_SCHEMA_VERSION,
    material: typeof a.material === "string" ? a.material : "unknown",
    shopId: typeof a.shopId === "string" ? a.shopId : "default",
    fleetDefault,
    priorMean: fleetDefault,
    priorVariance: priorVar,
    posteriorMean: fleetDefault,
    posteriorVariance: priorVar,
    observationCount: 0,
    sumObservations: 0,
    observationVariance: Number.isFinite(Number(a.observationVariance)) && Number(a.observationVariance) > 0
      ? Number(a.observationVariance)
      : DEFAULT_OBS_VARIANCE,
    lastUpdatedIso: null,
  };
}

/** Pure: fold one kc observation into the posterior (immutable). */
export function observeForce(posterior, event) {
  if (!posterior || !event) return posterior;
  const measured = Number(event.measuredKc);
  if (!Number.isFinite(measured) || measured <= 0) return posterior;
  const obsVar = Number.isFinite(Number(event.observationVariance)) && Number(event.observationVariance) > 0
    ? Number(event.observationVariance)
    : posterior.observationVariance;
  const newCount = posterior.observationCount + 1;
  const newSum = posterior.sumObservations + measured;
  const priorPrecision = 1 / posterior.priorVariance;
  const obsPrecision = newCount / obsVar;
  const postPrecision = priorPrecision + obsPrecision;
  const postVar = 1 / postPrecision;
  const postMean = postVar * (posterior.priorMean * priorPrecision + newSum / obsVar);
  return {
    ...posterior,
    posteriorMean: postMean,
    posteriorVariance: postVar,
    observationCount: newCount,
    sumObservations: newSum,
    observationVariance: obsVar,
    lastUpdatedIso: typeof event.timestampIso === "string" ? event.timestampIso : posterior.lastUpdatedIso,
  };
}

/** Pure: posterior mean kc value. */
export function getPosteriorMean(posterior) {
  if (!posterior) return null;
  return posterior.posteriorMean;
}

/** Pure: posterior variance. */
export function getPosteriorVariance(posterior) {
  if (!posterior) return null;
  return posterior.posteriorVariance;
}

/** Pure: confidence interval [low, high] via Normal approximation. */
export function getConfidenceInterval(posterior, zScore) {
  if (!posterior) return null;
  const z = Number.isFinite(Number(zScore)) ? Number(zScore) : DEFAULT_CI_Z;
  const sd = Math.sqrt(posterior.posteriorVariance);
  return [posterior.posteriorMean - z * sd, posterior.posteriorMean + z * sd];
}

/** Pure: should the operator trust the posterior, or fall back to fleet default? */
export function shouldUsePosterior(posterior, options) {
  if (!posterior) return false;
  const opts = options || {};
  const minObs = Number.isFinite(Number(opts.minObservations))
    ? Number(opts.minObservations)
    : MIN_OBSERVATIONS_FOR_TRUST;
  return posterior.observationCount >= minObs;
}

/** Pure: returns the kc value to use right now (fleet-default fallback if untrusted). */
export function recommendKc(posterior, options) {
  if (!posterior) return null;
  if (shouldUsePosterior(posterior, options)) {
    return {
      kc: posterior.posteriorMean,
      source: "shop_posterior",
      observationCount: posterior.observationCount,
    };
  }
  return {
    kc: posterior.fleetDefault,
    source: "fleet_default",
    observationCount: posterior.observationCount,
  };
}

/** Pure: percent deviation of posterior mean from fleet default (-1..+inf). */
export function deviationFromFleetDefault(posterior) {
  if (!posterior) return null;
  if (!Number.isFinite(posterior.fleetDefault) || posterior.fleetDefault === 0) return null;
  return (posterior.posteriorMean - posterior.fleetDefault) / posterior.fleetDefault;
}

/** Pure: aggregate summary for operator readout. */
export function summarize(posterior) {
  if (!posterior) return null;
  const ci = getConfidenceInterval(posterior);
  return {
    material: posterior.material,
    shopId: posterior.shopId,
    fleetDefault: posterior.fleetDefault,
    posteriorMean: posterior.posteriorMean,
    posteriorVariance: posterior.posteriorVariance,
    posteriorStdDev: Math.sqrt(posterior.posteriorVariance),
    observationCount: posterior.observationCount,
    trusted: shouldUsePosterior(posterior),
    deviationPct: deviationFromFleetDefault(posterior),
    ci95Low: ci[0],
    ci95High: ci[1],
  };
}
