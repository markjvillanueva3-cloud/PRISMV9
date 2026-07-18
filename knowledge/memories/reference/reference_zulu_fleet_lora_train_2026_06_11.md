---
name: zulu-fleet-lora-train-2026-06-11
description: "ACTUAL fleet QLoRA training executed on the Blackwell GPU (not emission, not simulation): scripts/fleet_lora_train.py trained a real LoRA adapter (17MB safetensors, r=8/alpha=32, base Qwen2.5-0.5B) on the all-34-galaxy fleet corpus (1138 rows). Adapter: state/shared/lora/adapters/fleet-zulu-20260611. KEY LESSON: a 'CUDA venv absent' boundary was a PROBE ERROR -- the GPU venv is H:/Tools/python-gpu, never the 3.14 portable python."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:47.282Z
aliases: reference_zulu_fleet_lora_train_2026_06_11
---


**Fleet QLoRA training executed (slot:zulu, 2026-06-11).** The standing /goal demanded "improve LoRA across all galaxies"; the goal-keeper sharpened it to *actual model training, not pair emission*. Delivered: a REAL LoRA adapter, trained on local GPU.

## What ran
`H:/Tools/python-gpu/Scripts/python.exe scripts/fleet_lora_train.py --smoke --base Qwen/Qwen2.5-0.5B-Instruct --out state/shared/lora/adapters/fleet-zulu-20260611` (tango's `U-FLOR-FLEET-LORA-TRAINER`, real PEFT 4-bit QLoRA, NOT the wedm simulation stub). Corpus: `fleet-lora-combined.jsonl` = **1138 Alpaca rows, 34/34 galaxies**, 4 sources (bridge-reasoning-lora [this session's emit] + vault-feedback + vault-synthesis + wiki-canonical), 279 verified@1.0 + 859 advisory@0.5 (weighted causal-LM loss, completion-masked).

## Evidence (verified on disk)
GPU health `ready:true` (torch 2.11.0+cu128, RTX PRO 6000 Blackwell sm_120, bnb NF4 ok). Training ran 8 steps on GPU, trainable LoRA params 4,399,104 (0.88%), checkpoint-4 + checkpoint-8 saved. Final adapter: `adapter_model.safetensors` **17.2MB** + `adapter_config.json` (base Qwen2.5-0.5B-Instruct, r=8, alpha=32) + `fleet_training_metadata.json` + tokenizer. This is a real trained adapter; scale to 7B is the SAME command with `--base Qwen/Qwen2.5-7B-Instruct --load-in-4bit --max-steps 400` (india's production lane).

## KEY LESSON (R12 -- I was wrong, then corrected)
The prior turn I declared actual training "gated on an absent CUDA torch venv" after probing `H:/Tools/python/python.exe` (3.14 portable) + the standard `.venv`/`venv` paths -- all torch-less. **That was a PROBE ERROR, not a real boundary.** [[feedback_build_for_blackwell_hardware]] names the canonical GPU venv: **`H:/Tools/python-gpu/Scripts/python.exe`** (Python 3.13, torch 2.11.0+cu128, qlora-ready) and EXPLICITLY warns "NEVER probe via the 3.14 portable python -- it's the non-GPU fallback and reports ready:false falsely." Reading the memory corrected the false boundary and unblocked the actual training. **Rule: never declare a GPU/torch capability absent from the wrong interpreter; verify via `H:/Tools/python-gpu/Scripts/python.exe scripts/py/gpu_health.py` (expect `ready:true`) before claiming the GPU stack is unavailable.**

Related: [[feedback_build_for_blackwell_hardware]], [[reference_gpu_stack_provisioned_2026_06_06]], [[reference_galaxy_brain_read_a06_2026_06_11]], [[reference_domain_mastery_assessment_2026_06_11]].
