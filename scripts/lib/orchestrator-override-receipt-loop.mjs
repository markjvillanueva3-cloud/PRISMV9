// scripts/lib/orchestrator-override-receipt-loop.mjs
//
// U-MMO-OVERRIDE-RECEIPT-LOOP — capture operator overrides + emit receipt +
// auto-trigger retrain at threshold.
//
// PURPOSE
// Per Agent J, today's override loop is OPEN: operators hand-tune speeds/
// feeds/toolpaths on the floor, the data is captured but no receipt fires
// to the operator + no auto-retrain trigger + no manager visibility.
//
// CLOSES THE LOOP
//   1. Operator overrides X → captureOverride(stage, suggested, actual, intent)
//   2. Receipt emitted: "Recorded. Auto-retrain at N overrides/quarter. Now: M/N"
//   3. Threshold trigger when count ≥ N → emits retrain request to OUTCOME-BUS
//   4. Manager dashboard surfaces override count + retrain status per engine
//
// INTENT TAXONOMY (from Agent I — only tribal/emergency feed RL training):
//   - "tribal"           — operator applied shop tribal knowledge
//   - "emergency"        — safety / part-saving intervention
//   - "over-conservative" — system suggestion was too cautious (use to relax)
//   - "over-aggressive"  — system suggestion would have crashed (use to tighten)

const DEFAULT_RETRAIN_THRESHOLD = 5;
const VALID_INTENTS = Object.freeze(["tribal", "emergency", "over-conservative", "over-aggressive"]);

/**
 * @typedef {object} OverrideRecord
 * @property {string} stage
 * @property {string} engineRef
 * @property {*} suggested
 * @property {*} actual
 * @property {string} intent
 * @property {string} timestamp
 * @property {string} [operator]
 * @property {string} [note]
 */

/**
 * @typedef {object} Receipt
 * @property {boolean} recorded
 * @property {string} stage
 * @property {string} intent
 * @property {number} count_this_period
 * @property {number} threshold
 * @property {boolean} retrain_triggered
 * @property {string} message
 */

/**
 * Create an override-receipt store bound to an emit fn.
 *
 * @param {object} params
 * @param {Function} params.emit  - (event) => void, fans to OUTCOME-BUS + dashboard
 * @param {number} [params.retrainThreshold]
 * @param {Function} [params.now]  - injectable clock for tests
 * @returns {object}
 */
export function createOverrideReceiptStore({
  emit,
  retrainThreshold = DEFAULT_RETRAIN_THRESHOLD,
  now = () => new Date().toISOString(),
}) {
  if (typeof emit !== "function") {
    throw new Error("createOverrideReceiptStore: emit fn required");
  }
  if (typeof retrainThreshold !== "number" || retrainThreshold < 1) {
    throw new Error(`createOverrideReceiptStore: retrainThreshold must be >= 1, got ${retrainThreshold}`);
  }

  // Per-engine override counters keyed by `${stage}::${engineRef}`
  const counters = new Map();
  // All records (bounded ring; in production wired to FeedbackBus instead)
  const records = [];
  const MAX_RECORDS = 10000;

  return {
    /**
     * Capture an operator override.
     * @param {object} override
     * @returns {Receipt}
     */
    captureOverride(override) {
      if (!override || typeof override !== "object") {
        throw new Error("captureOverride: override object required");
      }
      const { stage, engineRef, suggested, actual, intent, operator, note } = override;
      if (typeof stage !== "string" || stage.length === 0) {
        throw new Error("captureOverride: stage (string) required");
      }
      if (typeof engineRef !== "string" || engineRef.length === 0) {
        throw new Error("captureOverride: engineRef (string) required");
      }
      if (!VALID_INTENTS.includes(intent)) {
        throw new Error(`captureOverride: intent must be one of ${VALID_INTENTS.join("|")}, got '${intent}'`);
      }

      const record = {
        stage,
        engineRef,
        suggested,
        actual,
        intent,
        timestamp: now(),
        operator: operator || "anonymous",
        note: note || "",
      };
      records.push(record);
      if (records.length > MAX_RECORDS) records.shift();

      const key = `${stage}::${engineRef}`;
      const count = (counters.get(key) || 0) + 1;
      counters.set(key, count);

      // Emit override event
      safeEmit(emit, { type: "override.captured", record });

      // Check retrain threshold
      let retrainTriggered = false;
      if (count >= retrainThreshold) {
        retrainTriggered = true;
        safeEmit(emit, {
          type: "override.retrain_triggered",
          stage,
          engineRef,
          count,
          threshold: retrainThreshold,
          timestamp: now(),
        });
        // Reset counter after trigger (next batch starts fresh)
        counters.set(key, 0);
      }

      const receipt = {
        recorded: true,
        stage,
        intent,
        count_this_period: retrainTriggered ? 0 : count,
        threshold: retrainThreshold,
        retrain_triggered: retrainTriggered,
        message: retrainTriggered
          ? `Override recorded (${intent}). Retrain queued for ${stage}::${engineRef} — counter reset.`
          : `Override recorded (${intent}). Auto-retrain at ${retrainThreshold}; now ${count}/${retrainThreshold} for ${stage}::${engineRef}.`,
      };
      safeEmit(emit, { type: "override.receipt", receipt });
      return receipt;
    },

    /**
     * Manager-dashboard query: per-engine override counts + retrain status.
     */
    dashboardSnapshot() {
      const snapshot = {
        timestamp: now(),
        retrainThreshold,
        engines: [],
        totalOverrides: records.length,
        byIntent: {},
      };
      for (const [key, count] of counters.entries()) {
        const [stage, engineRef] = key.split("::");
        snapshot.engines.push({
          stage,
          engineRef,
          count_this_period: count,
          retrain_progress_pct: Math.min(100, Math.round((count / retrainThreshold) * 100)),
        });
      }
      for (const r of records) {
        snapshot.byIntent[r.intent] = (snapshot.byIntent[r.intent] || 0) + 1;
      }
      return snapshot;
    },

    /**
     * RL-training filter: ONLY tribal + emergency overrides feed RL per
     * Agent I doctrine ("over-aggressive overrides are system failures —
     * don't train from them; over-conservative overrides are also corrective
     * info but require manager review before flowing to training").
     */
    rlTrainingRecords() {
      return records.filter((r) => r.intent === "tribal" || r.intent === "emergency");
    },

    /** Diagnostic */
    totalRecords() { return records.length; },
    counterFor(stage, engineRef) {
      return counters.get(`${stage}::${engineRef}`) || 0;
    },
  };
}

function safeEmit(emit, event) {
  try {
    emit(event);
  } catch { /* observation must never break control */ }
}

export { DEFAULT_RETRAIN_THRESHOLD, VALID_INTENTS };
