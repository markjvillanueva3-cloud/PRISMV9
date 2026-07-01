---
name: reference_fleet_lora_adapter_trained_2026_06_11
description: "The fleet LoRA adapter was TRAINED to completion on the Blackwell (slot:tango, 2026-06-11) -- fleet-3b-prod, globalStep 200, finalLoss 4.43 (from 16.4), 119.8MB, NO fleet pause, ~10min. The actual model-improvement the AI-synergy /goal drove at. Also: the trainer's multi-hour GPU 'hang' is TRANSIENT -- a checkpoint resume sails past it; never let a wedged run sit (R14). Verified VRAM/time facts for any future fleet LoRA run."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_lora_adapter_trained_2026_06_11
---


**The fleet LoRA adapter is TRAINED** (slot:tango, 2026-06-11) -- the actual model improvement the AI-synergy /goal drove at, $0-operator, on the local Blackwell.

## Result (verified)
`state/shared/lora/adapters/fleet-3b-prod/`: **globalStep 200/200, finalLoss 4.43** (down from 16.4 at step 5 -- real loss reduction, genuine learning), `adapter_model.safetensors` 119.8MB, `fleet_training_metadata.json` present, train_runtime 458s, trainer exited clean (0 orphans). Base `Qwen/Qwen2.5-3B-Instruct`, 4-bit QLoRA rank 16, corpus = the 1138-row `fleet-lora-combined.jsonl` (279 verified + 859 advisory, 34 galaxies), per-sample weighted loss (advisory wiki/synthesis @0.5, verified doctrine @1.0), completion-only masked. Trainer: `scripts/fleet_lora_train.py` (U-FLOR-FLEET-LORA-TRAINER, real -- not the WEDM simulation stub). Smoke proof also exists: `fleet-smoke/` (0.5B, 8 steps).

## Operational facts (for any future fleet LoRA run)
- **NO fleet pause needed.** A 3B 4-bit QLoRA trained alongside the live Ollama stack: during the run, 50GB used / 46GB free of the 96GB Blackwell (Ollama held ~14GB). 7-8B 4-bit is ~6-10GB. The fleet's resident models do NOT need eviction.
- **Time: ~10 min of compute** for a full 200-step 3B run (~4.5 s/step, train_runtime 458s for the 100-step resume half). The "multi-hour" framing was the HANG, not the work.
- **venv**: `.venv-lora/Scripts/python.exe` = Python 3.12.13, torch 2.11.0+cu128, CUDA on Blackwell. Do NOT use the default 3.14 python (no sm_120 wheels -- the #1 trap; the trainer hard-asserts torch.cuda.is_available()).
- Base models cached at `C:\Users\wompu\.cache\huggingface\hub` (Qwen2.5 0.5B/3B/Coder-0.5B/Coder-7B).

## LESSON: the GPU "hang" is TRANSIENT -- resume past it; never let a wedged run sit (R14)
The first prod attempt trained fine to step 100 (loss 16.4->9.6) then WEDGED: GPU pegged 100%/337W for ~5 HOURS with zero progress past checkpoint-100, holding 52GB. It was NOT a deterministic bug -- killing it (R14: it was my own orphaned bg run) + relaunching with `--resume` (default on) reloaded checkpoint-100 and **sailed straight past step 100** to a clean 200/200 finish. So: (1) a long GPU-100%-but-no-checkpoint-advance run is WEDGED, not working -- kill it, don't wait; (2) the trainer is checkpoint-resumable so a kill loses nothing; (3) ALWAYS verify a backgrounded trainer actually ADVANCES a checkpoint within minutes -- a `nohup &` detaches it from the bash-task callback, so poll the latest `checkpoint-N` + GPU util, don't assume it's progressing. Cause of the transient wedge unconfirmed (likely a CUDA/driver stall or a fleet-reaper interaction right after the step-100 save) -- worth a watchdog if it recurs.

## Remaining (india's GPU lane, NOT this)
GNN full-coverage AUROC still needs the H2GCN-at-scale retrain (0.808 selective-deploy @ tau=0.7). Optional stronger LoRA: a 7B-Coder run (was mid-download). Pairs with [[reference_galaxy_bridge_deep_reason_2026_06_11]] (the deep-reasoning mode + the wiki-canon trainingReady flip that made this corpus).
