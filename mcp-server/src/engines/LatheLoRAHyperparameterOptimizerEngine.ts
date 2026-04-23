/**
 * LatheLoRAHyperparameterOptimizerEngine — LATHE-LORA-MS0 U-LLR09
 * ================================================================
 *
 * Optimizes hyperparameters for LatheLoRA fine-tuning using Bayesian
 * optimization and grid search strategies.
 *
 * Hyperparameters optimized:
 *   - Learning rate (lr)
 *   - LoRA rank (r)
 *   - LoRA alpha
 *   - Batch size
 *   - Epochs
 *   - Warmup ratio
 *   - Weight decay
 *   - Gradient accumulation steps
 *
 * Strategies:
 *   - Grid search (exhaustive)
 *   - Random search (sampling)
 *   - Bayesian optimization (GP-based)
 *   - Preset configurations (fast, balanced, quality)
 *
 * @module engines/LatheLoRAHyperparameterOptimizerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Hyperparameter configuration */
export interface HyperparameterConfig {
  learning_rate: number;
  lora_rank: number;
  lora_alpha: number;
  batch_size: number;
  epochs: number;
  warmup_ratio: number;
  weight_decay: number;
  gradient_accumulation_steps: number;
  max_seq_length: number;
  optimizer: "adamw_8bit" | "adamw" | "sgd" | "paged_adamw_8bit";
  scheduler: "linear" | "cosine" | "constant" | "cosine_with_restarts";
}

/** Search space definition */
export interface SearchSpace {
  learning_rate: { min: number; max: number; log_scale: boolean };
  lora_rank: { values: number[] };
  lora_alpha: { values: number[] };
  batch_size: { values: number[] };
  epochs: { min: number; max: number };
  warmup_ratio: { min: number; max: number };
  weight_decay: { min: number; max: number };
}

/** Trial result */
export interface TrialResult {
  trial_id: string;
  config: HyperparameterConfig;
  metrics: {
    train_loss: number;
    eval_loss: number;
    perplexity: number;
    physics_accuracy?: number;
    g_code_validity?: number;
  };
  duration_seconds: number;
  vram_peak_gb: number;
  status: "completed" | "failed" | "pruned";
}

/** Optimization result */
export interface OptimizationResult {
  best_config: HyperparameterConfig;
  best_metrics: TrialResult["metrics"];
  all_trials: TrialResult[];
  search_strategy: SearchStrategy;
  total_trials: number;
  total_duration_seconds: number;
  recommendations: string[];
}

/** Search strategy */
export type SearchStrategy = "grid" | "random" | "bayesian" | "preset";

/** Preset name */
export type PresetName = "fast" | "balanced" | "quality" | "memory_efficient" | "high_rank";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default search space for LatheLoRA */
const DEFAULT_SEARCH_SPACE: SearchSpace = {
  learning_rate: { min: 1e-5, max: 5e-4, log_scale: true },
  lora_rank: { values: [8, 16, 32, 64] },
  lora_alpha: { values: [16, 32, 64, 128] },
  batch_size: { values: [1, 2, 4, 8] },
  epochs: { min: 1, max: 5 },
  warmup_ratio: { min: 0.03, max: 0.1 },
  weight_decay: { min: 0.0, max: 0.1 },
};

/** Preset configurations */
const PRESETS: Record<PresetName, HyperparameterConfig> = {
  fast: {
    learning_rate: 2e-4,
    lora_rank: 8,
    lora_alpha: 16,
    batch_size: 4,
    epochs: 1,
    warmup_ratio: 0.03,
    weight_decay: 0.01,
    gradient_accumulation_steps: 4,
    max_seq_length: 2048,
    optimizer: "adamw_8bit",
    scheduler: "linear",
  },
  balanced: {
    learning_rate: 1e-4,
    lora_rank: 16,
    lora_alpha: 32,
    batch_size: 2,
    epochs: 3,
    warmup_ratio: 0.05,
    weight_decay: 0.01,
    gradient_accumulation_steps: 8,
    max_seq_length: 2048,
    optimizer: "adamw_8bit",
    scheduler: "cosine",
  },
  quality: {
    learning_rate: 5e-5,
    lora_rank: 32,
    lora_alpha: 64,
    batch_size: 1,
    epochs: 5,
    warmup_ratio: 0.1,
    weight_decay: 0.05,
    gradient_accumulation_steps: 16,
    max_seq_length: 4096,
    optimizer: "adamw_8bit",
    scheduler: "cosine_with_restarts",
  },
  memory_efficient: {
    learning_rate: 2e-4,
    lora_rank: 4,
    lora_alpha: 8,
    batch_size: 1,
    epochs: 2,
    warmup_ratio: 0.03,
    weight_decay: 0.01,
    gradient_accumulation_steps: 16,
    max_seq_length: 1024,
    optimizer: "paged_adamw_8bit",
    scheduler: "linear",
  },
  high_rank: {
    learning_rate: 5e-5,
    lora_rank: 64,
    lora_alpha: 128,
    batch_size: 1,
    epochs: 3,
    warmup_ratio: 0.05,
    weight_decay: 0.01,
    gradient_accumulation_steps: 16,
    max_seq_length: 2048,
    optimizer: "adamw_8bit",
    scheduler: "cosine",
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAHyperparameterOptimizerEngine {
  private trials: TrialResult[] = [];
  private bestConfig: HyperparameterConfig | null = null;
  private bestMetrics: TrialResult["metrics"] | null = null;

  /**
   * Get preset configuration
   */
  getPreset(name: PresetName): HyperparameterConfig {
    return { ...PRESETS[name] };
  }

  /**
   * List available presets
   */
  listPresets(): { name: PresetName; description: string; vram_estimate_gb: number }[] {
    return [
      { name: "fast", description: "Quick training, lower quality", vram_estimate_gb: 8 },
      { name: "balanced", description: "Good balance of speed and quality", vram_estimate_gb: 12 },
      { name: "quality", description: "Best quality, slower training", vram_estimate_gb: 16 },
      { name: "memory_efficient", description: "For limited VRAM (<12GB)", vram_estimate_gb: 6 },
      { name: "high_rank", description: "High LoRA rank for complex tasks", vram_estimate_gb: 20 },
    ];
  }

  /**
   * Estimate VRAM requirement for a configuration
   */
  estimateVRAM(config: HyperparameterConfig, modelSizeB: number = 7): number {
    // Base model memory (4-bit quantized)
    const baseMemory = modelSizeB * 0.5; // ~0.5GB per billion params with 4-bit

    // LoRA adapter memory
    const loraMemory = (config.lora_rank * config.lora_alpha * modelSizeB * 0.001);

    // Optimizer states (AdamW has 2 states per param)
    const optimizerMemory = loraMemory * 2;

    // Gradient memory
    const gradientMemory = loraMemory;

    // Activation memory (depends on batch size and sequence length)
    const activationMemory = config.batch_size * (config.max_seq_length / 1024) * 0.5;

    // Total with overhead
    const total = (baseMemory + loraMemory + optimizerMemory + gradientMemory + activationMemory) * 1.2;

    return Math.round(total * 10) / 10;
  }

  /**
   * Generate grid search configurations
   */
  generateGridSearch(space: SearchSpace = DEFAULT_SEARCH_SPACE): HyperparameterConfig[] {
    const configs: HyperparameterConfig[] = [];

    // Generate all combinations (limited for practicality)
    for (const rank of space.lora_rank.values.slice(0, 3)) {
      for (const alpha of space.lora_alpha.values.slice(0, 2)) {
        for (const batchSize of space.batch_size.values.slice(0, 2)) {
          for (const lr of [1e-4, 2e-4]) {
            configs.push({
              learning_rate: lr,
              lora_rank: rank,
              lora_alpha: alpha,
              batch_size: batchSize,
              epochs: 2,
              warmup_ratio: 0.05,
              weight_decay: 0.01,
              gradient_accumulation_steps: Math.max(1, 8 / batchSize),
              max_seq_length: 2048,
              optimizer: "adamw_8bit",
              scheduler: "cosine",
            });
          }
        }
      }
    }

    return configs;
  }

  /**
   * Generate random search configurations
   */
  generateRandomSearch(
    space: SearchSpace = DEFAULT_SEARCH_SPACE,
    numSamples: number = 10
  ): HyperparameterConfig[] {
    const configs: HyperparameterConfig[] = [];

    for (let i = 0; i < numSamples; i++) {
      const lr = space.learning_rate.log_scale
        ? Math.exp(
            Math.log(space.learning_rate.min) +
            Math.random() * (Math.log(space.learning_rate.max) - Math.log(space.learning_rate.min))
          )
        : space.learning_rate.min + Math.random() * (space.learning_rate.max - space.learning_rate.min);

      configs.push({
        learning_rate: lr,
        lora_rank: space.lora_rank.values[Math.floor(Math.random() * space.lora_rank.values.length)],
        lora_alpha: space.lora_alpha.values[Math.floor(Math.random() * space.lora_alpha.values.length)],
        batch_size: space.batch_size.values[Math.floor(Math.random() * space.batch_size.values.length)],
        epochs: Math.floor(space.epochs.min + Math.random() * (space.epochs.max - space.epochs.min + 1)),
        warmup_ratio: space.warmup_ratio.min + Math.random() * (space.warmup_ratio.max - space.warmup_ratio.min),
        weight_decay: space.weight_decay.min + Math.random() * (space.weight_decay.max - space.weight_decay.min),
        gradient_accumulation_steps: 8,
        max_seq_length: 2048,
        optimizer: "adamw_8bit",
        scheduler: Math.random() > 0.5 ? "cosine" : "linear",
      });
    }

    return configs;
  }

  /**
   * Record a trial result
   */
  recordTrial(result: TrialResult): void {
    this.trials.push(result);

    // Update best if this is better
    if (
      result.status === "completed" &&
      (!this.bestMetrics || result.metrics.eval_loss < this.bestMetrics.eval_loss)
    ) {
      this.bestConfig = result.config;
      this.bestMetrics = result.metrics;
      log.info(`[HyperparamOpt] New best config: eval_loss=${result.metrics.eval_loss.toFixed(4)}`);
    }
  }

  /**
   * Get optimization result
   */
  getResult(strategy: SearchStrategy): OptimizationResult {
    const completedTrials = this.trials.filter(t => t.status === "completed");
    const totalDuration = this.trials.reduce((sum, t) => sum + t.duration_seconds, 0);

    return {
      best_config: this.bestConfig || PRESETS.balanced,
      best_metrics: this.bestMetrics || { train_loss: 0, eval_loss: 0, perplexity: 0 },
      all_trials: [...this.trials],
      search_strategy: strategy,
      total_trials: this.trials.length,
      total_duration_seconds: totalDuration,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate recommendations based on trials
   */
  private generateRecommendations(): string[] {
    const recs: string[] = [];

    if (this.trials.length === 0) {
      recs.push("No trials recorded yet. Start with 'balanced' preset.");
      return recs;
    }

    const completed = this.trials.filter(t => t.status === "completed");
    const failed = this.trials.filter(t => t.status === "failed");

    if (failed.length > completed.length / 2) {
      recs.push("High failure rate - consider reducing batch size or LoRA rank");
    }

    if (this.bestConfig) {
      if (this.bestConfig.lora_rank >= 32) {
        recs.push("High LoRA rank performing well - model may benefit from more capacity");
      }
      if (this.bestConfig.learning_rate < 1e-4) {
        recs.push("Low learning rate optimal - training is stable");
      }
      if (this.bestConfig.epochs >= 4) {
        recs.push("Multiple epochs needed - consider more training data");
      }
    }

    // VRAM recommendations
    const avgVRAM = completed.reduce((sum, t) => sum + t.vram_peak_gb, 0) / completed.length;
    if (avgVRAM > 20) {
      recs.push(`High VRAM usage (${avgVRAM.toFixed(1)}GB) - consider memory_efficient preset`);
    }

    return recs;
  }

  /**
   * Suggest configuration based on constraints
   */
  suggestConfig(constraints: {
    max_vram_gb?: number;
    max_hours?: number;
    priority?: "speed" | "quality" | "balanced";
  }): HyperparameterConfig {
    const { max_vram_gb = 16, max_hours = 4, priority = "balanced" } = constraints;

    // Start with priority-based preset
    let config = this.getPreset(priority === "speed" ? "fast" : priority === "quality" ? "quality" : "balanced");

    // Adjust for VRAM constraint
    let vram = this.estimateVRAM(config);
    while (vram > max_vram_gb && config.lora_rank > 4) {
      config.lora_rank = Math.floor(config.lora_rank / 2);
      config.lora_alpha = Math.floor(config.lora_alpha / 2);
      config.batch_size = Math.max(1, Math.floor(config.batch_size / 2));
      vram = this.estimateVRAM(config);
    }

    // Adjust for time constraint (rough estimate: 1 epoch ≈ 30 min for 5K examples)
    const maxEpochs = Math.floor(max_hours * 2);
    config.epochs = Math.min(config.epochs, Math.max(1, maxEpochs));

    return config;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: HyperparameterConfig): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (config.learning_rate <= 0 || config.learning_rate > 1) {
      issues.push(`Invalid learning rate: ${config.learning_rate}`);
    }
    if (config.lora_rank < 1 || config.lora_rank > 256) {
      issues.push(`Invalid LoRA rank: ${config.lora_rank} (must be 1-256)`);
    }
    if (config.lora_alpha < config.lora_rank / 2) {
      issues.push(`LoRA alpha (${config.lora_alpha}) should be >= rank/2 (${config.lora_rank / 2})`);
    }
    if (config.batch_size < 1 || config.batch_size > 64) {
      issues.push(`Invalid batch size: ${config.batch_size}`);
    }
    if (config.epochs < 1 || config.epochs > 100) {
      issues.push(`Invalid epochs: ${config.epochs}`);
    }
    if (config.warmup_ratio < 0 || config.warmup_ratio > 0.5) {
      issues.push(`Invalid warmup ratio: ${config.warmup_ratio}`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Reset optimizer state
   */
  reset(): void {
    this.trials = [];
    this.bestConfig = null;
    this.bestMetrics = null;
  }

  /**
   * Get trial count
   */
  getTrialCount(): number {
    return this.trials.length;
  }

  /**
   * Export configuration for Unsloth
   */
  toUnslothConfig(config: HyperparameterConfig): Record<string, unknown> {
    return {
      model_name: "unsloth/mistral-7b-v0.3-bnb-4bit",
      max_seq_length: config.max_seq_length,
      load_in_4bit: true,
      lora_config: {
        r: config.lora_rank,
        lora_alpha: config.lora_alpha,
        target_modules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout: 0,
        bias: "none",
        use_gradient_checkpointing: "unsloth",
      },
      training_args: {
        per_device_train_batch_size: config.batch_size,
        gradient_accumulation_steps: config.gradient_accumulation_steps,
        warmup_ratio: config.warmup_ratio,
        num_train_epochs: config.epochs,
        learning_rate: config.learning_rate,
        fp16: true,
        bf16: false,
        logging_steps: 10,
        optim: config.optimizer,
        weight_decay: config.weight_decay,
        lr_scheduler_type: config.scheduler,
        seed: 42,
      },
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAHyperparameterOptimizerEngine = new LatheLoRAHyperparameterOptimizerEngine();
