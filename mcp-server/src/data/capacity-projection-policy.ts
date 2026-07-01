/**
 * capacity-projection-policy.ts — policy constants for ScheduleProjectedCapacityEngine (galaxy:business,
 * slot:hotel; PRISM networking-marketplace Phase-2 differentiator).
 *
 * Capacity-aware RFQ matching: a shop with a full backlog can't deliver by the need-by date no matter how
 * cheap or capable it is. This engine projects a supplier's free hours over a horizon from its committed
 * orders, so matching can prefer shops that can ACTUALLY take the work. This file holds the defaults +
 * the over-utilization threshold so the engine never inlines them.
 *
 * Citation: finite-capacity loading / rough-cut capacity planning (RCCP); a load factor > 1.0 is an
 * overcommit (the week is already oversold).
 */

export const CAPACITY_PROJECTION_SCHEMA_VERSION = "1.0.0";

/** Default working hours a shop has per week when the supplier omits its capacity. */
export const DEFAULT_CAPACITY_HOURS_PER_WEEK = 80; // ~2 machines × 40h; overridable per supplier

/** Default projection horizon (weeks) when the caller omits it. */
export const DEFAULT_HORIZON_WEEKS = 8;

/** Utilization at/above which a week is "overcommitted" (load ≥ this × capacity). */
export const OVERCOMMIT_UTILIZATION = 1.0;

/** Utilization at/above which a week is "tight" (a warning band below overcommit). */
export const TIGHT_UTILIZATION = 0.85;

/** Days per week (calendar bucketing of caller-supplied ISO dates). */
export const DAYS_PER_WEEK = 7;
