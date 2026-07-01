/**
 * outcomeActionSchemas.ts — Zod input schemas for the prism_outcome dispatcher.
 *
 * One schema per action group. Re-exports OutcomeInputSchema from
 * OutcomeTrackingEngine to avoid duplication (single source of truth).
 * Re-exports RecordOutcomeTraceInputSchema from policyExperienceSchema
 * for the same reason.
 *
 * @module schemas/outcomeActionSchemas
 * @milestone PSN-SYNERGY / OUTCOME-WIRING
 */

import { z } from "zod";

// ─── Re-exports (avoid duplicating schemas that already exist) ───────────────

export { OutcomeInputSchema } from "../engines/OutcomeTrackingEngine.js";
export { RecordOutcomeTraceInputSchema } from "./policyExperienceSchema.js";

// ─── OutcomeCaptureBus ────────────────────────────────────────────────────────

export const OutcomeBusRecordSchema = z.object({
  domain: z.string().min(1).describe("Outcome domain shard (e.g. mill, lathe, wedm, cam, cad)"),
  kind: z.string().min(1).describe("Outcome kind (e.g. cycle_complete, scrap, override, tool_break)"),
  source: z.string().min(1).describe("Engine or component that observed this outcome"),
  lineage_id: z.string().optional().describe("Lineage id tying this event to a prior recommendation"),
  event_id: z.string().optional().describe("Override event_id; auto-generated when absent"),
  severity: z.enum(["info", "warning", "error", "critical"]).optional().describe("Severity level"),
  agent_id: z.string().optional().describe("Chat slot or agent that produced this event"),
  timestamp: z.string().optional().describe("ISO-8601 override for import/backfill; omit for now()"),
  context: z.record(z.string(), z.unknown()).optional().describe("Arbitrary domain context bag"),
  recommended: z.unknown().optional().describe("What the system recommended"),
  actual: z.unknown().optional().describe("What actually happened"),
  delta: z.unknown().optional().describe("Quantified difference between recommended and actual"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence of the originating prediction"),
  note: z.string().optional().describe("Human-readable annotation"),
  numeric_features: z.record(z.string(), z.number()).optional().describe("v1.1.0 numeric feature vector"),
});

export const OutcomeBusQuerySchema = z.object({
  domain: z.string().optional().describe("Filter to a single domain shard"),
  kind: z.string().optional().describe("Filter by outcome kind"),
  lineage_id: z.string().optional().describe("Filter by lineage_id"),
  agent_id: z.string().optional().describe("Filter by agent_id"),
  since_iso: z.string().optional().describe("ISO-8601 lower bound for timestamp"),
  limit: z.number().int().min(1).max(10_000).optional().describe("Max events to return (default 100)"),
});

// ─── OutcomeTracking (per-program JSONL logger) ───────────────────────────────

export const OutcomeQuerySchema = z.object({
  programId: z.string().optional().describe("Filter by program id"),
  machineId: z.string().optional().describe("Filter by machine id"),
  materialId: z.string().optional().describe("Filter by material id"),
  outcome: z
    .union([
      z.enum(["good", "scrap", "adjusted", "aborted"]),
      z.array(z.enum(["good", "scrap", "adjusted", "aborted"])),
    ])
    .optional()
    .describe("Outcome kind filter (single or array)"),
  sinceIso: z.string().optional().describe("ISO-8601 lower bound"),
  untilIso: z.string().optional().describe("ISO-8601 upper bound"),
  limit: z.number().int().min(1).max(50_000).optional().describe("Max records to return"),
});

export const OutcomeForProgramSchema = z.object({
  programId: z.string().min(1).describe("Program id to fetch outcomes for"),
});

export const OutcomeStatsSchema = z.object({
  programId: z.string().optional().describe("Scope stats to a single program"),
  machineId: z.string().optional().describe("Scope stats to a single machine"),
  materialId: z.string().optional().describe("Scope stats to a single material"),
  outcome: z
    .union([
      z.enum(["good", "scrap", "adjusted", "aborted"]),
      z.array(z.enum(["good", "scrap", "adjusted", "aborted"])),
    ])
    .optional()
    .describe("Scope stats to specific outcome kinds"),
  sinceIso: z.string().optional(),
  untilIso: z.string().optional(),
  limit: z.number().int().min(1).max(50_000).optional(),
});

// ─── OutcomePublishAdapter ────────────────────────────────────────────────────

export const OutcomePublishSchema = z.object({
  bridge: z.string().min(1).describe("Cross-process bridge name (e.g. mill_sf, lathe_turning, wedm)"),
  process: z.string().min(1).describe("Manufacturing process (mill, lathe, wedm, cam, cad, post)"),
  request_summary: z.record(z.string(), z.unknown()).describe("Summary of the system's recommendation"),
  response_summary: z.record(z.string(), z.unknown()).optional().describe("Summary of the generated response"),
  outcome: z
    .object({
      kind: z.string().optional().describe("Outcome kind; defaults to 'pending' when absent"),
      failure_mode: z.string().optional(),
      actual_metrics: z.record(z.string(), z.unknown()).optional(),
      notes: z.string().optional(),
    })
    .optional()
    .describe("Outcome block; omit to land as pending and update later"),
  operator: z
    .object({
      id: z.string().optional(),
      skill_level: z.string().optional(),
      override_reason: z.string().optional(),
    })
    .optional(),
});

export const OutcomePublishWithActualsSchema = z.object({
  bridge: z.string().min(1),
  process: z.string().min(1),
  request_summary: z.record(z.string(), z.unknown()),
  response_summary: z.record(z.string(), z.unknown()).optional(),
  outcome_kind: z.string().min(1).describe("Terminal outcome kind (success, failure, operator_override)"),
  failure_mode: z.string().optional(),
  actual_metrics: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  operator: z.object({ id: z.string().optional(), skill_level: z.string().optional() }).optional(),
});

export const OutcomePublishFailureSchema = z.object({
  bridge: z.string().min(1),
  process: z.string().min(1),
  request_summary: z.record(z.string(), z.unknown()),
  response_summary: z.record(z.string(), z.unknown()).optional(),
  failure_mode: z.string().min(1).describe("Non-empty failure mode (required for learning signal quality)"),
  actual_metrics: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  operator: z.object({ id: z.string().optional(), skill_level: z.string().optional() }).optional(),
});

export const OutcomePublishOverrideSchema = z.object({
  bridge: z.string().min(1),
  process: z.string().min(1),
  request_summary: z.record(z.string(), z.unknown()),
  response_summary: z.record(z.string(), z.unknown()).optional(),
  override_reason: z.string().min(1).describe("Why the operator overrode the recommendation"),
  actual_metrics: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  operator_id: z.string().optional(),
  operator_skill_level: z.string().optional(),
});

export const OutcomeUpdateSchema = z.object({
  id: z.string().min(1).describe("Outcome record id returned by a prior publish call"),
  kind: z.enum(["success", "failure", "operator_override"]).describe("Terminal outcome kind"),
  failure_mode: z.string().optional(),
  actual_metrics: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
});

// ─── Bridge engines — shared configure / stats schemas ───────────────────────

export const BridgeConfigureSchema = z.object({
  errorPolicy: z
    .enum(["failure_only", "failure_or_override"])
    .optional()
    .describe("How to map outcome.kind to the binary error signal for drift/replay"),
  minDriftConfidenceForRetrain: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("(DriftCalibration only) min drift confidence before concept-shift handler fires"),
  cooldownMs: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("(DriftCalibration only) cooldown between concept-shift decisions"),
  ringCapacity: z
    .number()
    .int()
    .min(1)
    .max(100_000)
    .optional()
    .describe("(ReplayBuffer only) ring-buffer episode capacity"),
  applyKindPrior: z.boolean().optional().describe("(RL only) add KIND_PRIOR[kind] on top of reward-shaper output"),
  defaultDecision: z
    .enum(["approved", "vetoed", "override", "pending"])
    .optional()
    .describe("(EpisodicMemory only) default decision label when not in request_summary"),
  maxFeatureCount: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe("(EpisodicMemory only) cap on per-event feature vector size"),
});

// ─── ReplayBuffer — sampling schemas ─────────────────────────────────────────

export const ReplayBufferSampleStratifiedSchema = z.object({
  n: z.number().int().nonnegative().max(100_000).describe("Number of episodes to sample"),
  processWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  outcomeWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  materialClusters: z.record(z.string(), z.array(z.string())).optional(),
  shuffleResult: z.boolean().optional().describe("Shuffle result before returning (default true)"),
});

export const ReplayBufferSamplePrioritizedSchema = z.object({
  n: z.number().int().min(1).max(100_000).describe("Number of episodes to sample"),
  beta: z.number().min(0).max(1).optional().describe("Importance-sampling exponent"),
});

// ─── RL bridge — replay schema ────────────────────────────────────────────────

export const RLBridgeReplaySchema = z.object({
  limit: z.number().int().min(1).max(100_000).optional().describe("Max outcomes to replay (default 200)"),
  process: z.enum(["mill", "lathe", "wedm"]).optional().describe("Scope replay to a single process"),
});

// --- FeedbackCollector (operator-facing front door over OutcomeTracking) ------
// Mirrors the metrics/adjustments sub-shapes of OutcomeInputSchema (the engine
// re-validates on log()); kept faithful so the dispatcher boundary validates
// intent before any engine call. Source of truth: OutcomeTrackingEngine.ts.

const FeedbackMetricsSchema = z
  .object({
    cycleTimeSec: z.number().nonnegative().optional(),
    surfaceFinishRaUm: z.number().nonnegative().optional(),
    toolWearMm: z.number().nonnegative().optional(),
    dimensionalErrorMm: z.number().optional(),
    scrapReason: z.string().optional(),
  })
  .optional();

const FeedbackAdjustmentsSchema = z
  .object({
    feedRatePct: z.number().optional(),
    spindleRpmPct: z.number().optional(),
    depthOfCutPct: z.number().optional(),
    stepoverPct: z.number().optional(),
    coolantChange: z.string().optional(),
    toolChange: z.string().optional(),
    freeText: z.string().optional(),
  })
  .optional();

/** Shared run-context bag accepted by every feedback verb. */
export const FeedbackMetaSchema = z.object({
  machineId: z.string().optional(),
  materialId: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  operatorId: z.string().optional(),
  notes: z.string().optional(),
  metrics: FeedbackMetricsSchema,
});

export const FeedbackThumbsUpSchema = z.object({
  programId: z.string().min(1).describe("Program id the feedback is about"),
  meta: FeedbackMetaSchema.optional().describe("Optional run context (machine/material/tool/operator/notes/metrics)"),
});

export const FeedbackThumbsDownSchema = z.object({
  programId: z.string().min(1).describe("Program id the feedback is about"),
  reason: z.string().min(1).describe("Why the run was bad (logged as metrics.scrapReason)"),
  meta: FeedbackMetaSchema.optional().describe("Optional run context"),
});

export const FeedbackAdjustedSchema = z.object({
  programId: z.string().min(1).describe("Program id the feedback is about"),
  adjustments: FeedbackAdjustmentsSchema.describe("Process adjustments applied (feed/rpm/doc/stepover/coolant/tool/freeText)"),
  meta: FeedbackMetaSchema.optional().describe("Optional run context"),
});

export const FeedbackAbortedSchema = z.object({
  programId: z.string().min(1).describe("Program id the feedback is about"),
  reason: z.string().min(1).describe("Why the run was aborted (appended to notes)"),
  meta: FeedbackMetaSchema.optional().describe("Optional run context"),
});

export const FeedbackRecordLooseSchema = z.object({
  programId: z.string().min(1).describe("Program id the feedback is about"),
  loose: z.string().min(1).describe("Loose operator outcome string (ok/good/bad/scrap/adj/abort/...)"),
  meta: FeedbackMetaSchema.optional().describe("Optional run context"),
});

// --- No-input (stats / reset / subscribe / status / needs-attention) ---------

export const EmptyInputSchema = z.object({}).describe("No input parameters required");
