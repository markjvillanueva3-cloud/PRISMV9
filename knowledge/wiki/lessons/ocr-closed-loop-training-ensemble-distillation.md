---
title: Closed-loop OCR training via ensemble distillation + agreement calibration
domain: blueprint-vision
slot: xray
created: 2026-06-04
tags: [ocr, training, ensemble-distillation, calibration, isotonic, weak-supervision, blackwell, lora]
---

# Closed-loop OCR training-data engine (ensemble distillation + agreement calibration)

## Why (ready without delta)

The full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen. But the print-READING stage
trains **today**: the multi-VLM ensemble ([[vlm-ensemble-ocr-and-leading-dot-parse-fix]]) is a
**teacher** — run it over real prints and the dims models corroborate are high-confidence
pseudo-labels. The student is india's LoRA. This engine produces + grades the training DATA; the
gradient-descent fine-tune stays india's domain (xray PSN: produces→india/training).

## What shipped (slot:xray, 2026-06-04)

- `scripts/lib/ocr-training-loop-lib.mjs` (pure core, 12 tests):
  - `calibrateAgreement(samples)` — measures **P(consensus dim correct | agreement fraction f = k/n_models)**
    on perfect-GT synthetic prints, isotonic-regressed monotone in f (reuses `poolAdjacentViolators`
    from `isotonic-calibrator.mjs` — single-sources the PAV math). Carries a `reliable` flag
    (`totalN ≥ MIN_RELIABLE_SAMPLES=50`).
  - `assignLabelTier(f, calibration)` → gold/silver/bronze/reject by expected-accuracy floors
    (0.85/0.65/0.45). `expectedAccuracyForFraction` clamps + nearest-lower + **null on uncalibrated
    (never fabricates a trust value)**.
  - `buildTrainsetRow` / `classifyActiveLearning` / `aggregateTrainingLoop`.
- `scripts/blueprint-ocr-training-loop.mjs` (runner): **CALIBRATE** (synthetic perfect-GT, mixed
  difficulty) → **WEAK-LABEL** (real prints) → **EMIT** (`trainset.jsonl` for india +
  `active-learning-queue.jsonl` + report). No-re-OCR soul honored: weak-labels ONLY the bounded
  operator-supplied prints, never the 257K corpus.

## The key correctness property: calibrate on FRACTION, not raw count

Raw corroboration `k` is only meaningful relative to the ensemble size that ran. Under fleet
contention the *effective* model count varies per print (1, 2, or 3 survive), so calibrating on `k`
mixes incomparable domains. Calibrating on the **agreement fraction f = k/n_models** is
ensemble-size-invariant: f=1.0 ("all agreed") is high-trust whether 2-of-2 or 3-of-3. A 1-model run
has f=1.0 by *self-agreement* — which is NOT corroboration, so:

- a label is **trainable only if its print had n_models ≥ 2** (`MIN_ENSEMBLE_FOR_CORROBORATION`), AND
- a single-model dim is tiered **`no_corroboration`** (never an accuracy tier), routed to review.

This was a **P1 caught in 3-of-3 scrutiny** (arm C): the first cut calibrated on `k` from a 3-model
ensemble, then applied it to a real print where only 1 model survived → emitted 8 zero-corroboration
dims as trainable `silver` under a 3-model trust value. The fraction redesign + the n_models≥2 gate
closed it. Regression test: a single-model run must mint **zero** trainable labels.

## Live proof (real JM print, 2026-06-04)

`extrude_punch` print (`PRISM_2475-037`), 2 warm models (qwen3-vl:8b-instruct + qwen2.5vl:7b):
- calibration: **f=0.5 → 0.57, f=1.0 → 0.90** (monotone — more agreement, more accurate, as theory
  predicts), honestly flagged **UNDER-POWERED (<50 samples)**.
- weak-label: 8 dims, both models corroborated → **8 gold trainable labels → trainset.jsonl** (for
  india's LoRA), 1 ambiguous pair → active-learning queue.
- When only 1 model survives (contention), the same print yields **0 trainable** → all to review
  (verified). The engine fails safe.

## Honest limits (R12)

- Calibration is **synthetic→real transfer** (the OOD pitfall): synthetic prints are cleaner than
  scans, so calibrated P(correct|f) is an upper-confidence estimate. `mustHumanVerify:true` on the
  report + the operator active-learning gate mean nothing trains without confirmation.
- Live calibration is **under-powered** (24–28 samples < 50) — daemon contention starved the 3rd
  model. Production needs more synthetic prints with ≥2 models surviving (daemon-quiet or pre-warmed).

## Staging seam to india (shipped 2026-06-04, U-XRAY-BLUEPRINT-LORA-STAGE)

The trainset now routes into india's real LoRA stack. `scripts/lib/trainset-to-lora-pairs.mjs` (pure
adapter, 8 tests) maps trainset rows → `BlueprintLoRABridgeEngine`'s `LoRATrainingPair[]` (trainable-only,
`String(value_mm)`, type+signals folded into `context`). `scripts/xray-trainset-to-lora.mjs` imports the
COMPILED bridge directly (no MCP) → `prepareTrainingSet(confidenceTier:"ensemble_consensus")` →
`exportBundle(provider:"local-lora")` → a staged `{prompt,completion}` bundle under
`mcp-server/data/training/lora/staging/`. Proven live (1 print → 8 pairs, anonymized).

**A real fine-tune is BLOCKED on 3 india-owned dependencies** (workflow `wwvgyrm26`, verified): (1) the
Blackwell is sm_120 but torch 2.6/cu124 has kernels only ≤sm_90 — CUDA is a false positive; (2) no real
trainer + missing peft/datasets/trl (`wedm_train_lora.py` is a simulation stub); (3) the bundle carries
the image PATH, not pixels — a vision LoRA needs india to load pdfPath→VLM. Deploy gate must be
**Brier ≤0.15 on operator_verified data** (NOT the pseudo-labels — circular), via `LoRAAdapterRegistry`
shadow→canary→active. Do NOT use `ContinualLoRAEngine` (stub numerics). Full work order:
`state/shared/ocr-training-loop/INDIA-HANDOFF-blueprint-lora.md`.

## Next
- Persist + accumulate calibration across runs (currently per-run); reach `reliable:true` (≥50).
- Wire as `cadDispatcher:cad_pdf_blueprint_extract_ensemble` + a `prism_ai` training-data action so
  india consumes `trainset.jsonl` directly.
- When delta's CAD-gen lands, extend the loop to print→CAD round-trip scoring.

Related: [[vlm-ensemble-ocr-and-leading-dot-parse-fix]] · [[reference_xray_ocr_closed_loop_2026_06_01]] · isotonic-calibrator.mjs
