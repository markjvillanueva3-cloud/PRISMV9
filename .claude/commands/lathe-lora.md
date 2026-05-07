---
name: lathe-lora
description: Build, train, and deploy LatheLoRA fine-tuned models for local G-code generation
arguments: [subcommand]
---

# /lathe-lora — Local LLM Fine-Tuning Pipeline

Build and deploy LoRA fine-tuned models on JM Die Okuma lathe programs for local G-code generation.

## Subcommands

### `/lathe-lora build`
Build training dataset from JM Die archive.

### `/lathe-lora train [preset]`
Generate training scripts. Presets: fast, balanced, quality.

### `/lathe-lora eval`
Run evaluation harness on fine-tuned model.

### `/lathe-lora merge [format]`
Merge LoRA adapters and quantize. Formats: gguf, awq, gptq.

### `/lathe-lora deploy`
Deploy to Ollama for local inference.

### `/lathe-lora pipeline`
Run full end-to-end pipeline.

### `/lathe-lora cadence`
Check training cadence and schedule status.

### `/lathe-lora infer <prompt>`
Generate inference request for deployed model.

## Workflow

<workflow>
1. Parse the subcommand from arguments
2. For each subcommand:
   - build: Use lathe_lora_build_dataset action
   - train: Use lathe_lora_generate_training action
   - eval: Use lathe_lora_evaluate action
   - merge: Use lathe_lora_merge_quant action
   - deploy: Use lathe_lora_ollama_deploy action
   - pipeline: Use lathe_lora_pipeline_run action
   - cadence: Use lathe_lora_cadence_status action
   - infer: Use lathe_lora_inference action
3. Display results with actionable next steps
</workflow>

## Usage Examples

```
/lathe-lora build
/lathe-lora train balanced
/lathe-lora merge gguf
/lathe-lora deploy
/lathe-lora cadence
/lathe-lora infer "Generate roughing program for ALCOA"
```

## Implementation

```typescript
// Build dataset
const buildResult = await mcp.prism_turning({
  action: "lathe_lora_build_dataset",
  params: { config: { archive_path: "H:/PRISM/JM DIE/CNC LATHE" } }
});

// Generate training scripts
const trainResult = await mcp.prism_turning({
  action: "lathe_lora_generate_training",
  params: { preset: "balanced" }
});

// Merge and quantize
const mergeResult = await mcp.prism_turning({
  action: "lathe_lora_merge_quant",
  params: { config: { output_format: "gguf", gguf_quant: "Q4_K_M" } }
});

// Deploy to Ollama
const deployResult = await mcp.prism_turning({
  action: "lathe_lora_ollama_deploy",
  params: { config: { model_name: "lathe-lora" } }
});

// Check cadence
const cadenceResult = await mcp.prism_turning({
  action: "lathe_lora_cadence_status",
  params: {}
});
```

## Pipeline Stages

1. **Dataset** (5 min): Build instruction-tuning examples from archive
2. **Training** (2 hr): Fine-tune LoRA adapters on base model
3. **Evaluation** (15 min): Score model on held-out customer programs
4. **Merge** (10 min): Merge adapters into base model
5. **Quantize** (20 min): Compress to GGUF/AWQ for deployment
6. **Deploy** (2 min): Create Ollama model from Modelfile
7. **Verify** (1 min): Health check inference

## Cadence Schedule

Default: Weekly retraining when 50+ new programs accumulated.

Triggers:
- Scheduled (cron-based weekly run)
- Data drift (baseline score drops 10%+)
- Performance drop (eval score < 65)
- Manual (/lathe-lora cadence start)

## Model Versions

- Auto-versioned: YYYYMMDD.N format
- Max 5 versions retained
- Auto-promote when eval_score >= threshold
- Deprecate old versions automatically

## Hardware Requirements

| Preset | VRAM | Time | Quality |
|--------|------|------|---------|
| fast   | 6GB  | 1hr  | Adequate |
| balanced | 8GB | 2hr | Good |
| quality | 12GB | 4hr | Best |

## Integration

- **Hook**: `post-lathe-lora-train.mjs` validates model before deployment
- **Skill**: `/lathe-studio` can use deployed model for generation
- **CI**: `lathe-lora-cadence.yml` runs weekly pipeline

## Related Commands

- `/lathe-prove` — Formal verification (runs on generated programs)
- `/lathe-studio` — Full lathe programming environment
- `/train-lora` — Generic LoRA training (non-lathe)
