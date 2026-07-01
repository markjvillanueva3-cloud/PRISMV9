---
name: reference_xray_vl_trainer_2026_06_04
description: "Real Qwen2.5-VL PEFT trainer for blueprint-OCR LoRA shipped (xray acting for india) — T3.1 of the takeover plan, commit b121b19f7b"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.279Z
aliases: reference_xray_vl_trainer_2026_06_04
---


slot:xray, 2026-06-04. Operator: "precompact but plan for taking over india's work since its currently busy" — then resumed post-compact to EXECUTE the xray-SOLO slice of `state/shared/ocr-training-loop/INDIA-TAKEOVER-PLAN-blueprint-lora.md`.

**SHIPPED T3.1 (commit `b121b19f7b`, 2 files, 667 insertions):**
- `mcp-server/scripts/blueprint_vl_train_lora.py` — the REAL Qwen2.5-VL PEFT (LoRA) trainer for the blueprint-OCR loop. Replaces the keystone gap: `wedm_train_lora.py` is a text-only SIMULATION stub (fake epoch losses, stdlib-only, no GPU). This one: consumes `BlueprintLoRABridgeEngine` local-lora bundle `{prompt:"Print: <pdfPath> Context: <ctx>", completion:<value>}`, regex-recovers pdfPath, rasterizes PDF→pixels (PyMuPDF/fitz), Qwen2.5-VL + processor + PEFT LoRA, trains, saves adapter, computes a real calibration Brier on a held-out split.
- `mcp-server/scripts/blueprint_vl_train_lora.test.mjs` — 4 node:tests via the REAL `py-subprocess-bridge` (not a mock): self-test 13/13 pure-logic, structured fail-loud on a blocked run (every stdout line valid JSON), bad_args→exit 2; skip-soft only on SPAWN_FAILED.

**THE P0 A REVIEWER CAUGHT (VL-SFT masking gotcha — worth remembering):** the Qwen2.5-VL processor EXPANDS each `<|image_pad|>` placeholder into hundreds of image tokens at encode time. Measuring the prompt-prefix length with the plain tokenizer on the un-expanded template undercounts by the expansion factor → the loss mask covers the wrong span (trains on image/prompt tokens, not the answer). FIX: measure the prompt length from the EXPANDED encoding (run prompt-only through the full `processor(text=..., images=[[img]])`, take `attention_mask.sum()`) + force `padding_side="right"`. Also: PEFT `print_trainable_parameters()` writes to STDOUT (pollutes NDJSON) → redirect to stderr; `device_map="cuda"` conflicts with Trainer → load + `.to("cuda")`.

**HONESTY (R12/R9, baked into the code + commit):** CANNOT run until india lands torch≥2.7/cu128 + peft/datasets/trl (the 3 verified blockers from [[reference_xray_blueprint_lora_stage_2026_06_04]]); the held-out Brier is on PSEUDO-labels — stamped `brier_basis:"held_out_pseudo_labels"` + `eval_gate_satisfied:false`; the real deploy gate is Brier≤0.15 on `operator_verified` data (does NOT exist yet — T2.2). Real-matmul GPU preflight (`is_available()` is a false positive on this sm_120 Blackwell). NOT wired through `ContinualLoRAEngine` (stub `Math.random` numerics).

Scrutiny: per-file 2-reviewer (1 FAIL on the P0 above → fixed → both PASS) + end-of-task 3-of-3 ALL PASS, 0 P0/P1.

**NEXT (xray-SOLO, no operator/india):** T3.2 = `py-subprocess-bridge → DetachedLoRARunnerEngine → monitor` runner (consumes T3.1); T1.3 = lift the trainer's `preflight_gpu()` real-matmul check into `GpuStackHealthEngine` (the health gate green-lights the dead GPU today); T2.1 = grow the trainset (quiet Ollama window). STOP at operator-gated T0.1/T1.1/T1.2/T2.2. Plan: `state/shared/ocr-training-loop/INDIA-TAKEOVER-PLAN-blueprint-lora.md`. See [[reference_xray_ocr_closed_loop_training_2026_06_04]].
