---
policy:
  tier: 3
  triggers:
    - "train-lora"
---
# Train LoRA — Nightly Adapter Training From Shop Outcomes

Kick off a LoRA fine-tune of the local base model using recent shop outcomes as training signal. Queries `OutcomeTrackingEngine` for good/adjusted records, emits a training manifest, and shells out to the Python trainer.

## Args: $ARGUMENTS
- Empty: `nightly()` run with defaults (good+adjusted, minExamples=10, base=qwen2.5-coder:7b)
- `--since=<iso>`: window start (default: no lower bound)
- `--until=<iso>`: window end (default: now)
- `--min=<n>`: minimum example threshold (default: 10; skips if fewer)
- `--kinds=<csv>`: outcome kinds (default: good,adjusted). Scraps handled separately as counter-examples.
- `--base=<model>`: base model tag (default: qwen2.5-coder:7b)
- `--label=<name>`: adapter label (default: prism-nightly)
- `--dry-run`: prepare manifest + job record but skip trainer invocation
- `--list`: just list existing jobs (newest first)
- `--inspect=<jobId>`: read back a manifest

## Pipeline
1. **IncrementalLearningEngine.prepareJob()** — filter outcomes, write manifest+job record
2. **IncrementalLearningEngine.runJob()** — shell out to `python scripts/train_lora.py --manifest <path>`
3. **PRISMLoRAAdapterEngine.register()** — (trainer responsibility) record descriptor + safetensors
4. Optional: `/train-lora activate <adapterId>` to set as active for base model

## Engines
- `IncrementalLearningEngine` (U-LLM6) — orchestrator, pending→running→succeeded/failed lifecycle
- `PRISMLoRAAdapterEngine` (U-LLM3) — adapter registry, active.json map
- `OutcomeTrackingEngine` (U-LLM5) — source of truth for training examples

## Job States
- `pending` — manifest written, trainer not yet invoked
- `running` — trainer shelled
- `succeeded` — exit code 0
- `failed` — non-zero exit code or exception; stderr tail stored in `error`
- `skipped` — prepare returned `too-few-examples`

## Dispatcher Call (once wired)
```json
{
  "tool": "prism_local_llm",
  "action": "lora_nightly",
  "params": { "minExamples": 10, "dryRun": false }
}
```

## Typical Cadence
- Nightly cron at ~03:00 local time
- Manual run after major batch of adjusted outcomes (e.g., new material type tried)
- Never during shop hours — takes 30–90 min on RTX 3080, 15–45 min on RTX 4080
