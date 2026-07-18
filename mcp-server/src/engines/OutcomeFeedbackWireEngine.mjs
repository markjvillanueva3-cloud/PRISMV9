// OutcomeFeedbackWireEngine.mjs
// Consumes shop-floor outcomes from the MetaLearningOptimizerEngine ledger
// and emits corpus deltas + retrain triggers for the self-learning loop.
// Pure-fn computation; the orchestrator decides when to fire retrain based
// on threshold (RETRAIN_OUTCOME_THRESHOLD in SelfLearningLoopOrchestrator).
//
// Per kilo soul: this engine is the wire from outcome-ledger →
// classifier/trainer corpus. Actual retraining lives downstream
// (echo or dedicated ML chat).
//
// Outcome shape (canonical):
//   { outcomeId, templateId, decision, query, observed: {success|partial|fail},
//     measuredFeatures?: {cycleTime,surfaceFinish,toolWear,...},
//     timestamp }
//
// Dispatcher contract (WIRED 2026-05-31, CAM-LEARN-LOOP/U-CAM-LOOP-WIRE-CONSUMER):
//   prism_cam:cam_outcome_feedback_compute_delta({limit?, since_iso?, threshold?})
//     reads the state/outcomes/cam.jsonl shard → CamOutcomeFeedbackAdapterEngine
//     (bus-event → wire-outcome schema bridge) → computeCorpusDelta + shouldRetrain.
//   (These pure fns are domain-agnostic; the cam consumer is the live wire. A future
//    prism_ai:outcome_feedback_compute_delta surface could reuse them unchanged.)
//
// schemaVersion 1.0.0

const SCHEMA_VERSION = '1.0.0';

// Minimum confidence margin between top template match and second-best for an
// outcome to be considered "high-evidence". Below this the outcome is logged
// but not added to the training delta — avoids reinforcing ambiguous labels.
const HIGH_EVIDENCE_MARGIN = 0.15;

// Minimum number of times a template must succeed in production before it's
// added to the corpus's high-confidence set. Single-success entries stay in
// the candidate set per ML-expert-mode "data quality > model complexity".
const PRODUCTION_PROMOTION_SUCCESS_FLOOR = 3;

/**
 * Validate an outcome record has the minimum fields needed.
 * @param {Object} outcome
 * @returns {boolean}
 */
export function isValidOutcome(outcome) {
  if (!outcome || typeof outcome !== 'object') return false;
  if (!outcome.outcomeId || typeof outcome.outcomeId !== 'string') return false;
  if (!outcome.decision || typeof outcome.decision !== 'string') return false;
  if (!outcome.observed || !['success', 'partial', 'fail'].includes(outcome.observed)) return false;
  return true;
}

/**
 * Aggregate raw outcomes into per-template success/fail counts.
 * @param {Array<Object>} outcomes
 * @returns {Map<string, {success: number, partial: number, fail: number, total: number}>}
 */
export function aggregateByTemplate(outcomes) {
  const out = new Map();
  if (!Array.isArray(outcomes)) return out;
  for (const o of outcomes) {
    if (!isValidOutcome(o)) continue;
    const key = o.templateId || '_compose_';
    const entry = out.get(key) || { success: 0, partial: 0, fail: 0, total: 0 };
    entry[o.observed] += 1;
    entry.total += 1;
    out.set(key, entry);
  }
  return out;
}

/**
 * Compute a corpus delta from a batch of outcomes.
 *   - promote: templates that reached the success floor → corpus high-confidence
 *   - demote:  templates with > 2:1 fail:success ratio → flagged for review
 *   - newCandidates: outcomes from 'compose' decisions that succeeded → seed
 *                    candidates for future template extraction
 *   - skipped: outcomes that didn't meet validation
 *
 * @param {Array<Object>} outcomes
 * @returns {{promote: Array, demote: Array, newCandidates: Array, skipped: number, totalConsumed: number}}
 */
export function computeCorpusDelta(outcomes) {
  const agg = aggregateByTemplate(outcomes);
  const promote = [];
  const demote = [];
  const newCandidates = [];
  let skipped = 0;
  let totalConsumed = 0;
  if (!Array.isArray(outcomes)) {
    return { promote, demote, newCandidates, skipped: 0, totalConsumed: 0 };
  }
  for (const o of outcomes) {
    if (!isValidOutcome(o)) {
      skipped += 1;
      continue;
    }
    totalConsumed += 1;
    // Compose-decisions that succeeded → seed candidates for future template
    // extraction (downstream ML chat may promote to formal templates).
    if (o.decision === 'compose' && o.observed === 'success') {
      newCandidates.push({
        outcomeId: o.outcomeId,
        query: o.query || null,
        measuredFeatures: o.measuredFeatures || null,
      });
    }
  }
  for (const [templateId, counts] of agg.entries()) {
    if (templateId === '_compose_') continue;
    // Promote: hits the production-promotion success floor with no recent fails.
    if (counts.success >= PRODUCTION_PROMOTION_SUCCESS_FLOOR && counts.fail === 0) {
      promote.push({ templateId, success: counts.success, total: counts.total });
      continue;
    }
    // Demote: failure outweighs success substantially.
    if (counts.fail > 0 && counts.fail >= counts.success * 2) {
      demote.push({ templateId, success: counts.success, fail: counts.fail, total: counts.total });
    }
  }
  return { promote, demote, newCandidates, skipped, totalConsumed };
}

/**
 * Decide whether the accumulated delta is large enough to fire a retrain
 * signal. Matches SelfLearningLoopOrchestrator's RETRAIN_OUTCOME_THRESHOLD
 * downstream.
 * @param {{promote: Array, demote: Array, newCandidates: Array, totalConsumed: number}} delta
 * @param {number} threshold - default 50
 * @returns {{retrain: boolean, reason: string, novelty: number}}
 */
export function shouldRetrain(delta, threshold = 50) {
  if (!delta || typeof delta !== 'object') {
    return { retrain: false, reason: 'invalid-delta', novelty: 0 };
  }
  const promoteCount = (delta.promote || []).length;
  const demoteCount = (delta.demote || []).length;
  const candidateCount = (delta.newCandidates || []).length;
  const novelty = promoteCount + demoteCount + candidateCount;
  if (delta.totalConsumed < threshold) {
    return { retrain: false, reason: 'below-outcome-threshold', novelty };
  }
  if (novelty === 0) {
    return { retrain: false, reason: 'no-novel-information', novelty };
  }
  return { retrain: true, reason: 'novelty-and-threshold-met', novelty };
}

export const META = {
  schemaVersion: SCHEMA_VERSION,
  highEvidenceMargin: HIGH_EVIDENCE_MARGIN,
  productionPromotionSuccessFloor: PRODUCTION_PROMOTION_SUCCESS_FLOOR,
};
