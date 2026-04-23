/**
 * Offline RL Schemas — U-LEARN-08
 * ================================
 *
 * Zod schemas for IQL, MaxEnt IRL, and SafetyShield engines.
 *
 * Key concepts:
 * - IQL: Implicit Q-Learning (Kostrikov 2021) — avoids OOD via expectile regression
 * - MaxEnt IRL: Maximum Entropy Inverse RL (Ziebart) — learns reward from demonstrations
 * - SafetyShield: CMDP formulation with control-barrier functions over physics envelope
 *
 * @module schemas/offlineRLSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-08
 */

import { z } from "zod";

// ============================================================================
// IQL Schemas — Implicit Q-Learning
// ============================================================================

export const IQLConfigSchema = z.object({
  policy_id: z.string().min(1).describe("Policy identifier"),
  state_dim: z.number().int().positive().describe("State dimension"),
  action_dim: z.number().int().positive().describe("Action dimension"),
  hidden_dims: z.array(z.number().int().positive()).default([256, 256]).describe("Hidden layer dimensions"),
  expectile: z.number().min(0).max(1).default(0.7).describe("Expectile τ for V regression"),
  temperature: z.number().positive().default(3.0).describe("AWR temperature β"),
  discount: z.number().min(0).max(1).default(0.99).describe("Discount factor γ"),
  learning_rate: z.number().positive().default(3e-4).describe("Learning rate"),
  soft_target_tau: z.number().min(0).max(1).default(0.005).describe("Soft target update τ"),
  clip_grad_norm: z.number().positive().optional().describe("Gradient clipping norm"),
});
export type IQLConfig = z.infer<typeof IQLConfigSchema>;

export const IQLBatchSchema = z.object({
  states: z.array(z.array(z.number())).describe("Batch of state vectors"),
  actions: z.array(z.array(z.number())).describe("Batch of action vectors"),
  rewards: z.array(z.number()).describe("Batch of scalar rewards"),
  next_states: z.array(z.array(z.number())).describe("Batch of next state vectors"),
  dones: z.array(z.boolean()).describe("Batch of terminal flags"),
});
export type IQLBatch = z.infer<typeof IQLBatchSchema>;

export const IQLTrainResultSchema = z.object({
  policy_id: z.string(),
  step: z.number().int().nonnegative(),
  v_loss: z.number().describe("Value function loss (expectile)"),
  q_loss: z.number().describe("Q-function loss"),
  policy_loss: z.number().describe("Policy loss (advantage-weighted BC)"),
  mean_q: z.number().describe("Mean Q-value"),
  mean_v: z.number().describe("Mean V-value"),
  mean_advantage: z.number().describe("Mean advantage A = Q - V"),
  training_time_ms: z.number(),
});
export type IQLTrainResult = z.infer<typeof IQLTrainResultSchema>;

export const IQLInferenceInputSchema = z.object({
  policy_id: z.string().min(1),
  state: z.array(z.number()).describe("State vector"),
  return_distribution: z.boolean().default(false).describe("Return action distribution"),
});
export type IQLInferenceInput = z.infer<typeof IQLInferenceInputSchema>;

export const IQLInferenceResultSchema = z.object({
  policy_id: z.string(),
  action: z.array(z.number()).describe("Selected action vector"),
  q_value: z.number().describe("Q(s, a) estimate"),
  v_value: z.number().describe("V(s) estimate"),
  advantage: z.number().describe("A(s, a) = Q - V"),
  confidence: z.number().min(0).max(1).describe("Action confidence"),
  distribution: z.record(z.string(), z.number()).optional().describe("Action distribution if requested"),
  inference_time_ms: z.number(),
});
export type IQLInferenceResult = z.infer<typeof IQLInferenceResultSchema>;

// ============================================================================
// MaxEnt IRL Schemas — Maximum Entropy Inverse RL
// ============================================================================

export const MaxEntIRLConfigSchema = z.object({
  reward_model_id: z.string().min(1).describe("Reward model identifier"),
  state_dim: z.number().int().positive().describe("State dimension"),
  action_dim: z.number().int().positive().describe("Action dimension"),
  hidden_dims: z.array(z.number().int().positive()).default([128, 128]).describe("Hidden layer dimensions"),
  learning_rate: z.number().positive().default(1e-3).describe("Learning rate"),
  entropy_weight: z.number().min(0).default(0.01).describe("Entropy regularization weight"),
  gradient_penalty: z.number().min(0).default(0.0).describe("Gradient penalty for stability"),
});
export type MaxEntIRLConfig = z.infer<typeof MaxEntIRLConfigSchema>;

export const DemonstrationSchema = z.object({
  demo_id: z.string().min(1),
  state: z.array(z.number()).describe("State vector"),
  action: z.array(z.number()).describe("Action taken by expert"),
  source: z.enum(["operator_override", "program_archive", "expert_annotation", "successful_job"]).describe("Source of demonstration"),
  confidence: z.number().min(0).max(1).default(1.0).describe("Demonstration quality/confidence"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Demonstration = z.infer<typeof DemonstrationSchema>;

export const MaxEntIRLTrainInputSchema = z.object({
  reward_model_id: z.string().min(1),
  demonstrations: z.array(DemonstrationSchema).min(1).describe("Expert demonstrations"),
  policy_samples: z.array(z.object({
    state: z.array(z.number()),
    action: z.array(z.number()),
  })).default([]).describe("Samples from current policy for partition function estimate"),
  epochs: z.number().int().positive().default(100),
});
export type MaxEntIRLTrainInput = z.infer<typeof MaxEntIRLTrainInputSchema>;

export const MaxEntIRLTrainResultSchema = z.object({
  reward_model_id: z.string(),
  epoch: z.number().int().nonnegative(),
  loss: z.number().describe("MaxEnt IRL loss"),
  log_partition: z.number().describe("Log partition function estimate"),
  mean_demo_reward: z.number().describe("Mean reward on demonstrations"),
  mean_policy_reward: z.number().describe("Mean reward on policy samples"),
  gradient_norm: z.number().describe("Gradient norm for monitoring"),
  training_time_ms: z.number(),
});
export type MaxEntIRLTrainResult = z.infer<typeof MaxEntIRLTrainResultSchema>;

export const MaxEntIRLRewardInputSchema = z.object({
  reward_model_id: z.string().min(1),
  state: z.array(z.number()),
  action: z.array(z.number()),
});
export type MaxEntIRLRewardInput = z.infer<typeof MaxEntIRLRewardInputSchema>;

export const MaxEntIRLRewardResultSchema = z.object({
  reward_model_id: z.string(),
  reward: z.number().describe("Learned reward r_θ(s, a)"),
  log_probability: z.number().describe("log P(a | s; r_θ)"),
  confidence: z.number().min(0).max(1).describe("Confidence based on coverage"),
});
export type MaxEntIRLRewardResult = z.infer<typeof MaxEntIRLRewardResultSchema>;

// ============================================================================
// SafetyShield Schemas — CMDP with Control-Barrier Functions
// ============================================================================

export const SafetyConstraintSchema = z.object({
  constraint_id: z.string().min(1),
  type: z.enum([
    "force_limit",
    "spindle_load",
    "tool_deflection",
    "thermal_limit",
    "collision_margin",
    "tool_life_reserve",
    "vibration_limit",
    "power_limit",
  ]).describe("Constraint type"),
  parameter: z.string().describe("Parameter being constrained (e.g., 'Fc', 'tool_deflection_mm')"),
  limit_value: z.number().describe("Limit value"),
  limit_type: z.enum(["max", "min"]).describe("Constraint direction"),
  probability_threshold: z.number().min(0).max(1).default(1e-4).describe("Allowed violation probability"),
  severity: z.enum(["soft", "hard"]).default("hard").describe("Soft = penalty, Hard = rejection"),
  physics_model: z.enum(["kienzle", "taylor", "thermal", "deflection", "none"]).default("none"),
});
export type SafetyConstraint = z.infer<typeof SafetyConstraintSchema>;

export const SafetyShieldConfigSchema = z.object({
  shield_id: z.string().min(1).describe("Shield identifier"),
  constraints: z.array(SafetyConstraintSchema).min(1).describe("Safety constraints to enforce"),
  cbf_gamma: z.number().min(0).max(1).default(0.1).describe("Control-barrier function decay rate"),
  slack_penalty: z.number().min(0).default(1000.0).describe("Penalty for soft constraint violation"),
  uncertainty_model: z.enum(["gaussian", "bootstrap", "ensemble", "none"]).default("gaussian"),
  uncertainty_scale: z.number().positive().default(1.0).describe("Scale factor for uncertainty"),
});
export type SafetyShieldConfig = z.infer<typeof SafetyShieldConfigSchema>;

export const SafetyShieldInputSchema = z.object({
  shield_id: z.string().min(1),
  state: z.record(z.string(), z.number()).describe("Current state (material, tool, etc.)"),
  proposed_action: z.record(z.string(), z.number()).describe("Proposed action from policy"),
  material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  machine_envelope: z.object({
    max_spindle_power_kW: z.number().optional(),
    max_spindle_torque_Nm: z.number().optional(),
    max_spindle_rpm: z.number().optional(),
    max_axis_force_N: z.number().optional(),
  }).optional(),
});
export type SafetyShieldInput = z.infer<typeof SafetyShieldInputSchema>;

export const ConstraintEvaluationSchema = z.object({
  constraint_id: z.string(),
  type: z.string(),
  parameter: z.string(),
  computed_value: z.number().describe("Computed value for constraint"),
  limit_value: z.number(),
  margin: z.number().describe("Margin to limit (positive = safe)"),
  violation_probability: z.number().min(0).max(1),
  status: z.enum(["pass", "warn", "reject"]),
  cbf_value: z.number().optional().describe("Control-barrier function h(x)"),
});
export type ConstraintEvaluation = z.infer<typeof ConstraintEvaluationSchema>;

export const SafetyShieldResultSchema = z.object({
  shield_id: z.string(),
  allowed: z.boolean().describe("Whether action is allowed"),
  safe_action: z.record(z.string(), z.number()).describe("Safe action (modified if needed)"),
  original_action: z.record(z.string(), z.number()),
  was_modified: z.boolean().describe("Whether action was modified for safety"),
  constraint_evaluations: z.array(ConstraintEvaluationSchema),
  overall_safety_score: z.number().min(0).max(1).describe("S(x) safety score"),
  rejection_reason: z.string().nullable(),
  cbf_status: z.enum(["safe", "approaching_boundary", "boundary_enforcement"]),
  evaluation_time_ms: z.number(),
});
export type SafetyShieldResult = z.infer<typeof SafetyShieldResultSchema>;

// ============================================================================
// Offline RL Orchestrator Schemas
// ============================================================================

export const OfflineRLTrainInputSchema = z.object({
  policy_id: z.string().min(1),
  domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder", "general"]),
  iql_config: IQLConfigSchema.optional(),
  maxent_irl_config: MaxEntIRLConfigSchema.optional(),
  safety_shield_config: SafetyShieldConfigSchema.optional(),
  experience_query: z.object({
    domain: z.string().optional(),
    since_iso: z.string().optional(),
    limit: z.number().int().positive().default(10000),
  }).optional(),
  demonstration_source: z.enum(["operator_overrides", "program_archive", "both"]).default("both"),
  epochs: z.number().int().positive().default(100),
  batch_size: z.number().int().positive().default(256),
  eval_interval: z.number().int().positive().default(10),
});
export type OfflineRLTrainInput = z.infer<typeof OfflineRLTrainInputSchema>;

export const OfflineRLTrainResultSchema = z.object({
  policy_id: z.string(),
  domain: z.string(),
  epochs_completed: z.number().int(),
  iql_metrics: z.object({
    final_v_loss: z.number(),
    final_q_loss: z.number(),
    final_policy_loss: z.number(),
    mean_q: z.number(),
  }).optional(),
  irl_metrics: z.object({
    final_loss: z.number(),
    demo_reward_mean: z.number(),
    operator_preference_accuracy: z.number(),
  }).optional(),
  safety_metrics: z.object({
    rejection_rate: z.number(),
    mean_safety_score: z.number(),
    constraint_violations: z.number(),
  }).optional(),
  experience_tuples_used: z.number(),
  demonstrations_used: z.number(),
  training_time_ms: z.number(),
  checkpoint_path: z.string().nullable(),
});
export type OfflineRLTrainResult = z.infer<typeof OfflineRLTrainResultSchema>;

export const OfflineRLInferenceInputSchema = z.object({
  policy_id: z.string().min(1),
  state: z.record(z.string(), z.number()).describe("Current state features"),
  apply_safety_shield: z.boolean().default(true),
  material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
  machine_envelope: z.record(z.string(), z.number()).optional(),
});
export type OfflineRLInferenceInput = z.infer<typeof OfflineRLInferenceInputSchema>;

export const OfflineRLInferenceResultSchema = z.object({
  policy_id: z.string(),
  action: z.record(z.string(), z.number()),
  q_value: z.number(),
  learned_reward: z.number().nullable(),
  safety_result: SafetyShieldResultSchema.optional(),
  provenance: z.object({
    iql_contribution: z.number(),
    irl_contribution: z.number().nullable(),
    safety_modification: z.boolean(),
    demonstrations_influencing: z.number(),
  }),
  inference_time_ms: z.number(),
});
export type OfflineRLInferenceResult = z.infer<typeof OfflineRLInferenceResultSchema>;
