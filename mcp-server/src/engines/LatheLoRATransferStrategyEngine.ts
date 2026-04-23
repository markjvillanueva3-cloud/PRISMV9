/**
 * LatheLoRATransferStrategyEngine — LATHE-LORA-MS0 U-LLR10
 * ========================================================
 *
 * Manages transfer learning strategies for LatheLoRA fine-tuning.
 * Determines optimal base model, adapter selection, and knowledge transfer.
 *
 * Strategies:
 *   - Full fine-tuning (all layers)
 *   - LoRA adaptation (rank-based)
 *   - QLoRA (quantized + LoRA)
 *   - Progressive unfreezing
 *   - Domain-specific initialization
 *
 * @module engines/LatheLoRATransferStrategyEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Base model configuration */
export interface BaseModel {
  name: string;
  family: "llama" | "mistral" | "qwen" | "phi" | "gemma";
  size_b: number;
  context_length: number;
  quantization: "none" | "4bit" | "8bit";
  recommended_rank: number;
  vram_requirement_gb: number;
}

/** Transfer strategy */
export interface TransferStrategy {
  name: string;
  type: "full" | "lora" | "qlora" | "progressive" | "domain_init";
  base_model: string;
  frozen_layers: number[];
  trainable_modules: string[];
  initialization: "random" | "pretrained" | "domain_warm";
  adapter_config?: {
    rank: number;
    alpha: number;
    dropout: number;
    target_modules: string[];
  };
}

/** Knowledge domain */
export interface KnowledgeDomain {
  name: string;
  description: string;
  keywords: string[];
  relevant_layers: string[];
  transfer_difficulty: "easy" | "medium" | "hard";
}

/** Strategy recommendation */
export interface StrategyRecommendation {
  strategy: TransferStrategy;
  confidence: number;
  rationale: string[];
  estimated_vram_gb: number;
  estimated_training_hours: number;
  risks: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Available base models */
const BASE_MODELS: Record<string, BaseModel> = {
  "mistral-7b-4bit": {
    name: "unsloth/mistral-7b-v0.3-bnb-4bit",
    family: "mistral",
    size_b: 7,
    context_length: 32768,
    quantization: "4bit",
    recommended_rank: 16,
    vram_requirement_gb: 6,
  },
  "llama3-8b-4bit": {
    name: "unsloth/llama-3-8b-bnb-4bit",
    family: "llama",
    size_b: 8,
    context_length: 8192,
    quantization: "4bit",
    recommended_rank: 16,
    vram_requirement_gb: 8,
  },
  "qwen2-7b-4bit": {
    name: "unsloth/Qwen2-7B-bnb-4bit",
    family: "qwen",
    size_b: 7,
    context_length: 131072,
    quantization: "4bit",
    recommended_rank: 16,
    vram_requirement_gb: 6,
  },
  "phi3-mini-4bit": {
    name: "unsloth/Phi-3-mini-4k-instruct-bnb-4bit",
    family: "phi",
    size_b: 3.8,
    context_length: 4096,
    quantization: "4bit",
    recommended_rank: 8,
    vram_requirement_gb: 4,
  },
  "gemma2-9b-4bit": {
    name: "unsloth/gemma-2-9b-bnb-4bit",
    family: "gemma",
    size_b: 9,
    context_length: 8192,
    quantization: "4bit",
    recommended_rank: 16,
    vram_requirement_gb: 10,
  },
};

/** Knowledge domains for lathe G-code */
const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
  {
    name: "g_code_syntax",
    description: "G-code command structure and syntax",
    keywords: ["G00", "G01", "M03", "syntax", "command"],
    relevant_layers: ["embedding", "early_attention"],
    transfer_difficulty: "easy",
  },
  {
    name: "cutting_parameters",
    description: "Speed, feed, depth calculations",
    keywords: ["speed", "feed", "rpm", "ipr", "cutting"],
    relevant_layers: ["mid_attention", "mlp"],
    transfer_difficulty: "medium",
  },
  {
    name: "physics_reasoning",
    description: "Force, power, thermal calculations",
    keywords: ["force", "power", "thermal", "kienzle", "taylor"],
    relevant_layers: ["late_attention", "output"],
    transfer_difficulty: "hard",
  },
  {
    name: "operation_planning",
    description: "Operation sequencing and planning",
    keywords: ["sequence", "roughing", "finishing", "operation"],
    relevant_layers: ["mid_attention"],
    transfer_difficulty: "medium",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRATransferStrategyEngine {
  /**
   * List available base models
   */
  listBaseModels(): BaseModel[] {
    return Object.values(BASE_MODELS);
  }

  /**
   * Get base model by key
   */
  getBaseModel(key: string): BaseModel | undefined {
    return BASE_MODELS[key];
  }

  /**
   * Recommend base model based on constraints
   */
  recommendBaseModel(constraints: {
    max_vram_gb?: number;
    min_context_length?: number;
    preferred_family?: string;
  }): BaseModel {
    const { max_vram_gb = 16, min_context_length = 2048, preferred_family } = constraints;

    let candidates = Object.values(BASE_MODELS).filter(
      m => m.vram_requirement_gb <= max_vram_gb && m.context_length >= min_context_length
    );

    if (preferred_family) {
      const familyMatch = candidates.filter(m => m.family === preferred_family);
      if (familyMatch.length > 0) candidates = familyMatch;
    }

    // Sort by size (prefer larger within constraints)
    candidates.sort((a, b) => b.size_b - a.size_b);

    return candidates[0] || BASE_MODELS["phi3-mini-4bit"];
  }

  /**
   * Create transfer strategy
   */
  createStrategy(
    baseModelKey: string,
    type: TransferStrategy["type"],
    options: {
      rank?: number;
      alpha?: number;
      frozen_layers?: number[];
    } = {}
  ): TransferStrategy {
    const baseModel = BASE_MODELS[baseModelKey] || BASE_MODELS["mistral-7b-4bit"];
    const rank = options.rank || baseModel.recommended_rank;
    const alpha = options.alpha || rank * 2;

    const targetModules = [
      "q_proj", "k_proj", "v_proj", "o_proj",
      "gate_proj", "up_proj", "down_proj",
    ];

    switch (type) {
      case "lora":
        return {
          name: `lora-r${rank}-${baseModelKey}`,
          type: "lora",
          base_model: baseModel.name,
          frozen_layers: [],
          trainable_modules: targetModules,
          initialization: "random",
          adapter_config: {
            rank,
            alpha,
            dropout: 0,
            target_modules: targetModules,
          },
        };

      case "qlora":
        return {
          name: `qlora-r${rank}-${baseModelKey}`,
          type: "qlora",
          base_model: baseModel.name,
          frozen_layers: [],
          trainable_modules: targetModules,
          initialization: "random",
          adapter_config: {
            rank,
            alpha,
            dropout: 0.05,
            target_modules: targetModules,
          },
        };

      case "progressive":
        // Freeze early layers, train later ones
        const numLayers = Math.floor(baseModel.size_b * 4); // Rough estimate
        const frozenCount = Math.floor(numLayers * 0.5);
        return {
          name: `progressive-${baseModelKey}`,
          type: "progressive",
          base_model: baseModel.name,
          frozen_layers: Array.from({ length: frozenCount }, (_, i) => i),
          trainable_modules: targetModules,
          initialization: "pretrained",
          adapter_config: {
            rank,
            alpha,
            dropout: 0,
            target_modules: targetModules.slice(0, 4), // Just attention
          },
        };

      case "domain_init":
        return {
          name: `domain-init-${baseModelKey}`,
          type: "domain_init",
          base_model: baseModel.name,
          frozen_layers: options.frozen_layers || [],
          trainable_modules: targetModules,
          initialization: "domain_warm",
          adapter_config: {
            rank: rank * 2, // Higher rank for domain init
            alpha: alpha * 2,
            dropout: 0,
            target_modules: targetModules,
          },
        };

      default: // full
        return {
          name: `full-${baseModelKey}`,
          type: "full",
          base_model: baseModel.name,
          frozen_layers: [],
          trainable_modules: ["all"],
          initialization: "pretrained",
        };
    }
  }

  /**
   * Recommend strategy based on task and constraints
   */
  recommendStrategy(params: {
    dataset_size: number;
    max_vram_gb: number;
    training_hours: number;
    task_complexity: "simple" | "moderate" | "complex";
  }): StrategyRecommendation {
    const { dataset_size, max_vram_gb, training_hours, task_complexity } = params;

    // Select base model
    const baseModel = this.recommendBaseModel({ max_vram_gb });
    const baseModelKey = Object.keys(BASE_MODELS).find(
      k => BASE_MODELS[k].name === baseModel.name
    ) || "mistral-7b-4bit";

    // Determine strategy type
    let strategyType: TransferStrategy["type"];
    let rank: number;

    if (dataset_size < 1000) {
      // Small dataset: use lower rank
      strategyType = "qlora";
      rank = 8;
    } else if (dataset_size < 5000) {
      // Medium dataset
      strategyType = "lora";
      rank = 16;
    } else {
      // Large dataset
      strategyType = task_complexity === "complex" ? "domain_init" : "lora";
      rank = task_complexity === "complex" ? 32 : 16;
    }

    // Adjust for VRAM
    if (max_vram_gb < 8) {
      rank = Math.min(rank, 8);
      strategyType = "qlora";
    }

    const strategy = this.createStrategy(baseModelKey, strategyType, { rank });

    // Calculate estimates
    const estimatedVRAM = baseModel.vram_requirement_gb + (rank * 0.1);
    const estimatedHours = (dataset_size / 1000) * (rank / 8);

    const rationale: string[] = [
      `Base model: ${baseModel.name} (${baseModel.size_b}B params)`,
      `Strategy: ${strategyType} with rank ${rank}`,
      `Dataset size: ${dataset_size} examples`,
      `Task complexity: ${task_complexity}`,
    ];

    const risks: string[] = [];
    if (dataset_size < 500) {
      risks.push("Small dataset may lead to overfitting");
    }
    if (rank > 32) {
      risks.push("High rank increases VRAM usage significantly");
    }
    if (estimatedHours > training_hours) {
      risks.push(`Training may exceed ${training_hours}h limit`);
    }

    return {
      strategy,
      confidence: Math.min(0.95, 0.7 + (dataset_size / 10000)),
      rationale,
      estimated_vram_gb: estimatedVRAM,
      estimated_training_hours: estimatedHours,
      risks,
    };
  }

  /**
   * Get knowledge domains
   */
  getKnowledgeDomains(): KnowledgeDomain[] {
    return [...KNOWLEDGE_DOMAINS];
  }

  /**
   * Match content to knowledge domains
   */
  matchDomains(content: string): { domain: string; score: number }[] {
    const lower = content.toLowerCase();
    const matches: { domain: string; score: number }[] = [];

    for (const domain of KNOWLEDGE_DOMAINS) {
      let score = 0;
      for (const keyword of domain.keywords) {
        if (lower.includes(keyword.toLowerCase())) {
          score += 1 / domain.keywords.length;
        }
      }
      if (score > 0) {
        matches.push({ domain: domain.name, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Validate strategy
   */
  validateStrategy(strategy: TransferStrategy): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!strategy.base_model) {
      issues.push("Missing base_model");
    }

    if (strategy.adapter_config) {
      if (strategy.adapter_config.rank < 1 || strategy.adapter_config.rank > 256) {
        issues.push(`Invalid rank: ${strategy.adapter_config.rank}`);
      }
      if (strategy.adapter_config.target_modules.length === 0) {
        issues.push("No target modules specified");
      }
    }

    if (strategy.type === "progressive" && strategy.frozen_layers.length === 0) {
      issues.push("Progressive strategy should have frozen layers");
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Generate Unsloth-compatible model loading code
   */
  generateModelLoadCode(strategy: TransferStrategy): string {
    const lines = [
      "from unsloth import FastLanguageModel",
      "",
      "model, tokenizer = FastLanguageModel.from_pretrained(",
      `    model_name="${strategy.base_model}",`,
      "    max_seq_length=2048,",
      "    dtype=None,",
      "    load_in_4bit=True,",
      ")",
      "",
    ];

    if (strategy.adapter_config) {
      lines.push(
        "model = FastLanguageModel.get_peft_model(",
        "    model,",
        `    r=${strategy.adapter_config.rank},`,
        `    lora_alpha=${strategy.adapter_config.alpha},`,
        `    target_modules=${JSON.stringify(strategy.adapter_config.target_modules)},`,
        `    lora_dropout=${strategy.adapter_config.dropout},`,
        '    bias="none",',
        '    use_gradient_checkpointing="unsloth",',
        "    random_state=42,",
        ")"
      );
    }

    return lines.join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRATransferStrategyEngine = new LatheLoRATransferStrategyEngine();
