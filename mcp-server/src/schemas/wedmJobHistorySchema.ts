/**
 * wedmJobHistorySchema — Zod schema v1 for WEDM_JOB_HISTORY.json
 *
 * Canonical on-device learning substrate. Every finished WEDM job writes one
 * `WEDMJobRecord` into this history. Downstream consumers (LoRA adapter
 * training, EWC Fisher-info update, few-shot material bootstrap) read this
 * file as their training corpus.
 *
 * Schema design principles:
 *   • Every numeric telemetry field carries `unit`, `source`, optional
 *     `uncertainty` — mirrors AtomicValue shape used elsewhere in PRISM.
 *   • `schemaVersion: 1` is the stable contract. Breaking changes require
 *     a migration in src/migrations/.
 *   • `job_id` is a ULID (sortable by time). `recorded_at` is ISO-8601 UTC.
 *   • Outcomes are bounded: wire_break counts and Ra values reject negatives
 *     and `Number.isFinite(NaN) === false` is asserted.
 *
 * Referenced by:
 *   • WEDMJobOutcomeEngine.record() — validates input before persisting
 *   • WEDMJobOutcomeEngine.load()   — validates file on read (round-trip safe)
 *   • MS-P4-DL-CORE / U-P4-DL-01
 *
 * @module schemas/wedmJobHistorySchema
 * @version 1.0.0
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** Finite number: rejects NaN and ±Infinity. */
const finiteNumber = z
  .number()
  .refine((n) => Number.isFinite(n), { message: "must be finite (no NaN/Infinity)" });

/** Non-negative finite number (Ra, cycle time, wire length cannot go negative). */
const nonNegFinite = finiteNumber.refine((n) => n >= 0, {
  message: "must be ≥ 0",
});

/** Strictly positive finite number (thickness, amperage cannot be 0 in a real job). */
const posFinite = finiteNumber.refine((n) => n > 0, {
  message: "must be > 0",
});

/** ISO-8601 UTC timestamp (e.g. "2026-04-21T18:30:00Z"). */
const iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    "must be ISO-8601 UTC with trailing Z",
  );

/** ULID identifier (26 chars Crockford base32). */
const ulid = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "must be a ULID");

/** Atomic measurement — value + unit + provenance + optional uncertainty. */
const atomic = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    unit: z.string().min(1),
    source: z.enum(["cmm", "controller", "operator", "predicted", "sensor", "derived"]),
    uncertainty: nonNegFinite.optional(),
  });

// ─────────────────────────────────────────────────────────────────────────────
// INPUT BLOCK — what was fed to the machine
// ─────────────────────────────────────────────────────────────────────────────

const jobInput = z.object({
  /** Material key (e.g. "D2", "M2", "WC", "S7"). Case-preserved as recorded. */
  material: z.string().min(1),
  /** Material hardness in HRC, if known. */
  hardness_hrc: finiteNumber.optional(),
  /** Workpiece thickness in mm. Strictly positive. */
  thickness_mm: posFinite,
  /** Wire diameter in mm (e.g. 0.25). */
  wire_diameter_mm: posFinite,
  /** Wire material (e.g. "brass", "zinc_coated", "molybdenum"). */
  wire_material: z.string().min(1),
  /** Total profile length cut in mm. */
  profile_length_mm: posFinite,
  /** Number of passes (rough + finish). */
  num_passes: z.number().int().min(1).max(20),
  /** Target Ra in µm for the finish pass. */
  target_ra_um: posFinite,
  /** Tolerance specification in mm (e.g. 0.005). */
  tolerance_mm: posFinite,
  /** Controller dialect used. */
  controller: z.enum([
    "fanuc",
    "sodick",
    "makino",
    "mitsubishi",
    "agiecharmilles",
    "accutex",
    "unknown",
  ]),
  /** Peak current amperage (A) from the E-code recipe. */
  peak_current_A: posFinite.optional(),
  /** Pulse-on time in microseconds. */
  on_time_us: posFinite.optional(),
  /** Pulse-off time in microseconds. */
  off_time_us: posFinite.optional(),
});
export type WEDMJobInput = z.infer<typeof jobInput>;

// ─────────────────────────────────────────────────────────────────────────────
// OUTCOME BLOCK — what actually happened
// ─────────────────────────────────────────────────────────────────────────────

const wireBreakEvent = z.object({
  elapsed_cut_min: nonNegFinite,
  peak_current_A: posFinite.optional(),
  /** Breaker action: "restart", "abort", "slow_and_resume". */
  action: z.enum(["restart", "abort", "slow_and_resume"]),
});

const jobOutcome = z.object({
  /** Measured Ra in µm on the finish surface. */
  measured_ra: atomic(nonNegFinite),
  /** Measured cycle time in minutes (includes wire-break recovery). */
  measured_cycle_min: atomic(nonNegFinite),
  /** Measured recast-layer depth in µm (optional — requires micrograph). */
  measured_recast_um: atomic(nonNegFinite).optional(),
  /** Number of wire breaks during the job. */
  wire_break_count: z.number().int().min(0),
  /** Detail of each break. Length must equal `wire_break_count`. */
  wire_break_events: z.array(wireBreakEvent),
  /** Total wire consumed in meters. */
  wire_consumed_m: nonNegFinite,
  /** Was the job accepted by the inspector? */
  accepted: z.boolean(),
  /** Rejection reason codes, empty if accepted. */
  rejection_codes: z.array(z.string()),
});
export type WEDMJobOutcome = z.infer<typeof jobOutcome>;

// ─────────────────────────────────────────────────────────────────────────────
// PREDICTED BLOCK — what PRISM said would happen (for error computation)
// ─────────────────────────────────────────────────────────────────────────────

const jobPredicted = z
  .object({
    predicted_ra_um: nonNegFinite.optional(),
    predicted_cycle_min: nonNegFinite.optional(),
    predicted_recast_um: nonNegFinite.optional(),
    predicted_wire_break_probability: z.number().min(0).max(1).optional(),
    /** Which engine/model produced the prediction. */
    model_name: z.string().optional(),
    model_version: z.string().optional(),
  })
  .optional();
export type WEDMJobPredicted = z.infer<typeof jobPredicted>;

// ─────────────────────────────────────────────────────────────────────────────
// TOP-LEVEL RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const WEDMJobRecordSchema = z
  .object({
    job_id: ulid,
    recorded_at: iso8601,
    shop_id: z.string().min(1).default("jm-die"),
    machine_id: z.string().min(1),
    operator_id: z.string().optional(),
    customer: z.string().optional(),
    part_number: z.string().optional(),
    program_file: z.string().optional(),
    input: jobInput,
    outcome: jobOutcome,
    predicted: jobPredicted,
    notes: z.string().optional(),
  })
  .superRefine((rec, ctx) => {
    if (rec.outcome.wire_break_events.length !== rec.outcome.wire_break_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `wire_break_events.length (${rec.outcome.wire_break_events.length}) must equal wire_break_count (${rec.outcome.wire_break_count})`,
        path: ["outcome", "wire_break_events"],
      });
    }
    if (!rec.outcome.accepted && rec.outcome.rejection_codes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejected jobs must include at least one rejection_code",
        path: ["outcome", "rejection_codes"],
      });
    }
    if (rec.outcome.accepted && rec.outcome.rejection_codes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "accepted jobs must have empty rejection_codes",
        path: ["outcome", "rejection_codes"],
      });
    }
  });
export type WEDMJobRecord = z.infer<typeof WEDMJobRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FILE ENVELOPE — the shape of WEDM_JOB_HISTORY.json on disk
// ─────────────────────────────────────────────────────────────────────────────

export const WEDMJobHistoryFileSchema = z.object({
  schemaVersion: z.literal(1),
  generated_at: iso8601,
  /** Monotonic counter; every append bumps by +1. */
  sequence: z.number().int().min(0),
  records: z.array(WEDMJobRecordSchema),
});
export type WEDMJobHistoryFile = z.infer<typeof WEDMJobHistoryFileSchema>;

/** Build an empty history envelope (used on first boot / cold start). */
export function emptyHistoryFile(): WEDMJobHistoryFile {
  return {
    schemaVersion: 1,
    generated_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    sequence: 0,
    records: [],
  };
}
