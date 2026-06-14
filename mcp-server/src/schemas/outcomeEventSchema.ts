/**
 * Outcome Event Schema — U-LEARN-01 OutcomeCaptureBus
 * ====================================================
 *
 * Universal event envelope every PRISM engine uses to emit outcomes to the
 * cross-domain learning spine. Per-domain JSONL shards under state/outcomes/
 * are append-only with atomic writes so 6 concurrent chats never corrupt the
 * event stream.
 *
 * Producers: any engine — physics calc, CAM strategy, PP, SFC, quote,
 *            shop-floor scanner, operator-override capture hook, etc.
 * Consumers: PhysicsOutcomeCalibrator, PolicyExperienceLedger, FeatureStore,
 *            MLLineage, BusinessValueMetrics, TheoryOfMind, and (1.1.0)
 *            CrossProcessNeuralLearningEngine + downstream Tier-1 trainers.
 *
 * Compatible with existing OutcomeTrackingEngine (Phase 0.19) — that engine
 * still owns program-outcome-specific logging; this bus covers every other
 * signal (override, measurement, scrap, quote-vs-actual, ...).
 *
 * @module schemas/outcomeEventSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-01 (1.0.0) · INFRA-NEURAL-LEDGER-MS1/P0-U01 (1.1.0)
 *
 * ─── SCHEMA MIGRATION SPEC ─────────────────────────────────────────────────
 *
 * 1.0.0 → 1.1.0 (2026-05-12, additive, backward-compatible)
 *
 *   Why:  Close architect risk #1 (outcome data starvation) — every print-to-
 *         program pipeline run, consensus decision, and machine job needs to
 *         emit a structured event the cross-process learning spine can train
 *         on. v1.0.0 covers the operator/measurement axis; v1.1.0 adds the
 *         pipeline-stage + consensus-audit-link axis without forking the
 *         schema.
 *
 *   New OutcomeKind values:
 *     - cross_process_decision        — bridge invocation logged by an
 *                                       XPROC-* engine (router/feature/SFC/
 *                                       post/AI). Pair predicted+actual via
 *                                       lineage_id; payload may include
 *                                       consensus_audit_id when the decision
 *                                       was driven by prism_ai:consensus_decide.
 *     - cross_process_stage_complete  — a pipeline stage finished (CAD →
 *                                       feature recognition, toolpath →
 *                                       post, etc.). Use for Section 5.5
 *                                       throughput + drop-out analysis.
 *
 *   New OutcomeContextSchema fields (all optional, pure addition):
 *     - job_id              — cross-event linkage key (groups events from one
 *                             job across stages/engines). Distinct from
 *                             lineage_id (which is recommendation→outcome
 *                             pair) and event_id (per-event).
 *     - pipeline_stage      — labelled pipeline stage (e.g. "feature_recognize",
 *                             "toolpath_generate", "post_process", "consensus_vote").
 *     - pipeline_run_id     — uuid for one pipeline execution; ties together
 *                             every event emitted across that run's stages.
 *     - consensus_audit_id  — pointer into mcp-server/data/state/
 *                             consensus-decisions.jsonl entry that drove this
 *                             decision (gated by INFRA-CONSENSUS-WIRE-MS0/
 *                             P0-U04 audit-log unit shipping that ledger).
 *
 *   New top-level field (optional):
 *     - numeric_features    — Record<NumericFeatureKey, number> validated
 *                             against the canonical NUMERIC_FEATURE_KEYS list
 *                             from CrossProcessOutcomeStore. Each value must
 *                             be a finite number; non-canonical keys are
 *                             rejected (not silently dropped) so the feature
 *                             vocabulary stays controlled.
 *
 *   schemaVersion accepts:  z.union([z.literal("1.0.0"), z.literal("1.1.0")]).
 *   v1.0.0 events validate unchanged. New consumers must check schemaVersion
 *   before reading 1.1.0-only fields. Producers ought to emit "1.1.0" once
 *   they populate any new field.
 *
 *   Producers MUST NOT downgrade. If a 1.1.0 producer falls back to 1.0.0,
 *   it must zero out all 1.1.0-only fields (no bleed). This rule is
 *   machine-enforced by the cross-field .superRefine() at the bottom of
 *   OutcomeEventSchema (a v1.0.0 schemaVersion paired with any 1.1.0-only
 *   kind/context-key/numeric_features is rejected at parse time).
 *   Coverage tests live in outcomeEventSchema.v11.test.ts.
 *
 *   Rollback plan: revert this commit + re-stamp any in-flight 1.1.0 events
 *   to 1.0.0 (the new fields are all optional, so dropping them is safe).
 *   No on-disk migration required — JSONL shards keep their schemaVersion
 *   marker per event.
 *
 *   Next bumps will follow the same additive-only protocol unless an
 *   architectural change forces a breaking 2.0.0 (in which case a one-shot
 *   migration script lives at scripts/migrations/outcome-events-v2.mjs).
 * ───────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// SINGLE SOURCE OF TRUTH for canonical numeric-feature vocabulary. Imported
// directly from the engine that owns runtime validation (CrossProcessOutcomeStore)
// so parse-time + runtime stay aligned automatically. The matching `NumericFeatureKey`
// type is intentionally NOT re-exported here — consumers import it directly from
// the store to keep the type's source single-rooted (see end-of-file note).
import { NUMERIC_FEATURE_KEYS } from "../engines/CrossProcessOutcomeStore.js";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Domains the bus knows about. Expandable — unknown domain falls back to "other"
 * so an engine never fails to emit because of a schema mismatch.
 */
export const OutcomeDomain = z.enum([
  "mill",
  "lathe",
  "wedm",
  "sinker_edm",
  "grinder",
  "welder",
  "laser",
  "waterjet",
  "five_axis",
  "mill_turn",
  "cad",
  "cam",
  "post_processor",
  "speed_feed",
  "quote",
  "schedule",
  "shop_floor",
  "quality",
  "erp",
  "other",
]);

/**
 * Event kind — what happened. Consumers route by kind.
 *
 * v1.1.0 additions: cross_process_decision, cross_process_stage_complete.
 * Reading consumers must guard on schemaVersion before assuming these are
 * present in the upstream payload.
 */
export const OutcomeKind = z.enum([
  "operator_override",                // operator dialed recommendation away from suggestion
  "cycle_time_measurement",           // actual cycle time observed post-run
  "tool_break",                       // tool failure event
  "surface_finish_ra",                // measured Ra value
  "cmm_measurement",                  // inspection datum
  "scrap_event",                      // part rejected
  "first_article_pass",               // FAI approved
  "first_article_fail",               // FAI rejected
  "quote_accepted",                   // customer accepted quote
  "quote_rejected",
  "quote_vs_actual",                  // reconciliation at job close
  "chatter_event",
  "collision_avoided",
  "post_editor_edit",                 // operator edited generated post
  "recommendation_emitted",           // AI emitted a recommendation (paired with outcome later via lineage_id)
  // v1.1.0 — INFRA-NEURAL-LEDGER-MS1/P0-U01
  "cross_process_decision",           // bridge invocation logged by an XPROC-* engine; pair predicted+actual via lineage_id
  "cross_process_stage_complete",     // pipeline stage finished (CAD→feature, toolpath→post, consensus→commit, etc.)
  // CAD-COMPLETE-MS0/U-CADC-LP01 — base kind, deliberately NOT v1.1.0-gated:
  // it carries no version-guarded fields, so a v1.0.0 consumer simply sees an
  // unrecognised kind rather than mis-reading a guarded field. Adding it here
  // (vs V11_ONLY_KINDS) lets CADExecutionOutcomeBusEngine's durable channel
  // validate under the default schemaVersion 1.0.0 pickSchemaVersion() stamps.
  "cad_execution_outcome",            // a CAD adapter op finished — success/error/timing/collision/regeneration
  "other",
]);

/**
 * Severity for downstream prioritization (calibration weight, alert routing).
 */
export const OutcomeSeverity = z.enum(["info", "low", "medium", "high", "critical"]);

/**
 * Source of the signal — informs credibility / confidence weighting.
 */
export const OutcomeSource = z.enum([
  "operator",     // typed/dialed by human at machine
  "controller",   // machine controller log / MTConnect
  "cmm",          // metrology instrument
  "sensor",       // vibration/temp/current etc.
  "system",       // PRISM engine itself
  "import",       // historical import from archive
  "erp",          // ERP system
  "simulation",   // simulator
  "other",
]);

/**
 * Context object — arbitrary structured data accompanying the event. Keep
 * to scalars / shallow objects so JSONL lines stay bounded. Zod passes through
 * extras so no engine fails to emit because of a new field.
 *
 * v1.1.0 (INFRA-NEURAL-LEDGER-MS1/P0-U01) adds 4 optional fields for the
 * cross-process pipeline + consensus axis. All optional — v1.0.0 producers
 * keep working unchanged. New consumers should treat absence as "this event
 * predates 1.1.0 OR this producer doesn't participate in the cross-process
 * pipeline."
 */
export const OutcomeContextSchema = z
  .object({
    customer: z.string().optional().describe("Customer name (e.g. JM Die customer ID)"),
    part_number: z.string().optional().describe("Part number from CAD/PO"),
    program: z.string().optional().describe("NC program filename or path"),
    machine_id: z.string().optional().describe("Machine identifier from shop config"),
    material: z.string().optional().describe("Material code (ISO group or specific alloy)"),
    tool_id: z.string().optional().describe("Tool identifier from tool crib"),
    operation: z.string().optional().describe("Operation type (rough/finish/drill/etc)"),
    engine: z.string().optional().describe("Which engine emitted this event"),
    action: z.string().optional().describe("Which dispatcher action triggered emission"),
    // v1.1.0 — cross-process pipeline + consensus linkage
    job_id: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe(
        "Cross-event linkage key — groups every event from a single job across stages and engines. " +
          "Distinct from event_id (per-event UUID) and lineage_id (recommendation→outcome pair).",
      ),
    pipeline_run_id: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe(
        "UUID for one pipeline execution; ties together every event emitted across that run's stages. " +
          "Use job_id for cross-pipeline linkage, pipeline_run_id for within-pipeline.",
      ),
    pipeline_stage: z
      .string()
      .min(1)
      .max(64)
      .optional()
      .describe(
        "Labelled pipeline stage (e.g. 'feature_recognize', 'toolpath_generate', 'post_process', " +
          "'consensus_vote'). Used for stage-level throughput + drop-out analysis.",
      ),
    consensus_audit_id: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe(
        "Pointer into mcp-server/data/state/consensus-decisions.jsonl entry that drove this " +
          "decision. Populated when the upstream invoked prism_ai:consensus_decide and persisted " +
          "an audit row (per INFRA-CONSENSUS-WIRE-MS0/P0-U04 audit-log unit).",
      ),
  })
  .passthrough();

/**
 * Numeric-feature payload — a controlled vocabulary of canonical cutting-physics
 * features (tool diameter, depth of cut, RPM, etc.). The key set is sourced
 * from CrossProcessOutcomeStore.NUMERIC_FEATURE_KEYS so runtime + parse-time
 * validation stay aligned automatically.
 *
 * Validation rules (1.1.0):
 *   - Every key must be in NUMERIC_FEATURE_KEYS (non-canonical keys rejected;
 *     prevents the feature vocabulary from sprawling silently).
 *   - Every value must be a finite number (no NaN, no Infinity).
 *   - Empty object `{}` is valid (just means no features were recorded).
 */
export const NumericFeaturesSchema = z
  .record(z.string(), z.number().finite())
  // P1 fix (2026-05-12 reviewer B): use superRefine so EVERY offending key surfaces
  // its own issue with `path: [bad_key]` — debuggable when the canonical list grows.
  // The previous .refine() short-circuited on the first invalid key and only
  // pointed at the parent field.
  .superRefine((rec, ctx) => {
    const allowed = new Set<string>(NUMERIC_FEATURE_KEYS);
    for (const k of Object.keys(rec)) {
      if (!allowed.has(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [k],
          message: `key "${k}" not in canonical NUMERIC_FEATURE_KEYS [${NUMERIC_FEATURE_KEYS.join(", ")}]`,
        });
      }
    }
  })
  .describe(
    "Optional numeric feature vector (cutting-physics canonical keys). Each value " +
      "must be a finite number; non-canonical keys are rejected with per-key path " +
      "so the feature vocabulary stays controlled. Source of truth: " +
      "CrossProcessOutcomeStore.NUMERIC_FEATURE_KEYS.",
  );

/**
 * Main event. `recommended` and `actual` are free-form JSON so any physics/
 * cost/ time delta can be represented without schema churn. `delta` is an
 * engine-computed summary; consumers may recompute.
 *
 * schemaVersion accepts a union of ("1.0.0" | "1.1.0") for backward compat —
 * v1.1.0 is purely additive (new optional context fields, new OutcomeKind
 * values, optional top-level numeric_features). Producers ought to emit
 * "1.1.0" once they populate any new field; consumers MUST guard before
 * reading 1.1.0-only fields.
 *
 * See top-of-module SCHEMA MIGRATION SPEC for the full 1.0.0 → 1.1.0 plan.
 */
export const OutcomeEventSchema = z.object({
  schemaVersion: z
    .union([z.literal("1.0.0"), z.literal("1.1.0")])
    .describe("Schema version; v1.1.0 adds optional cross-process pipeline + consensus fields. Additive only."),
  event_id: z.string().min(1).describe("Per-event UUID; unique across all events."),
  lineage_id: z
    .string()
    .min(1)
    .describe("Recommendation→outcome pairing key. Multiple events may share lineage_id."),
  domain: OutcomeDomain,
  kind: OutcomeKind,
  severity: OutcomeSeverity.default("info"),
  source: OutcomeSource,
  timestamp: IsoTimestamp,
  agent_id: z.string().optional().describe("Agent/chat identifier that emitted (e.g. 'claude-88901d4c')."),
  context: OutcomeContextSchema,
  recommended: z.unknown().optional().describe("What the upstream engine recommended (free-form JSON)."),
  actual: z.unknown().optional().describe("What actually happened post-execution (free-form JSON)."),
  delta: z.unknown().optional().describe("Engine-computed delta summary; consumers may recompute."),
  confidence: z.number().min(0).max(1).optional().describe("Producer's confidence in the recommendation [0,1]."),
  note: z.string().optional().describe("Free-text note for human review."),
  // v1.1.0 — INFRA-NEURAL-LEDGER-MS1/P0-U01
  numeric_features: NumericFeaturesSchema.optional().describe(
    "v1.1.0 only — optional numeric feature vector. See NumericFeaturesSchema for vocabulary.",
  ),
})
  // P0 fix (2026-05-12 reviewer B): enforce the migration spec's "no version bleed"
  // rule at parse time. Without this, a producer can stamp schemaVersion="1.0.0"
  // on an event that uses a v1.1.0-only kind/context-field/numeric_features and
  // both Zod accepts it (the union allows 1.0.0) AND consumers guarding on
  // `schemaVersion === "1.0.0"` silently mis-handle the new payload. The rule
  // is now machine-enforced, not just doctrine in the migration spec.
  .superRefine((evt, ctx) => {
    const V11_ONLY_KINDS = new Set<string>([
      "cross_process_decision",
      "cross_process_stage_complete",
    ]);
    const V11_ONLY_CONTEXT_KEYS = [
      "job_id",
      "pipeline_run_id",
      "pipeline_stage",
      "consensus_audit_id",
    ];
    const usesV11Kind = V11_ONLY_KINDS.has(evt.kind);
    const ctxObj = (evt.context ?? {}) as Record<string, unknown>;
    const usesV11Context = V11_ONLY_CONTEXT_KEYS.some((k) => ctxObj[k] !== undefined);
    const usesV11Features = evt.numeric_features !== undefined;
    if ((usesV11Kind || usesV11Context || usesV11Features) && evt.schemaVersion === "1.0.0") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["schemaVersion"],
        message:
          'schemaVersion must be "1.1.0" when using v1.1.0-only fields ' +
          "(kind ∈ {cross_process_decision, cross_process_stage_complete}, " +
          "context.{job_id,pipeline_run_id,pipeline_stage,consensus_audit_id}, " +
          "or top-level numeric_features). Producer is bleeding schema versions; " +
          "fix the producer to stamp 1.1.0 before populating new fields.",
      });
    }
    // P1 fix (2026-05-12 reviewer B): catch the convention-drift case where a
    // producer used the camelCase variant of a snake_case field. .passthrough()
    // on context lets the typo slide silently into the JSONL — the typed
    // snake_case field stays undefined and analytics break in subtle ways.
    const CAMEL_TO_SNAKE: Array<[string, string]> = [
      ["jobId", "job_id"],
      ["pipelineRunId", "pipeline_run_id"],
      ["pipelineStage", "pipeline_stage"],
      ["consensusAuditId", "consensus_audit_id"],
    ];
    for (const [camel, snake] of CAMEL_TO_SNAKE) {
      if (ctxObj[camel] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["context", camel],
          message: `use snake_case key "${snake}" — camelCase variant rejected per PRISM convention (rules/schemas.md)`,
        });
      }
    }
  });

export type NumericFeatures = z.infer<typeof NumericFeaturesSchema>;
// P1 fix (2026-05-12 reviewer B): NumericFeatureKey is intentionally NOT
// re-exported here. Single canonical source: import from
// `../engines/CrossProcessOutcomeStore.js` directly. Re-exporting created two
// import paths for the same type, inviting silent drift on rename.

export type OutcomeEvent = z.infer<typeof OutcomeEventSchema>;
export type OutcomeDomainT = z.infer<typeof OutcomeDomain>;
export type OutcomeKindT = z.infer<typeof OutcomeKind>;
export type OutcomeSeverityT = z.infer<typeof OutcomeSeverity>;
export type OutcomeSourceT = z.infer<typeof OutcomeSource>;

/**
 * Query filter — consumers use this shape when calling `querySince()`.
 */
export const OutcomeQuerySchema = z.object({
  domain: OutcomeDomain.optional(),
  kind: OutcomeKind.optional(),
  since_iso: IsoTimestamp.optional(),
  lineage_id: z.string().optional(),
  agent_id: z.string().optional(),
  limit: z.number().int().positive().max(10_000).default(1000),
});

export type OutcomeQuery = z.infer<typeof OutcomeQuerySchema>;
