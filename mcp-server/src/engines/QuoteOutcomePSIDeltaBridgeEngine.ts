/**
 * QuoteOutcomePSIDeltaBridgeEngine — U-QP-PSI-DELTA-WIRE (Axis M)
 *
 * Closes the NN/GNN learning loop for the quoting subsystem. Operator
 * directive (audit Axis M): quote outcomes should feed
 * `psnAutonomyLoopEngine.scoreEvent({type:'psi_delta'})` so the autonomy
 * loop accumulates the signal and the NN/GNN tier-5 promotion gate has
 * real reward data to evaluate against.
 *
 * Pure mapping engine. Takes a QuoteOutcome (FMV-predicted vs actual-shipped)
 * and emits a SignalEvent that PSNAutonomyLoop can score. The delta is
 * computed from the calibrated quote's accuracy on actuals.
 *
 * Formula:
 *   psi_delta = (1 - |signed_pct_error| / 100) - 0.5
 *   where 0% error → +0.5 reward (best), 100% error → -0.5 (worst)
 *   clamped to [-0.1, +0.1] per PSNAutonomyLoop reward scale
 *
 * @milestone QUOTING-COMPLETENESS-MS0/U-QP-PSI-DELTA-WIRE
 */

import { psnAutonomyLoopEngine, type SignalEvent, type RewardScore } from "./PSNAutonomyLoopEngine.js";

export interface QuoteOutcome {
  /** Quote id (for trace). */
  quote_id: string;
  /** Slot that produced the quote (for per-slot reward). */
  slot?: string;
  /** Customer. */
  customer?: string;
  /** Predicted FMV from QuoteEstimator (calibrated or raw). */
  predicted_usd: number;
  /** Actual shipped/invoiced revenue. */
  actual_usd: number;
  /** ISO timestamp of the outcome (default: now). */
  ts?: string;
  /** Was calibration applied? Used to tag the reward stream. */
  calibrated?: boolean;
}

export interface PSIDeltaResult {
  ok: boolean;
  reason?: string;
  quote_id: string;
  signed_pct_error: number;
  abs_pct_error: number;
  psi_delta: number;
  signal_event: SignalEvent;
  reward_score: RewardScore;
}

const PSI_DELTA_MAX = 0.10;
const PSI_DELTA_MIN = -0.10;

export class QuoteOutcomePSIDeltaBridgeEngine {
  /**
   * Score a single quote outcome and feed it into the autonomy loop.
   */
  scoreOutcome(outcome: QuoteOutcome): PSIDeltaResult {
    if (!outcome || !outcome.quote_id) {
      return this.empty({ reason: "quote_id required" });
    }
    if (!Number.isFinite(outcome.predicted_usd) || outcome.predicted_usd < 0) {
      return this.empty({ reason: "predicted_usd must be non-negative finite", quote_id: outcome.quote_id });
    }
    if (!Number.isFinite(outcome.actual_usd) || outcome.actual_usd <= 0) {
      return this.empty({ reason: "actual_usd must be positive finite", quote_id: outcome.quote_id });
    }

    const signedPctError = ((outcome.predicted_usd - outcome.actual_usd) / outcome.actual_usd) * 100;
    const absPctError = Math.abs(signedPctError);

    // psi_delta: 0% error → +0.05 reward (clamped), 100% error → -0.05.
    // Linear mapping: psi = (1 - absPct/100 - 0.5) * 0.2  → range [-0.1, +0.1]
    const rawPsi = (1 - absPctError / 100 - 0.5) * 0.2;
    const psiDelta = Math.max(PSI_DELTA_MIN, Math.min(PSI_DELTA_MAX, rawPsi));

    const signalEvent: SignalEvent = {
      type: "psi_delta",
      ts: outcome.ts ?? new Date().toISOString(),
      slot: outcome.slot ?? null,
      unit_id: outcome.quote_id,
      delta: psiDelta,
    };

    const rewardScore = psnAutonomyLoopEngine.scoreEvent(signalEvent);

    return {
      ok: true,
      quote_id: outcome.quote_id,
      signed_pct_error: round2(signedPctError),
      abs_pct_error: round2(absPctError),
      psi_delta: round4(psiDelta),
      signal_event: signalEvent,
      reward_score: rewardScore,
    };
  }

  /** Batch-score a list of outcomes — builds a trainer-manifest snapshot. */
  scoreBatch(outcomes: QuoteOutcome[]): {
    ok: boolean;
    n_scored: number;
    n_rejected: number;
    rejections: Array<{ quote_id: string; reason: string }>;
    results: PSIDeltaResult[];
    aggregate_psi: number;
  } {
    const results: PSIDeltaResult[] = [];
    const rejections: Array<{ quote_id: string; reason: string }> = [];
    for (const outcome of outcomes) {
      const r = this.scoreOutcome(outcome);
      if (r.ok) results.push(r);
      else rejections.push({ quote_id: r.quote_id || "?", reason: r.reason ?? "unknown" });
    }
    const aggregate = results.length > 0
      ? results.reduce((s, r) => s + r.psi_delta, 0) / results.length
      : 0;
    return {
      ok: true,
      n_scored: results.length,
      n_rejected: rejections.length,
      rejections,
      results,
      aggregate_psi: round4(aggregate),
    };
  }

  private empty(opts: { reason: string; quote_id?: string }): PSIDeltaResult {
    return {
      ok: false,
      reason: opts.reason,
      quote_id: opts.quote_id ?? "",
      signed_pct_error: 0,
      abs_pct_error: 0,
      psi_delta: 0,
      signal_event: { type: "psi_delta", ts: new Date().toISOString(), delta: 0 },
      reward_score: { reward: 0, components: {}, signals_considered: 0 },
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const quoteOutcomePSIDeltaBridgeEngine = new QuoteOutcomePSIDeltaBridgeEngine();
export default quoteOutcomePSIDeltaBridgeEngine;
