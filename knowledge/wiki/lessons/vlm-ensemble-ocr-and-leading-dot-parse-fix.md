---
title: Multi-VLM ensemble blueprint OCR + the leading-dot JSON parse-loss bug
domain: blueprint-vision
slot: xray
created: 2026-06-04
tags: [ocr, vision, ensemble, blackwell, parse-bug, regression, consensus, hallucination]
---

# Multi-VLM ensemble blueprint OCR (Blackwell unlock) + leading-dot parse fix

## What shipped (slot:xray, BLACKWELL-TOKEN-SYNERGY context, 2026-06-04)

The RTX PRO 6000 Blackwell (96GB, ~85GB idle) can hold **multiple VLM families resident at
once** and serve them concurrently (`OLLAMA_MAX_LOADED_MODELS=6`, `OLLAMA_NUM_PARALLEL=2`,
`KEEP_ALIVE=-1`). The single-model OCR path used ONE 8B VLM because the old 16GB card could
fit only one. New capability: **multi-VLM ensemble consensus OCR**.

- `scripts/lib/vision-ensemble-fuse.mjs` — pure fusion core + async concurrent transport.
  Runs N diverse VLMs over ONE print in parallel (`runEnsembleOverImage`, true `Promise.all`),
  fuses via **N-way clustering + noisy-OR corroboration** (`fuseEnsemble` / `clusterAcrossModels`
  / `combineConfidenceNoisyOr`). Reuses the `scoreDimensionSet` matcher (type-aware, mm-canonical)
  and the `ollama-vision-extract-lib` prompt/request/parse primitives — does NOT reinvent them.
- `scripts/vision-ensemble-extract.mjs` — CLI: `--image <png>` or `--gen` (synthetic + ground
  truth); scores each single model AND the fused consensus vs truth (the ensemble-lift evidence).
- 26 pure-core tests + 2 DI-shell tests; both per-file reviewers PASS (0 P0/P1).

## Why ensemble > a single bigger model (the science)

A generative VLM's dominant OCR failure is **hallucination** — a confidently reported dimension
that is not on the drawing. Independent models from DIFFERENT families (qwen3-vl, qwen2.5-vl,
llama3.2-vision) make UNCORRELATED errors:
- a dim **≥2 models agree on** → corroborated consensus (a shared hallucination across families
  is improbable), confidence boosted by noisy-OR `P = 1 − Π(1 − cᵢ)`, capped 0.99;
- a dim **only 1 of ≥2 models reports** → `hallucination_candidate` flagged for the operator gate,
  never silently kept as ground truth.

This is the same corroboration doctrine as cross-SOURCE reconciliation
(`CrossSourceDimensionReconciliationEngine` / `dimension-corroborate.mjs`, print+CAD+CNC) — but a
distinct N-way SAME-class extractor fold, not a duplicate (no CAD-is-exact orientation;
one-vote-per-model so a model echoing a value twice cannot self-corroborate).

## The bug it surfaced (REGRESSION-CLASS — silent OCR data loss)

Live run, qwen2.5vl:7b emitted `"nominal": .171` — **engineering notation** (leading dot, no
zero) for a sub-1″ nominal. That is valid manufacturing shorthand but **invalid JSON**, so
`parseVisionResponse` threw and **discarded the ENTIRE extraction** — a whole print of dimensions
lost over one number. Same silent-data-loss class as the truncation bug `repairTruncatedJson`
already guards.

**Fix** (`scripts/lib/ollama-vision-extract-lib.mjs`, `repairLeadingDotDecimals`, called in the
sanitizer block before JSON.parse): a **string-aware single-pass scanner** that tracks in-string
state (honoring `\` escapes) and inserts the leading zero ONLY for a leading-dot number OUTSIDE
any JSON string (i.e. real value positions — dimension nominals are never inside strings). A
verbatim `raw_text`/`notes` interior like a scale ratio `"1:.5"` or a list `"[.5]"` is preserved
byte-for-byte; normal decimals (`1.5`) and `..5`/`5.` malformations are untouched.
(An earlier regex `/([:,\[])(\s*)(-?)\.(\d)/` was rejected in 3-of-3 scrutiny — all three arms
caught that it corrupts a string interior when a structural char abuts the dot, e.g.
`"SCALE 1:.5"` → `"1:0.5"`. The scanner is the correct, string-aware replacement.) +3 regression
tests incl. the adversarial interior cases.

**Live proof after the fix:** the same `.171″` dim came back as `4.3434mm` (= 0.171 × 25.4), the
warm-model extraction scored **F1 0.8 vs ground truth (MAE 0mm)** end-to-end through the CLI.

## Operational notes / gotchas

- **Cold-load starvation under fleet load.** With ~200 concurrent /loop sessions + a large model
  pull saturating the daemon, COLD VLMs cannot get GPU/queue time within 300s (curl exit 28). The
  ensemble design + Ollama config are correct — **pre-warm** the models (`/api/generate` with
  `keep_alive:-1`) or run when the fleet is quieter. A warm model OCRs a page in ~40s.
- A single-model ensemble run NEVER false-flags a hallucination (the flag requires ≥2 models).
- Ambiguous-pair detection is conservative + honestly labeled: two same-type values within the
  conflict band are surfaced as "model value-disagreement OR two distinct similar features —
  operator must disambiguate", NEVER auto-merged or averaged.

## Next (iter 2)
- Extend `bench-vision-ocr-ab.mjs` to a paired ensemble-vs-best-single F1 benchmark on N prints
  (the rigorous lift evidence) once a 32B/diverse model set is warm.
- Wire ensemble OCR as a `cadDispatcher` action (`cad_pdf_blueprint_extract_ensemble`) so the
  print→CAD pipeline (delta) and quote/CAM consumers can call corroborated extraction.

Related: [[reference_xray_vision_ab_benchmark_2026_06_03]] · [[reference_xray_ocr_closed_loop_2026_06_01]] · [[feedback_check_units_first]]
