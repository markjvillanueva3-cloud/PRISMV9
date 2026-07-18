/**
 * WEDMRetrainTriggerEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-RETRAIN
 * ============================================================================
 *
 * Closes iter13 strategic-gap items #7 + #8 — wires the closed-loop
 * retrain signal. Reads outcome counts via WEDMJobOutcomeEngine (which
 * already appends to mcp-server/data/state/WEDM_OUTCOME_LEDGER.jsonl),
 * compares against a configurable threshold, and emits a 'retrain ready'
 * signal when enough new operator outcomes have accumulated since the last
 * retrain checkpoint.
 *
 * Designed to be polled by a scheduled task (cron / Windows scheduled
 * task) OR invoked on-demand through the `wedm_retrain_status` dispatcher
 * action. It does NOT actually run training — it tells you WHEN to.
 *
 * @module engines/WEDMRetrainTriggerEngine
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WedmRetrainCheckpoint {
  /** Total outcome count at the time of the last retrain (or 0 if never trained). */
  outcomes_at_last_retrain: number;
  /** ISO timestamp of the last retrain. */
  last_retrain_at: string | null;
  /** Model adapter version produced by the last retrain (semver-like). */
  last_adapter_version: string | null;
  /** Free-form notes — e.g. validation Ra / MRR accuracy from the last run. */
  notes: string;
}

export interface WedmRetrainStatus {
  ready: boolean;
  reason: string;
  total_outcomes: number;
  outcomes_since_last_retrain: number;
  threshold: number;
  fraction_to_threshold: number;
  checkpoint: WedmRetrainCheckpoint;
  /** Suggested next steps when ready=true. */
  next_actions: string[];
}

export interface WedmRetrainConfig {
  /** Number of new outcomes required to trigger retrain. Default 500 per iter13 audit. */
  retrain_threshold: number;
  /**
   * Soft warning fraction — when outcomes_since/threshold reaches this,
   * status surfaces an early-warning message so operators can prep the
   * GPU machine before the trigger fires. Default 0.8.
   */
  warning_fraction: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: WedmRetrainConfig = {
  retrain_threshold: 500,
  warning_fraction: 0.8,
};

const DEFAULT_CHECKPOINT: WedmRetrainCheckpoint = {
  outcomes_at_last_retrain: 0,
  last_retrain_at: null,
  last_adapter_version: null,
  notes: "no retrain yet",
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMRetrainTriggerEngine {
  private config: WedmRetrainConfig = { ...DEFAULT_CONFIG };
  private checkpoint: WedmRetrainCheckpoint = { ...DEFAULT_CHECKPOINT };

  setConfig(config: Partial<WedmRetrainConfig>): WedmRetrainConfig {
    this.config = { ...this.config, ...config };
    return { ...this.config };
  }

  getConfig(): WedmRetrainConfig {
    return { ...this.config };
  }

  /**
   * Record a retrain checkpoint. Called by the scheduled-task or CI
   * pipeline after a successful retrain so future status() calls can
   * compute the delta correctly.
   */
  recordCheckpoint(input: {
    outcomes_at_this_point: number;
    adapter_version: string;
    notes?: string;
    timestamp?: string;
  }): WedmRetrainCheckpoint {
    if (input.outcomes_at_this_point < 0 || !Number.isFinite(input.outcomes_at_this_point)) {
      throw new Error(`outcomes_at_this_point must be a non-negative finite number, got ${input.outcomes_at_this_point}`);
    }
    if (!input.adapter_version || input.adapter_version.trim().length === 0) {
      throw new Error("adapter_version must be a non-empty string");
    }
    this.checkpoint = {
      outcomes_at_last_retrain: Math.floor(input.outcomes_at_this_point),
      last_retrain_at: input.timestamp ?? new Date().toISOString(),
      last_adapter_version: input.adapter_version.trim(),
      notes: input.notes ?? "",
    };
    return { ...this.checkpoint };
  }

  getCheckpoint(): WedmRetrainCheckpoint {
    return { ...this.checkpoint };
  }

  /** Reset checkpoint to its initial 'no retrain yet' state — useful for tests. */
  resetCheckpoint(): void {
    this.checkpoint = { ...DEFAULT_CHECKPOINT };
  }

  /**
   * Compute the retrain status against a current total-outcome count.
   * The caller (dispatcher / scheduled task) reads `total_outcomes` from
   * the WEDM_OUTCOME_LEDGER count and passes it in — this keeps the engine
   * pure (no I/O) and trivially testable.
   */
  status(totalOutcomes: number): WedmRetrainStatus {
    if (totalOutcomes < 0 || !Number.isFinite(totalOutcomes)) {
      throw new Error(`totalOutcomes must be a non-negative finite number, got ${totalOutcomes}`);
    }
    const total = Math.floor(totalOutcomes);
    const sinceLast = Math.max(0, total - this.checkpoint.outcomes_at_last_retrain);
    const threshold = this.config.retrain_threshold;
    const fraction = threshold > 0 ? sinceLast / threshold : 0;
    const ready = sinceLast >= threshold;

    let reason: string;
    const nextActions: string[] = [];
    if (ready) {
      reason = `${sinceLast} new outcomes since last retrain ≥ threshold ${threshold} — retrain READY`;
      nextActions.push("Invoke wedm_lora_dataset_build to assemble the latest Alpaca corpus");
      nextActions.push("Invoke wedm_lora_curriculum to order easy→hard");
      nextActions.push("Invoke wedm_lora_train_script to emit train_wedm_lora.py");
      nextActions.push("Run the script on a GPU machine + record_checkpoint with the new adapter version");
    } else if (fraction >= this.config.warning_fraction) {
      reason = `${sinceLast}/${threshold} new outcomes — approaching retrain threshold (${(fraction * 100).toFixed(0)}%)`;
      nextActions.push("Prepare GPU machine for upcoming retrain");
    } else {
      reason = `${sinceLast}/${threshold} new outcomes since last retrain — below threshold`;
    }

    return {
      ready,
      reason,
      total_outcomes: total,
      outcomes_since_last_retrain: sinceLast,
      threshold,
      fraction_to_threshold: Math.min(1, fraction),
      checkpoint: { ...this.checkpoint },
      next_actions: nextActions,
    };
  }
}

export const wedmRetrainTriggerEngine = new WEDMRetrainTriggerEngine();
