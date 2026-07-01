/**
 * cad-dimtol-ks-validate.mjs -- the T-DIMTOL gate (U-DELTA-DIMTOL-DB, slot:delta 2026-06-28).
 *
 * Pure 2-sample Kolmogorov-Smirnov drift validator for the per-class CAD dimension distributions
 * (the DB already exists: scripts/build-cad-dimension-dataset.mjs + step-dimension-extract.mjs's
 * extractRadiiMm/extractBboxMm produce the per-class samples). This closes the plan's T-DIMTOL gate:
 * "KS-test p > 0.05 that held-out part dims are drawn from the learned class distribution (no
 * distribution drift)". A held-out part whose dims do NOT match its class distribution (p <= alpha)
 * is flagged as drift -- the data-quality signal that the learned distribution is unrepresentative.
 *
 * The DB stores summary stats (min/median/IQR/max); a real KS test needs the empirical samples, so
 * the learned side is the pooled per-class radiiMm array (collected by running extractRadiiMm over
 * the class's corpus files), and the held-out side is the held-out part's radiiMm array.
 *
 * Reference: 2-sample KS statistic D = max_x |F1(x) - F2(x)| over the merged empirical CDFs; p-value
 * via the Kolmogorov distribution Q_KS with the Numerical Recipes (Press et al., 2nd ed., kstwo)
 * small-sample correction lambda = (sqrt(ne) + 0.12 + 0.11/sqrt(ne)) * D, ne = n1*n2/(n1+n2).
 *
 * Pure -> hermetically testable. Never throws on degenerate input (returns a structured result
 * with `drawn:false` + a `reason`, never a fabricated p-value -- R12).
 */

const DEFAULT_ALPHA = 0.05;

function cleanSamples(a) {
  return (Array.isArray(a) ? a : []).filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
}

/**
 * Kolmogorov distribution complementary CDF Q_KS(lambda) = 2 * sum_{k=1..inf} (-1)^(k-1) e^{-2 k^2 lambda^2}.
 * Returns the KS p-value for a given lambda. Clamped to [0,1]; series terminates on EPS convergence.
 */
export function kolmogorovQ(lambda) {
  if (!(lambda > 0)) return 1; // lambda <= 0 (incl D==0) -> identical CDFs -> p = 1
  // For very small lambda the alternating series converges too slowly and the term cap would stop
  // on a partial sum (breaking monotonicity); the true Q->1 there. Guard (NR EPS-style). Unreachable
  // in this gate's range (D<=1, n tens-to-hundreds => lambda >= ~0.8) but robust if reused.
  if (lambda < 0.04) return 1;
  const a2 = -2 * lambda * lambda;
  let sum = 0, sign = 1, termPrev = 0;
  for (let k = 1; k <= 200; k++) {
    const term = Math.exp(a2 * k * k);
    sum += sign * term;
    // converged when this term is negligible vs the running sum and shrinking (NR EPS1/EPS2)
    if (term <= 1e-12 * termPrev || term <= 1e-12) {
      return Math.min(1, Math.max(0, 2 * sum));
    }
    sign = -sign;
    termPrev = term;
  }
  return Math.min(1, Math.max(0, 2 * sum)); // non-convergence -> clamped (conservative)
}

/**
 * 2-sample KS D statistic over two numeric arrays (sorted internally). Pure.
 * Returns { D, n1, n2 } with D in [0,1]; D=null + n=0 when a side is empty.
 */
export function ksStatistic(sampleA, sampleB) {
  const a = cleanSamples(sampleA), b = cleanSamples(sampleB);
  const n1 = a.length, n2 = b.length;
  if (n1 === 0 || n2 === 0) return { D: null, n1, n2 };
  let i = 0, j = 0, d = 0;
  // COALESCE cross-sample ties: advance BOTH pointers past every copy of the current smallest
  // value before measuring the CDF gap. Measuring mid-tie (advancing one step per pointer) would
  // inflate D on clustered/tied data -- the classic 2-sample KS pitfall (caught by 3-of-3 arm B).
  while (i < n1 && j < n2) {
    const v = a[i] < b[j] ? a[i] : b[j];
    while (i < n1 && a[i] === v) i++;
    while (j < n2 && b[j] === v) j++;
    const gap = Math.abs(i / n1 - j / n2);
    if (gap > d) d = gap;
  }
  return { D: d, n1, n2 };
}

/**
 * Validate that `heldout` dims are drawn from the `learned` class distribution (no drift).
 * Returns { D, pValue, drawn, n1, n2, alpha, reason? }. `drawn` is the gate: p > alpha => the
 * held-out part's dims are consistent with the learned distribution (PASS, no drift).
 * Degenerate input (empty side) => drawn:false + reason, never a fabricated p (R12).
 */
export function validateDimDrift(learned, heldout, { alpha = DEFAULT_ALPHA } = {}) {
  const { D, n1, n2 } = ksStatistic(learned, heldout);
  if (D === null) {
    return { D: null, pValue: null, drawn: false, n1, n2, alpha, reason: "empty-sample" };
  }
  const ne = (n1 * n2) / (n1 + n2);
  const sne = Math.sqrt(ne);
  const lambda = (sne + 0.12 + 0.11 / sne) * D;
  const pValue = kolmogorovQ(lambda);
  const res = { D, pValue, drawn: pValue > alpha, n1, n2, alpha };
  if (n1 < 2 || n2 < 2) res.reason = "insufficient-sample"; // p computed but unreliable below n=2
  return res;
}
