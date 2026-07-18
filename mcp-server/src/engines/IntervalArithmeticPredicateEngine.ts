/**
 * IntervalArithmeticPredicateEngine — PROGRAM-PROOF-MS0 / U-PP02
 *
 * FP-rounding-proof safe predicates via Moore 1966 interval arithmetic with
 * outward-rounding directed-rounding semantics. Wraps collision / distance
 * predicates so FP rounding can't produce a FALSE-NEGATIVE (the dangerous
 * class: "no collision" when there is one).
 *
 * Output classes:
 *   - "definitely-safe"     — proven no collision over the worst-case interval
 *   - "definitely-collision" — proven collision exists
 *   - "inconclusive"        — interval straddles zero; caller should split + recurse
 *
 * Math: Moore 1966, Hickey-Ju-vanEmden 2001 (directed rounding). Pure
 * functions, no floating-state. Sub-µm-honest under double-precision FP.
 *
 * @milestone PROGRAM-PROOF-MS0/U-PP02-INTERVAL-ARITHMETIC
 * @author slot:charlie /goal-12 iter6, 2026-05-24
 */

export type Interval = { lo: number; hi: number };
export type Predicate = "definitely-safe" | "definitely-collision" | "inconclusive";

const ULP = Number.EPSILON; // ~2.22e-16 for double precision

/** Outward-round helper: widens an interval by 1 ULP each side (defense against accumulated FP error). */
function widen(i: Interval): Interval {
  return { lo: i.lo - Math.abs(i.lo) * ULP - 1e-300, hi: i.hi + Math.abs(i.hi) * ULP + 1e-300 };
}

export class IntervalArithmeticPredicateEngine {
  /** Construct an interval from a single point + uncertainty (e.g. machine accuracy in µm). */
  fromPoint(x: number, uncertainty: number = 0): Interval {
    const u = Math.max(0, uncertainty);
    return { lo: x - u, hi: x + u };
  }

  /** Add two intervals: [a,b] + [c,d] = [a+c, b+d]. */
  add(a: Interval, b: Interval): Interval { return widen({ lo: a.lo + b.lo, hi: a.hi + b.hi }); }
  /** Subtract: [a,b] - [c,d] = [a-d, b-c]. */
  sub(a: Interval, b: Interval): Interval { return widen({ lo: a.lo - b.hi, hi: a.hi - b.lo }); }
  /** Multiply: [a,b] * [c,d] = [min(ac,ad,bc,bd), max(...)]. */
  mul(a: Interval, b: Interval): Interval {
    const p = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
    return widen({ lo: Math.min(...p), hi: Math.max(...p) });
  }
  /** Square: optimized [a,b]^2; correct when interval straddles 0. */
  sq(a: Interval): Interval {
    if (a.lo >= 0) return widen({ lo: a.lo * a.lo, hi: a.hi * a.hi });
    if (a.hi <= 0) return widen({ lo: a.hi * a.hi, hi: a.lo * a.lo });
    // straddles 0
    return widen({ lo: 0, hi: Math.max(a.lo * a.lo, a.hi * a.hi) });
  }
  /** Sqrt: requires lo >= 0; clamps lo to 0 if slightly negative (defense vs ULP). */
  sqrt(a: Interval): Interval {
    const lo = Math.max(0, a.lo);
    return widen({ lo: Math.sqrt(lo), hi: Math.sqrt(Math.max(lo, a.hi)) });
  }

  /**
   * Point-in-box predicate with FP-rounding-proof safety.
   * Returns "definitely-safe" only when the point's uncertainty interval is
   * strictly INSIDE the box (with ULP-widened bounds).
   */
  pointInBox(pt: { x: Interval; y: Interval; z: Interval }, box: { x: Interval; y: Interval; z: Interval }): Predicate {
    const allInside = (p: Interval, b: Interval) => p.lo >= b.lo && p.hi <= b.hi;
    const noOverlap = (p: Interval, b: Interval) => p.hi < b.lo || p.lo > b.hi;
    if (allInside(pt.x, box.x) && allInside(pt.y, box.y) && allInside(pt.z, box.z)) return "definitely-safe";
    if (noOverlap(pt.x, box.x) || noOverlap(pt.y, box.y) || noOverlap(pt.z, box.z)) return "definitely-collision";
    return "inconclusive";
  }

  /**
   * Segment-segment distance lower bound (interval). If the lower bound
   * exceeds a safety margin, predicate is definitely-safe; if upper bound
   * falls below 0, definitely-collision; else inconclusive.
   */
  segmentDistancePredicate(distLowerBound: Interval, safetyMarginMm: number): Predicate {
    const margin = Math.max(0, safetyMarginMm);
    if (distLowerBound.lo > margin) return "definitely-safe";
    if (distLowerBound.hi < 0) return "definitely-collision";
    return "inconclusive";
  }

  /** Combine multiple sub-predicates conservatively: any collision ⇒ collision; all safe ⇒ safe; else inconclusive. */
  combine(predicates: Predicate[]): Predicate {
    if (predicates.some((p) => p === "definitely-collision")) return "definitely-collision";
    if (predicates.every((p) => p === "definitely-safe")) return "definitely-safe";
    return "inconclusive";
  }
}

export const intervalArithmeticPredicateEngine = new IntervalArithmeticPredicateEngine();
