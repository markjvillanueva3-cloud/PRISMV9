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
 *            MLLineage, BusinessValueMetrics, TheoryOfMind.
 *
 * Compatible with existing OutcomeTrackingEngine (Phase 0.19) — that engine
 * still owns program-outcome-specific logging; this bus covers every other
 * signal (override, measurement, scrap, quote-vs-actual, ...).
 *
 * @module schemas/outcomeEventSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-01
 */

import { z } from "zod";

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
 */
export const OutcomeKind = z.enum([
  "operator_override",       // operator dialed recommendation away from suggestion
  "cycle_time_measurement",  // actual cycle time observed post-run
  "tool_break",              // tool failure event
  "surface_finish_ra",       // measured Ra value
  "cmm_measurement",         // inspection datum
  "scrap_event",             // part rejected
  "first_article_pass",      // FAI approved
  "first_article_fail",      // FAI rejected
  "quote_accepted",          // customer accepted quote
  "quote_rejected",
  "quote_vs_actual",         // reconciliation at job close
  "chatter_event",
  "collision_avoided",
  "post_editor_edit",        // operator edited generated post
  "recommendation_emitted",  // AI emitted a recommendation (paired with outcome later via lineage_id)
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
 */
export const OutcomeContextSchema = z
  .object({
    customer: z.string().optional(),
    part_number: z.string().optional(),
    program: z.string().optional(),
    machine_id: z.string().optional(),
    material: z.string().optional(),
    tool_id: z.string().optional(),
    operation: z.string().optional(),
    engine: z.string().optional(),      // which engine emitted
    action: z.string().optional(),      // which dispatcher action
  })
  .passthrough();

/**
 * Main event. `recommended` and `actual` are free-form JSON so any physics/
 * cost/ time delta can be represented without schema churn. `delta` is an
 * engine-computed summary; consumers may recompute.
 */
export const OutcomeEventSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  event_id: z.string().min(1),
  lineage_id: z.string().min(1),
  domain: OutcomeDomain,
  kind: OutcomeKind,
  severity: OutcomeSeverity.default("info"),
  source: OutcomeSource,
  timestamp: IsoTimestamp,
  agent_id: z.string().optional(),
  context: OutcomeContextSchema,
  recommended: z.unknown().optional(),
  actual: z.unknown().optional(),
  delta: z.unknown().optional(),
  confidence: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

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
