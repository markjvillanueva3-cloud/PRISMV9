/**
 * WEDMLoRATrainingScriptEngine — Wire-EDM LoRA Training Script Generator
 *
 * U-WCTP-A2a: Generates Python training scripts for LoRA/QLoRA fine-tuning
 * of local LLMs on the JM Die wire-EDM corpus emitted by
 * WEDMLoRADatasetBuilderEngine (U-WCTP-A2-DSB).
 *
 * Mirrors LatheLoRATrainingScriptEngine (U-LLR03) shape, but the prompt
 * format, dataset path, output_dir, base model name, and inference example
 * are wire-EDM specific. Targets the 7 WEDM instruction families:
 *   wire_parameter_calc | pass_strategy | controller_dialect |
 *   wire_break_diagnose | taper_uv | surface_integrity | cost_estimate
 *
 * Physics provenance cited in the comment header of the generated script:
 *   Klocke (EDM fundamentals), Kunieda (single-discharge crater model),
 *   Toenshoff (surface integrity), Sato (taper/UV kinematics),
 *   Carslaw-Jaeger (heat-equation derived crater geometry),
 *   wire-deflection beam (cantilever/Euler-Bernoulli for wire bow).
 *
 * @module engines/WEDMLoRATrainingScriptEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WedmTrainingConfig {
  base_model: string;
  dataset_path: string;
  output_dir: string;
  lora_r: number;
  lora_alpha: number;
  lora_dropout: number;
  target_modules: string[];
  learning_rate: number;
  batch_size: number;
  gradient_accumulation: number;
  num_epochs: number;
  max_seq_length: number;
  warmup_ratio: number;
  weight_decay: number;
  use_4bit: boolean;
  use_gradient_checkpointing: boolean;
  logging_steps: number;
  save_steps: number;
  eval_steps: number;
  fp16: boolean;
  bf16: boolean;
}

export interface WedmScriptOutput {
  script: string;
  filename: string;
  config_json: string;
  requirements: string;
  estimated_vram_gb: number;
  estimated_time_hours: number;
}

export type WedmBaseModel =
  | "unsloth/llama-3-8b-bnb-4bit"
  | "unsloth/mistral-7b-bnb-4bit"
  | "unsloth/Phi-3.5-mini-instruct"
  | "unsloth/gemma-2-9b-bnb-4bit"
  | "unsloth/Qwen2.5-7B-bnb-4bit"
  | "unsloth/Qwen2.5-Coder-7B-bnb-4bit"
  | "custom";

export type WedmTrainingPreset = "fast" | "balanced" | "quality";

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: WedmTrainingConfig = {
  // Coder model preferred — WEDM responses include G-code-like control
  // dialect snippets (Sodick LN/Mitsubishi M700/Agie/Charmilles/Makino EDGE),
  // and code-tuned base outperforms generic on dialect-format precision.
  base_model: "unsloth/Qwen2.5-Coder-7B-bnb-4bit",
  dataset_path: "data/training/wedm_lora_train.jsonl",
  output_dir: "models/wedm-lora",
  lora_r: 16,
  lora_alpha: 32,
  lora_dropout: 0.05,
  target_modules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
  learning_rate: 2e-4,
  batch_size: 4,
  gradient_accumulation: 4,
  num_epochs: 3,
  max_seq_length: 2048,
  warmup_ratio: 0.03,
  weight_decay: 0.01,
  use_4bit: true,
  use_gradient_checkpointing: true,
  logging_steps: 10,
  save_steps: 100,
  eval_steps: 100,
  fp16: false,
  bf16: true,
};

const VRAM_ESTIMATES: Record<string, { base: number; per_r: number }> = {
  "unsloth/llama-3-8b-bnb-4bit": { base: 6, per_r: 0.1 },
  "unsloth/mistral-7b-bnb-4bit": { base: 5.5, per_r: 0.1 },
  "unsloth/Phi-3.5-mini-instruct": { base: 4, per_r: 0.05 },
  "unsloth/gemma-2-9b-bnb-4bit": { base: 7, per_r: 0.12 },
  "unsloth/Qwen2.5-7B-bnb-4bit": { base: 5.5, per_r: 0.1 },
  "unsloth/Qwen2.5-Coder-7B-bnb-4bit": { base: 5.5, per_r: 0.1 },
  custom: { base: 8, per_r: 0.15 },
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMLoRATrainingScriptEngine {
  private config: WedmTrainingConfig = { ...DEFAULT_CONFIG };

  /** Set training configuration (merged into current). */
  setConfig(config: Partial<WedmTrainingConfig>): WedmTrainingConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  /** Get a defensive copy of the current configuration. */
  getConfig(): WedmTrainingConfig {
    return { ...this.config };
  }

  /** Generate the full training script bundle. */
  generateScript(): WedmScriptOutput {
    const script = this.buildTrainingScript();
    const configJson = JSON.stringify(this.config, null, 2);
    const requirements = this.buildRequirements();
    const vram = this.estimateVRAM();
    const time = this.estimateTime();

    return {
      script,
      filename: "train_wedm_lora.py",
      config_json: configJson,
      requirements,
      estimated_vram_gb: vram,
      estimated_time_hours: time,
    };
  }

  private buildTrainingScript(): string {
    const c = this.config;

    return `#!/usr/bin/env python3
"""
WEDM LoRA Training Script — JM Die Wire-EDM Fine-Tuning

Generated by WEDMLoRATrainingScriptEngine (U-WCTP-A2a)
Base Model: ${c.base_model}
LoRA Config: r=${c.lora_r}, alpha=${c.lora_alpha}, dropout=${c.lora_dropout}

Trains on the wedm_lora_train.jsonl emitted by
WEDMLoRADatasetBuilderEngine (U-WCTP-A2-DSB), which covers 7 instruction
families with physics provenance citations:
  - wire_parameter_calc     (Klocke crater model)
  - pass_strategy           (multi-pass MRR/Ra trade)
  - controller_dialect      (Sodick / Mitsubishi / Agie / Charmilles / Makino)
  - wire_break_diagnose     (deflection-beam + thermal-limit)
  - taper_uv                (Sato UV-kinematics)
  - surface_integrity       (Toenshoff WEDM-recast-layer)
  - cost_estimate           (Carslaw-Jaeger heat-balance MRR proxy)

Usage:
  python train_wedm_lora.py
  python train_wedm_lora.py --resume checkpoint-500
"""

import os
import json
import argparse
from datetime import datetime

from unsloth import FastLanguageModel
from unsloth import is_bfloat16_supported
from transformers import TrainingArguments
from trl import SFTTrainer
from datasets import load_dataset

CONFIG = {
    "base_model": "${c.base_model}",
    "max_seq_length": ${c.max_seq_length},
    "load_in_4bit": ${c.use_4bit ? "True" : "False"},
    "lora_r": ${c.lora_r},
    "lora_alpha": ${c.lora_alpha},
    "lora_dropout": ${c.lora_dropout},
    "target_modules": ${JSON.stringify(c.target_modules)},
    "dataset_path": "${c.dataset_path}",
    "output_dir": "${c.output_dir}",
    "num_epochs": ${c.num_epochs},
    "batch_size": ${c.batch_size},
    "gradient_accumulation": ${c.gradient_accumulation},
    "learning_rate": ${c.learning_rate},
    "warmup_ratio": ${c.warmup_ratio},
    "weight_decay": ${c.weight_decay},
    "fp16": ${c.fp16 ? "True" : "False"},
    "bf16": ${c.bf16 ? "True" : "False"},
    "logging_steps": ${c.logging_steps},
    "save_steps": ${c.save_steps},
    "eval_steps": ${c.eval_steps},
}

# Alpaca-style prompt — matches the format the dataset builder emits.
WEDM_PROMPT = """### Instruction:
{instruction}

### Input:
{input}

### Response:
{output}"""

def format_prompts(examples):
    texts = []
    for i in range(len(examples["instruction"])):
        text = WEDM_PROMPT.format(
            instruction=examples["instruction"][i],
            input=examples["input"][i] if examples["input"][i] else "",
            output=examples["output"][i],
        )
        texts.append(text)
    return {"text": texts}

def train(resume_from: str = None):
    print(f"[{datetime.now()}] Starting WEDM LoRA training...")
    print(f"Base model: {CONFIG['base_model']}")
    print(f"Dataset: {CONFIG['dataset_path']}")

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=CONFIG["base_model"],
        max_seq_length=CONFIG["max_seq_length"],
        dtype=None,
        load_in_4bit=CONFIG["load_in_4bit"],
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=CONFIG["lora_r"],
        target_modules=CONFIG["target_modules"],
        lora_alpha=CONFIG["lora_alpha"],
        lora_dropout=CONFIG["lora_dropout"],
        bias="none",
        use_gradient_checkpointing=${c.use_gradient_checkpointing ? '"unsloth"' : "False"},
        random_state=42,
        use_rslora=False,
        loftq_config=None,
    )

    dataset = load_dataset("json", data_files=CONFIG["dataset_path"], split="train")
    dataset = dataset.map(format_prompts, batched=True)
    print(f"Dataset size: {len(dataset)} examples")

    training_args = TrainingArguments(
        output_dir=CONFIG["output_dir"],
        num_train_epochs=CONFIG["num_epochs"],
        per_device_train_batch_size=CONFIG["batch_size"],
        gradient_accumulation_steps=CONFIG["gradient_accumulation"],
        learning_rate=CONFIG["learning_rate"],
        warmup_ratio=CONFIG["warmup_ratio"],
        weight_decay=CONFIG["weight_decay"],
        fp16=CONFIG["fp16"],
        bf16=CONFIG["bf16"],
        logging_steps=CONFIG["logging_steps"],
        save_steps=CONFIG["save_steps"],
        save_total_limit=3,
        optim="adamw_8bit",
        seed=42,
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=CONFIG["max_seq_length"],
        dataset_num_proc=2,
        packing=False,
        args=training_args,
    )

    if resume_from:
        checkpoint_path = os.path.join(CONFIG["output_dir"], resume_from)
        print(f"Resuming from: {checkpoint_path}")
        trainer.train(resume_from_checkpoint=checkpoint_path)
    else:
        trainer.train()

    final_path = os.path.join(CONFIG["output_dir"], "final")
    model.save_pretrained(final_path)
    tokenizer.save_pretrained(final_path)

    print(f"[{datetime.now()}] Training complete!")
    print(f"Model saved to: {final_path}")

    stats = {
        "config": CONFIG,
        "completed_at": datetime.now().isoformat(),
        "dataset_size": len(dataset),
        "final_loss": trainer.state.log_history[-1].get("loss", None) if trainer.state.log_history else None,
    }
    stats_path = os.path.join(CONFIG["output_dir"], "training_stats.json")
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    return model, tokenizer

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train WEDM LoRA model")
    parser.add_argument("--resume", type=str, help="Resume from checkpoint")
    args = parser.parse_args()
    train(resume_from=args.resume)
`;
  }

  private buildRequirements(): string {
    return `# WEDM LoRA Training Requirements
# Install with: pip install -r requirements.txt

# Core
torch>=2.1.0
transformers>=4.36.0
datasets>=2.16.0
accelerate>=0.25.0

# LoRA/PEFT
peft>=0.7.0
bitsandbytes>=0.41.0
trl>=0.7.0

# Unsloth (fast training)
unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git
xformers

# Evaluation
evaluate>=0.4.0
rouge-score>=0.1.2
nltk>=3.8.0

# Utilities
wandb>=0.16.0
tensorboard>=2.15.0
`;
  }

  /** Estimate VRAM requirements (GB) for the current config. */
  estimateVRAM(): number {
    const modelKey = this.config.base_model in VRAM_ESTIMATES
      ? this.config.base_model
      : "custom";
    const estimate = VRAM_ESTIMATES[modelKey];

    let vram = estimate.base + (this.config.lora_r * estimate.per_r);

    if (!this.config.use_4bit) {
      vram *= 4;
    }

    if (this.config.use_gradient_checkpointing) {
      vram *= 0.7;
    }

    vram += (this.config.batch_size * this.config.max_seq_length * 0.001);

    return Math.round(vram * 10) / 10;
  }

  /** Estimate training wall-clock (hours) for the current config. */
  estimateTime(): number {
    const baseTime = 0.5;
    const examplesPerHour = 500;
    // WEDM training set is typically smaller than lathe (fewer parseable
    // programs per machine-class subdirectory). A2-DSB shipped ~7 examples
    // on a 50-cap smoke; full-archive uncapped runs land around 500-1500.
    const estimatedExamples = 1500;

    const trainingTime = (estimatedExamples * this.config.num_epochs) / examplesPerHour;

    return Math.round((baseTime + trainingTime) * 10) / 10;
  }

  /** Get a partial config for a named preset. */
  getPreset(name: WedmTrainingPreset): Partial<WedmTrainingConfig> {
    switch (name) {
      case "fast":
        return {
          lora_r: 8,
          lora_alpha: 16,
          num_epochs: 1,
          batch_size: 8,
          gradient_accumulation: 2,
          learning_rate: 5e-4,
          max_seq_length: 1024,
        };
      case "balanced":
        return {
          lora_r: 16,
          lora_alpha: 32,
          num_epochs: 3,
          batch_size: 4,
          gradient_accumulation: 4,
          learning_rate: 2e-4,
          max_seq_length: 2048,
        };
      case "quality":
        return {
          lora_r: 32,
          lora_alpha: 64,
          num_epochs: 5,
          batch_size: 2,
          gradient_accumulation: 8,
          learning_rate: 1e-4,
          max_seq_length: 4096,
        };
    }
  }

  /** Apply a preset and return the merged config. */
  applyPreset(name: WedmTrainingPreset): WedmTrainingConfig {
    const preset = this.getPreset(name);
    return this.setConfig(preset);
  }

  /** Validate the current configuration. */
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this.config.lora_r < 4 || this.config.lora_r > 128) {
      errors.push("lora_r should be between 4 and 128");
    }

    if (this.config.lora_alpha < this.config.lora_r) {
      warnings.push("lora_alpha is typically >= lora_r for stable training");
    }

    if (this.config.learning_rate > 1e-3) {
      warnings.push("Learning rate > 1e-3 may cause instability");
    }

    if (this.config.batch_size * this.config.gradient_accumulation < 8) {
      warnings.push("Effective batch size < 8 may hurt convergence");
    }

    if (this.config.max_seq_length < 512) {
      errors.push("max_seq_length should be at least 512 for WEDM programs");
    }

    if (this.config.num_epochs > 10) {
      warnings.push("More than 10 epochs may cause overfitting");
    }

    const vram = this.estimateVRAM();
    if (vram > 24) {
      warnings.push(`Estimated VRAM (${vram}GB) exceeds typical GPU capacity`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /** Generate the inference script for a deployed WEDM LoRA model. */
  generateInferenceScript(): string {
    return `#!/usr/bin/env python3
"""
WEDM LoRA Inference Script
Load and run the fine-tuned WEDM LoRA model.
"""

from unsloth import FastLanguageModel

def load_model(model_path: str = "${this.config.output_dir}/final"):
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_path,
        max_seq_length=${this.config.max_seq_length},
        dtype=None,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)
    return model, tokenizer

def generate(model, tokenizer, instruction: str, input_text: str = "") -> str:
    prompt = f"""### Instruction:
{instruction}

### Input:
{input_text}

### Response:
"""
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    outputs = model.generate(
        **inputs,
        max_new_tokens=1024,
        temperature=0.3,
        top_p=0.9,
        do_sample=True,
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

if __name__ == "__main__":
    model, tokenizer = load_model()
    result = generate(
        model, tokenizer,
        instruction="Generate Sodick LN-controller WEDM program. Material: D2 tool steel. Thickness: 12.7mm. Tolerance: \\u00b10.005mm. Surface Ra target: 0.8 \\u00b5m.",
        input_text="Customer: ATF\\nMaterial: D2 tool steel\\nThickness: 12.7 mm\\nWire: 0.25 mm brass\\nController: Sodick LN"
    )
    print(result)
`;
  }
}

export const wedmLoRATrainingScriptEngine = new WEDMLoRATrainingScriptEngine();
