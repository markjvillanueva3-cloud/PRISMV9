---
name: reference_post_ship_fleet-ollama-routing-ms0-u-flor-lora-train-executed
description: Auto-distilled learnings from shipping FLEET-OLLAMA-ROUTING-MS0/U-FLOR-LORA-TRAIN-EXECUTED (commit 9a4361034). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.859Z
aliases: reference_post_ship_fleet-ollama-routing-ms0-u-flor-lora-train-executed
---


# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-LORA-TRAIN-EXECUTED

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-LORA-TRAIN-EXECUTED (slot:tango): EXECUTE the operator-authorized GPU fine-tune + fix the live-caught bug. Provisioned the stack (uv -> py3.12 venv -> torch 2.11.0+cu128 + transformers/peft/trl/bitsandbytes 0.49.2; CUDA_OK True on RTX PRO 6000 Blackwell) -- the env-block is RESOLVED. First smoke run caught a REAL bug (R12 live-validation): HF Trainer defaults remove_unused_columns=True, which strips the custom sample_weight dataset column BEFORE the weighted collator -> KeyError at step 0. Fix: remove_unused_columns=False in build_training_args_dict + a regression-locking test assertion. RE-RAN: real LoRA fine-tune ran end-to-end on Blackwell -- 4-bit Qwen2.5-0.5B, LoRA 4.4M trainable params (0.88%), 8/8 steps, per-sample weighted loss backpropagated (step5 16.34 -> final 15.62), real 17.6MB adapter_model.safetensors + checkpoints saved to state/shared/lora/adapters/fleet-smoke (gitignored). 36/36 hermetic tests. The authorized GPU EXECUTION is DONE (smoke proves the pipeline; a 400-step 7B run converges -- one command, drop --smoke). gitignore: exclude .venv-lora + adapters.

**Shipped:** 2026-06-11T08:13:33-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[fleet-ollama-routing-ms0-u-flor-lora-train-executed]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._