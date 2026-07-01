// scripts/lib/hermes-outcome-feedback.mjs
//
// U-HFR01 — closed-loop cluster quality feedback. After a Hermes-shipped
// skill is invoked N times, evaluate whether it's actually being used
// productively (operator-marked outcome). If consistently abandoned, mark
// the cluster's pattern as "noise" so future similar clusters AUTO-FAIL.
//
// Pure-core: inputs/outputs are arrays + Maps; no I/O.

export const ABANDON_THRESHOLD = 3;       // ≥3 abandons of similar shipped clusters → mark noise
export const MIN_OUTCOMES_TO_JUDGE = 3;   // need ≥3 outcomes before any verdict

export const OUTCOMES = Object.freeze(["success", "failure", "abandoned", "pending"]);

// Given an array of `{ clusterId, signature, outcome }` records, return a map
// signature → { totalOutcomes, abandoned, success, isNoise }.
export function summarizeClusterOutcomes(outcomes) {
  const bySignature = new Map();
  if (!Array.isArray(outcomes)) return bySignature;
  for (const o of outcomes) {
    if (!o || typeof o.signature !== "string") continue;
    if (!OUTCOMES.includes(o.outcome)) continue;
    const slot = bySignature.get(o.signature) || { totalOutcomes: 0, success: 0, failure: 0, abandoned: 0, pending: 0 };
    slot.totalOutcomes += 1;
    slot[o.outcome] += 1;
    bySignature.set(o.signature, slot);
  }
  for (const s of bySignature.values()) {
    s.isNoise = s.totalOutcomes >= MIN_OUTCOMES_TO_JUDGE && s.abandoned >= ABANDON_THRESHOLD && s.abandoned > s.success;
  }
  return bySignature;
}

// Check if a new cluster's signature matches a known-noise pattern.
// Returns { match: bool, reason?: string }.
export function checkClusterAgainstNoise(cluster, noiseMap) {
  if (!cluster || typeof cluster !== "object") return { match: false };
  if (!(noiseMap instanceof Map)) return { match: false };
  const sig = cluster.fullSignature || cluster.signature;
  if (typeof sig !== "string") return { match: false };
  const entry = noiseMap.get(sig);
  if (entry && entry.isNoise) {
    return { match: true, reason: `noise-pattern:abandoned=${entry.abandoned}/${entry.totalOutcomes}` };
  }
  return { match: false };
}
