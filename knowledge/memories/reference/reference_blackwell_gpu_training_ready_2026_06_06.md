---
name: reference_blackwell_gpu_training_ready_2026_06_06
description: "The Blackwell GPU training stack is LIVE (torch 2.11+cu128, qlora-ready) via H:/Tools/python-gpu; T3.2 Node→GPU LoRA runner shipped + live-validated. T4.1 needs 4 small deps."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.030Z
aliases: reference_blackwell_gpu_training_ready_2026_06_06
---


# Blackwell GPU training stack is LIVE + T3.2 Node→GPU runner shipped (slot:xray, 2026-06-06)

**The env blocker that gated india's whole LoRA stack is GONE.** `PRISM_PYTHON_GPU_PATH=H:/Tools/python-gpu/Scripts/python.exe` now has **torch 2.11.0+cu128 (sm_120)** + peft 0.19 / datasets 5.0 / transformers 5.10 / bitsandbytes 0.49 / accelerate 1.13 / numpy 2.4. `scripts/py/gpu_health.py` LIVE on the RTX PRO 6000 Blackwell returns `torch_ready:true, gpu_matmul_ok:true, qlora_ready:true` (was refusing torch 2.6/cu124 sm_50..sm_90 just one session earlier). The Blackwell can now run real PyTorch GPU training.

**T3.2 SHIPPED** — `scripts/lib/blueprint-vl-train-runner.mjs` (commit `U-XRAY-VL-TRAIN-RUNNER`): the Node→GPU edge between the `.mjs` layer and the real Qwen2.5-VL PEFT trainer (`mcp-server/scripts/blueprint_vl_train_lora.py`). Strong `gpu_health.py` pre-gate (arch_list + matmul, fail-closed) → bundle check (no zero-row train) → spawn via `py-subprocess-bridge` streaming progress → map to `lora-training-pipeline.mjs#trainOnce()`. `makeBlueprintVlInnerTrain(ctx)` is the FACTORY (trainOnce calls innerTrain with 2 args → context closed over; a 3-arg form was the reviewer-caught P0). 16 hermetic tests (DI on both py-bridge calls) + LIVE end-to-end: real gpu_health passes → real trainer reached → `missing_dependency` fail-loud propagated as `TrainerFailedError code=missing_dependency`. Per-file 2-reviewer PASS (P0 refix re-reviewed 0 P0/P1). bf16 trainer (line 358) → requireBnb default false is correct.

**T4.1 (run the real fine-tune) — remaining small blockers:**
1. `python-gpu` lacks **pip** (and 4 trainer deps: **trl, qwen-vl-utils, pillow, pymupdf**). Operator: `H:/Tools/python-gpu/Scripts/python.exe -m ensurepip` then `-m pip install trl qwen-vl-utils pillow pymupdf`. (NOTE: long `pip install` of big wheels gets reaped under heavy fleet load — run when quiet; these 4 are small.)
2. A staged `local-lora` bundle (`{prompt,completion}`) from BlueprintLoRABridgeEngine.
3. The **operator_verified eval split (T2.2)** before any deploy past `shadow` (Brier ≤0.15 on gold labels, never pseudo-labels — R9).

Then `runBlueprintVlLoRATrain({bundlePath, outputDir})` runs the real train. Plan: `state/shared/ocr-training-loop/INDIA-TAKEOVER-PLAN-blueprint-lora.md`. Related: [[reference_xray_ocr_parse_truncation_fix_2026_06_06]] (the OCR keystone fixed same milestone), [[reference_xray_vl_trainer_2026_06_04]] (T3.1).

**Host note:** long-running node/python processes get reaped under heavy fleet load (65+ node procs, 200+ loops) — corpus OCR + big installs run best when the fleet is quiet (the overnight task design). Not a code bug; resource contention.
