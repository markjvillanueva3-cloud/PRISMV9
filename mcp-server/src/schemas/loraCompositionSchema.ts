/**
 * LoRA Composition Schema — U-LEARN-05
 * =====================================
 *
 * Schemas for the LoRA composition layer that turns 70 isolated adapters
 * into a mixture-of-experts system:
 * - MoE gating: top-K softmax routing
 * - DoRA: decomposed magnitude/direction updates
 * - AdaLoRA: SVD-based rank allocation
 * - O-LoRA: orthogonality constraints
 *
 * @module schemas/loraCompositionSchema
 * @milestone PSAU P2.5-LEARN U-LEARN-05
 */

import { z } from "zod";
import { OutcomeDomain } from "./outcomeEventSchema.js";

// ─── Expert Routing ─────────────────────────────────────────────────────

export const QualityScoreVectorSchema = z.object({
  accuracy: z.number().min(0).max(1).describe("Prediction accuracy score"),
  stability: z.number().min(0).max(1).describe("Output stability score"),
  coverage: z.number().min(0).max(1).describe("Context coverage score"),
  confidence: z.number().min(0).max(1).describe("Model confidence score"),
  freshness: z.number().min(0).max(1).describe("Training recency score"),
}).describe("5-dimensional quality score vector for adapter ranking");
export type QualityScoreVector = z.infer<typeof QualityScoreVectorSchema>;

export const ExpertSchema = z.object({
  adapter_id: z.string().describe("Adapter identifier"),
  domain: OutcomeDomain,
  quality_score: QualityScoreVectorSchema,
  material_embedding: z.array(z.number()).optional().describe("Material context embedding"),
  machine_embedding: z.array(z.number()).optional().describe("Machine context embedding"),
  rank: z.number().int().positive().describe("LoRA rank (r)"),
  alpha: z.number().positive().describe("LoRA scaling factor"),
}).describe("Expert adapter metadata for MoE routing");
export type Expert = z.infer<typeof ExpertSchema>;

export const GatingInputSchema = z.object({
  domain: OutcomeDomain,
  material: z.string().optional(),
  machine: z.string().optional(),
  operation: z.string().optional(),
  quality_weights: z.array(z.number()).length(5).optional().describe("Weights for 5-dim quality score"),
  top_k: z.number().int().min(1).max(10).default(3).describe("Number of experts to route to"),
  temperature: z.number().positive().default(1.0).describe("Softmax temperature"),
}).describe("Input for MoE gating");
export type GatingInput = z.infer<typeof GatingInputSchema>;

export const GatingResultSchema = z.object({
  selected_experts: z.array(z.object({
    adapter_id: z.string(),
    weight: z.number().min(0).max(1),
    score: z.number(),
  })).describe("Top-K selected experts with softmax weights"),
  total_experts: z.number().int(),
  gating_time_ms: z.number(),
}).describe("MoE gating result");
export type GatingResult = z.infer<typeof GatingResultSchema>;

// ─── DoRA (Decomposed LoRA) ─────────────────────────────────────────────

export const DoRAConfigSchema = z.object({
  adapter_id: z.string(),
  rank: z.number().int().positive().describe("LoRA rank"),
  alpha: z.number().positive().describe("Scaling factor"),
  magnitude_lr_scale: z.number().positive().default(1.0).describe("Learning rate scale for magnitude"),
  direction_lr_scale: z.number().positive().default(1.0).describe("Learning rate scale for direction"),
  normalize_direction: z.boolean().default(true).describe("Normalize direction vectors"),
}).describe("DoRA configuration");
export type DoRAConfig = z.infer<typeof DoRAConfigSchema>;

export const DoRAWeightsSchema = z.object({
  adapter_id: z.string(),
  magnitude: z.array(z.number()).describe("Magnitude vector (m)"),
  direction_A: z.array(z.array(z.number())).describe("Direction matrix A (r×d_in)"),
  direction_B: z.array(z.array(z.number())).describe("Direction matrix B (d_out×r)"),
}).describe("DoRA decomposed weights");
export type DoRAWeights = z.infer<typeof DoRAWeightsSchema>;

// ─── AdaLoRA (Adaptive Rank Allocation) ─────────────────────────────────

export const RankAllocationSchema = z.object({
  adapter_id: z.string(),
  layer_ranks: z.record(z.string(), z.number().int().nonnegative()).describe("Per-layer rank allocation"),
  total_rank_budget: z.number().int().positive(),
  importance_scores: z.record(z.string(), z.number()).optional().describe("SVD importance per layer"),
}).describe("AdaLoRA rank allocation");
export type RankAllocation = z.infer<typeof RankAllocationSchema>;

export const AdaLoRAConfigSchema = z.object({
  adapter_id: z.string(),
  total_rank_budget: z.number().int().positive().describe("Total rank budget across all layers"),
  min_rank: z.number().int().nonnegative().default(1).describe("Minimum rank per layer"),
  max_rank: z.number().int().positive().default(64).describe("Maximum rank per layer"),
  importance_metric: z.enum(["svd", "gradient", "fisher"]).default("svd").describe("Importance scoring method"),
  reallocation_interval: z.number().int().positive().default(100).describe("Steps between reallocations"),
}).describe("AdaLoRA configuration");
export type AdaLoRAConfig = z.infer<typeof AdaLoRAConfigSchema>;

// ─── O-LoRA (Orthogonal LoRA) ───────────────────────────────────────────

export const OrthogonalConstraintSchema = z.object({
  adapter_ids: z.array(z.string()).min(2).describe("Adapters to enforce orthogonality between"),
  constraint_strength: z.number().min(0).max(1).default(0.1).describe("Orthogonality penalty weight"),
  subspace_dim: z.number().int().positive().optional().describe("Subspace dimension for constraint"),
}).describe("Orthogonality constraint specification");
export type OrthogonalConstraint = z.infer<typeof OrthogonalConstraintSchema>;

export const OrthogonalityMetricsSchema = z.object({
  adapter_pair: z.tuple([z.string(), z.string()]),
  cosine_similarity: z.number().min(-1).max(1).describe("Cosine similarity between adapter directions"),
  orthogonality_loss: z.number().min(0).describe("Orthogonality penalty value"),
  subspace_overlap: z.number().min(0).max(1).describe("Fraction of overlapping subspace"),
}).describe("Orthogonality metrics between adapter pair");
export type OrthogonalityMetrics = z.infer<typeof OrthogonalityMetricsSchema>;

// ─── Composition ────────────────────────────────────────────────────────

export const CompositionInputSchema = z.object({
  domain: OutcomeDomain,
  context: z.object({
    material: z.string().optional(),
    machine: z.string().optional(),
    operation: z.string().optional(),
    customer: z.string().optional(),
  }),
  base_values: z.record(z.string(), z.number()).describe("Base physics values to adapt"),
  composition_mode: z.enum(["weighted_sum", "cascade", "residual", "attention"]).default("weighted_sum"),
  max_experts: z.number().int().min(1).max(10).default(3),
}).describe("Input for adapter composition");
export type CompositionInput = z.infer<typeof CompositionInputSchema>;

export const CompositionResultSchema = z.object({
  adapted_values: z.record(z.string(), z.number()).describe("Adapted output values"),
  experts_used: z.array(z.object({
    adapter_id: z.string(),
    weight: z.number(),
    contribution: z.record(z.string(), z.number()),
  })),
  composition_time_ms: z.number(),
  provenance: z.object({
    mode: z.string(),
    total_experts_available: z.number(),
    experts_selected: z.number(),
  }),
}).describe("Composition result");
export type CompositionResult = z.infer<typeof CompositionResultSchema>;
