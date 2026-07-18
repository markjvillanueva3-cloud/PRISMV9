/**
 * cad-dim-scale-buckets.mjs -- scale-stratified dimension drift (U-DELTA-DIMTOL-SCALE-BUCKET,
 * slot:delta 2026-06-28). Directly addresses the T-DIMTOL heterogeneity finding: pooling ALL of a
 * class's circular-feature radii gives only ~20-26% per-part KS membership, because a part's radii
 * MIX (mostly-fillets vs mostly-bores) differs from the pooled class mix even when each scale band
 * matches. Bucketing radii by manufacturing scale before the KS test makes the comparison
 * apples-to-apples (a part's fillets vs the class fillet distribution, etc.).
 *
 * Buckets are manufacturing-meaningful, NOT arbitrary (cite the rationale): tiny radii are
 * edge-breaks / fillets, mid radii are drilled/reamed holes, large radii are bored/turned features.
 * Thresholds are configurable; the DEFAULTs are a starting heuristic to be tuned per the live result.
 *
 * Whether bucketing actually RAISES membership is an empirical question -- measured live by the
 * harness (--bucketed), never assumed (R12). Pure -> hermetically testable.
 */
import { validateDimDrift } from "./cad-dimtol-ks-validate.mjs";

/** Manufacturing scale bands for circular-feature radii (mm). Ordered ascending by maxMm. */
export const DEFAULT_SCALE_BUCKETS = [
  { name: "fillet", maxMm: 2 },   // edge-breaks / fillets / small corner radii
  { name: "hole", maxMm: 15 },    // drilled / reamed holes
  { name: "bore", maxMm: Infinity }, // bored / turned / large circular features
];

/** Partition a radii array into named scale buckets. Non-finite / non-positive radii are dropped. */
export function bucketRadii(radiiMm, buckets = DEFAULT_SCALE_BUCKETS) {
  const out = {};
  for (const b of buckets) out[b.name] = [];
  for (const r of Array.isArray(radiiMm) ? radiiMm : []) {
    if (!Number.isFinite(r) || r <= 0) continue;
    for (const b of buckets) { if (r <= b.maxMm) { out[b.name].push(r); break; } }
  }
  return out;
}

/**
 * Scale-stratified drift gate: bucket learned + heldout radii, run the KS gate per bucket where BOTH
 * sides have >= minPerBucket samples, and aggregate. The part is `drawn` (consistent, no drift) iff
 * EVERY co-populated bucket passes -- a single drifted band (e.g. wrong bore size) flags the part.
 * Returns { drawn, byBucket, bucketsTested }. byBucket carries each band's {drawn, pValue, D, reason?}.
 * If NO bucket is co-populated, returns drawn:false + reason (cannot assess -- R12, no fabricated pass).
 */
export function bucketedDrift(learnedRadii, heldoutRadii, { alpha, buckets = DEFAULT_SCALE_BUCKETS, minPerBucket = 3 } = {}) {
  const L = bucketRadii(learnedRadii, buckets);
  const H = bucketRadii(heldoutRadii, buckets);
  const byBucket = {};
  let tested = 0;
  let allPass = true;
  for (const b of buckets) {
    const ln = L[b.name], hn = H[b.name];
    if (ln.length < minPerBucket || hn.length < minPerBucket) {
      byBucket[b.name] = { drawn: null, reason: "insufficient-bucket-sample", nLearned: ln.length, nHeldout: hn.length };
      continue;
    }
    const r = validateDimDrift(ln, hn, alpha == null ? {} : { alpha });
    byBucket[b.name] = { drawn: r.drawn, pValue: r.pValue, D: r.D, nLearned: ln.length, nHeldout: hn.length };
    tested++;
    if (!r.drawn) allPass = false;
  }
  if (tested === 0) return { drawn: false, byBucket, bucketsTested: 0, reason: "no-co-populated-bucket" };
  return { drawn: allPass, byBucket, bucketsTested: tested };
}
