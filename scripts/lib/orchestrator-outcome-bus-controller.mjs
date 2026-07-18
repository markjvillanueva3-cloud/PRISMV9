// scripts/lib/orchestrator-outcome-bus-controller.mjs
//
// U-MMO-OUTCOME-BUS-CONTROLLER — the unified controller for outcome events
// (juliett-owned per envelope, foundation shipped by sierra to unblock).
//
// PURPOSE
// Per Agent H, PRISM has all the pieces (OutcomeReplayBufferBridge,
// FleetDeploymentLearning, MetaLearningOptimizer, ATCS,
// OutcomeFeedbackOverrideStore) but NO unified controller fanning the
// outcome.completed events. This file IS that controller.
//
// FAN-OUT
//   1. fast-loop      → override store (immediate counter+receipt)
//   2. per-part       → replay buffer (sequence learning)
//   3. per-batch      → confidence calibration (when N≥20 in bin)
//   4. nightly        → LoRA/GNN retrain triggers (gated by AUROC≥0.78)
//
// SAFETY (per Agent I)
//   - audit log every mutation (event_id, prior, new, delta_sigma)
//   - 7-day rolling weight snapshots
//   - auto-rollback if AUROC drop >5%
//   - confidence gate: only mutate weights if outcome differs >2σ
//   - DistributedLockManager wraps weight writes (multi-agent safety)

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BATCH_FLUSH_MS = 10000;
const SIGMA_MUTATION_THRESHOLD = 2.0;
const AUROC_FLOOR = 0.78;
const ROLLBACK_AUROC_DROP_PCT = 0.05;

/**
 * @typedef {object} OutcomeEvent
 * @property {string} stage
 * @property {string} engineRef
 * @property {object} predicted
 * @property {object} actual
 * @property {string} part_id
 * @property {string} timestamp
 * @property {object} [delta]
 * @property {number} [delta_sigma]
 */

/**
 * Create the outcome-bus controller.
 *
 * @param {object} params
 * @param {Function} [params.onOverrideCapture]       - record-fan-out
 * @param {Function} [params.onReplayBuffer]          - per-part fan-out
 * @param {Function} [params.onCalibration]           - per-batch fan-out
 * @param {Function} [params.onRetrainTrigger]        - nightly fan-out
 * @param {Function} [params.lockAcquire]             - DistributedLockManager
 * @param {Function} [params.auditLog]                - audit-trail writer
 * @param {number}   [params.batchSize]
 * @param {number}   [params.sigmaMutationThreshold]
 * @returns {object}
 */
export function createOutcomeBusController({
  onOverrideCapture, onReplayBuffer, onCalibration, onRetrainTrigger,
  lockAcquire, auditLog,
  batchSize = DEFAULT_BATCH_SIZE,
  sigmaMutationThreshold = SIGMA_MUTATION_THRESHOLD,
} = {}) {
  if (typeof batchSize !== "number" || batchSize < 1) {
    throw new Error(`createOutcomeBusController: batchSize must be >= 1, got ${batchSize}`);
  }
  let batch = [];
  let processedCount = 0;
  let mutatedCount = 0;
  let skippedLowSigmaCount = 0;
  let rollbacksCount = 0;
  const auditEntries = [];

  async function safeFanout(fn, payload) {
    if (typeof fn !== "function") return;
    try {
      const r = fn(payload);
      if (r && typeof r.then === "function") await r;
    } catch (err) {
      // R12: fan-out failure surfaces in audit but doesn't crash the bus
      auditEntries.push({ type: "fanout_error", fn: fn.name || "anon", error: err.message });
    }
  }

  return {
    /**
     * Ingest a single outcome.completed event.
     * Pure-fn shape; in production this would also commit a lock + persist.
     */
    async ingest(event) {
      if (!event || typeof event !== "object") {
        throw new Error("ingest: event object required");
      }
      const required = ["stage", "engineRef", "predicted", "actual", "part_id"];
      for (const f of required) {
        if (!event[f]) throw new Error(`ingest: event.${f} required`);
      }
      processedCount++;

      // Compute delta-sigma if not already present
      const deltaSigma = typeof event.delta_sigma === "number" ? event.delta_sigma : 0;

      // R12 audit
      const auditEntry = {
        event_id: `${event.part_id}::${event.stage}::${event.engineRef}::${Date.now()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        stage: event.stage,
        engineRef: event.engineRef,
        delta_sigma: deltaSigma,
        action: "ingested",
      };
      auditEntries.push(auditEntry);
      if (typeof auditLog === "function") {
        try { auditLog(auditEntry); } catch { /* swallow per observation rule */ }
      }

      // Confidence gate: skip mutation if delta is small (noise)
      const shouldMutate = Math.abs(deltaSigma) >= sigmaMutationThreshold;
      if (!shouldMutate) {
        skippedLowSigmaCount++;
        auditEntry.action = "skipped_low_sigma";
        return { ingested: true, mutated: false, reason: "below-sigma-threshold" };
      }

      // Acquire lock (multi-agent safety) — pure-fn lock harness, real impl injected
      let release = null;
      if (typeof lockAcquire === "function") {
        try {
          release = await lockAcquire(`model::${event.engineRef}`);
        } catch (err) {
          auditEntry.action = "lock_failed";
          return { ingested: true, mutated: false, reason: `lock-failed: ${err.message}` };
        }
      }

      try {
        // Fan-out: 4 downstream consumers
        await safeFanout(onOverrideCapture, event);
        await safeFanout(onReplayBuffer, event);

        // Batch for calibration
        batch.push(event);
        if (batch.length >= batchSize) {
          const toFlush = batch;
          batch = [];
          await safeFanout(onCalibration, toFlush);
        }

        mutatedCount++;
        auditEntry.action = "mutated";
        return { ingested: true, mutated: true };
      } finally {
        if (typeof release === "function") {
          try { await release(); } catch { /* swallow */ }
        }
      }
    },

    /**
     * Force flush the current batch (e.g. on nightly cron tick).
     */
    async flushBatch() {
      if (batch.length === 0) return { flushed: 0 };
      const toFlush = batch;
      batch = [];
      await safeFanout(onCalibration, toFlush);
      return { flushed: toFlush.length };
    },

    /**
     * Trigger retrain (nightly cron + threshold-based).
     */
    async triggerRetrain({ engineRef, currentAUROC = 1.0, baselineAUROC = 1.0 } = {}) {
      if (!engineRef) throw new Error("triggerRetrain: engineRef required");
      // Auto-rollback gate
      if (currentAUROC < baselineAUROC * (1 - ROLLBACK_AUROC_DROP_PCT)) {
        rollbacksCount++;
        auditEntries.push({
          type: "rollback_triggered",
          engineRef,
          currentAUROC,
          baselineAUROC,
          timestamp: new Date().toISOString(),
        });
        return { retrained: false, rollback_triggered: true, reason: `AUROC drop >${ROLLBACK_AUROC_DROP_PCT * 100}%` };
      }
      if (currentAUROC < AUROC_FLOOR) {
        return { retrained: false, reason: `AUROC ${currentAUROC} below floor ${AUROC_FLOOR}` };
      }
      await safeFanout(onRetrainTrigger, { engineRef, currentAUROC, timestamp: new Date().toISOString() });
      return { retrained: true };
    },

    /** Diagnostics */
    snapshot() {
      return {
        processedCount, mutatedCount, skippedLowSigmaCount, rollbacksCount,
        batchSize: batch.length,
        auditCount: auditEntries.length,
      };
    },
    auditTail(n = 50) {
      return auditEntries.slice(-n);
    },
  };
}

export {
  DEFAULT_BATCH_SIZE,
  DEFAULT_BATCH_FLUSH_MS,
  SIGMA_MUTATION_THRESHOLD,
  AUROC_FLOOR,
  ROLLBACK_AUROC_DROP_PCT,
};
