/**
 * outcome-actual-emit.mjs -- the GENERIC actuals-side PRODUCER for the closed-loop
 * OUTCOME BUS (FLEET-CLOSEDLOOP-MS0/U-CL-PRODUCER, slot:zulu 2026-06-19).
 *
 * THE GAP THIS CLOSES (verified 2026-06-19, file:line cited in the milestone memo):
 * the consumer side of the LoRA loop is already built --
 *   state/outcomes/<domain>.jsonl  -> scripts/build-outcomes-lora-dataset.mjs
 *   -> scripts/lib/outcome-to-alpaca-converter.mjs -> state/shared/lora/outcomes-dataset.jsonl
 *   -> assemble-fleet-lora-corpus.mjs -> scripts/fleet_lora_train.py
 * BUT the producer side wrote only prediction-only `recommendation_emitted` events whose
 * `context` lacked the determining inputs (material/tool/operation/...). Result: the builder
 * yielded 11 UNIQUE pairs from 12,093 events -- a write-only sink, not a closed loop.
 *
 * This module is the missing producer: it emits ACTUAL-bearing OutcomeEvents (measured
 * shop-floor / ERP / sim reality) WITH determining-input context, in the EXACT v1.0.0
 * OutcomeEvent shape the bus already validates (mcp-server/src/schemas/outcomeEventSchema.ts),
 * appended to state/outcomes/<domain>.jsonl. Every producer galaxy feeds the ONE existing
 * consumer (R15 build-once / apply-to-all) -- no per-galaxy dataset builder, no converter change.
 *
 * CLOSED-LOOP SEMANTICS (deliberate): the measured outcome goes in `actual`, NOT `recommended`.
 * outcome-to-alpaca-converter.buildOutput uses `recommended || actual`, so leaving `recommended`
 * empty makes the training OUTPUT be what ACTUALLY happened (the real signal we want the model
 * to learn toward), not the prior prediction. Pass `recommended` too only when you want the
 * pair to reflect the prediction (then provenance of the actual is kept in `delta`).
 *
 * FAIL-LOUD CONTRACT (R12): buildOutcomeEvent THROWS if the event would be silently dropped by
 * the consumer -- it runs the REAL converter (outcomeToAlpaca) and refuses to write a degenerate
 * record. So "emitted" provably means "produces a training pair", never "accumulated as noise".
 *
 * Pure builder (buildOutcomeEvent) is hermetically testable; emitOutcomeActual is fail-soft I/O
 * (append-only O_APPEND single line, like OutcomeCaptureBusEngine, so concurrent fleet writers
 * never clobber each other).
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { outcomeToAlpaca } from "./outcome-to-alpaca-converter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
export const OUTCOMES_DIR = path.join(ROOT, "state", "outcomes");

// Mirror of OutcomeDomain / OutcomeKind / OutcomeSource enums
// (mcp-server/src/schemas/outcomeEventSchema.ts:108-184). Kept in sync deliberately so a
// root .mjs producer validates without importing the TS/zod schema. A drift here is caught
// by outcome-actual-emit.test.mjs (asserts these match the canonical enum lists).
export const OUTCOME_DOMAINS = new Set([
  "mill", "lathe", "wedm", "sinker_edm", "grinder", "welder", "laser", "waterjet",
  "five_axis", "mill_turn", "cad", "cam", "post_processor", "speed_feed", "quote",
  "schedule", "shop_floor", "quality", "erp", "other",
]);
export const OUTCOME_KINDS = new Set([
  "operator_override", "cycle_time_measurement", "tool_break", "surface_finish_ra",
  "cmm_measurement", "scrap_event", "first_article_pass", "first_article_fail",
  "quote_accepted", "quote_rejected", "quote_vs_actual", "chatter_event",
  "collision_avoided", "post_editor_edit", "recommendation_emitted",
  "cross_process_decision", "cross_process_stage_complete", "cad_execution_outcome", "other",
]);
export const OUTCOME_SOURCES = new Set([
  "operator", "controller", "cmm", "sensor", "system", "import", "erp", "simulation", "other",
]);
export const OUTCOME_SEVERITIES = new Set(["info", "low", "medium", "high", "critical"]);

// Determining-input context keys the converter's learnability gate requires
// (outcome-to-alpaca-converter.mjs:27). At least one must be a non-empty string.
export const DETERMINING_INPUT_KEYS = ["material", "tool_id", "tool", "operation", "feature", "machine_id", "process"];

// v1.1.0-only kinds + context keys (mcp-server/src/schemas/outcomeEventSchema.ts). The schema's
// superRefine REJECTS a "1.0.0" stamp paired with any of these, so the bus/neural consumer
// (OutcomeCaptureBusEngine.query -> safeParse) would silently drop the line. We auto-bump the
// version exactly like the engine's pickSchemaVersion so actuals reach BOTH the LoRA arm AND the
// neural/bus arm.
export const V11_ONLY_KINDS = new Set(["cross_process_decision", "cross_process_stage_complete"]);
export const V11_ONLY_CONTEXT_KEYS = new Set(["job_id", "pipeline_run_id", "pipeline_stage", "consensus_audit_id"]);

// camelCase variants of the schema's snake_case fields. The canonical schema rejects these
// (a typo'd `jobId`/`partNumber` is silently dropped by the bus), so we reject them LOUDLY at
// emit time rather than writing a record the consumer discards.
export const BANNED_CAMEL_CONTEXT_KEYS = new Set([
  "partNumber", "machineId", "toolId", "jobId", "pipelineRunId", "pipelineStage", "consensusAuditId", "agentId", "numericFeatures",
]);

// O_APPEND single-line atomicity only holds below 64 KiB; above it, concurrent fleet writers can
// tear/interleave the shared shard (mirrors OutcomeCaptureBusEngine MAX_LINE_BYTES).
export const MAX_LINE_BYTES = 64 * 1024;

/** Pick schemaVersion the same way OutcomeCaptureBusEngine.pickSchemaVersion does (PURE). */
export function pickSchemaVersion(kind, context, numericFeatures) {
  if (V11_ONLY_KINDS.has(kind)) return "1.1.0";
  if (numericFeatures != null) return "1.1.0";
  if (context && typeof context === "object") {
    for (const k of Object.keys(context)) if (V11_ONLY_CONTEXT_KEYS.has(k)) return "1.1.0";
  }
  return "1.0.0";
}

/**
 * Throw if any number leaf is non-finite. JSON.stringify silently turns Infinity/NaN -> null, so a
 * non-finite leaf would make the WRITTEN record diverge from what the converter-guard validated
 * in-memory (breaking the "emitted -> trainable" guarantee). NumericFeaturesSchema enforces .finite()
 * for the same reason.
 */
function assertAllFinite(obj, label) {
  const walk = (o) => {
    if (o == null) return;
    if (typeof o === "number") {
      if (!Number.isFinite(o)) throw new RangeError(`buildOutcomeEvent: ${label} contains a non-finite number`);
      return;
    }
    if (typeof o !== "object") return;
    for (const v of Object.values(o)) walk(v);
  };
  walk(obj);
}

/** True if `context` carries at least one determining input (else the converter skips the event). */
export function hasDeterminingInput(context) {
  if (!context || typeof context !== "object") return false;
  return DETERMINING_INPUT_KEYS.some((k) => typeof context[k] === "string" && context[k].trim() !== "");
}

/**
 * Build a schema-valid v1.0.0 OutcomeEvent carrying an ACTUAL outcome. PURE.
 * Throws (R12) on an invalid enum value, missing determining-input context, an empty
 * actual/recommended payload, OR -- the strong guarantee -- if the EXISTING converter would
 * drop the event (so we never write a record that won't become a training pair).
 *
 * @param {object} o
 * @param {string} o.domain   OutcomeDomain enum value
 * @param {string} o.kind     OutcomeKind enum value (a terminal/measured kind, e.g. quote_vs_actual)
 * @param {string} o.source   OutcomeSource enum value (e.g. "import" for backfill, "erp", "controller")
 * @param {object} o.context  MUST contain >=1 determining input (material/tool_id/operation/...)
 * @param {object} [o.actual] measured outcome payload (scalar leaves) -- the training target
 * @param {object} [o.recommended] optional prior prediction payload
 * @param {object} [o.delta]  optional engine-computed delta summary
 * @param {string} [o.lineage_id] recommendation->outcome pairing key (defaults to a fresh uuid)
 * @param {string} [o.severity="info"]
 * @param {number} [o.confidence] [0,1]
 * @param {string} [o.note]
 * @param {string} [o.agent_id]
 * @param {string} [o.timestamp] ISO string (default: now -- inject for deterministic tests)
 * @param {string} [o.event_id] (default: fresh uuid -- inject for deterministic tests)
 * @param {() => string} [o.uuid] uuid factory (default crypto.randomUUID) -- inject for tests
 * @param {() => Date} [o.clock] clock (default new Date) -- inject for tests
 * @returns {object} the OutcomeEvent
 */
export function buildOutcomeEvent(o) {
  if (!o || typeof o !== "object") throw new TypeError("buildOutcomeEvent: opts object required");
  const uuid = typeof o.uuid === "function" ? o.uuid : () => crypto.randomUUID();
  const clock = typeof o.clock === "function" ? o.clock : () => new Date();

  const { domain, kind, source } = o;
  if (!OUTCOME_DOMAINS.has(domain)) throw new RangeError(`buildOutcomeEvent: invalid domain "${domain}"`);
  if (!OUTCOME_KINDS.has(kind)) throw new RangeError(`buildOutcomeEvent: invalid kind "${kind}"`);
  if (!OUTCOME_SOURCES.has(source)) throw new RangeError(`buildOutcomeEvent: invalid source "${source}"`);

  const severity = o.severity == null ? "info" : o.severity;
  if (!OUTCOME_SEVERITIES.has(severity)) throw new RangeError(`buildOutcomeEvent: invalid severity "${severity}"`);

  const context = o.context;
  if (!hasDeterminingInput(context)) {
    throw new Error(
      `buildOutcomeEvent: context lacks a determining input (need >=1 non-empty of ${DETERMINING_INPUT_KEYS.join("/")}) -- ` +
      `the converter would skip this event (outcome-to-alpaca-converter.mjs:71-82).`,
    );
  }
  for (const k of Object.keys(context)) {
    if (BANNED_CAMEL_CONTEXT_KEYS.has(k)) {
      throw new Error(
        `buildOutcomeEvent: context key "${k}" is a camelCase variant the schema rejects -- use snake_case ` +
        `(the bus consumer would silently drop this record).`,
      );
    }
  }

  const hasActual = o.actual != null && typeof o.actual === "object" && Object.keys(o.actual).length > 0;
  const hasRec = o.recommended != null && typeof o.recommended === "object" && Object.keys(o.recommended).length > 0;
  if (!hasActual && !hasRec) {
    throw new Error("buildOutcomeEvent: at least one of actual/recommended must be a non-empty object");
  }
  // Non-finite numbers serialize to null (silent divergence from the in-memory guard) -- reject loudly.
  assertAllFinite(o.actual, "actual");
  assertAllFinite(o.recommended, "recommended");
  assertAllFinite(o.delta, "delta");

  const ts = o.timestamp != null ? String(o.timestamp) : clock().toISOString();
  // Clean copy that drops a __proto__ own-key (JSON.parse can create one) -- ledger hygiene.
  const safeContext = {};
  for (const [k, v] of Object.entries(context)) if (k !== "__proto__") safeContext[k] = v;
  const event = {
    schemaVersion: pickSchemaVersion(kind, context, o.numeric_features),
    event_id: o.event_id != null ? String(o.event_id) : uuid(),
    lineage_id: o.lineage_id != null ? String(o.lineage_id) : uuid(),
    domain,
    kind,
    severity,
    source,
    timestamp: ts,
    context: safeContext,
  };
  if (o.agent_id != null) event.agent_id = String(o.agent_id);
  if (hasRec) event.recommended = o.recommended;
  if (hasActual) event.actual = o.actual;
  if (o.delta != null) event.delta = o.delta;
  if (typeof o.confidence === "number") {
    if (o.confidence < 0 || o.confidence > 1) throw new RangeError("buildOutcomeEvent: confidence must be in [0,1]");
    event.confidence = o.confidence;
  }
  if (o.note != null) event.note = String(o.note);

  // STRONG GUARANTEE (R12): refuse to produce a record the consumer would silently drop.
  if (outcomeToAlpaca(event) == null) {
    throw new Error(
      "buildOutcomeEvent: event is not learnable by the converter (no extractable scalar output). " +
      "Ensure actual/recommended carries scalar leaves (numbers/strings).",
    );
  }
  return event;
}

/**
 * Append ONE actual-bearing OutcomeEvent to state/outcomes/<domain>.jsonl. Fail-SOFT on I/O
 * (returns {ok:false,error} rather than throwing) so a backfill loop survives a transient FS
 * error; but PROPAGATES a build/validation throw from buildOutcomeEvent (a caller bug, not an
 * environmental fault). O_APPEND single-line write == the OutcomeCaptureBusEngine convention.
 *
 * @returns {{ok:boolean, event?:object, path?:string, error?:string}}
 */
export function emitOutcomeActual(o, { dir = OUTCOMES_DIR, appendImpl = fs.appendFileSync, mkdirImpl = fs.mkdirSync } = {}) {
  const event = buildOutcomeEvent(o); // throws on caller error -- intentional
  const file = path.join(dir, `${event.domain}.jsonl`);
  const line = JSON.stringify(event) + "\n";
  const bytes = Buffer.byteLength(line, "utf8");
  if (bytes > MAX_LINE_BYTES) {
    // Over the O_APPEND atomicity cap -- writing it could tear the shared shard. Fail-soft.
    return { ok: false, event, path: file, error: `line ${bytes}B exceeds MAX_LINE_BYTES ${MAX_LINE_BYTES} (O_APPEND atomicity cap)` };
  }
  try {
    mkdirImpl(dir, { recursive: true });
    appendImpl(file, line, "utf8");
    return { ok: true, event, path: file };
  } catch (e) {
    return { ok: false, event, path: file, error: e?.message ?? String(e) };
  }
}
