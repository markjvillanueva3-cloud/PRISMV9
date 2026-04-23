/**
 * WEDM Job History Schema — v1
 *
 * Schema for WEDM_JOB_HISTORY.json. Captures finished-job telemetry that the
 * learning loop ingests (LoRA, EWC++, few-shot bootstrap). Source of truth for
 * per-job outcomes: WEDM_OUTCOME_LEDGER.jsonl (append-only). WEDM_JOB_HISTORY.json
 * is the rollup: aggregate stats + most recent N jobs for quick lookup.
 *
 * MS-P4-DL-CORE / U-P4-DL-01
 *
 * @module schemas/wedmJobHistorySchema
 */

import { z } from "zod";

// ============================================================================
// PRIMITIVES
// ============================================================================

export const MaterialKeySchema = z.string().min(1).describe("Material key (e.g. 'D2', 'M2', 'WC')");

export const ISOGroupSchema = z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group");

export const WEDMJobOutcomeSchema = z.object({
  /** Stable UUID for this job record. */
  jobId: z.string().min(1).describe("Stable UUID for this job record"),

  /** ISO-8601 timestamp of when the job finished. */
  finishedAt: z.string().datetime().describe("ISO-8601 finish timestamp"),

  /** Material key (must exist in material registry). */
  material: MaterialKeySchema,

  /** Thickness in mm. */
  thicknessMm: z.number().finite().positive().describe("Workpiece thickness (mm)"),

  /** Wire diameter in mm. */
  wireDiameterMm: z.number().finite().positive().describe("Wire diameter (mm)"),

  /** Wire material (brass, coated_brass, molybdenum, tungsten, etc.). */
  wireMaterial: z.string().min(1).describe("Wire material"),

  /** Controller dialect used. */
  controller: z.enum(["fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles", "accutex"]).describe("Controller dialect"),

  /** Predicted vs actual telemetry. */
  predicted: z.object({
    raUm: z.number().finite().nonnegative().describe("Predicted surface roughness (µm Ra)"),
    cycleTimeMin: z.number().finite().nonnegative().describe("Predicted cycle time (minutes)"),
    wireBreaks: z.number().finite().nonnegative().describe("Predicted wire-break count"),
    recastDepthUm: z.number().finite().nonnegative().optional().describe("Predicted recast depth (µm)"),
  }).describe("Predicted telemetry before the job"),

  actual: z.object({
    raUm: z.number().finite().nonnegative().describe("Measured surface roughness (µm Ra)"),
    cycleTimeMin: z.number().finite().nonnegative().describe("Actual cycle time (minutes)"),
    wireBreaks: z.number().finite().nonnegative().int().describe("Observed wire-break count"),
    recastDepthUm: z.number().finite().nonnegative().optional().describe("Measured recast depth (µm)"),
  }).describe("Actual telemetry captured after the job"),

  /** Optional: recipe used (peak current, pulse on/off, etc.). */
  recipe: z.object({
    peakCurrentA: z.number().finite().positive().describe("Peak current (A)"),
    pulseOnUs: z.number().finite().positive().describe("Pulse on time (µs)"),
    pulseOffUs: z.number().finite().positive().describe("Pulse off time (µs)"),
    wireTensionN: z.number().finite().positive().describe("Wire tension (N)"),
    wireSpeedMPerMin: z.number().finite().positive().optional(),
    flushPressureBar: z.number().finite().nonnegative().optional(),
    skimPasses: z.number().finite().nonnegative().int().optional(),
  }).optional().describe("Recipe parameters used"),

  /** Who recorded this outcome (operator id, agent id, or 'pipeline'). */
  recordedBy: z.string().min(1).describe("Recording identity"),

  /** Free-form notes (optional). */
  notes: z.string().optional(),
}).strict();

export type WEDMJobOutcome = z.infer<typeof WEDMJobOutcomeSchema>;

export const WEDMJobHistorySchema = z.object({
  schemaVersion: z.literal(1),
  /** Total jobs recorded (including rolled-out beyond recent window). */
  totalJobs: z.number().finite().nonnegative().int(),
  /** Recent jobs (bounded cache; full log is WEDM_OUTCOME_LEDGER.jsonl). */
  recent: z.array(WEDMJobOutcomeSchema).max(500),
  /** Per-material aggregate stats. */
  statsByMaterial: z.record(z.string(), z.object({
    count: z.number().finite().nonnegative().int(),
    meanRaErrorUm: z.number().finite(),
    meanCycleTimeErrorMin: z.number().finite(),
    wireBreakRate: z.number().finite().nonnegative(),
    lastFinishedAt: z.string().datetime().nullable(),
  })),
  /** Top-level aggregate stats. */
  aggregate: z.object({
    meanRaMAEUm: z.number().finite().nonnegative(),
    meanCycleTimeMAEMin: z.number().finite().nonnegative(),
    overallWireBreakRate: z.number().finite().nonnegative(),
    firstFinishedAt: z.string().datetime().nullable(),
    lastFinishedAt: z.string().datetime().nullable(),
  }),
}).strict();

export type WEDMJobHistory = z.infer<typeof WEDMJobHistorySchema>;

/** Canonical zero-state for a fresh install. */
export const EMPTY_WEDM_JOB_HISTORY: WEDMJobHistory = {
  schemaVersion: 1,
  totalJobs: 0,
  recent: [],
  statsByMaterial: {},
  aggregate: {
    meanRaMAEUm: 0,
    meanCycleTimeMAEMin: 0,
    overallWireBreakRate: 0,
    firstFinishedAt: null,
    lastFinishedAt: null,
  },
};
