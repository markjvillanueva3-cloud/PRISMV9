---
name: reference_xray_blueprint_lora_stage_2026_06_04
description: "xray→india blueprint-vision LoRA staging seam + the 3 verified blockers to a real fine-tune (slot xray, 2026-06-04)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.066Z
aliases: reference_xray_blueprint_lora_stage_2026_06_04
---


slot:xray, 2026-06-04. Operator: "utilize india galaxy capabilities since all galaxies should be linked. use workflow to fine tune your galaxy and system for lora." Ran workflow `wwvgyrm26` (4 discovery agents + synthesis) to map india's LoRA stack, then shipped the **xray→india LoRA staging seam**.

**SHIPPED (U-XRAY-BLUEPRINT-LORA-STAGE):**
- `scripts/lib/trainset-to-lora-pairs.mjs` (8 tests) — pure adapter: closed-loop OCR `trainset.jsonl` → `BlueprintLoRABridgeEngine`'s `LoRATrainingPair[]`. ONLY genuinely-new code (the bridge consumes pairs, doesn't produce them). 3 rules: trainable-only, `String(value_mm)`, fold type+signals into `context` (bridge prompt is only "Print: <path> Context: <ctx>").
- `scripts/xray-trainset-to-lora.mjs` — runner: imports the COMPILED `mcp-server/dist/engines/BlueprintLoRABridgeEngine.js` directly (no MCP needed; dispatcher does the same import) → `prepareTrainingSet({confidenceTier:"ensemble_consensus", io:{loadTrainingPairs}})` → `exportBundle({setId, provider:"local-lora", outputPath: under DEFAULT_STAGING_DIR})`. Staging dir = no operator-marker needed. Fail-soft if dist unavailable. **LIVE: 1 row → 8 pairs → staged bundle `mcp-server/data/training/lora/staging/blueprint-ocr-*.jsonl` ({prompt,completion} pairs), anonymized=true.**
- `state/shared/ocr-training-loop/INDIA-HANDOFF-blueprint-lora.md` — the work order for india.

**THE BRIDGE IS REAL** (system-viz graph said `[L8/stub]` — STALE; `prepareTrainingSet`/`exportBundle` have real anonymize+format+write+Zod-manifest, proven by the live run).

**3 VERIFIED BLOCKERS to an actual fine-tune (india's multi-session job, NOT buildable by xray):**
1. GPU dead for compute — Blackwell sm_120, but torch 2.6.0+cu124 only has kernels ≤sm_90. `cuda.is_available()==True` is a FALSE POSITIVE (`randn@randn` throws). Needs torch≥2.7/cu128.
2. No real trainer + no PEFT — `wedm_train_lora.py` is a SIMULATION stub (text-only, fake losses); ML env (WPy64-3.13) missing peft/datasets/trl.
3. Text/path bundle, not vision — the whole LoRA stack carries the image PATH string, never pixels. A vision LoRA needs india to load pdfPath→pixels→VLM.

**Guardrails surfaced (do NOT violate):** DO NOT route through `ContinualLoRAEngine`/`prism_ml continual_lora_*` (stub `Math.random` numerics). Deploy gate = **Brier ≤0.15 on operator_verified data, NOT pseudo-labels** (circular) — xray has NO operator_verified split yet (prerequisite). `InferenceLoRAGate` is serving/provenance, NOT quality. Deploy via `LoRAAdapterRegistry` shadow→canary→active.

Wiki [[ocr-closed-loop-training-ensemble-distillation]]. Workflow synthesis: task `wwvgyrm26`. See [[reference_xray_ocr_closed_loop_training_2026_06_04]].
