/**
 * QuoteOutcomeFeedEngine — QUOTING-PIPELINE-MS0 / SYNERGY-NN-GNN
 *
 * Wires shipped quote outcomes into PSNAutonomyLoopEngine as psi_delta signals
 * so the NN/GNN leg (#10) can learn from quoting accuracy over time.
 *
 * Per the envelope's synergy_psn_wiring.nn_gnn entry: "Quote outcomes feed
 * PSNAutonomyLoopEngine as psi_delta signals". This engine is that feed.
 *
 * Delta calculation:
 *   ΔΨ = clamp((actual_cost - quoted_cost) / actual_cost, -0.1, +0.1)
 *   - Positive delta → quote was TOO LOW (we lost margin)
 *   - Negative delta → quote was TOO HIGH (we left bid on the table)
 *   - Magnitude clamped to ±0.10 to keep one bad quote from dominating training
 *
 * Per R12: missing inputs → return {available:false, reason}, NEVER fabricate.
 *
 * @milestone QUOTING-PIPELINE-MS0/SYNERGY-NN-GNN-PSI-DELTA-FEED
 * @author slot:charlie /goal-13 iter10, 2026-05-24
 */

import { psnAutonomyLoopEngine, type SignalEvent } from "./PSNAutonomyLoopEngine.js";

export interface QuoteOutcomeRecord {
  /** Quote ID for trace */
  quote_id: string;
  /** Quoted cost (USD) at the time of quote */
  quoted_cost_usd: number;
  /** Actual realized cost (USD) after job completion */
  actual_cost_usd: number;
  /** ISO timestamp of the outcome */
  ts?: string;
  /** Slot that produced the quote (charlie default) */
  slot?: string;
}

export interface FeedResult {
  fed: boolean;
  delta?: number;
  reason?: string;
  signal_event?: SignalEvent;
}

const MAX_ABS_DELTA = 0.10;

export class QuoteOutcomeFeedEngine {
  /**
   * Feed one quote outcome → PSNAutonomyLoopEngine as a psi_delta signal.
   * Returns {fed, delta, signal_event} on success or {fed:false, reason} on failure.
   */
  feed(record: QuoteOutcomeRecord): FeedResult {
    if (!record || typeof record.quoted_cost_usd !== "number" || typeof record.actual_cost_usd !== "number") {
      return { fed: false, reason: "missing-required-fields:quote_id,quoted_cost_usd,actual_cost_usd" };
    }
    if (!Number.isFinite(record.quoted_cost_usd) || !Number.isFinite(record.actual_cost_usd)) {
      return { fed: false, reason: "non-finite-cost" };
    }
    if (record.actual_cost_usd <= 0) {
      return { fed: false, reason: "non-positive-actual-cost" };
    }
    if (!record.quote_id || record.quote_id.length === 0) {
      return { fed: false, reason: "missing-quote-id" };
    }

    const rawDelta = (record.actual_cost_usd - record.quoted_cost_usd) / record.actual_cost_usd;
    const clampedDelta = Math.max(-MAX_ABS_DELTA, Math.min(MAX_ABS_DELTA, rawDelta));

    const event: SignalEvent = {
      type: "psi_delta",
      ts: record.ts ?? new Date().toISOString(),
      slot: record.slot ?? "charlie",
      unit_id: record.quote_id,
      delta: clampedDelta,
    };

    // Score the event through PSNAutonomyLoop — this is the actual wire to leg #10
    psnAutonomyLoopEngine.scoreEvent(event);
    return { fed: true, delta: clampedDelta, signal_event: event };
  }

  /** Feed a batch of quote outcomes; returns per-record results. */
  feedBatch(records: QuoteOutcomeRecord[]): FeedResult[] {
    return records.map((r) => this.feed(r));
  }
}

export const quoteOutcomeFeedEngine = new QuoteOutcomeFeedEngine();
