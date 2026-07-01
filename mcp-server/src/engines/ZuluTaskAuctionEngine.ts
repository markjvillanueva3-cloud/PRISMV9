/**
 * ZuluTaskAuctionEngine — HZP06 soul-weighted task auction across slots.
 *
 * Pure-core: when a task could be claimed by N slots, runs a single-round
 * sealed-bid auction. Each slot's bid is computed deterministically from
 * (a) soul domain_filter match (large weight), (b) refuse_list non-hit
 * (binary veto), (c) current queue depth (penalty), (d) success-rate prior
 * from the awareness fingerprint (small weight).
 *
 * The winning bidder is the slot that should take the task; ties break by
 * higher success rate, then by slot name (alphabetical) for determinism.
 *
 * @module engines/ZuluTaskAuctionEngine
 */

import { z } from "zod";
import type { SlotSoul } from "./SoulFrontmatterReaderEngine.js";

/** Upper bound on a bidder's queue_depth (single source for the C3 live-feed bridge clamp). */
export const MAX_QUEUE_DEPTH = 10_000;

export const BidderSchema = z.object({
  slot: z.string().min(1).max(60),
  queue_depth: z.number().int().min(0).max(MAX_QUEUE_DEPTH),
  success_rate: z.number().min(0).max(1),
  success_sample_size: z.number().int().min(0).max(100_000),
});
export type Bidder = z.infer<typeof BidderSchema>;

export const AuctionRequestSchema = z.object({
  task_id: z.string().min(1).max(120),
  task_text: z.string().min(1).max(2000),
  task_domain: z.string().max(60).optional(),
  bidders: z.array(BidderSchema).min(1).max(40),
});
export type AuctionRequest = z.infer<typeof AuctionRequestSchema>;

export interface AuctionBid {
  slot: string;
  bid: number;
  vetoed: boolean;
  veto_reason: string | null;
  components: {
    domain_match: number;
    refuse_veto: number;
    queue_penalty: number;
    success_prior: number;
  };
}

export interface AuctionResult {
  task_id: string;
  winner_slot: string | null;
  winner_reason: string;
  /** All bids sorted high → low; vetoed bids appear at the end. */
  bids: AuctionBid[];
  /** Bidders with no soul resolvable. */
  unresolved_slots: string[];
}

/** Weights — kept aligned with zulu-awareness DEFAULT_WEIGHTS philosophy. */
const W = {
  domain_match: 4.0,
  refuse_veto: -100.0,
  queue_per_log10: -0.5,
  success_prior_max: 1.5,
  min_sample_for_prior: 3,
};

export class ZuluTaskAuctionEngine {
  /** Souls map: slot → SlotSoul. Missing souls go to unresolved_slots, bid=0. */
  static auction(req: AuctionRequest, souls: Record<string, SlotSoul>): AuctionResult {
    if (!souls || typeof souls !== "object") throw new Error("ZuluTaskAuction.auction: souls map required");
    const v = AuctionRequestSchema.parse(req);

    const seen = new Set<string>();
    for (const b of v.bidders) {
      if (seen.has(b.slot)) throw new Error(`ZuluTaskAuction: duplicate bidder slot ${b.slot}`);
      seen.add(b.slot);
    }

    const lowerText = `${v.task_text} ${v.task_domain ?? ""}`.toLowerCase();
    const bids: AuctionBid[] = [];
    const unresolved_slots: string[] = [];

    for (const bidder of v.bidders) {
      const soul = souls[bidder.slot];
      if (!soul) {
        unresolved_slots.push(bidder.slot);
        bids.push({
          slot: bidder.slot,
          bid: 0,
          vetoed: true,
          veto_reason: "soul unresolved",
          components: { domain_match: 0, refuse_veto: 0, queue_penalty: 0, success_prior: 0 },
        });
        continue;
      }

      // Refuse-list veto check — case-insensitive substring on task text.
      const hitRefusal = (soul.refuse_list || []).find((r) => lowerText.includes(r.toLowerCase()));
      if (hitRefusal) {
        bids.push({
          slot: bidder.slot,
          bid: W.refuse_veto,
          vetoed: true,
          veto_reason: `refuse_list hit: ${hitRefusal}`,
          components: { domain_match: 0, refuse_veto: W.refuse_veto, queue_penalty: 0, success_prior: 0 },
        });
        continue;
      }

      // Domain match.
      let domain_match = 0;
      if (soul.domain_filter) {
        try {
          const re = new RegExp(soul.domain_filter, "i");
          if (re.test(lowerText)) domain_match = W.domain_match;
        } catch { /* bad regex → no boost */ }
      }

      // Queue depth penalty (log10-scaled).
      const queue_penalty = bidder.queue_depth > 0
        ? Math.log10(1 + bidder.queue_depth) * W.queue_per_log10
        : 0;

      // Success prior — only applied with enough samples to be non-noise.
      const success_prior = bidder.success_sample_size >= W.min_sample_for_prior
        ? bidder.success_rate * W.success_prior_max
        : 0;

      const total = domain_match + queue_penalty + success_prior;
      bids.push({
        slot: bidder.slot,
        bid: total,
        vetoed: false,
        veto_reason: null,
        components: { domain_match, refuse_veto: 0, queue_penalty, success_prior },
      });
    }

    // Sort: non-vetoed by bid desc (tiebreak: success_prior desc, then slot asc); vetoed at end.
    bids.sort((a, b) => {
      if (a.vetoed !== b.vetoed) return a.vetoed ? 1 : -1;
      if (b.bid !== a.bid) return b.bid - a.bid;
      if (b.components.success_prior !== a.components.success_prior) return b.components.success_prior - a.components.success_prior;
      return a.slot.localeCompare(b.slot);
    });

    const winner = bids.find((b) => !b.vetoed && b.bid > 0);
    return {
      task_id: v.task_id,
      winner_slot: winner ? winner.slot : null,
      winner_reason: winner
        ? `bid=${winner.bid.toFixed(2)} (domain=${winner.components.domain_match.toFixed(1)} queue=${winner.components.queue_penalty.toFixed(2)} success=${winner.components.success_prior.toFixed(2)})`
        : (bids.every((b) => b.vetoed) ? "all bidders vetoed" : "no positive-bid winner"),
      bids,
      unresolved_slots: [...new Set(unresolved_slots)].sort(),
    };
  }

  static renderResult(r: AuctionResult): string {
    const tag = r.winner_slot ? "[AUCTION WON]" : "[AUCTION NO-WIN]";
    return `${tag} ${r.task_id} winner=${r.winner_slot ?? "—"} bids=${r.bids.length} unresolved=${r.unresolved_slots.length}`;
  }
}

export const zuluTaskAuctionEngine = ZuluTaskAuctionEngine;
