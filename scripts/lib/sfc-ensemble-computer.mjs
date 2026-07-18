/**
 * sfc-ensemble-computer.mjs — 4th SFC computer kind: ensemble.
 *
 * Closes the 4th of 5 COMPUTER_SOURCES from iter39 — wraps the 3
 * concrete computers from iter43 (kienzle + table + vendor) and emits
 * a confidence-weighted blend. The ensemble is the production-default
 * surface for operators: it gets the safety of having multiple
 * estimators agree, and surfaces the disagreement when they don't.
 *
 * Blend math: each component computer contributes a vote weighted by
 * its own confidence. Output Vc/n/fz/vf are confidence-weighted means.
 * Confidence-of-ensemble = avg(component confidences) × agreement
 * factor in [0,1] (1.0 = full agreement, drops as components diverge).
 *
 * Disagreement penalty:
 *   disagreement = stdev(Vc_normalized) / mean(Vc_normalized)
 *   agreement_factor = max(0, 1 - 2 × disagreement)
 * → if any 2 computers disagree by >50% on Vc, agreement_factor → 0
 *   and ensemble confidence is fully discounted (operator must
 *   manually arbitrate).
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-SFC-ABSORB-ENSEMBLE
 * @slot echo · @iter 46 · @date 2026-05-27
 */

import {
  kienzleComputer,
  tableComputer,
  vendorComputer,
} from "./sfc-bridge-absorption.mjs";

export const ENSEMBLE_SCHEMA_VERSION = 1;
export const DISAGREEMENT_PENALTY_FACTOR = 2;
export const ENSEMBLE_AGREEMENT_FLOOR = 0;
export const ENSEMBLE_AGREEMENT_CEIL = 1;

/** Pure: weighted mean of values by weights (parallel arrays). null on empty / zero weight. */
export function weightedMean(values, weights) {
  if (!Array.isArray(values) || !Array.isArray(weights)) return null;
  if (values.length !== weights.length || values.length === 0) return null;
  let sum = 0;
  let totalWeight = 0;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]);
    const w = Number(weights[i]);
    if (!Number.isFinite(v) || !Number.isFinite(w) || w < 0) continue;
    sum += v * w;
    totalWeight += w;
  }
  if (totalWeight <= 0) return null;
  return sum / totalWeight;
}

/** Pure: sample standard deviation of an array. null on <2 values. */
export function sampleStdDev(values) {
  if (!Array.isArray(values) || values.length < 2) return null;
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (!Number.isFinite(Number(v))) continue;
    sum += Number(v);
    n++;
  }
  if (n < 2) return null;
  const mean = sum / n;
  let sqSum = 0;
  for (const v of values) {
    if (!Number.isFinite(Number(v))) continue;
    const d = Number(v) - mean;
    sqSum += d * d;
  }
  return Math.sqrt(sqSum / (n - 1));
}

/** Pure: agreement factor in [0, 1] from coefficient of variation of Vc values. */
export function agreementFactor(VcValues) {
  if (!Array.isArray(VcValues) || VcValues.length < 2) return ENSEMBLE_AGREEMENT_CEIL;
  const sd = sampleStdDev(VcValues);
  if (sd == null) return ENSEMBLE_AGREEMENT_CEIL;
  const mean = VcValues.reduce((a, b) => a + b, 0) / VcValues.length;
  if (mean === 0) return ENSEMBLE_AGREEMENT_FLOOR;
  const cv = sd / mean;
  const factor = ENSEMBLE_AGREEMENT_CEIL - DISAGREEMENT_PENALTY_FACTOR * cv;
  if (factor < ENSEMBLE_AGREEMENT_FLOOR) return ENSEMBLE_AGREEMENT_FLOOR;
  if (factor > ENSEMBLE_AGREEMENT_CEIL) return ENSEMBLE_AGREEMENT_CEIL;
  return factor;
}

/** Ensemble computer: blend kienzle + table + vendor via confidence-weighted mean. */
export function ensembleComputer(req) {
  if (!req || typeof req !== "object") return null;
  const components = [
    kienzleComputer(req),
    tableComputer(req),
    vendorComputer(req),
  ].filter((r) => r !== null);
  if (components.length === 0) return null;
  const Vcs = components.map((c) => c.Vc_m_per_min);
  const ns = components.map((c) => c.n_rpm);
  const fzs = components.map((c) => c.fz_mm_per_tooth);
  const vfs = components.map((c) => c.vf_mm_per_min);
  const weights = components.map((c) => c.confidence);
  const Vc = weightedMean(Vcs, weights);
  const n = weightedMean(ns, weights);
  const fz = weightedMean(fzs, weights);
  const vf = weightedMean(vfs, weights);
  if (Vc == null || n == null || fz == null || vf == null) return null;
  const meanConfidence = weights.reduce((a, b) => a + b, 0) / weights.length;
  const agreement = agreementFactor(Vcs);
  const ensembleConfidence = meanConfidence * agreement;
  return {
    Vc_m_per_min: Vc,
    n_rpm: n,
    fz_mm_per_tooth: fz,
    vf_mm_per_min: vf,
    source: "ensemble",
    confidence: ensembleConfidence,
    rationale: `ensemble: ${components.length} components, mean conf=${meanConfidence.toFixed(3)}, agreement=${agreement.toFixed(3)}`,
    componentCount: components.length,
    components: components.map((c) => ({ source: c.source, Vc_m_per_min: c.Vc_m_per_min, confidence: c.confidence })),
  };
}

/** Pure: register ensemble computer into a fresh SFC bridge. */
export function wireEnsembleComputer(bridge, registerComputerFn) {
  if (!bridge || typeof registerComputerFn !== "function") return null;
  return registerComputerFn(bridge, "ensemble", ensembleComputer);
}
