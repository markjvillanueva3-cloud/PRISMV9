---
name: reference_xray_ocr_yield_mechanics_2026_06_10
description: "blueprint-vision OCR closed-loop trainset yield mechanics + the 2026-06-10 A/B experiment (3rd-model REFUTED, real lever = qwen2.5vl runaway-JSON dropout → format:json fix)"
type: reference
galaxy: blueprint-vision
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_ocr_yield_mechanics_2026_06_10
---


**The closed-loop OCR trainset pipeline** (`scripts/blueprint-ocr-training-loop.mjs` runner + `scripts/lib/ocr-training-loop-lib.mjs` pure core) weak-labels real JM drawing prints into a tiered supervised trainset for india's blueprint-OCR LoRA. 3 phases: CALIBRATE (synthetic perfect-GT → isotonic P(correct | agreement fraction f)) → WEAK-LABEL (multi-VLM ensemble; gold/silver=trainable, bronze/reject→active-learning queue, NEVER silently trained, R12) → EMIT `trainset.jsonl`. Production: `run-ocr-training-loop-overnight.ps1` → scheduled task `PRISM OCR Training Loop`, worklist ~7794 prints. Resumable per-print cursor (reaper-survivable).

**Why most prints yield "0 trainable dims" — CORRECT conservative behavior, not a bug.** Tier floors gold≥0.85, silver≥0.65, bronze≥0.45; `trainable = gold||silver` (expected-accuracy ≥0.65). 2-model ensemble → agreement fraction f∈{0.5,1.0}. Measured calibration (n=51, now reliable): **f=0.5 → ~0.51 (bronze → NOT trainable)**, **f=1.0 → ~0.87 (gold → trainable)**. So a dim is trainable ONLY when BOTH VLMs independently extract it within tolerance — noisy real scans rarely match → low yield. R9/R12-honest (refuses untrustworthy labels).

## A/B EXPERIMENT 2026-06-10 (xray d00dc7c4) — 3rd-model hypothesis REFUTED
Tested whether adding a 3rd vision model (`llama3.2-vision:11b`, already in `VISION_FAMILY_LEADERS`) unlocks an f=0.67 (2-of-3) trainable bucket. Ran 2-model vs 3-model calibration (16 synthetic prints each). **RESULT: llama3.2-vision:11b survived 0 / 32 prints — it returns "empty response" 100% of the time** to the dimension-extraction prompt (per-model `err=empty response`, ms 9-80k). The ensemble NEVER reached 3 survivors → no f=0.67 bucket ever formed. **The production 2-model pin (`run-ocr-training-loop-overnight.ps1:31`) is EMPIRICALLY CORRECT** — its comment "other families fail dense dims" is validated (root cause: empty response, not weak extraction). My original "add a 3rd model" hypothesis was wrong.

## THE REAL YIELD LEVER (found by the experiment) — qwen2.5vl:7b runaway-JSON dropout
The experiment surfaced the actual bottleneck: even the 2 production qwen-VL models drop to **1-survivor ~30-37% of prints** (1 survivor → corroboration impossible → print fully EXCLUDED). Diagnosed via `state/shared/ocr-3model-ab/diag-ensemble.mjs`: `qwen3-vl:8b-instruct` is the reliable anchor (always ok, 8-42s); **`qwen2.5vl:7b` occasionally free-generates a runaway repetitive blob** (observed: 480-line / 12684-char output, 73s) that hits the `num_predict:4096` cap mid-structure → malformed JSON → `parse: repair failed` → drops out. The extraction call (`ollama-vision-extract-lib.mjs:408`) sets `temperature:0.1, num_predict:4096, num_ctx:8192` but **NO `format` constraint**.

**FIX (validated next ROI unit, NOT yet built):** add Ollama **constrained JSON decoding (`format:"json"` or a JSON schema)** to the vision-extraction `/api/generate` body so qwen2.5vl cannot emit malformed JSON → recovers the ~30% dropped prints (more f=1.0 trainable dims) + cuts the 73s runaway latency. Plumb `format` through `ollama-vision-extract-lib.mjs` → `run-ollama-vision-extract.mjs` → `vision-ensemble-fuse.mjs`; A/B vs no-format to confirm NO regression of the qwen3-vl anchor; unit test + per-file scrutiny + 3-of-3 (shared OCR pipeline feeds quotes/programs = safety-relevant). DO NOT lower num_predict globally (truncates legit rich prints) and DO NOT lower the silver floor (gaming R9).

Experiment artifacts: `state/shared/ocr-3model-ab/` (cal-2model + cal-3model reports, diag-ensemble.mjs, this A/B). Links: [[reference_xray_ocr_closed_loop_training_2026_06_04]] · [[reference_xray_ocr_corpus_resumable_multipage_2026_06_08]] · [[reference_ollama_vision_single_source_2026_06_09]] · [[feedback_xray_per_field_confidence_mandatory]].
