/**
 * marketplace-rank-weights.ts — blend weights for MarketplaceFinalRankEngine (galaxy:business,
 * slot:hotel; PRISM networking-marketplace capstone).
 *
 * The final buyer-facing supplier rank fuses Phase-1 capability MATCH (RFQMatchScoring TOPSIS closeness)
 * with the three Phase-2 differentiators — earned REPUTATION (SupplierReputationEngine), true LANDED-cost
 * LOGISTICS (GeoLogisticsRoutingEngine), and available CAPACITY (ScheduleProjectedCapacityEngine). The
 * weights live here so the engine never inlines them and an operator can re-tune the marketplace's
 * ranking philosophy in one place.
 *
 * Rationale: capability fit is primary (a shop that can't make the part can't win), but a slightly-worse
 * fit with a stellar track record, lower landed cost, and open capacity should be able to outrank a
 * perfect-fit shop that's unproven, overseas, and backlogged. Weights sum to 1.0 (asserted by the engine).
 */

export const MARKETPLACE_RANK_SCHEMA_VERSION = "1.0.0";

export const FINAL_RANK_WEIGHTS = Object.freeze({
  match: 0.4,
  reputation: 0.25,
  logistics: 0.2,
  capacity: 0.15,
});
