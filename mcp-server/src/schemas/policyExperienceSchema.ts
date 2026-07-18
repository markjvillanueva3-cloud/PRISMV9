/**
 * Policy Experience Schema — U-LEARN-09
 * =======================================
 *
 * (s, a, r, s') tuple representation for offline RL. Written to
 * state/policy/experience.jsonl atomically by PolicyExperienceLedgerEngine.
 * RL-Specialist scrutiny (0.38) called out ratio-based rewards as a hacking
 * surface; this schema stores both raw + z-normalized components so
 * downstream IQL / MaxEnt IRL trains on normalized rewards while operators
 * see human-readable raw values.
 *
 * @module schemas/policyExperienceSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-09
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

export const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Reward objective kinds — the core manufacturing metrics RL optimizes.
 * cycle_time and cost are MINIMIZE objectives; tool_life / first_article
 * are MAXIMIZE. sign_convention stores which way is "better" so scalarization
 * is unambiguous.
 */
export const RewardObjective = z.enum([
  "cycle_time",
  "tool_life",
  "quality_ra",
  "cost",
  "safety",
  "first_article_yield",
  "operator_preference",
  "scrap_rate",
  "other",
]);
export type RewardObjectiveT = z.infer<typeof RewardObjective>;

/**
 * One reward component within an experience tuple.
 *
 * normalized_z_score is computed per (material × machine × tool × operation)
 * tuple by the caller or a downstream normalizer. scalar_contribution =
 * weight * normalized_z_score * sign_convention.
 */
export const RewardComponentSchema = z.object({
  objective: RewardObjective,
  raw_value: z.number(),
  raw_unit: z.string().optional(),
  normalized_z_score: z.number().optional(),
  weight: z.number().min(0).default(1),
  sign_convention: z.enum(["maximize", "minimize"]),
  scalar_contribution: z.number().optional(),
});
export type RewardComponent = z.infer<typeof RewardComponentSchema>;

/**
 * State / next_state: pointer into FeatureStore OR inline feature dict.
 * Pointer form keeps tuples small; inline form keeps them self-contained.
 */
export const StateRefSchema = z.object({
  feature_store: z
    .object({
      domain: OutcomeDomain,
      feature_group: z.string().min(1),
      feature_group_version: z.string().regex(/^v\d+$/).default("v1"),
      entity_id: z.string().min(1),
      event_ts: IsoTimestamp,
    })
    .optional(),
  inline: z.record(z.string(), z.unknown()).optional(),
  context: z
    .object({
      material: z.string().optional(),
      operation: z.string().optional(),
      machine: z.string().optional(),
      customer: z.string().optional(),
      tool_id: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
export type StateRef = z.infer<typeof StateRefSchema>;

/**
 * Action: what the engine actually recommended / executed.
 * `adapted` is the post-gate values; `baseline` is pre-gate; `adapter_used`
 * ties back to the LoRA registry. Without this triplet you cannot run IRL.
 */
export const ActionRecordSchema = z.object({
  engine_name: z.string().min(1),
  baseline: z.record(z.string(), z.number()).default({}),
  adapted: z.record(z.string(), z.number()).default({}),
  adapter_used: z.string().nullable().optional(),
  adapter_status: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export type ActionRecord = z.infer<typeof ActionRecordSchema>;

/**
 * One (s, a, r, s') experience tuple.
 */
export const ExperienceTupleSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  experience_id: z.string().min(1),
  lineage_id: z.string().min(1),
  domain: OutcomeDomain,
  timestamp: IsoTimestamp,
  state: StateRefSchema,
  action_record: ActionRecordSchema,
  reward_components: z.array(RewardComponentSchema),
  reward_total: z.number(),                      // aggregated scalar reward
  // GRPO group-relative advantage (ULTRACODE-SYNERGY-MS0 Order 3). OPTIONAL +
  // additive — pre-GRPO tuples (without it) still validate under 1.0.0. Set by
  // prism_ai:group_normalize_reward when this tuple was part of an N-trajectory
  // group; it is the critic-free advantage Â_i = (reward_total − groupMean)/std,
  // NOT the per-objective normalized_z_score on each reward_component.
  group_advantage: z.number().optional(),
  next_state: StateRefSchema.optional(),         // may be absent if terminal or pending
  terminal: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ExperienceTuple = z.infer<typeof ExperienceTupleSchema>;

// -------------------------- Input schemas --------------------------

export const AppendExperienceInputSchema = z.object({
  lineage_id: z.string().min(1),
  domain: OutcomeDomain,
  state: StateRefSchema,
  action_record: ActionRecordSchema,
  reward_components: z.array(RewardComponentSchema).min(1),
  group_advantage: z.number().optional(),        // GRPO advantage (ULTRACODE-SYNERGY-MS0); additive-optional
  next_state: StateRefSchema.optional(),
  terminal: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
  experience_id: z.string().optional(),          // auto-generated if absent
  timestamp: IsoTimestamp.optional(),
});
export type AppendExperienceInput = z.infer<typeof AppendExperienceInputSchema>;

export const QueryExperienceInputSchema = z.object({
  domain: OutcomeDomain.optional(),
  lineage_id: z.string().optional(),
  engine_name: z.string().optional(),
  adapter_used: z.string().optional(),
  since_iso: IsoTimestamp.optional(),
  terminal_only: z.boolean().optional(),
  limit: z.number().int().positive().max(100_000).default(5000),
});
export type QueryExperienceInput = z.infer<typeof QueryExperienceInputSchema>;

/**
 * OutcomeTrace convenience input — given a prediction + outcome, record
 * the (s,a,r,s') tuple AND the MLLineage edges in one call.
 */
export const RecordOutcomeTraceInputSchema = z.object({
  lineage_id: z.string().min(1),
  domain: OutcomeDomain,
  prediction_id: z.string().min(1),
  outcome_event_id: z.string().min(1),
  model_checkpoint_id: z.string().optional(),
  state: StateRefSchema,
  action_record: ActionRecordSchema,
  reward_components: z.array(RewardComponentSchema).min(1),
  next_state: StateRefSchema.optional(),
  terminal: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RecordOutcomeTraceInput = z.infer<typeof RecordOutcomeTraceInputSchema>;
