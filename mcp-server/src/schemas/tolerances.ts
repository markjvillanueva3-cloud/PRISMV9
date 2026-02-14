/**
 * PRISM MCP Server - Canonical Tolerance Table
 * Single source of truth for R2 test matrix validation thresholds.
 * 
 * S(x) >= 0.70 is the SAFETY gate (is this cut safe?).
 * Tolerances are the ACCURACY gate (is the math correct?).
 * Both must pass. A calc can be "safe" (S(x)=0.85) but "wrong" (delta=40%).
 * 
 * SOURCE OF TRUTH: PRISM_PROTOCOLS_CORE.md §Canonical Tolerance Table.
 * This file is the compile-time implementation of those protocol values.
 * 
 * @module schemas/tolerances
 * @safety HIGH — Controls pass/fail thresholds for calculation validation.
 */

export const R2_TOLERANCES = {
  /** ±15% of published Vc — empirical, accounts for material variation */
  speed_feed_vc: 0.15,
  /** ±15% of published fz — empirical, accounts for tool geometry variation */
  speed_feed_fz: 0.15,
  /** ±20% of Kienzle prediction — wider due to model simplifications */
  cutting_force_fc: 0.20,
  /** ±25% of Taylor prediction — widest due to environmental factors */
  tool_life: 0.25,
  /** ±5% — geometric calculation, not empirical (tight tolerance) */
  thread_calcs: 0.05,
  /** Exact match on structured fields (controller, code, severity) */
  alarm_decode: 0.00,
  /** ±30% — wider for boundary conditions and exotic materials */
  edge_case: 0.30,
  /** ±15% per operation — same as speed_feed for multi-op consistency */
  multi_op: 0.15,
} as const satisfies Record<string, number>;

export type ToleranceCategory = keyof typeof R2_TOLERANCES;

/**
 * Check if a calculated value is within tolerance of a reference value.
 * 
 * @param actual - The calculated value
 * @param reference - The published/known reference value
 * @param category - The tolerance category to apply
 * @returns true if |actual - reference| / reference <= tolerance
 */
export function withinTolerance(
  actual: number,
  reference: number,
  category: ToleranceCategory,
): boolean {
  if (reference === 0) return actual === 0; // Avoid division by zero
  const tolerance = R2_TOLERANCES[category];
  if (tolerance === 0) return actual === reference; // Exact match
  const delta = Math.abs(actual - reference) / Math.abs(reference);
  return delta <= tolerance;
}

/**
 * Calculate the delta percentage between actual and reference.
 * Useful for reporting how far off a calculation is.
 */
export function toleranceDelta(actual: number, reference: number): number {
  if (reference === 0) return actual === 0 ? 0 : Infinity;
  return Math.abs(actual - reference) / Math.abs(reference);
}
