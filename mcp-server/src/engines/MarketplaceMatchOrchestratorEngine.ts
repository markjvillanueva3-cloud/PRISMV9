/**
 * MarketplaceMatchOrchestratorEngine.ts — the END-TO-END RFQ → ranked-shortlist pipeline of the PRISM
 * networking marketplace (galaxy:business, slot:hotel). This is the "documented future re-ranking layer"
 * that {@link RFQMatchScoringEngine}'s header reserves (see its §MAIN-WIRING): it runs the Phase-0
 * capability match, then layers the three Phase-2 differentiators on top, blended by the capstone — in
 * ONE call, so the differentiators actually DRIVE the buyer-facing shortlist instead of sitting standalone.
 *
 * PIPELINE (rankRfq):
 *   1. CAPABILITY MATCH — {@link RFQMatchScoringEngine.scoreShortlist} hard-filters by declared capability
 *      and ranks survivors by TOPSIS closeness. Its per-survivor `score` IS the marketplace matchScore.
 *      (COMPOSITION, not mutation — RFQMatchScoring stays the pure, deterministic, auditable Phase-0
 *      matcher; this layer is where the external-corpus join belongs.)
 *   2. GATHER SIGNALS — for each survivor, compute the three Phase-2 [0,1] signals from the caller-supplied
 *      corpora, recording PROVENANCE (`evidence` vs `neutral-default`) so the blend is explainable:
 *        - reputation ← {@link SupplierReputationEngine.reputationFor}      (Beta-Binomial; prior when new)
 *        - logistics  ← {@link GeoLogisticsRoutingEngine.logisticsScore}     (freight zone from regions)
 *        - capacity   ← {@link ScheduleProjectedCapacityEngine.project}.capacityScore (free hours / horizon)
 *   3. BLEND — {@link MarketplaceFinalRankEngine.rank} fuses match+reputation+logistics+capacity into the
 *      final explainable rank (weights sum-to-1 asserted by the capstone).
 *
 * GRACEFUL DEGRADATION (honest, never silent): a differentiator whose input data is absent falls back to a
 * documented NEUTRAL (marketplace-orchestrator-policy.ts) AND is flagged `neutral-default` in the
 * per-supplier provenance — an un-evidenced axis neither lifts nor sinks a shop, and the buyer can SEE
 * which axes were real. Reputation degrades to the engine's own industry prior (0.7), flagged when the
 * supplier has zero recorded jobs.
 *
 * OUTCOMES:
 *   - EMPTY shortlist is a VALID outcome (no shop survived the capability filter): passed through with the
 *     scoreShortlist `noMatch` reason and an empty `ranked` — NOT a throw.
 *   - a bad RFQ / unknown supplier still THROWS (propagated from scoreShortlist — fail loud, R12).
 *   - bad blend weights (not summing to 1) THROW (propagated from the capstone — fail loud).
 *
 * ADDITIVE: composes five already-landed engines; modifies none of them. (R7 — composition was chosen
 * over mutating RFQMatchScoring's TOPSIS criteria: that engine is deliberately a pure capability matcher
 * with no external-corpus dependency, and bolting reputation/logistics/capacity data into it would couple
 * concerns and risk its landed test suite. The capstone was built additive precisely to be called here.)
 */

import {
  RFQMatchScoringEngine,
  type ScoreShortlistArgs,
  type ShortlistEntry,
  type ExcludedEntry,
} from "./RFQMatchScoringEngine.js";
import { SupplierCapabilityProfileEngine } from "./SupplierCapabilityProfileEngine.js";
import { SupplierReputationEngine, type ReputationOutcome } from "./SupplierReputationEngine.js";
import { GeoLogisticsRoutingEngine } from "./GeoLogisticsRoutingEngine.js";
import { ScheduleProjectedCapacityEngine } from "./ScheduleProjectedCapacityEngine.js";
import {
  MarketplaceFinalRankEngine,
  type RankWeights,
  type RankedSupplier,
} from "./MarketplaceFinalRankEngine.js";
import {
  MARKETPLACE_ORCH_SCHEMA_VERSION,
  NEUTRAL_LOGISTICS_SCORE,
  NEUTRAL_CAPACITY_SCORE,
} from "../data/marketplace-orchestrator-policy.js";

// ============================================================================
// INPUT TYPES
// ============================================================================

/** A supplier's committed order for capacity projection (structural subset of a production order). */
export interface CommittedOrderInput {
  hoursRequired: number;
  dueDateISO: string;
}

/**
 * Capacity-projection inputs. When this block is supplied the orchestrator scores capacity from the real
 * committed-order data (a supplier absent from `committedBySupplier` is treated as having NO committed work
 * — a verified-open shop, capacityScore 1.0). When the block is ABSENT, capacity degrades to the neutral.
 */
export interface CapacityInputs {
  /** as-of date for the projection (ISO string; deterministic — no wall-clock read). */
  asOfISO: string;
  /** projection horizon in weeks (default: ScheduleProjectedCapacityEngine's DEFAULT_HORIZON_WEEKS). */
  horizonWeeks?: number;
  /** per-supplier committed orders, keyed by supplierId (missing key ⇒ no committed work). */
  committedBySupplier?: Record<string, CommittedOrderInput[]>;
  /** per-supplier weekly capacity override, keyed by supplierId (missing key ⇒ engine default). */
  capacityHoursPerWeekBySupplier?: Record<string, number>;
}

export interface RankRfqInput {
  /** the RFQ to match (validated by scoreShortlist — fail-loud on a bad shape). */
  rfq: ScoreShortlistArgs["rfq"];
  /** which suppliers to consider; default = all ACTIVE suppliers in the registry. */
  candidateSupplierIds?: string[];
  /**
   * the immutable RFQ outcome corpus (delivered-on-time + measured Cpk tuples). Default []: every supplier
   * scores the reputation prior, flagged `neutral-default`. A supplier present here with ≥1 job is flagged
   * `evidence`.
   */
  outcomes?: ReputationOutcome[];
  /** the buyer's geography.region; ABSENT ⇒ logistics is the neutral default for every supplier. */
  buyerRegion?: string;
  /** supplier ids in the buyer's same metro (courier/pickup → the `local` freight zone). */
  sameMetroSupplierIds?: string[];
  /** committed-order data for capacity projection; ABSENT ⇒ capacity is the neutral default. */
  capacity?: CapacityInputs;
  /** blend-weight override (match/reputation/logistics/capacity); must sum to 1.0 (asserted by the capstone). */
  weights?: Partial<RankWeights>;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

/** Whether a signal was computed from real evidence or fell back to a documented neutral default. */
export type SignalProvenance = "evidence" | "neutral-default";

/** The four signals (+ provenance) that fed one supplier's blended final score — the explainable audit row. */
export interface SupplierSignalDetail {
  supplierId: string;
  /** Phase-0 capability-match TOPSIS closeness in [0,1] (from scoreShortlist). */
  matchScore: number;
  reputationScore: number;
  reputationProvenance: SignalProvenance;
  /** jobs the reputation score is based on (0 ⇒ score is the prior, provenance `neutral-default`). */
  reputationJobs: number;
  logisticsScore: number;
  logisticsProvenance: SignalProvenance;
  /** freight zone used (local/domestic/international); null when logistics fell back to the neutral. */
  logisticsZone: string | null;
  capacityScore: number;
  capacityProvenance: SignalProvenance;
}

/** One blended-ranked supplier: the capstone breakdown plus the signal provenance that produced it. */
export interface RankedRfqSupplier extends RankedSupplier {
  signals: SupplierSignalDetail;
}

export interface RankRfqResult {
  rfqId: string;
  /** final blended ranking (best-first) — each entry carries the capstone breakdown + signal provenance. */
  ranked: RankedRfqSupplier[];
  /** the Phase-0 capability-match order (TOPSIS), for audit/comparison against the blended order. */
  capabilityShortlist: ShortlistEntry[];
  /** suppliers dropped by the hard capability filter, with the gaps that disqualified each. */
  excluded: ExcludedEntry[];
  /** the resolved blend weights actually used (defaults merged with any override). */
  weights: RankWeights;
  /** non-null ONLY when no shop survived the capability filter (passed through from scoreShortlist). */
  noMatch: string | null;
  candidatesEvaluated: number;
  survivors: number;
  schemaVersion: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class MarketplaceMatchOrchestratorEngine {
  /**
   * Match + rank an RFQ end-to-end: capability hard-filter & TOPSIS (Phase-0), gather the three Phase-2
   * differentiator signals per survivor, then blend into the final explainable rank.
   *
   * @param input the RFQ + the (optional) reputation/logistics/capacity corpora + blend-weight override.
   * @returns a {@link RankRfqResult}: the blended `ranked` list (with per-supplier signal provenance), the
   *          Phase-0 `capabilityShortlist` for comparison, the `excluded` drops, and a `noMatch` reason
   *          when nobody survived.
   * @throws if the RFQ is invalid / names an unknown supplier (scoreShortlist), if buyerRegion is supplied
   *         but empty, or if the blend weights do not sum to 1.0 (capstone).
   */
  static rankRfq(input: RankRfqInput): RankRfqResult {
    if (input === null || typeof input !== "object") {
      throw new Error("MarketplaceMatchOrchestratorEngine.rankRfq: an input object is required");
    }
    if (
      input.buyerRegion !== undefined &&
      (typeof input.buyerRegion !== "string" || input.buyerRegion.length === 0)
    ) {
      throw new Error(
        "MarketplaceMatchOrchestratorEngine.rankRfq: buyerRegion, when supplied, must be a non-empty string " +
          "(omit it entirely to use the neutral logistics default).",
      );
    }
    const outcomes = input.outcomes ?? [];
    const sameMetro = new Set<string>(input.sameMetroSupplierIds ?? []);

    // ---- Step 1: CAPABILITY MATCH (Phase-0) — composition, not mutation ----
    const match = RFQMatchScoringEngine.scoreShortlist({
      rfq: input.rfq,
      ...(input.candidateSupplierIds !== undefined
        ? { candidateSupplierIds: input.candidateSupplierIds }
        : {}),
    });

    // ---- Step 1b: EMPTY shortlist is a valid outcome — pass through the noMatch reason (never thrown) ----
    if (match.shortlist.length === 0) {
      return {
        rfqId: match.rfqId,
        ranked: [],
        capabilityShortlist: [],
        excluded: match.excluded,
        // still resolve+validate the weights so a bad override fails loud regardless of the shortlist.
        weights: MarketplaceMatchOrchestratorEngine.#resolveWeights(input.weights),
        noMatch: match.noMatch,
        candidatesEvaluated: match.candidatesEvaluated,
        survivors: 0,
        schemaVersion: MARKETPLACE_ORCH_SCHEMA_VERSION,
      };
    }

    // ---- Step 2: GATHER the three Phase-2 signals per survivor ----
    const detailById = new Map<string, SupplierSignalDetail>();
    const entries = match.shortlist.map((entry) => {
      const detail = MarketplaceMatchOrchestratorEngine.#gatherSignals(entry, input, outcomes, sameMetro);
      detailById.set(detail.supplierId, detail);
      return {
        supplierId: detail.supplierId,
        name: entry.name,
        matchScore: detail.matchScore,
        reputationScore: detail.reputationScore,
        logisticsScore: detail.logisticsScore,
        capacityScore: detail.capacityScore,
      };
    });

    // ---- Step 3: BLEND via the capstone (validates weights sum-to-1 + every signal ∈ [0,1]) ----
    const blended = MarketplaceFinalRankEngine.rank({
      entries,
      ...(input.weights !== undefined ? { weights: input.weights } : {}),
    });

    const ranked: RankedRfqSupplier[] = blended.ranked.map((r) => {
      const signals = detailById.get(r.supplierId);
      if (!signals) {
        // Unreachable: every blended entry came from an entry we keyed. Never trust a silent undefined.
        throw new Error(
          `MarketplaceMatchOrchestratorEngine.rankRfq: blended supplier '${r.supplierId}' has no signal detail.`,
        );
      }
      return { ...r, signals };
    });

    return {
      rfqId: match.rfqId,
      ranked,
      capabilityShortlist: match.shortlist,
      excluded: match.excluded,
      weights: blended.weights,
      noMatch: null,
      candidatesEvaluated: match.candidatesEvaluated,
      survivors: match.survivors,
      schemaVersion: MARKETPLACE_ORCH_SCHEMA_VERSION,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /**
   * Compute the three Phase-2 signals (+ provenance) for ONE surviving supplier. Each signal degrades to a
   * documented neutral when its input data is absent, and records WHY (evidence vs neutral-default).
   */
  static #gatherSignals(
    entry: ShortlistEntry,
    input: RankRfqInput,
    outcomes: ReputationOutcome[],
    sameMetro: Set<string>,
  ): SupplierSignalDetail {
    const supplierId = entry.supplierId;

    // (1) REPUTATION — reputationFor returns the industry prior when this supplier has no recorded jobs.
    const rep = SupplierReputationEngine.reputationFor(outcomes, supplierId);
    const reputationProvenance: SignalProvenance = rep.jobsCompleted > 0 ? "evidence" : "neutral-default";

    // (2) LOGISTICS — needs the buyer region + this supplier's region; absent buyerRegion ⇒ neutral.
    let logisticsScore = NEUTRAL_LOGISTICS_SCORE;
    let logisticsProvenance: SignalProvenance = "neutral-default";
    let logisticsZone: string | null = null;
    if (input.buyerRegion !== undefined) {
      const profile = SupplierCapabilityProfileEngine.getProfile(supplierId);
      if (!profile) {
        // A survivor came from scoreShortlist, so its profile must exist; defend anyway (fail loud).
        throw new Error(
          `MarketplaceMatchOrchestratorEngine: survivor '${supplierId}' has no capability profile for logistics.`,
        );
      }
      const isSameMetro = sameMetro.has(supplierId);
      logisticsScore = GeoLogisticsRoutingEngine.logisticsScore(
        profile.geography.region,
        input.buyerRegion,
        isSameMetro,
      );
      logisticsZone = GeoLogisticsRoutingEngine.resolveZone(
        profile.geography.region,
        input.buyerRegion,
        isSameMetro,
      );
      logisticsProvenance = "evidence";
    }

    // (3) CAPACITY — needs committed-order data; absent the capacity block ⇒ neutral (NOT project([])=1.0).
    let capacityScore = NEUTRAL_CAPACITY_SCORE;
    let capacityProvenance: SignalProvenance = "neutral-default";
    if (input.capacity !== undefined) {
      const cap = input.capacity;
      if (typeof cap.asOfISO !== "string" || cap.asOfISO.length === 0) {
        throw new Error(
          "MarketplaceMatchOrchestratorEngine: capacity.asOfISO is required when capacity inputs are supplied.",
        );
      }
      const committed = cap.committedBySupplier?.[supplierId] ?? [];
      const hoursPerWeek = cap.capacityHoursPerWeekBySupplier?.[supplierId];
      const proj = ScheduleProjectedCapacityEngine.project({
        supplierId,
        asOfISO: cap.asOfISO,
        committed,
        ...(cap.horizonWeeks !== undefined ? { horizonWeeks: cap.horizonWeeks } : {}),
        ...(hoursPerWeek !== undefined ? { capacityHoursPerWeek: hoursPerWeek } : {}),
      });
      capacityScore = proj.capacityScore;
      capacityProvenance = "evidence";
    }

    return {
      supplierId,
      matchScore: entry.score,
      reputationScore: rep.reputationScore,
      reputationProvenance,
      reputationJobs: rep.jobsCompleted,
      logisticsScore,
      logisticsProvenance,
      logisticsZone,
      capacityScore,
      capacityProvenance,
    };
  }

  /**
   * Resolve + validate the blend weights without ranking any entries (used on the empty-shortlist path so a
   * bad weight override still fails loud). Delegates to the capstone's own parse + sum-to-1 assertion.
   */
  static #resolveWeights(weights: Partial<RankWeights> | undefined): RankWeights {
    return MarketplaceFinalRankEngine.rank({
      entries: [],
      ...(weights !== undefined ? { weights } : {}),
    }).weights;
  }

  static schemaVersion(): string {
    return MARKETPLACE_ORCH_SCHEMA_VERSION;
  }
}

export const marketplaceMatchOrchestratorEngine = MarketplaceMatchOrchestratorEngine;
