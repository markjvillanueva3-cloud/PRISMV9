/**
 * LatheLoRAQuantizationOptimizerEngine — LATHE-LORA-MS0 U-LLR18
 * =============================================================
 *
 * Optimizes model quantization for LatheLoRA deployment.
 * Supports multiple quantization formats and quality assessment.
 *
 * Quantization formats:
 *   - GGUF (llama.cpp compatible)
 *   - GPTQ (GPU optimized)
 *   - AWQ (activation-aware)
 *   - BitsAndBytes (4/8-bit)
 *   - ONNX (cross-platform)
 *
 * @module engines/LatheLoRAQuantizationOptimizerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Quantization format */
export type QuantFormat = "gguf" | "gptq" | "awq" | "bnb_4bit" | "bnb_8bit" | "onnx" | "fp16";

/** GGUF quantization levels */
export type GGUFLevel = "Q2_K" | "Q3_K_S" | "Q3_K_M" | "Q3_K_L" | "Q4_0" | "Q4_K_S" | "Q4_K_M" | "Q5_0" | "Q5_K_S" | "Q5_K_M" | "Q6_K" | "Q8_0" | "F16";

/** Model info */
export interface ModelInfo {
  id: string;
  base_model: string;
  parameters_b: number;
  hidden_size: number;
  num_layers: number;
  vocab_size: number;
  original_size_gb: number;
  has_lora: boolean;
  lora_rank?: number;
}

/** Quantization config */
export interface QuantConfig {
  format: QuantFormat;
  gguf_level?: GGUFLevel;
  group_size?: number;       // For GPTQ/AWQ
  bits?: 4 | 8;              // For BNB
  calibration_samples?: number;
  use_double_quant?: boolean;
  compute_dtype?: "float16" | "bfloat16";
}

/** Quantization result */
export interface QuantResult {
  success: boolean;
  output_path: string;
  format: QuantFormat;
  original_size_gb: number;
  quantized_size_gb: number;
  compression_ratio: number;
  estimated_vram_gb: number;
  quality_estimate: number;  // 0-100
  warnings: string[];
  commands: string[];        // Commands to execute quantization
}

/** Hardware profile for recommendations */
export interface HardwareProfile {
  vram_gb: number;
  ram_gb: number;
  gpu_type?: "nvidia" | "amd" | "apple" | "cpu_only";
  cuda_available?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** GGUF level details */
const GGUF_LEVELS: Record<GGUFLevel, {
  bits_per_weight: number;
  quality_estimate: number;
  description: string;
}> = {
  Q2_K: { bits_per_weight: 2.5, quality_estimate: 60, description: "Smallest, significant quality loss" },
  Q3_K_S: { bits_per_weight: 3.0, quality_estimate: 70, description: "Small, noticeable quality loss" },
  Q3_K_M: { bits_per_weight: 3.3, quality_estimate: 73, description: "Medium 3-bit" },
  Q3_K_L: { bits_per_weight: 3.5, quality_estimate: 76, description: "Large 3-bit" },
  Q4_0: { bits_per_weight: 4.0, quality_estimate: 78, description: "Legacy 4-bit" },
  Q4_K_S: { bits_per_weight: 4.3, quality_estimate: 82, description: "Small 4-bit, good balance" },
  Q4_K_M: { bits_per_weight: 4.5, quality_estimate: 85, description: "Medium 4-bit, recommended" },
  Q5_0: { bits_per_weight: 5.0, quality_estimate: 88, description: "Legacy 5-bit" },
  Q5_K_S: { bits_per_weight: 5.3, quality_estimate: 90, description: "Small 5-bit" },
  Q5_K_M: { bits_per_weight: 5.5, quality_estimate: 92, description: "Medium 5-bit, high quality" },
  Q6_K: { bits_per_weight: 6.0, quality_estimate: 95, description: "6-bit, near-lossless" },
  Q8_0: { bits_per_weight: 8.0, quality_estimate: 98, description: "8-bit, excellent quality" },
  F16: { bits_per_weight: 16.0, quality_estimate: 100, description: "Full precision float16" },
};

/** Format characteristics */
const FORMAT_INFO: Record<QuantFormat, {
  name: string;
  gpu_required: boolean;
  inference_speed: "fast" | "medium" | "slow";
  platform: string;
}> = {
  gguf: { name: "GGUF", gpu_required: false, inference_speed: "fast", platform: "llama.cpp, Ollama" },
  gptq: { name: "GPTQ", gpu_required: true, inference_speed: "fast", platform: "vLLM, text-generation-inference" },
  awq: { name: "AWQ", gpu_required: true, inference_speed: "fast", platform: "vLLM, AutoAWQ" },
  bnb_4bit: { name: "BitsAndBytes 4-bit", gpu_required: true, inference_speed: "medium", platform: "Transformers" },
  bnb_8bit: { name: "BitsAndBytes 8-bit", gpu_required: true, inference_speed: "medium", platform: "Transformers" },
  onnx: { name: "ONNX", gpu_required: false, inference_speed: "medium", platform: "ONNX Runtime" },
  fp16: { name: "Float16", gpu_required: true, inference_speed: "slow", platform: "Any" },
};

const DEFAULT_CONFIG: Partial<QuantConfig> = {
  format: "gguf",
  gguf_level: "Q4_K_M",
  group_size: 128,
  bits: 4,
  calibration_samples: 512,
  use_double_quant: true,
  compute_dtype: "float16",
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAQuantizationOptimizerEngine {
  private models: Map<string, ModelInfo> = new Map();

  /**
   * Register model info
   */
  registerModel(model: ModelInfo): void {
    this.models.set(model.id, model);
    log.debug(`Registered model: ${model.id} (${model.parameters_b}B params)`);
  }

  /**
   * Get model info
   */
  getModel(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }

  /**
   * Get available formats
   */
  getFormats(): typeof FORMAT_INFO {
    return { ...FORMAT_INFO };
  }

  /**
   * Get GGUF levels
   */
  getGGUFLevels(): typeof GGUF_LEVELS {
    return { ...GGUF_LEVELS };
  }

  /**
   * Estimate quantized model size
   */
  estimateSize(modelId: string, config: Partial<QuantConfig>): {
    original_gb: number;
    quantized_gb: number;
    vram_required_gb: number;
    compression_ratio: number;
  } {
    const model = this.models.get(modelId);
    const params_b = model?.parameters_b || 7;
    const original_gb = model?.original_size_gb || params_b * 2; // FP16 default

    let bits_per_weight: number;
    const format = config.format || "gguf";

    if (format === "gguf") {
      const level = config.gguf_level || "Q4_K_M";
      bits_per_weight = GGUF_LEVELS[level].bits_per_weight;
    } else if (format === "gptq" || format === "awq" || format === "bnb_4bit") {
      bits_per_weight = 4;
    } else if (format === "bnb_8bit") {
      bits_per_weight = 8;
    } else if (format === "fp16") {
      bits_per_weight = 16;
    } else {
      bits_per_weight = 8; // ONNX default
    }

    const quantized_gb = (params_b * bits_per_weight) / 8;
    const vram_required = quantized_gb * 1.2; // 20% overhead for KV cache

    return {
      original_gb,
      quantized_gb,
      vram_required_gb: vram_required,
      compression_ratio: original_gb / quantized_gb,
    };
  }

  /**
   * Recommend quantization based on hardware
   */
  recommendQuantization(
    modelId: string,
    hardware: HardwareProfile
  ): {
    format: QuantFormat;
    config: QuantConfig;
    confidence: number;
    reasoning: string;
  } {
    const model = this.models.get(modelId);
    const params_b = model?.parameters_b || 7;

    // CPU-only: GGUF is the only option
    if (hardware.gpu_type === "cpu_only" || !hardware.cuda_available) {
      const level = this.selectGGUFLevel(params_b, hardware.ram_gb);
      return {
        format: "gguf",
        config: {
          format: "gguf",
          gguf_level: level,
        },
        confidence: 0.90,
        reasoning: "CPU-only: GGUF with llama.cpp provides best CPU inference",
      };
    }

    // Apple Silicon
    if (hardware.gpu_type === "apple") {
      const level = this.selectGGUFLevel(params_b, hardware.ram_gb);
      return {
        format: "gguf",
        config: {
          format: "gguf",
          gguf_level: level,
        },
        confidence: 0.85,
        reasoning: "Apple Silicon: GGUF with Metal acceleration is optimal",
      };
    }

    // Low VRAM (< 8GB): Need aggressive quantization
    if (hardware.vram_gb < 8) {
      if (params_b <= 7) {
        return {
          format: "bnb_4bit",
          config: {
            format: "bnb_4bit",
            bits: 4,
            use_double_quant: true,
            compute_dtype: "float16",
          },
          confidence: 0.80,
          reasoning: "Low VRAM: BitsAndBytes 4-bit with double quantization fits in memory",
        };
      } else {
        return {
          format: "gguf",
          config: {
            format: "gguf",
            gguf_level: "Q3_K_M",
          },
          confidence: 0.70,
          reasoning: "Very low VRAM for model size: aggressive GGUF quantization needed",
        };
      }
    }

    // Medium VRAM (8-16GB)
    if (hardware.vram_gb <= 16) {
      if (params_b <= 7) {
        return {
          format: "gptq",
          config: {
            format: "gptq",
            bits: 4,
            group_size: 128,
            calibration_samples: 512,
          },
          confidence: 0.85,
          reasoning: "Medium VRAM: GPTQ provides fast inference with good quality",
        };
      } else {
        return {
          format: "awq",
          config: {
            format: "awq",
            bits: 4,
            group_size: 128,
          },
          confidence: 0.80,
          reasoning: "Larger model: AWQ provides efficient memory usage",
        };
      }
    }

    // High VRAM (> 16GB)
    return {
      format: "fp16",
      config: {
        format: "fp16",
        compute_dtype: "float16",
      },
      confidence: 0.90,
      reasoning: "High VRAM: Full FP16 provides best quality with acceptable speed",
    };
  }

  /**
   * Select appropriate GGUF level for RAM
   */
  private selectGGUFLevel(params_b: number, ram_gb: number): GGUFLevel {
    const base_size = params_b; // Roughly 1GB per billion params at Q4

    if (ram_gb >= base_size * 8) return "F16";
    if (ram_gb >= base_size * 6) return "Q8_0";
    if (ram_gb >= base_size * 4) return "Q5_K_M";
    if (ram_gb >= base_size * 2.5) return "Q4_K_M";
    if (ram_gb >= base_size * 2) return "Q4_K_S";
    if (ram_gb >= base_size * 1.5) return "Q3_K_M";
    return "Q2_K";
  }

  /**
   * Generate quantization commands
   */
  generateQuantizationCommands(
    modelId: string,
    config: QuantConfig,
    outputDir: string = "./quantized"
  ): string[] {
    const model = this.models.get(modelId);
    const modelPath = model?.id || modelId;
    const commands: string[] = [];

    switch (config.format) {
      case "gguf":
        commands.push(
          `# Convert to GGUF format`,
          `python convert.py ${modelPath} --outtype f16 --outfile ${outputDir}/${modelId}-f16.gguf`,
          ``,
          `# Quantize to ${config.gguf_level}`,
          `./quantize ${outputDir}/${modelId}-f16.gguf ${outputDir}/${modelId}-${config.gguf_level}.gguf ${config.gguf_level}`
        );
        break;

      case "gptq":
        commands.push(
          `# GPTQ quantization`,
          `python -m auto_gptq.quantization \\`,
          `  --model_name_or_path ${modelPath} \\`,
          `  --bits ${config.bits || 4} \\`,
          `  --group_size ${config.group_size || 128} \\`,
          `  --num_samples ${config.calibration_samples || 512} \\`,
          `  --output_dir ${outputDir}/${modelId}-gptq`
        );
        break;

      case "awq":
        commands.push(
          `# AWQ quantization`,
          `from awq import AutoAWQForCausalLM`,
          `from transformers import AutoTokenizer`,
          ``,
          `model = AutoAWQForCausalLM.from_pretrained("${modelPath}")`,
          `tokenizer = AutoTokenizer.from_pretrained("${modelPath}")`,
          ``,
          `quant_config = {"w_bit": ${config.bits || 4}, "q_group_size": ${config.group_size || 128}}`,
          `model.quantize(tokenizer, quant_config=quant_config)`,
          `model.save_quantized("${outputDir}/${modelId}-awq")`
        );
        break;

      case "bnb_4bit":
      case "bnb_8bit":
        const bits = config.format === "bnb_4bit" ? 4 : 8;
        commands.push(
          `# BitsAndBytes ${bits}-bit loading`,
          `from transformers import AutoModelForCausalLM, BitsAndBytesConfig`,
          ``,
          `bnb_config = BitsAndBytesConfig(`,
          `    load_in_${bits}bit=True,`,
          config.use_double_quant ? `    bnb_4bit_use_double_quant=True,` : ``,
          `    bnb_4bit_compute_dtype=torch.${config.compute_dtype || "float16"}`,
          `)`,
          ``,
          `model = AutoModelForCausalLM.from_pretrained(`,
          `    "${modelPath}",`,
          `    quantization_config=bnb_config,`,
          `    device_map="auto"`,
          `)`
        );
        break;

      case "onnx":
        commands.push(
          `# ONNX export`,
          `python -m transformers.onnx \\`,
          `  --model ${modelPath} \\`,
          `  --feature causal-lm \\`,
          `  ${outputDir}/${modelId}-onnx`
        );
        break;

      case "fp16":
        commands.push(
          `# FP16 conversion (already float16, just load)`,
          `from transformers import AutoModelForCausalLM`,
          `model = AutoModelForCausalLM.from_pretrained("${modelPath}", torch_dtype=torch.float16)`
        );
        break;
    }

    return commands;
  }

  /**
   * Prepare quantization (returns full result with estimates)
   */
  prepareQuantization(
    modelId: string,
    config: Partial<QuantConfig>,
    outputDir: string = "./quantized"
  ): QuantResult {
    const fullConfig: QuantConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      format: config.format || "gguf",
    } as QuantConfig;

    const sizeEstimate = this.estimateSize(modelId, fullConfig);
    const commands = this.generateQuantizationCommands(modelId, fullConfig, outputDir);
    const warnings: string[] = [];

    // Quality estimate
    let quality_estimate: number;
    if (fullConfig.format === "gguf") {
      quality_estimate = GGUF_LEVELS[fullConfig.gguf_level || "Q4_K_M"].quality_estimate;
    } else if (fullConfig.format === "fp16") {
      quality_estimate = 100;
    } else if (fullConfig.bits === 4) {
      quality_estimate = 85;
    } else {
      quality_estimate = 95;
    }

    // Warnings
    if (quality_estimate < 75) {
      warnings.push("Aggressive quantization may significantly impact model quality");
    }
    if (fullConfig.format === "gptq" || fullConfig.format === "awq") {
      warnings.push("Requires calibration data for best results");
    }

    return {
      success: true,
      output_path: `${outputDir}/${modelId}-${fullConfig.format}`,
      format: fullConfig.format,
      original_size_gb: sizeEstimate.original_gb,
      quantized_size_gb: sizeEstimate.quantized_gb,
      compression_ratio: sizeEstimate.compression_ratio,
      estimated_vram_gb: sizeEstimate.vram_required_gb,
      quality_estimate,
      warnings,
      commands,
    };
  }

  /**
   * Compare quantization options
   */
  compareQuantizations(
    modelId: string,
    formats: QuantFormat[] = ["gguf", "gptq", "awq", "bnb_4bit"]
  ): Array<{
    format: QuantFormat;
    size_gb: number;
    vram_gb: number;
    quality: number;
    speed: string;
    gpu_required: boolean;
  }> {
    return formats.map(format => {
      const config: Partial<QuantConfig> = { format };
      if (format === "gguf") config.gguf_level = "Q4_K_M";

      const estimate = this.estimateSize(modelId, config);
      const info = FORMAT_INFO[format];

      let quality: number;
      if (format === "gguf") {
        quality = GGUF_LEVELS["Q4_K_M"].quality_estimate;
      } else if (format === "fp16") {
        quality = 100;
      } else if (format === "bnb_8bit") {
        quality = 95;
      } else {
        quality = 85;
      }

      return {
        format,
        size_gb: estimate.quantized_gb,
        vram_gb: estimate.vram_required_gb,
        quality,
        speed: info.inference_speed,
        gpu_required: info.gpu_required,
      };
    });
  }

  /**
   * Get summary
   */
  getSummary(result: QuantResult): string {
    const lines = [
      `Format: ${result.format.toUpperCase()}`,
      `Size: ${result.original_size_gb.toFixed(1)}GB → ${result.quantized_size_gb.toFixed(1)}GB (${result.compression_ratio.toFixed(1)}x)`,
      `VRAM: ${result.estimated_vram_gb.toFixed(1)}GB`,
      `Quality: ${result.quality_estimate}%`,
    ];

    if (result.warnings.length > 0) {
      lines.push(`Warnings: ${result.warnings.join("; ")}`);
    }

    return lines.join(" | ");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.models.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAQuantizationOptimizerEngine = new LatheLoRAQuantizationOptimizerEngine();
