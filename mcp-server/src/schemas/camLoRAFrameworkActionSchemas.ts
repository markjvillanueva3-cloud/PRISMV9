/**
 * camLoRAFrameworkActionSchemas — U-CAM107 (PHASE-8)
 *
 * Zod schemas for CAMLoRAEngine dispatcher actions (cam_lora_*).
 * The 8 actions cover inference, validation, health, listing, selection,
 * ensemble, and standardization.
 *
 * @module schemas/camLoRAFrameworkActionSchemas
 */

import { z } from "zod";

// ─── Building blocks ────────────────────────────────────────────────

const PriorityCAMSchema = z
  .enum(["mastercam", "hypermill", "fusion360", "inventor-hsm"])
  .describe("Priority-4 CAM system slug");

const TargetSchema = z
  .enum(["spindle_rpm_midpoint", "feed_mm_min_midpoint"])
  .describe("Regression target (matches CAMBaselineRegressorEngine)");

const LoRAConfigSchema = z
  .object({
    rank: z.number().int().positive().describe("LoRA rank r (typ. 4)"),
    alpha: z.number().positive().describe("LoRA scaling α (typ. 8)"),
    learning_rate: z.number().positive().describe("SGD step size"),
    n_epochs: z.number().int().positive().describe("Training epochs"),
    batch_size: z.number().int().positive().describe("Mini-batch size"),
    weight_decay: z.number().nonnegative().describe("L2 decay on A and B"),
    seed: z.number().int().describe("RNG seed for reproducibility"),
  })
  .describe("LoRA hyperparameter config");

const LoRAAdapterSchema = z
  .object({
    cam_slug: PriorityCAMSchema,
    target: TargetSchema,
    config: LoRAConfigSchema,
    A: z
      .array(z.array(z.number()))
      .describe("Down-projection matrix A (rank × d_in)"),
    B: z.array(z.number()).describe("Up-projection vector B (length rank)"),
    d_in: z.number().int().positive().describe("Input feature dimension"),
    trained_on: z.number().int().nonnegative().describe("Training sample count"),
    final_train_loss: z.number().describe("Final training MSE"),
    improvement_over_baseline_mae_pct: z
      .number()
      .describe("Train-set MAE improvement vs baseline, percent"),
    trained_at: z.string().describe("ISO timestamp of training"),
  })
  .describe("Trained LoRA adapter payload");

const BayesianModelSchema = z
  .object({
    target: z.string().describe("Target name"),
    weights: z.array(z.number()).describe("Bayesian ridge weights (length d)"),
    bias: z.number().optional().describe("Intercept term"),
    feature_stats: z
      .object({
        mean: z.array(z.number()),
        std: z.array(z.number()),
      })
      .describe("Per-feature mean/std for z-scoring"),
    categorical_vocab: z
      .record(z.string(), z.array(z.string()))
      .optional()
      .describe("Category → level-value list per categorical feature"),
    n_train: z.number().int().nonnegative().optional().describe("Training sample count"),
    train_mae: z.number().nonnegative().optional().describe("Training-set MAE"),
    train_r2: z.number().optional().describe("Training-set R²"),
    alpha_used: z.number().nonnegative().optional().describe("α hyperparameter"),
    lambda_used: z.number().nonnegative().optional().describe("λ hyperparameter"),
  })
  .describe("Frozen baseline regressor model");

// ─── Action schemas ─────────────────────────────────────────────────

export const ACTION_CAM_LORA_FRAMEWORK_SCHEMAS = {
  cam_lora_predict: z
    .object({
      adapter: LoRAAdapterSchema,
      baseline: BayesianModelSchema,
      x_std: z
        .array(z.number())
        .describe("Pre-standardized feature vector (length must equal adapter.d_in)"),
    })
    .describe("Predict baseline + adapter delta for one feature vector"),

  cam_lora_apply_delta: z
    .object({
      adapter: LoRAAdapterSchema,
      x_std: z.array(z.number()).describe("Pre-standardized feature vector"),
    })
    .describe("Compute adapter delta only (no baseline pass)"),

  cam_lora_validate: z
    .object({
      adapter: LoRAAdapterSchema,
      expected_dim: z
        .number()
        .int()
        .nonnegative()
        .describe("Expected feature dimension to validate adapter against"),
    })
    .describe("Validate adapter shape + dimension compatibility"),

  cam_lora_check_health: z
    .object({
      adapter: LoRAAdapterSchema,
      now: z
        .string()
        .optional()
        .describe("ISO timestamp to age against (defaults to current time)"),
    })
    .describe("Audit adapter freshness, accuracy, training-data sufficiency"),

  cam_lora_list: z
    .object({
      model_dir: z
        .string()
        .describe("Root directory containing per-CAM adapter subdirs"),
    })
    .describe("Enumerate all adapters under a model directory"),

  cam_lora_select: z
    .object({
      model_dir: z.string().describe("Root model directory"),
      cam_slug: PriorityCAMSchema,
      target: TargetSchema,
      expected_dim: z.number().int().positive().describe("Required feature dim"),
    })
    .describe("Pick the first usable adapter for (cam, target) from disk"),

  cam_lora_ensemble: z
    .object({
      adapters: z.array(LoRAAdapterSchema).min(1).describe("Adapters to ensemble"),
      baseline: BayesianModelSchema,
      x_std: z.array(z.number()).describe("Pre-standardized feature vector"),
      weights: z
        .array(z.number())
        .optional()
        .describe("Optional per-adapter weights (default: equal)"),
    })
    .describe("Weighted ensemble of multiple adapters with shared baseline"),

  cam_lora_standardize: z
    .object({
      raw: z.array(z.number()).describe("Raw feature vector"),
      mean: z.array(z.number()).describe("Per-feature mean"),
      std: z.array(z.number()).describe("Per-feature std (zeros are treated as 1)"),
    })
    .describe("Apply z-score standardization"),
} as const;

export type CAMLoRAFrameworkAction = keyof typeof ACTION_CAM_LORA_FRAMEWORK_SCHEMAS;
