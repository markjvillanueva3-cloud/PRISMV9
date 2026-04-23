/**
 * LatheLoRAMergeStrategyEngine — LATHE-LORA-MS0 U-LLR17
 * =====================================================
 *
 * Manages LoRA adapter merging strategies for LatheLoRA models.
 * Supports multiple merge techniques including linear combination,
 * task arithmetic, and DARE-based merging.
 *
 * Merge strategies:
 *   - Linear merge (weighted average)
 *   - TIES merge (trim, elect, scale)
 *   - DARE merge (drop and rescale)
 *   - Task arithmetic (add/subtract)
 *   - Concatenate (stack adapters)
 *
 * @module engines/LatheLoRAMergeStrategyEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Merge strategy types */
export type MergeStrategy = "linear" | "ties" | "dare" | "task_arithmetic" | "concatenate";

/** LoRA adapter metadata */
export interface LoRAAdapter {
  id: string;
  name: string;
  base_model: string;
  rank: number;
  alpha: number;
  target_modules: string[];
  training_steps: number;
  loss: number;
  metrics?: {
    physics_score?: number;
    safety_score?: number;
    reasoning_score?: number;
  };
}

/** Merge configuration */
export interface MergeConfig {
  strategy: MergeStrategy;
  output_name: string;
  weights?: number[];          // For linear/weighted strategies
  density?: number;            // For DARE (0-1, drop rate)
  threshold?: number;          // For TIES (magnitude threshold)
  scale_factor?: number;       // Output scaling
  validate_compatibility?: boolean;
}

/** Merge result */
export interface MergeResult {
  success: boolean;
  output_adapter: string;
  strategy_used: MergeStrategy;
  input_adapters: string[];
  effective_rank: number;
  estimated_parameters: number;
  warnings: string[];
  merge_metadata: {
    created_at: number;
    weights_applied: number[];
    final_scale: number;
  };
}

/** Compatibility check result */
export interface CompatibilityCheck {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: Partial<MergeConfig> = {
  strategy: "linear",
  density: 0.5,
  threshold: 0.2,
  scale_factor: 1.0,
  validate_compatibility: true,
};

/** Strategy descriptions */
const STRATEGY_INFO: Record<MergeStrategy, { name: string; description: string; best_for: string }> = {
  linear: {
    name: "Linear Combination",
    description: "Weighted average of adapter weights",
    best_for: "Simple merging of similar adapters",
  },
  ties: {
    name: "TIES Merge",
    description: "Trim low-magnitude weights, resolve sign conflicts, scale",
    best_for: "Merging multiple diverse adapters with conflict resolution",
  },
  dare: {
    name: "DARE Merge",
    description: "Drop weights randomly, rescale remaining",
    best_for: "Reducing interference between adapters",
  },
  task_arithmetic: {
    name: "Task Arithmetic",
    description: "Add or subtract task vectors from base",
    best_for: "Combining or removing specific capabilities",
  },
  concatenate: {
    name: "Concatenate",
    description: "Stack adapters for mixture-of-experts style",
    best_for: "Preserving all adapter capabilities separately",
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAMergeStrategyEngine {
  private adapters: Map<string, LoRAAdapter> = new Map();
  private mergeHistory: MergeResult[] = [];

  /**
   * Register a LoRA adapter
   */
  registerAdapter(adapter: LoRAAdapter): void {
    this.adapters.set(adapter.id, adapter);
    log.debug(`Registered adapter: ${adapter.id} (rank=${adapter.rank})`);
  }

  /**
   * Get registered adapter
   */
  getAdapter(id: string): LoRAAdapter | undefined {
    return this.adapters.get(id);
  }

  /**
   * List all registered adapters
   */
  listAdapters(): LoRAAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get available merge strategies
   */
  getStrategies(): typeof STRATEGY_INFO {
    return { ...STRATEGY_INFO };
  }

  /**
   * Recommend merge strategy based on adapters
   */
  recommendStrategy(adapterIds: string[]): {
    strategy: MergeStrategy;
    confidence: number;
    reasoning: string;
  } {
    const adapters = adapterIds.map(id => this.adapters.get(id)).filter(Boolean) as LoRAAdapter[];

    if (adapters.length === 0) {
      return {
        strategy: "linear",
        confidence: 0.5,
        reasoning: "No adapters found, defaulting to linear",
      };
    }

    // Check if all adapters have same base model
    const baseModels = new Set(adapters.map(a => a.base_model));
    const sameBase = baseModels.size === 1;

    // Check rank consistency
    const ranks = adapters.map(a => a.rank);
    const sameRank = new Set(ranks).size === 1;

    // Check if adapters have metrics
    const hasMetrics = adapters.every(a => a.metrics);

    // Decision logic
    if (adapters.length === 2 && sameBase && sameRank) {
      return {
        strategy: "linear",
        confidence: 0.85,
        reasoning: "Two compatible adapters — linear merge is simple and effective",
      };
    }

    if (adapters.length > 3) {
      return {
        strategy: "ties",
        confidence: 0.80,
        reasoning: "Multiple adapters — TIES handles conflicts and redundancy well",
      };
    }

    if (!sameBase || !sameRank) {
      return {
        strategy: "concatenate",
        confidence: 0.70,
        reasoning: "Incompatible ranks or bases — concatenation preserves individual adapters",
      };
    }

    if (hasMetrics) {
      const avgPhysics = adapters.reduce((s, a) => s + (a.metrics?.physics_score || 0), 0) / adapters.length;
      if (avgPhysics > 80) {
        return {
          strategy: "dare",
          confidence: 0.75,
          reasoning: "High-quality adapters — DARE reduces interference while preserving capabilities",
        };
      }
    }

    return {
      strategy: "linear",
      confidence: 0.70,
      reasoning: "Default choice for compatible adapters",
    };
  }

  /**
   * Check compatibility of adapters for merging
   */
  checkCompatibility(adapterIds: string[]): CompatibilityCheck {
    const adapters = adapterIds.map(id => this.adapters.get(id)).filter(Boolean) as LoRAAdapter[];
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (adapters.length < 2) {
      issues.push("Need at least 2 adapters to merge");
      return { compatible: false, issues, warnings, recommendations };
    }

    // Check base model compatibility
    const baseModels = [...new Set(adapters.map(a => a.base_model))];
    if (baseModels.length > 1) {
      issues.push(`Incompatible base models: ${baseModels.join(", ")}`);
      recommendations.push("Use concatenate strategy or convert to same base model");
    }

    // Check rank compatibility
    const ranks = [...new Set(adapters.map(a => a.rank))];
    if (ranks.length > 1) {
      warnings.push(`Different ranks: ${ranks.join(", ")} — may affect merge quality`);
      recommendations.push("Consider using minimum rank or resizing adapters");
    }

    // Check target modules
    const allModules = adapters.map(a => new Set(a.target_modules));
    const commonModules = allModules.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    });
    if (commonModules.size === 0) {
      warnings.push("No common target modules — merge may be partial");
    }

    // Check training quality
    const avgLoss = adapters.reduce((s, a) => s + a.loss, 0) / adapters.length;
    if (avgLoss > 1.0) {
      warnings.push(`High average loss (${avgLoss.toFixed(3)}) — consider retraining`);
    }

    return {
      compatible: issues.length === 0,
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Prepare merge operation (validates and returns config)
   */
  prepareMerge(
    adapterIds: string[],
    config: Partial<MergeConfig>
  ): { valid: boolean; config: MergeConfig; compatibility: CompatibilityCheck } {
    const fullConfig: MergeConfig = {
      strategy: config.strategy || "linear",
      output_name: config.output_name || `merged_${Date.now()}`,
      weights: config.weights,
      density: config.density ?? DEFAULT_CONFIG.density,
      threshold: config.threshold ?? DEFAULT_CONFIG.threshold,
      scale_factor: config.scale_factor ?? DEFAULT_CONFIG.scale_factor,
      validate_compatibility: config.validate_compatibility ?? DEFAULT_CONFIG.validate_compatibility,
    };

    const compatibility = this.checkCompatibility(adapterIds);

    // Set default weights if not provided
    if (!fullConfig.weights) {
      fullConfig.weights = new Array(adapterIds.length).fill(1.0 / adapterIds.length);
    }

    // Normalize weights
    const weightSum = fullConfig.weights.reduce((a, b) => a + b, 0);
    fullConfig.weights = fullConfig.weights.map(w => w / weightSum);

    return {
      valid: compatibility.compatible || fullConfig.strategy === "concatenate",
      config: fullConfig,
      compatibility,
    };
  }

  /**
   * Execute merge (simulated — actual merge requires model files)
   */
  executeMerge(adapterIds: string[], config: MergeConfig): MergeResult {
    const adapters = adapterIds.map(id => this.adapters.get(id)).filter(Boolean) as LoRAAdapter[];
    const warnings: string[] = [];

    if (adapters.length === 0) {
      return {
        success: false,
        output_adapter: "",
        strategy_used: config.strategy,
        input_adapters: adapterIds,
        effective_rank: 0,
        estimated_parameters: 0,
        warnings: ["No valid adapters found"],
        merge_metadata: {
          created_at: Date.now(),
          weights_applied: [],
          final_scale: 1.0,
        },
      };
    }

    // Calculate effective rank based on strategy
    let effectiveRank: number;
    switch (config.strategy) {
      case "concatenate":
        effectiveRank = adapters.reduce((sum, a) => sum + a.rank, 0);
        break;
      case "ties":
      case "dare":
        effectiveRank = Math.max(...adapters.map(a => a.rank));
        break;
      default:
        effectiveRank = Math.round(adapters.reduce((sum, a) => sum + a.rank, 0) / adapters.length);
    }

    // Estimate parameters (rough: rank * hidden_dim * 2 * num_modules)
    const avgModules = adapters.reduce((sum, a) => sum + a.target_modules.length, 0) / adapters.length;
    const hiddenDim = 4096; // Typical for 7B models
    const estimatedParams = effectiveRank * hiddenDim * 2 * avgModules;

    // Strategy-specific warnings
    if (config.strategy === "dare" && (config.density || 0.5) > 0.7) {
      warnings.push("High DARE density may reduce model capabilities");
    }
    if (config.strategy === "ties" && (config.threshold || 0.2) < 0.1) {
      warnings.push("Low TIES threshold may keep too many conflicting weights");
    }

    const result: MergeResult = {
      success: true,
      output_adapter: config.output_name,
      strategy_used: config.strategy,
      input_adapters: adapterIds,
      effective_rank: effectiveRank,
      estimated_parameters: Math.round(estimatedParams),
      warnings,
      merge_metadata: {
        created_at: Date.now(),
        weights_applied: config.weights || [],
        final_scale: config.scale_factor || 1.0,
      },
    };

    // Register merged adapter
    const mergedAdapter: LoRAAdapter = {
      id: config.output_name,
      name: `Merged: ${adapters.map(a => a.name).join(" + ")}`,
      base_model: adapters[0].base_model,
      rank: effectiveRank,
      alpha: adapters[0].alpha,
      target_modules: [...new Set(adapters.flatMap(a => a.target_modules))],
      training_steps: adapters.reduce((sum, a) => sum + a.training_steps, 0),
      loss: adapters.reduce((sum, a, i) => sum + a.loss * (config.weights?.[i] || 1/adapters.length), 0),
    };
    this.adapters.set(config.output_name, mergedAdapter);

    // Store in history
    this.mergeHistory.push(result);

    return result;
  }

  /**
   * Get merge history
   */
  getMergeHistory(): MergeResult[] {
    return [...this.mergeHistory];
  }

  /**
   * Calculate optimal weights based on metrics
   */
  calculateOptimalWeights(
    adapterIds: string[],
    metric: "physics" | "safety" | "reasoning" | "balanced"
  ): number[] {
    const adapters = adapterIds.map(id => this.adapters.get(id)).filter(Boolean) as LoRAAdapter[];

    if (adapters.length === 0 || !adapters.every(a => a.metrics)) {
      return new Array(adapterIds.length).fill(1.0 / adapterIds.length);
    }

    let scores: number[];
    switch (metric) {
      case "physics":
        scores = adapters.map(a => a.metrics?.physics_score || 50);
        break;
      case "safety":
        scores = adapters.map(a => a.metrics?.safety_score || 50);
        break;
      case "reasoning":
        scores = adapters.map(a => a.metrics?.reasoning_score || 50);
        break;
      case "balanced":
        scores = adapters.map(a => {
          const m = a.metrics!;
          return ((m.physics_score || 50) + (m.safety_score || 50) + (m.reasoning_score || 50)) / 3;
        });
        break;
    }

    // Convert scores to weights (higher score = higher weight)
    const total = scores.reduce((a, b) => a + b, 0);
    return scores.map(s => s / total);
  }

  /**
   * Generate merge command for external tools (e.g., mergekit)
   */
  generateMergeCommand(
    adapterIds: string[],
    config: MergeConfig,
    tool: "mergekit" | "peft" = "mergekit"
  ): string {
    const adapters = adapterIds.map(id => this.adapters.get(id)).filter(Boolean) as LoRAAdapter[];

    if (tool === "mergekit") {
      const yamlConfig = {
        merge_method: config.strategy === "ties" ? "ties" : config.strategy === "dare" ? "dare_ties" : "linear",
        slices: adapters.map((a, i) => ({
          sources: [{ model: a.id, layer_range: [0, 32] }],
        })),
        parameters: {
          density: config.density,
          weight: config.weights,
        },
      };
      return `# Save as merge_config.yaml and run:\n# mergekit-yaml merge_config.yaml ${config.output_name}\n\n${JSON.stringify(yamlConfig, null, 2)}`;
    }

    // PEFT merge
    return `from peft import PeftModel
from transformers import AutoModelForCausalLM

# Load base and merge
base_model = AutoModelForCausalLM.from_pretrained("${adapters[0]?.base_model || 'base_model'}")
${adapters.map((a, i) => `adapter_${i} = PeftModel.from_pretrained(base_model, "${a.id}")`).join("\n")}

# Merge with weights
merged = adapter_0.merge_and_unload()  # Customize merging logic as needed
merged.save_pretrained("${config.output_name}")`;
  }

  /**
   * Get summary of an adapter
   */
  getAdapterSummary(id: string): string {
    const adapter = this.adapters.get(id);
    if (!adapter) return `Adapter not found: ${id}`;

    const lines = [
      `[${adapter.id}] ${adapter.name}`,
      `Base: ${adapter.base_model} | Rank: ${adapter.rank} | Alpha: ${adapter.alpha}`,
      `Modules: ${adapter.target_modules.join(", ")}`,
      `Training: ${adapter.training_steps} steps, loss=${adapter.loss.toFixed(4)}`,
    ];

    if (adapter.metrics) {
      lines.push(
        `Metrics: Physics=${adapter.metrics.physics_score || "N/A"} ` +
        `Safety=${adapter.metrics.safety_score || "N/A"} ` +
        `Reasoning=${adapter.metrics.reasoning_score || "N/A"}`
      );
    }

    return lines.join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.adapters.clear();
    this.mergeHistory = [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAMergeStrategyEngine = new LatheLoRAMergeStrategyEngine();
