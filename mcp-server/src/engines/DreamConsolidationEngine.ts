/**
 * DreamConsolidationEngine — HSE07 dream proposal consolidator.
 *
 * Pure-core: collapses N nights of DreamProposalBatch into a single
 * consolidated promotion queue — drops duplicates across nights, sums
 * observed_count for repeats, ranks by total observation, and emits the
 * top-K for operator review.
 *
 * @module engines/DreamConsolidationEngine
 */

import { z } from "zod";
import type {
  DreamProposalBatch,
  RefuseRuleProposal,
  SkillProposal,
} from "./DreamLoopProposalEngine.js";

export const ConsolidationRequestSchema = z.object({
  /** Sequence of nightly proposal batches for ONE slot. Must all share the same slot. */
  batches: z.array(z.any()).min(1).max(60),
  top_k: z.number().int().min(1).max(50),
});
export type ConsolidationRequest = z.infer<typeof ConsolidationRequestSchema>;

export interface ConsolidatedQueue {
  slot: string;
  nights_consolidated: number;
  promoted_refuse_rules: Array<RefuseRuleProposal & { recurrence_nights: number }>;
  promoted_skills: Array<SkillProposal & { recurrence_nights: number }>;
  dropped_singleton_count: number;
}

export class DreamConsolidationEngine {
  static consolidate(req: ConsolidationRequest): ConsolidatedQueue {
    const v = ConsolidationRequestSchema.parse(req);
    const batches = v.batches as DreamProposalBatch[];

    // Guard: all batches must be the same slot (consolidation is per-slot).
    const slot = batches[0]?.slot;
    if (typeof slot !== "string" || !slot.length) throw new Error("DreamConsolidation.consolidate: batch missing slot");
    for (const b of batches) {
      if (!b || typeof b !== "object") throw new Error("DreamConsolidation.consolidate: batch must be object");
      if (b.slot !== slot) throw new Error(`DreamConsolidation: mixed slots ${slot} vs ${b.slot}`);
    }

    const refMap = new Map<string, { p: RefuseRuleProposal; nights: number }>();
    for (const b of batches) {
      for (const r of b.refuse_rules || []) {
        const prev = refMap.get(r.rule);
        if (prev) {
          prev.p = { ...prev.p, observed_count: prev.p.observed_count + r.observed_count };
          prev.nights += 1;
        } else {
          refMap.set(r.rule, { p: { ...r }, nights: 1 });
        }
      }
    }

    const skillMap = new Map<string, { p: SkillProposal; nights: number }>();
    for (const b of batches) {
      for (const s of b.skills || []) {
        const prev = skillMap.get(s.name);
        if (prev) {
          prev.p = { ...prev.p, observed_count: prev.p.observed_count + s.observed_count };
          prev.nights += 1;
        } else {
          skillMap.set(s.name, { p: { ...s }, nights: 1 });
        }
      }
    }

    // Drop singletons unless their observed_count alone is >= 3 (one big-burst night counts).
    let dropped = 0;
    const refKept: Array<RefuseRuleProposal & { recurrence_nights: number }> = [];
    for (const { p, nights } of refMap.values()) {
      if (nights === 1 && p.observed_count < 3) {
        dropped += 1;
        continue;
      }
      refKept.push({ ...p, recurrence_nights: nights });
    }
    const skillKept: Array<SkillProposal & { recurrence_nights: number }> = [];
    for (const { p, nights } of skillMap.values()) {
      if (nights === 1 && p.observed_count < 6) {
        dropped += 1;
        continue;
      }
      skillKept.push({ ...p, recurrence_nights: nights });
    }

    // Rank by (recurrence_nights desc, observed_count desc).
    const rankRef = (a: typeof refKept[number], b: typeof refKept[number]) => {
      if (b.recurrence_nights !== a.recurrence_nights) return b.recurrence_nights - a.recurrence_nights;
      return b.observed_count - a.observed_count;
    };
    refKept.sort(rankRef);
    skillKept.sort((a, b) => {
      if (b.recurrence_nights !== a.recurrence_nights) return b.recurrence_nights - a.recurrence_nights;
      return b.observed_count - a.observed_count;
    });

    return {
      slot,
      nights_consolidated: batches.length,
      promoted_refuse_rules: refKept.slice(0, v.top_k),
      promoted_skills: skillKept.slice(0, v.top_k),
      dropped_singleton_count: dropped,
    };
  }

  static renderQueue(q: ConsolidatedQueue): string {
    return `[DREAM-CONSOL ${q.slot}] nights=${q.nights_consolidated} refuses=${q.promoted_refuse_rules.length} skills=${q.promoted_skills.length} dropped=${q.dropped_singleton_count}`;
  }
}

export const dreamConsolidationEngine = DreamConsolidationEngine;
