/**
 * marketplace-orchestrator-policy.ts — neutral-default policy for the end-to-end RFQ ranking orchestrator
 * (MarketplaceMatchOrchestratorEngine, galaxy:business, slot:hotel; PRISM networking-marketplace). Single
 * source of truth for the "signal data not supplied" fallbacks, so the orchestrator never inlines a magic
 * number and a future re-tune is one edit here.
 *
 * WHY NEUTRAL (max-entropy 0.5), not optimistic: when a Phase-2 differentiator's input data is ABSENT the
 * buyer has NO information on that axis, so the supplier must be neither rewarded nor penalized — a 0.5
 * midpoint. (Contrast REPUTATION, whose "no evidence" fallback is the mildly-positive industry-baseline
 * prior 0.7 owned by SupplierReputationEngine — "assumed industry-average until proven". Logistics and
 * capacity have no comparable industry baseline; an unknown route or unknown backlog is genuine
 * uncertainty, hence the 0.5 max-entropy midpoint, not 0.7.)
 *
 * CRITICAL (the honesty trap this constant exists to avoid): the capacity neutral is NOT
 * ScheduleProjectedCapacityEngine.project([]).capacityScore — an empty committed-order list scores 1.0 (a
 * VERIFIED fully-open shop). "We never checked the backlog" must NOT masquerade as "we checked and it's
 * wide open." The orchestrator therefore only scores capacity from real committed-order data; absent the
 * capacity input block entirely, it uses this neutral and flags the signal `neutral-default` in the
 * per-supplier provenance.
 */

export const MARKETPLACE_ORCH_SCHEMA_VERSION = "1.0.0";

/** Logistics score when the buyer region is not supplied (route undeterminable → max-entropy neutral). */
export const NEUTRAL_LOGISTICS_SCORE = 0.5;

/** Capacity score when no committed-order data is supplied (backlog unknown → max-entropy neutral). */
export const NEUTRAL_CAPACITY_SCORE = 0.5;
