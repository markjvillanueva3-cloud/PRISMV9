/**
 * Continual Learning Schema — U-LEARN-10
 * =======================================
 *
 * Zod schemas for EWC++, Synaptic Intelligence, DER++, TTA, LearningCascade, FedLoRA.
 *
 * References:
 * - EWC++: Schwarz 2018 "Progress & Compress"
 * - SI: Zenke 2017 "Continual Learning Through Synaptic Intelligence"
 * - DER++: Buzzega 2020 "Dark Experience for General Continual Learning"
 * - EATA: Niu ICML 2022 "Efficient Test-Time Adaptation"
 * - FedAvg: McMahan 2017 + LoRA composition 2024
 *
 * @module schemas/continualLearningSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-10
 */

import { z } from "zod";

// ===== Synaptic Intelligence (SI) =====

export const SIRegisterSchema = z.object({
  model_id: z.string().min(1),
  parameter_count: z.number().int().positive(),
  importance_decay: z.number().min(0).max(1).default(0.99),
  damping: z.number().positive().default(0.1),
});
export type SIRegister = z.infer<typeof SIRegisterSchema>;

export const SIUpdateSchema = z.object({
  model_id: z.string().min(1),
  gradients: z.array(z.number()),
  parameter_deltas: z.array(z.number()),
});
export type SIUpdate = z.infer<typeof SIUpdateSchema>;

export const SIConsolidateSchema = z.object({
  model_id: z.string().min(1),
  task_id: z.string().min(1),
});
export type SIConsolidate = z.infer<typeof SIConsolidateSchema>;

export const SILossSchema = z.object({
  model_id: z.string().min(1),
  current_params: z.array(z.number()),
  lambda_si: z.number().positive().default(1.0),
});
export type SILoss = z.infer<typeof SILossSchema>;

export const SILossResultSchema = z.object({
  regularization_loss: z.number(),
  top_important_params: z.array(z.object({
    index: z.number(),
    importance: z.number(),
  })).max(10),
});
export type SILossResult = z.infer<typeof SILossResultSchema>;

// ===== EWC++ =====

export const EWCConfigSchema = z.object({
  model_id: z.string().min(1),
  parameter_count: z.number().int().positive(),
  lambda_ewc: z.number().positive().default(1000),
  fisher_samples: z.number().int().positive().default(200),
  online: z.boolean().default(true),
  gamma: z.number().min(0).max(1).default(0.9),
});
export type EWCConfig = z.infer<typeof EWCConfigSchema>;

export const EWCComputeFisherSchema = z.object({
  model_id: z.string().min(1),
  log_likelihoods: z.array(z.number()),
  gradients_squared: z.array(z.array(z.number())),
});
export type EWCComputeFisher = z.infer<typeof EWCComputeFisherSchema>;

export const EWCLossSchema = z.object({
  model_id: z.string().min(1),
  current_params: z.array(z.number()),
});
export type EWCLoss = z.infer<typeof EWCLossSchema>;

export const EWCLossResultSchema = z.object({
  regularization_loss: z.number(),
  task_contributions: z.array(z.object({
    task_id: z.string(),
    contribution: z.number(),
  })),
});
export type EWCLossResult = z.infer<typeof EWCLossResultSchema>;

// ===== DER++ =====

export const DERBufferConfigSchema = z.object({
  buffer_id: z.string().min(1),
  max_size: z.number().int().positive().default(5000),
  alpha: z.number().min(0).max(1).default(0.5),
  beta: z.number().min(0).max(1).default(0.5),
});
export type DERBufferConfig = z.infer<typeof DERBufferConfigSchema>;

export const DERExperienceSchema = z.object({
  experience_id: z.string().min(1),
  input: z.array(z.number()),
  target: z.array(z.number()),
  logits: z.array(z.number()),
  task_id: z.string().min(1),
  timestamp_iso: z.string().datetime().optional(),
});
export type DERExperience = z.infer<typeof DERExperienceSchema>;

export const DERSampleSchema = z.object({
  buffer_id: z.string().min(1),
  batch_size: z.number().int().positive().default(32),
  task_id: z.string().optional(),
});
export type DERSample = z.infer<typeof DERSampleSchema>;

export const DERLossSchema = z.object({
  buffer_id: z.string().min(1),
  current_logits: z.array(z.array(z.number())),
  sample_indices: z.array(z.number().int()),
});
export type DERLoss = z.infer<typeof DERLossSchema>;

export const DERLossResultSchema = z.object({
  kl_loss: z.number(),
  mse_loss: z.number(),
  combined_loss: z.number(),
  samples_used: z.number().int(),
});
export type DERLossResult = z.infer<typeof DERLossResultSchema>;

// ===== Test-Time Adaptation (EATA) =====

export const TTAConfigSchema = z.object({
  model_id: z.string().min(1),
  entropy_threshold: z.number().positive().default(0.4),
  diversity_threshold: z.number().min(0).max(1).default(0.05),
  adaptation_lr: z.number().positive().default(1e-4),
  adapt_bn: z.boolean().default(true),
  adapt_lora_a: z.boolean().default(true),
  fisher_alpha: z.number().min(0).max(1).default(2000),
});
export type TTAConfig = z.infer<typeof TTAConfigSchema>;

export const TTAAdaptSchema = z.object({
  model_id: z.string().min(1),
  sample_logits: z.array(z.number()),
  sample_features: z.array(z.number()).optional(),
});
export type TTAAdapt = z.infer<typeof TTAAdaptSchema>;

export const TTAAdaptResultSchema = z.object({
  adapted: z.boolean(),
  entropy: z.number(),
  reliable: z.boolean(),
  non_redundant: z.boolean(),
  bn_updates: z.number().int(),
  lora_updates: z.number().int(),
});
export type TTAAdaptResult = z.infer<typeof TTAAdaptResultSchema>;

// ===== Learning Cascade =====

export const CascadeNodeSchema = z.object({
  node_id: z.string().min(1),
  node_type: z.enum(["lora_finetune", "tribal_kb", "playbook_rule", "feature_store"]),
  threshold_count: z.number().int().positive().default(5),
  auto_promote: z.boolean().default(true),
});
export type CascadeNode = z.infer<typeof CascadeNodeSchema>;

export const CascadeGraphSchema = z.object({
  graph_id: z.string().min(1),
  nodes: z.array(CascadeNodeSchema),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    weight: z.number().min(0).max(1).default(1),
  })),
});
export type CascadeGraph = z.infer<typeof CascadeGraphSchema>;

export const CascadeOutcomeSchema = z.object({
  graph_id: z.string().min(1),
  outcome_id: z.string().min(1),
  domain: z.string().min(1),
  material: z.string().optional(),
  machine: z.string().optional(),
  delta: z.record(z.string(), z.number()),
  confidence: z.number().min(0).max(1),
});
export type CascadeOutcome = z.infer<typeof CascadeOutcomeSchema>;

export const CascadePropagationResultSchema = z.object({
  outcome_id: z.string(),
  nodes_triggered: z.array(z.string()),
  actions_taken: z.array(z.object({
    node_id: z.string(),
    action: z.string(),
    success: z.boolean(),
  })),
  propagation_time_ms: z.number(),
});
export type CascadePropagationResult = z.infer<typeof CascadePropagationResultSchema>;

// ===== Federated LoRA =====

export const FedLoRAClientSchema = z.object({
  client_id: z.string().min(1),
  customer_id: z.string().min(1),
  material_class: z.string().min(1),
  operation_type: z.string().min(1),
  machine_class: z.string().min(1),
  lora_a_weights: z.array(z.array(z.number())),
  sample_count: z.number().int().nonnegative(),
});
export type FedLoRAClient = z.infer<typeof FedLoRAClientSchema>;

export const FedLoRAAggregateSchema = z.object({
  round_id: z.string().min(1),
  clients: z.array(FedLoRAClientSchema),
  aggregation_method: z.enum(["fedavg", "fedprox", "scaffold"]).default("fedavg"),
  mu: z.number().nonnegative().default(0.01),
});
export type FedLoRAAggregate = z.infer<typeof FedLoRAAggregateSchema>;

export const FedLoRAAggregateResultSchema = z.object({
  round_id: z.string(),
  global_lora_a: z.array(z.array(z.number())),
  clients_aggregated: z.number().int(),
  total_samples: z.number().int(),
  divergence_scores: z.array(z.object({
    client_id: z.string(),
    divergence: z.number(),
  })),
});
export type FedLoRAAggregateResult = z.infer<typeof FedLoRAAggregateResultSchema>;

// ===== Prioritized Replay Buffer =====

export const PrioritizedBufferConfigSchema = z.object({
  buffer_id: z.string().min(1),
  max_size: z.number().int().positive().default(10000),
  alpha: z.number().min(0).max(1).default(0.6),
  beta_start: z.number().min(0).max(1).default(0.4),
  beta_end: z.number().min(0).max(1).default(1.0),
  beta_frames: z.number().int().positive().default(100000),
  epsilon: z.number().positive().default(1e-6),
});
export type PrioritizedBufferConfig = z.infer<typeof PrioritizedBufferConfigSchema>;

export const PrioritizedExperienceSchema = z.object({
  experience_id: z.string().min(1),
  state: z.array(z.number()),
  action: z.array(z.number()),
  reward: z.number(),
  next_state: z.array(z.number()),
  done: z.boolean(),
  td_error: z.number().optional(),
});
export type PrioritizedExperience = z.infer<typeof PrioritizedExperienceSchema>;

export const PrioritizedSampleResultSchema = z.object({
  experiences: z.array(PrioritizedExperienceSchema),
  indices: z.array(z.number().int()),
  weights: z.array(z.number()),
  max_weight: z.number(),
});
export type PrioritizedSampleResult = z.infer<typeof PrioritizedSampleResultSchema>;

// ===== Cross-Customer Policy Transfer =====

export const PolicyTransferSourceSchema = z.object({
  source_customer: z.string().min(1),
  source_policy_id: z.string().min(1),
  material_class: z.string().min(1),
  operation_type: z.string().min(1),
  machine_class: z.string().min(1),
  performance_score: z.number().min(0).max(1),
  sample_count: z.number().int().positive(),
});
export type PolicyTransferSource = z.infer<typeof PolicyTransferSourceSchema>;

export const PolicyTransferRequestSchema = z.object({
  target_customer: z.string().min(1),
  material_class: z.string().min(1),
  operation_type: z.string().min(1),
  machine_class: z.string().min(1),
  min_similarity: z.number().min(0).max(1).default(0.7),
  max_sources: z.number().int().positive().default(5),
});
export type PolicyTransferRequest = z.infer<typeof PolicyTransferRequestSchema>;

export const PolicyTransferResultSchema = z.object({
  target_customer: z.string(),
  sources_used: z.array(z.object({
    source_customer: z.string(),
    source_policy_id: z.string(),
    similarity: z.number(),
    weight: z.number(),
  })),
  transferred_policy_id: z.string(),
  expected_performance: z.number(),
  adaptation_required: z.boolean(),
});
export type PolicyTransferResult = z.infer<typeof PolicyTransferResultSchema>;

// ===== ContinualLoRA Unified =====

export const ContinualLoRAConfigSchema = z.object({
  adapter_id: z.string().min(1),
  domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]),
  rank: z.number().int().positive().default(8),
  alpha: z.number().positive().default(16),
  ewc_lambda: z.number().nonnegative().default(1000),
  si_damping: z.number().positive().default(0.1),
  der_buffer_size: z.number().int().positive().default(5000),
  der_alpha: z.number().min(0).max(1).default(0.5),
  der_beta: z.number().min(0).max(1).default(0.5),
});
export type ContinualLoRAConfig = z.infer<typeof ContinualLoRAConfigSchema>;

export const ContinualLoRATrainSchema = z.object({
  adapter_id: z.string().min(1),
  task_id: z.string().min(1),
  experiences: z.array(z.object({
    input: z.array(z.number()),
    target: z.array(z.number()),
    logits: z.array(z.number()).optional(),
  })),
  epochs: z.number().int().positive().default(10),
  batch_size: z.number().int().positive().default(32),
  use_ewc: z.boolean().default(true),
  use_si: z.boolean().default(true),
  use_der: z.boolean().default(true),
});
export type ContinualLoRATrain = z.infer<typeof ContinualLoRATrainSchema>;

export const ContinualLoRATrainResultSchema = z.object({
  adapter_id: z.string(),
  task_id: z.string(),
  epochs_completed: z.number().int(),
  final_loss: z.number(),
  ewc_loss: z.number().optional(),
  si_loss: z.number().optional(),
  der_loss: z.number().optional(),
  forgetting_metric: z.number(),
  training_time_ms: z.number(),
});
export type ContinualLoRATrainResult = z.infer<typeof ContinualLoRATrainResultSchema>;

// ===== Prototypical Networks (U-LEARN-11) =====
// Reference: Snell 2017 "Prototypical Networks for Few-shot Learning"

export const PrototypeSupportExampleSchema = z.object({
  class_id: z.string().min(1).describe("Class identifier (e.g., customer-material)"),
  features: z.array(z.number()).min(1).describe("Feature vector"),
  target: z.number().describe("Target value for regression"),
});
export type PrototypeSupportExample = z.infer<typeof PrototypeSupportExampleSchema>;

export const PrototypeSupportSetSchema = z.object({
  task_id: z.string().min(1).describe("Task identifier"),
  domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]),
  examples: z.array(PrototypeSupportExampleSchema).min(1).describe("Support set examples per class"),
});
export type PrototypeSupportSet = z.infer<typeof PrototypeSupportSetSchema>;

export const PrototypeQuerySchema = z.object({
  task_id: z.string().min(1),
  query_features: z.array(z.number()).min(1).describe("Query point features"),
});
export type PrototypeQuery = z.infer<typeof PrototypeQuerySchema>;

export const PrototypePredictionSchema = z.object({
  task_id: z.string(),
  predicted_value: z.number().describe("Predicted target value"),
  nearest_prototype: z.string().describe("Nearest class prototype"),
  distance: z.number().describe("Distance to nearest prototype"),
  confidence: z.number().min(0).max(1).describe("Softmax confidence"),
  prototype_weights: z.record(z.string(), z.number()).describe("Distance-weighted prototype contributions"),
});
export type PrototypePrediction = z.infer<typeof PrototypePredictionSchema>;

// ===== ProtoMAML (U-LEARN-11) =====
// Reference: Triantafillou 2020 "Meta-Dataset" + Finn 2017 "MAML"
// ProtoMAML = Prototypical Networks init + MAML fine-tune

export const ProtoMAMLConfigSchema = z.object({
  config_id: z.string().min(1).describe("Configuration identifier"),
  domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]),
  inner_lr: z.number().positive().default(0.01).describe("Inner loop learning rate"),
  inner_steps: z.number().int().min(1).max(20).default(5).describe("Inner loop gradient steps"),
  meta_lr: z.number().positive().default(0.001).describe("Outer loop (meta) learning rate"),
  feature_dim: z.number().int().positive().default(64).describe("Feature embedding dimension"),
  hidden_dim: z.number().int().positive().default(128).describe("Hidden layer dimension"),
  use_proto_init: z.boolean().default(true).describe("Initialize from prototypical network"),
  regularization_lambda: z.number().min(0).default(0.01).describe("L2 regularization"),
});
export type ProtoMAMLConfig = z.infer<typeof ProtoMAMLConfigSchema>;

export const ProtoMAMLTaskSchema = z.object({
  task_id: z.string().min(1).describe("Meta-learning task identifier"),
  config_id: z.string().min(1).describe("Reference to ProtoMAML configuration"),
  support_set: z.array(z.object({
    features: z.array(z.number()),
    target: z.number(),
  })).min(1).max(50).describe("Support examples (1-50 shots)"),
  query_set: z.array(z.object({
    features: z.array(z.number()),
    target: z.number().optional(),
  })).optional().describe("Query examples for evaluation"),
});
export type ProtoMAMLTask = z.infer<typeof ProtoMAMLTaskSchema>;

export const ProtoMAMLAdaptSchema = z.object({
  config_id: z.string().min(1),
  customer_id: z.string().min(1).describe("New customer to adapt to"),
  material_class: z.string().min(1).describe("Material class for adaptation"),
  support_set: z.array(z.object({
    features: z.array(z.number()),
    target: z.number(),
  })).min(1).max(50).describe("Customer-specific examples"),
  cache_adapted: z.boolean().default(true).describe("Cache adapted parameters in registry"),
});
export type ProtoMAMLAdapt = z.infer<typeof ProtoMAMLAdaptSchema>;

export const ProtoMAMLAdaptResultSchema = z.object({
  config_id: z.string(),
  customer_id: z.string(),
  material_class: z.string(),
  inner_steps_executed: z.number().int(),
  final_inner_loss: z.number(),
  adaptation_time_ms: z.number(),
  cached: z.boolean(),
  adapted_params_id: z.string().optional().describe("Registry ID if cached"),
});
export type ProtoMAMLAdaptResult = z.infer<typeof ProtoMAMLAdaptResultSchema>;

export const ProtoMAMLPredictSchema = z.object({
  config_id: z.string().min(1),
  customer_id: z.string().min(1),
  material_class: z.string().min(1),
  query_features: z.array(z.number()).min(1),
  use_cached: z.boolean().default(true).describe("Use cached adapted params if available"),
});
export type ProtoMAMLPredict = z.infer<typeof ProtoMAMLPredictSchema>;

export const ProtoMAMLPredictResultSchema = z.object({
  config_id: z.string(),
  customer_id: z.string(),
  material_class: z.string(),
  predicted_value: z.number(),
  confidence: z.number().min(0).max(1),
  used_cached: z.boolean(),
  inference_time_ms: z.number(),
  provenance: z.object({
    base_model: z.string(),
    adapted_params_id: z.string().optional(),
    support_set_size: z.number().int(),
  }),
})
export type ProtoMAMLPredictResult = z.infer<typeof ProtoMAMLPredictResultSchema>;
