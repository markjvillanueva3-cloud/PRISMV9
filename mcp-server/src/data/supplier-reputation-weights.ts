/**
 * supplier-reputation-weights.ts — policy constants for SupplierReputationEngine (galaxy:business,
 * slot:hotel; PRISM networking-marketplace Phase-2 differentiator).
 *
 * Reputation is computed from the IMMUTABLE RFQ outcome corpus (BidCollectionRankingEngine.recordOutcome):
 * real delivered-on-time + measured-Cpk tuples, NOT self-reported stars. This file holds the weighting +
 * the Bayesian prior so the engine never inlines a threshold or a magic weight.
 *
 * STATISTICAL DESIGN (informed priors, interval estimates — not naive point rates):
 *   - A supplier with 1 job and 1 on-time delivery must NOT score 1.0. We shrink the raw rate toward an
 *     industry-baseline prior via a Beta-Binomial posterior mean:
 *         shrunk = (successes + PRIOR_MEAN * PRIOR_STRENGTH) / (trials + PRIOR_STRENGTH)
 *     PRIOR_STRENGTH is the pseudo-count "weight" of the prior (≈ how many real jobs it takes to move the
 *     score materially). At 0 trials the score equals PRIOR_MEAN; it converges to the raw rate as jobs grow.
 *   - We also report a Wilson score 95% lower confidence bound on the on-time rate, so a high-mean /
 *     low-volume supplier is visibly less certain than a high-mean / high-volume one (CIs, not scalars).
 *
 * Citations: Beta-Binomial conjugate shrinkage (Gelman, BDA3 §2); Wilson (1927) score interval; Cpk ≥ 1.33
 * = the conventional "process capable" acceptance gate (mirrors the PRISM quality galaxy SPC threshold).
 */

export const SUPPLIER_REPUTATION_SCHEMA_VERSION = "1.0.0";

/**
 * Process-capability acceptance threshold. A delivered job whose measured Cpk ≥ this is "quality-accepted".
 * 1.33 is the industry-standard "capable" gate (4σ; ~63 ppm). Kept here (policy), never inlined in the engine.
 */
export const CPK_ACCEPTANCE_THRESHOLD = 1.33;

/** Composite reputation = onTime*shrunkOnTimeRate + quality*shrunkQualityRate. Weights MUST sum to 1. */
export const REPUTATION_WEIGHTS = Object.freeze({
  onTime: 0.5,
  quality: 0.5,
});

/** Beta-Binomial prior MEAN — the industry-baseline success rate a never-seen supplier is assumed to hold. */
export const REPUTATION_PRIOR_MEAN = 0.7;

/** Beta-Binomial prior STRENGTH (pseudo-jobs). Higher → more real jobs needed to move the score off prior. */
export const REPUTATION_PRIOR_STRENGTH = 5;

/** z for a 95% Wilson score interval (two-sided 0.975 quantile of the standard normal). */
export const WILSON_Z_95 = 1.96;

/** Reputation tiers for human-facing labels (lower bound inclusive, descending). */
export const REPUTATION_TIERS: ReadonlyArray<{ minScore: number; tier: string }> = Object.freeze([
  Object.freeze({ minScore: 0.85, tier: "preferred" }),
  Object.freeze({ minScore: 0.7, tier: "trusted" }),
  Object.freeze({ minScore: 0.5, tier: "developing" }),
  Object.freeze({ minScore: 0.0, tier: "probation" }),
]);
