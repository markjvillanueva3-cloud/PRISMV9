/**
 * Promotion Gate Schema — U-LEARN-06
 * ====================================
 *
 * No LoRA adapter ships to `active` without beating the incumbent on a
 * held-out sample with statistical evidence. Evaluation-Scientist scrutiny
 * (0.42) called out the missing shadow/canary/temporal-holdout discipline.
 *
 * Shadow observation = one paired (champion, challenger) prediction against
 * the same observed outcome. Aggregated shadow observations feed:
 *   - Welch's two-sample t-test on error distributions
 *   - Cohen's d effect-size
 *   - temporal-holdout leakage check (train_max_ts < test_min_ts)
 * → GO / NO-GO / INSUFFICIENT_DATA verdict.
 *
 * @module schemas/promotionGateSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-06
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

export const ShadowObservationSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  obs_id: z.string().min(1),
  champion_id: z.string().min(1),
  challenger_id: z.string().min(1),
  domain: OutcomeDomain,
  metric: z.string().min(1),           // e.g. "sfm_error", "cycle_time_error_min"
  champion_value: z.number(),
  challenger_value: z.number(),
  actual_value: z.number(),
  context_key: z.string().default(""),
  event_ts: IsoTimestamp,
  write_ts: IsoTimestamp,
  lineage_id: z.string().optional(),
});
export type ShadowObservation = z.infer<typeof ShadowObservationSchema>;

export const RecordObservationInputSchema = z.object({
  champion_id: z.string().min(1),
  challenger_id: z.string().min(1),
  domain: OutcomeDomain,
  metric: z.string().min(1),
  champion_value: z.number(),
  challenger_value: z.number(),
  actual_value: z.number(),
  context_key: z.string().optional(),
  event_ts: IsoTimestamp.optional(),
  lineage_id: z.string().optional(),
  obs_id: z.string().optional(),
});
export type RecordObservationInput = z.infer<typeof RecordObservationInputSchema>;

export const EvaluateGateInputSchema = z.object({
  champion_id: z.string().min(1),
  challenger_id: z.string().min(1),
  metric: z.string().min(1),
  min_samples: z.number().int().positive().default(20),
  alpha: z.number().positive().max(0.2).default(0.05),
  lower_is_better: z.boolean().default(true),   // error metrics → true; score metrics → false
  training_max_ts: IsoTimestamp.optional(),
  test_min_ts: IsoTimestamp.optional(),
});
export type EvaluateGateInput = z.infer<typeof EvaluateGateInputSchema>;

export const GateVerdict = z.enum(["GO", "NO_GO", "INSUFFICIENT_DATA"]);
export type GateVerdictT = z.infer<typeof GateVerdict>;

export const GateEvaluationResultSchema = z.object({
  verdict: GateVerdict,
  champion_id: z.string(),
  challenger_id: z.string(),
  metric: z.string(),
  n_champion: z.number().int().nonnegative(),
  n_challenger: z.number().int().nonnegative(),
  mean_error_champion: z.number(),
  mean_error_challenger: z.number(),
  variance_champion: z.number(),
  variance_challenger: z.number(),
  welch_t: z.number().nullable(),
  welch_df: z.number().nullable(),
  p_value: z.number().nullable(),
  cohens_d: z.number().nullable(),
  effect_size_interpretation: z.string(),
  temporal_holdout_ok: z.boolean(),
  reasons: z.array(z.string()),
  evaluated_ts: IsoTimestamp,
});
export type GateEvaluationResult = z.infer<typeof GateEvaluationResultSchema>;

export const TemporalHoldoutCheckSchema = z.object({
  training_max_ts: IsoTimestamp,
  test_min_ts: IsoTimestamp,
});
export type TemporalHoldoutCheck = z.infer<typeof TemporalHoldoutCheckSchema>;
