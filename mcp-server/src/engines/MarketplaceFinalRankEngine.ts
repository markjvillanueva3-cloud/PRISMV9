/**
 * MarketplaceFinalRankEngine.ts — PRISM networking-marketplace capstone (galaxy:business, slot:hotel).
 * Fuses the Phase-1 capability MATCH (RFQMatchScoring TOPSIS closeness) with the three Phase-2
 * differentiators — REPUTATION (SupplierReputationEngine), LOGISTICS / true landed cost
 * (GeoLogisticsRoutingEngine), CAPACITY (ScheduleProjectedCapacityEngine) — into one explainable final
 * supplier rank for the buyer.
 *
 * This is what flips a perfect-fit-but-unproven-overseas-backlogged shop below a slightly-worse-fit shop
 * that's trusted, local, and open — the ranking competitors (price-only) can't produce. ADDITIVE: it
 * composes the four already-landed signals; it does NOT modify RFQMatchScoring.
 *
 * FAIL-LOUD (R12): weights must sum to 1.0; every signal must be in [0,1]; final score asserted into [0,1].
 * Each result carries the per-criterion weighted CONTRIBUTION (explainable — the honesty moat).
 */

import { z } from "zod";
import { MARKETPLACE_RANK_SCHEMA_VERSION, FINAL_RANK_WEIGHTS } from "../data/marketplace-rank-weights.js";

const unit = (label: string) =>
  z.number().finite(`${label} must be finite`).min(0, `${label} must be >= 0`).max(1, `${label} must be <= 1`);

const SignalEntrySchema = z.object({
  supplierId: z.string().min(1, "supplierId is required"),
  name: z.string().optional(),
  matchScore: unit("matchScore"),
  reputationScore: unit("reputationScore"),
  logisticsScore: unit("logisticsScore"),
  capacityScore: unit("capacityScore"),
});
export type SignalEntry = z.input<typeof SignalEntrySchema>;

const WeightsSchema = z.object({
  match: z.number().finite().nonnegative(),
  reputation: z.number().finite().nonnegative(),
  logistics: z.number().finite().nonnegative(),
  capacity: z.number().finite().nonnegative(),
});
export type RankWeights = z.infer<typeof WeightsSchema>;

export interface RankedSupplier {
  supplierId: string;
  name?: string;
  rank: number;
  finalScore: number;
  /** per-criterion WEIGHTED contribution (sums to finalScore) — explainable to the buyer. */
  components: { match: number; reputation: number; logistics: number; capacity: number };
  rawScores: { matchScore: number; reputationScore: number; logisticsScore: number; capacityScore: number };
}

export interface FinalRankResult {
  ranked: RankedSupplier[];
  weights: RankWeights;
  schemaVersion: string;
}

export class MarketplaceFinalRankEngine {
  static #round4(x: number): number {
    return Math.round(x * 1e4) / 1e4;
  }

  /** Weights MUST sum to 1.0 (else the blended score has no [0,1] meaning). */
  static #assertWeights(w: RankWeights): void {
    const sum = w.match + w.reputation + w.logistics + w.capacity;
    if (Math.abs(sum - 1) > 1e-9) {
      throw new Error(`MarketplaceFinalRankEngine: rank weights must sum to 1.0 (got ${sum})`);
    }
  }

  /**
   * Rank suppliers by the blended final score. Each entry supplies the four [0,1] signals (gathered by
   * the caller from the four engines). Returns suppliers best-first with the explainable breakdown.
   */
  static rank(input: { entries: SignalEntry[]; weights?: Partial<RankWeights> }): FinalRankResult {
    const w: RankWeights = input.weights
      ? WeightsSchema.parse({ ...FINAL_RANK_WEIGHTS, ...input.weights })
      : { ...FINAL_RANK_WEIGHTS };
    MarketplaceFinalRankEngine.#assertWeights(w);

    if (!Array.isArray(input.entries)) {
      throw new Error("MarketplaceFinalRankEngine.rank: entries must be an array");
    }

    const scored = input.entries.map((raw, i) => {
      const r = SignalEntrySchema.safeParse(raw);
      if (!r.success) {
        throw new Error(
          `MarketplaceFinalRankEngine: entry[${i}] invalid — ${r.error.issues
            .map((iss) => `${iss.path.join(".") || "<root>"}: ${iss.message}`)
            .join("; ")}`,
        );
      }
      const e = r.data;
      const components = {
        match: MarketplaceFinalRankEngine.#round4(w.match * e.matchScore),
        reputation: MarketplaceFinalRankEngine.#round4(w.reputation * e.reputationScore),
        logistics: MarketplaceFinalRankEngine.#round4(w.logistics * e.logisticsScore),
        capacity: MarketplaceFinalRankEngine.#round4(w.capacity * e.capacityScore),
      };
      const finalScore = MarketplaceFinalRankEngine.#round4(
        components.match + components.reputation + components.logistics + components.capacity,
      );
      if (!(finalScore >= 0 && finalScore <= 1)) {
        throw new Error(`MarketplaceFinalRankEngine: finalScore ${finalScore} out of [0,1] for '${e.supplierId}'`);
      }
      return {
        supplierId: e.supplierId,
        ...(e.name !== undefined ? { name: e.name } : {}),
        finalScore,
        components,
        rawScores: {
          matchScore: e.matchScore,
          reputationScore: e.reputationScore,
          logisticsScore: e.logisticsScore,
          capacityScore: e.capacityScore,
        },
      };
    });

    scored.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.rawScores.matchScore !== a.rawScores.matchScore) return b.rawScores.matchScore - a.rawScores.matchScore;
      return a.supplierId.localeCompare(b.supplierId);
    });

    const ranked: RankedSupplier[] = scored.map((s, i) => ({ ...s, rank: i + 1 }));
    return { ranked, weights: w, schemaVersion: MARKETPLACE_RANK_SCHEMA_VERSION };
  }

  static schemaVersion(): string {
    return MARKETPLACE_RANK_SCHEMA_VERSION;
  }
}

export const marketplaceFinalRankEngine = MarketplaceFinalRankEngine;
