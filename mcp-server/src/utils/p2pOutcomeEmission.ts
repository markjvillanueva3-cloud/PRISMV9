/**
 * p2pOutcomeEmission — Shared helper for emitting cross-process outcome
 * events from the 6 Print-to-Program / Program-Assembler pipeline engines.
 *
 * Wraps `outcomeCaptureBusEngine.record(...)` (see
 * `mcp-server/src/engines/OutcomeCaptureBusEngine.ts`) so each pipeline engine
 * fires one schema-valid, fire-and-forget emission at the end of its main run
 * method. The bus is the producer-side neural-feedback ledger established in
 * INFRA-NEURAL-LEDGER-MS1/P0-U01 (outcomeEventSchema v1.1.0, commit c96fe69d2;
 * WIRE-EXEMPT tag commit aaf7e3ede explicitly named OutcomeCaptureBusEngine
 * as THE producer surface).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PRODUCER → LEDGER → CONSUMER FLOW (for context — relevant to reviewers)
 * ──────────────────────────────────────────────────────────────────────────
 * Producer side (this helper):
 *   6 pipeline engines  →  emitP2POutcome(...)  →  outcomeCaptureBusEngine
 *                                                  → state/outcomes/{domain}.jsonl
 *                                                    (schema v1.1.0, atomic write)
 *
 * Consumer side (P0-U04 — next unit, NOT this one):
 *   FeedbackBusEngine (pub/sub) bridges the JSONL ledger into in-process
 *   subscribers: CrossProcessNeuralLearningEngine, BayesianCalibrationEngine,
 *   CAMLoRAAdapterTrainerEngine. Those Tier-1 trainers currently read from
 *   CrossProcessOutcomeStore (a separate store keyed on bridges/processes,
 *   not pipeline engines); P0-U04 will wire a bridge subscriber so the same
 *   JSONL events feed both surfaces. Until P0-U04 lands, this helper's
 *   emissions are "future-facing" — they accumulate in the JSONL shards and
 *   become live-trained-on the moment the bridge ships. This is by design:
 *   P0-U01 committed the schema-extension route (NOT a CrossProcessOutcomeStore
 *   extension); P0-U02 (this unit) follows that route. The envelope's loose
 *   `crossProcessOutcomeStore.append(...)` wording predates the P0-U01 route
 *   decision and is reconciled here.
 *
 * Wired engines (this unit, INFRA-NEURAL-LEDGER-MS1/P0-U02):
 *   - MillingPrintToProgramEngine    → domain: "mill"          (sync, single entry)
 *   - TurningPrintToProgramEngine    → domain: "lathe"         (sync, single entry)
 *   - WEDMPrintToProgramEngine       → domain: "wedm"          (ASYNC, single entry)
 *   - SinkerEDMPrintToProgramEngine  → domain: "sinker_edm"    (sync, single entry)
 *   - LaserProgramAssemblerEngine    → domain: "laser"         (4-entry assembler, scaffolded)
 *   - WaterjetProgramAssemblerEngine → domain: "waterjet"      (4-entry assembler, scaffolded)
 *
 * Design invariants (per envelope risks R1/R2/R3 + bus contract):
 *   1. NEVER BLOCK. Emission is synchronous-but-cheap (~1 ms);
 *      `outcomeCaptureBusEngine.record(...)` is fire-and-forget on its I/O
 *      path (atomic write + retry queue). Producers never await.
 *      Concurrent-writer caveat: under 6-chat concurrent producer load the
 *      bus's atomic-append + per-process retry-queue (cap 256) can lose
 *      events if multiple writers contend on the same per-domain JSONL
 *      shard and queues saturate. Cardinality of "1 emission per pipeline
 *      run × 6 engines" gives ample headroom; per-OP emission would not.
 *   2. NEVER THROW. The bus's `record()` returns `ok:false` on schema failure
 *      rather than throwing; this helper additionally wraps the call in
 *      try/catch as defense-in-depth against import/module-init errors. A
 *      ledger failure must never break the pipeline that produced the result.
 *   3. SCHEMA-DRIVEN. The bus's internal safeParse re-validates against
 *      OutcomeEventSchema v1.1.0; if a producer ever drifts the input out of
 *      schema, the bus logs to stderr and the helper sees `ok:false`.
 *      `pickSchemaVersion()` inside the bus auto-stamps "1.1.0" when any of
 *      the v1.1.0-only fields are populated.
 *   4. SINGLE EMISSION POINT. This helper is the only PRISM-internal
 *      abstraction over `outcomeCaptureBusEngine.record()` for P2P engines —
 *      every engine hits the same code path. Future schema bumps (1.2.0+)
 *      flow through this single chokepoint, not 6 scattered emission sites.
 *   5. PII / DATA-HYGIENE GUARDRAIL. `summary` is scalar-only and snake_case
 *      via `sanitizeSummary()` — callers cannot leak full G-code, customer
 *      part data, or file paths into the long-lived JSONL by passing arbitrary
 *      objects. Non-scalar values and camelCase keys are dropped with a stderr
 *      breadcrumb. The ledger is for ML training, not customer-data archival.
 *
 * @module utils/p2pOutcomeEmission
 * @milestone INFRA-NEURAL-LEDGER-MS1/P0-U02
 */

import { randomUUID } from "node:crypto";
import {
  outcomeCaptureBusEngine,
  type RecordOutcomeInput,
} from "../engines/OutcomeCaptureBusEngine.js";
import type {
  OutcomeDomainT,
  OutcomeKindT,
  OutcomeSeverityT,
  OutcomeSourceT,
} from "../schemas/outcomeEventSchema.js";

// ============================================================================
// SCHEMA-DERIVED CONSTANTS
// ----------------------------------------------------------------------------
// Bound to the schema enums via `satisfies`-style typed constants. If the
// schema ever drops one of these values, TypeScript fails the build at this
// file rather than letting drift sneak into the per-engine call sites.
// ============================================================================

const KIND_STAGE_COMPLETE: OutcomeKindT = "cross_process_stage_complete";
const SOURCE_SYSTEM: OutcomeSourceT = "system";
const SEVERITY_SUCCESS: OutcomeSeverityT = "info";
const SEVERITY_FAILURE: OutcomeSeverityT = "medium";

/**
 * Canonical P2P pipeline stage labels. Single source of truth for the
 * `context.pipeline_stage` field across all 6 engines — prevents 6 chats
 * inventing 6 different spellings.
 *
 * Keep snake_case; add new entries here when a new pipeline ships. The bus
 * schema's `context.pipeline_stage` is z.string().min(1).max(64) — the
 * constraint is at the bus, the canonical vocabulary is here.
 */
export const P2P_STAGES = {
  PRINT_TO_PROGRAM: "print_to_program",
  LASER_CUT: "laser_cut",
  LASER_MARK: "laser_mark",
  LASER_WELD: "laser_weld",
  LASER_DRILL: "laser_drill",
  WATERJET_ABRASIVE: "waterjet_abrasive",
  WATERJET_PURE: "waterjet_pure",
  WATERJET_TAPER: "waterjet_taper",
  WATERJET_CONTROLLED_DEPTH: "waterjet_controlled_depth",
} as const;
export type P2PStage = (typeof P2P_STAGES)[keyof typeof P2P_STAGES];

const MAX_WARNINGS_EMITTED = 8;          // first N warnings forwarded; rest summarized as count
const MAX_VALUE_STRLEN = 256;            // per-string-value cap inside summary / warnings
const MAX_BREADCRUMB_WARNING_LEN = 500;  // stderr breadcrumb truncation for Zod error trees
const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parameters every P2P engine passes when emitting its end-of-pipeline event.
 *
 * Required:
 *   - `engineName`    — emitting engine class name (e.g. "MillingPrintToProgramEngine").
 *   - `domain`        — OutcomeDomainT (mill | lathe | wedm | sinker_edm | laser | waterjet | …).
 *   - `pipelineStage` — labelled stage; should be one of `P2P_STAGES` values
 *                       (e.g. "print_to_program" / "laser_cut" / "waterjet_abrasive").
 *                       Free-form strings accepted by the schema but convention drift = pain.
 *   - `success`       — whether the pipeline completed without critical failures.
 *
 * Optional schema/context fields:
 *   - `jobId`           — cross-event linkage key; groups events from one job across stages.
 *   - `pipelineRunId`   — within-pipeline run UUID; ties together stages of one execution.
 *   - `consensusAuditId` — pointer into consensus-decisions.jsonl, if the run was driven
 *                       by `prism_ai:consensus_decide`.
 *   - `agentId`         — chat / agent id that triggered the run (e.g. "claude-f914e22b").
 *   - `lineageId`       — explicit lineage; defaults to a fresh UUID generated here so the
 *                       stderr breadcrumb on bus failure has a referenceable id.
 *
 * Optional payload fields:
 *   - `summary`         — scalar-only metrics (op counts, cycle times, RPM, etc.).
 *                       Keys MUST be snake_case; values MUST be number | boolean | string
 *                       (≤256 chars). Non-conforming entries are DROPPED with a stderr
 *                       breadcrumb. Lives at `actual.summary` (namespaced — never collides
 *                       with the helper-controlled `actual.success` boolean). This guard
 *                       protects the long-lived JSONL ledger from accidental leakage of
 *                       full G-code, customer paths, or other non-metrics data.
 *   - `warnings`        — string[] of warning messages from the pipeline. First N
 *                       (MAX_WARNINGS_EMITTED) are forwarded; total count is emitted as
 *                       `actual.warning_count`. Strings ≤256 chars are emitted verbatim;
 *                       longer strings are truncated with an ellipsis.
 *   - `numericFeatures` — Record<string, number> validated against the canonical
 *                       NUMERIC_FEATURE_KEYS list at the bus. Empty/undefined → omitted.
 *
 * Optional metadata:
 *   - `scaffolded`      — true if the engine is scaffolded (Laser/Waterjet per envelope
 *                       spec); adds `context.scaffolded:true` + a parameterized note.
 *   - `note`            — explicit free-text operator note. Overrides the scaffolded default.
 *   - `severity`        — explicit OutcomeSeverityT override; defaults: "info" on success,
 *                       "medium" on failure.
 */
export interface P2POutcomeParams {
  engineName: string;
  domain: OutcomeDomainT;
  pipelineStage: string;
  success: boolean;
  jobId?: string;
  pipelineRunId?: string;
  consensusAuditId?: string;
  agentId?: string;
  lineageId?: string;
  summary?: Record<string, unknown>;
  warnings?: string[];
  numericFeatures?: Record<string, number>;
  scaffolded?: boolean;
  note?: string;
  severity?: OutcomeSeverityT;
}

/**
 * Emit a `cross_process_stage_complete` outcome event for one pipeline run.
 *
 * **Cardinality**: 1 call per pipeline RUN (or 1 per scaffolded assembler entry-
 * method invocation — Laser has 4 assemble* methods, Waterjet has 4 — so each
 * concrete `assemble*` call counts as one "run"). Never call this in a per-OP
 * loop: the bus's per-process retry-queue (cap 256) would saturate immediately
 * on a failing-disk scenario and downstream training would lose signal.
 *
 * Side effects:
 *   - Calls `outcomeCaptureBusEngine.record(...)` synchronously (the bus
 *     itself buffers I/O internally — see OutcomeCaptureBusEngine.record docs).
 *   - On bus-side schema failure: bus returns `ok:false` with a stderr log;
 *     this helper additionally writes a single-line breadcrumb (engine name,
 *     stage, domain, event_id, lineage_id) so operators auditing missing
 *     events can trace producer → consumer.
 *   - On unexpected internal throw: caught here and logged; producer is
 *     never broken.
 *
 * @param params see P2POutcomeParams
 * @returns void — fire-and-forget; callers ignore the result.
 */
export function emitP2POutcome(params: P2POutcomeParams): void {
  // Pre-generate ids OUTSIDE the try block so the catch handler can still
  // reference them in the stderr breadcrumb (the bus also generates ids on
  // its own if absent, but pre-generating here lets failures trace back to a
  // stable id even if buildRecordInput throws before record() runs).
  const eventId = randomUUID();
  const lineageId = params.lineageId ?? eventId;

  try {
    const input = buildRecordInput(params, eventId, lineageId);
    const result = outcomeCaptureBusEngine.record(input);
    if (!result.ok) {
      const warning = truncate(result.warning ?? "unknown", MAX_BREADCRUMB_WARNING_LEN);
      process.stderr.write(
        `[p2pOutcomeEmission] bus rejected ${params.engineName} ` +
          `(stage=${params.pipelineStage}, domain=${params.domain}, ` +
          `event_id=${result.event_id}, lineage_id=${result.lineage_id}): ${warning}\n`,
      );
    }
  } catch (err) {
    // Defense-in-depth: bus.record() is documented never-throws, but a
    // module-init race / circular-import edge case could still surface a throw
    // before record() runs. Wrap stderr.write in its own try/catch so even a
    // closed-stderr child can't break the producer.
    safeStderr(
      `[p2pOutcomeEmission] unexpected throw from ${params.engineName} ` +
        `(stage=${params.pipelineStage}, event_id=${eventId}, lineage_id=${lineageId}): ` +
        `${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

/**
 * Translate P2POutcomeParams → RecordOutcomeInput (the bus's accepted shape).
 *
 * Exported for testability: unit tests assert the exact shape the helper would
 * pass to the bus without spying on the singleton, AND round-trip the result
 * through `OutcomeEventSchema.safeParse(...)` to confirm bus-side validity.
 *
 * eventId/lineageId are accepted as parameters (not generated internally) so
 * the breadcrumb path in emitP2POutcome() can pre-generate them and reference
 * the same ids in stderr on failure.
 */
export function buildRecordInput(
  params: P2POutcomeParams,
  eventId: string,
  lineageId: string,
): RecordOutcomeInput {
  const severity: OutcomeSeverityT =
    params.severity ?? (params.success ? SEVERITY_SUCCESS : SEVERITY_FAILURE);

  // Context: only include v1.1.0 fields when the caller supplied a value.
  // Omitting absent keys (rather than emitting `undefined`) keeps the JSONL
  // lean and makes drift-detection in the schema's superRefine cleaner.
  const context: Record<string, unknown> = {
    engine: params.engineName,
    pipeline_stage: params.pipelineStage,
  };
  if (params.jobId !== undefined) context.job_id = params.jobId;
  if (params.pipelineRunId !== undefined) context.pipeline_run_id = params.pipelineRunId;
  if (params.consensusAuditId !== undefined) context.consensus_audit_id = params.consensusAuditId;
  if (params.scaffolded === true) context.scaffolded = true;

  // Actual payload: helper-controlled `success` boolean PLUS namespaced
  // caller summary under `actual.summary`. Namespacing prevents key collision
  // (e.g. a caller passing `summary: {success: 0}` cannot overwrite the
  // helper's authoritative boolean — they land at different paths).
  const actual: Record<string, unknown> = {
    success: params.success,
  };
  const sanitizedSummary = sanitizeSummary(params.summary, params.engineName);
  if (sanitizedSummary) actual.summary = sanitizedSummary;

  if (params.warnings && params.warnings.length > 0) {
    actual.warning_count = params.warnings.length;
    // Forward first N warnings verbatim so operators have signal, not just
    // a count. Long strings get truncated to keep the JSONL line under the
    // bus's 64 KB cap (warning_count preserves total cardinality).
    actual.warnings_sample = params.warnings
      .slice(0, MAX_WARNINGS_EMITTED)
      .map((w) => (typeof w === "string" ? truncate(w, MAX_VALUE_STRLEN) : String(w)));
  }

  const input: RecordOutcomeInput = {
    event_id: eventId,
    lineage_id: lineageId,
    domain: params.domain,
    kind: KIND_STAGE_COMPLETE,
    source: SOURCE_SYSTEM,
    severity,
    context,
    actual,
  };

  if (params.agentId !== undefined) input.agent_id = params.agentId;

  // Only attach numeric_features if the caller actually supplied keys — an
  // empty record is valid per schema but bloats the JSONL with nothing.
  if (params.numericFeatures && Object.keys(params.numericFeatures).length > 0) {
    input.numeric_features = params.numericFeatures;
  }

  // Note resolution: explicit caller-provided `note` wins; otherwise scaffolded
  // engines get a parameterized default that names which stage was skipped so
  // 8 emission sites (Laser × 4 + Waterjet × 4) are distinguishable in stderr.
  if (params.note !== undefined) {
    input.note = params.note;
  } else if (params.scaffolded === true) {
    input.note =
      `pipeline_skipped: ${params.engineName} (${params.pipelineStage}) — ` +
      "scaffolded engine emits stage completion without a full P2P pipeline.";
  }

  return input;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Scalar-only + snake_case sanitizer for the caller-supplied `summary`.
 *
 * Rejected (dropped with stderr breadcrumb):
 *   - Keys not matching SNAKE_CASE_RE (^[a-z][a-z0-9_]*$).
 *   - Values that are objects, arrays, functions, NaN, Infinity, or strings
 *     longer than MAX_VALUE_STRLEN (truncated rather than dropped if string).
 *
 * Returns undefined when the sanitized result is empty (so callers know to
 * omit the `actual.summary` key entirely).
 */
function sanitizeSummary(
  summary: Record<string, unknown> | undefined,
  engineName: string,
): Record<string, unknown> | undefined {
  if (!summary || typeof summary !== "object") return undefined;
  const keys = Object.keys(summary);
  if (keys.length === 0) return undefined;

  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (!SNAKE_CASE_RE.test(k)) {
      safeStderr(
        `[p2pOutcomeEmission] dropped non-snake_case summary key "${k}" from ${engineName}\n`,
      );
      continue;
    }
    const v = summary[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "number") {
      if (Number.isFinite(v)) out[k] = v;
      else
        safeStderr(
          `[p2pOutcomeEmission] dropped non-finite summary value at "${k}" from ${engineName}\n`,
        );
    } else if (typeof v === "boolean") {
      out[k] = v;
    } else if (typeof v === "string") {
      out[k] = truncate(v, MAX_VALUE_STRLEN);
    } else {
      safeStderr(
        `[p2pOutcomeEmission] dropped non-scalar summary value at "${k}" from ${engineName} ` +
          `(type: ${typeof v})\n`,
      );
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Truncate a string to `max` chars with a 3-char ellipsis if it overflows. */
function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 3) + "...";
}

/** stderr write that swallows its own throws — the producer must never see them. */
function safeStderr(msg: string): void {
  try {
    process.stderr.write(msg);
  } catch {
    /* stderr unavailable (EBADF / closed); silently drop — producer is more important. */
  }
}
