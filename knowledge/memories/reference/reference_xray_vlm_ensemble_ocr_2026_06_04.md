---
name: reference_xray_vlm_ensemble_ocr_2026_06_04
description: "Multi-VLM ensemble blueprint OCR (Blackwell) + leading-dot JSON parse-loss bug fix (slot xray, 2026-06-04)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.279Z
aliases: reference_xray_vlm_ensemble_ocr_2026_06_04
---


slot:xray, 2026-06-04 (BLACKWELL OCR improvement /goal /loop). Built **multi-VLM ensemble consensus OCR** — the RTX PRO 6000 Blackwell (96GB) holds N diverse VLM families resident and serves them concurrently, so the OCR no longer rides one 8B model.

- `scripts/lib/vision-ensemble-fuse.mjs` — pure fusion core (`fuseEnsemble`, `clusterAcrossModels`, `combineConfidenceNoisyOr`) + async concurrent transport (`runEnsembleOverImage`, true Promise.all). N-way clustering + noisy-OR corroboration; reuses `scoreDimensionSet` matcher + `ollama-vision-extract-lib` primitives (NOT a duplicate of `CrossSourceDimensionReconciliationEngine`/`dimension-corroborate.mjs` which are cross-SOURCE; this is cross-MODEL, one-vote-per-model). 26 tests.
- `scripts/vision-ensemble-extract.mjs` — CLI (`--image`|`--gen`), scores each single model + fused consensus vs ground truth.
- **Dims ≥2 models agree on = corroborated consensus** (noisy-OR conf, cap 0.99); **dim only 1 of ≥2 models reports = `hallucination_candidate`** flagged for operator gate, never silently trusted.

**Regression-class bug found + fixed (R12):** qwen2.5vl emitted `"nominal": .171` (engineering notation, no leading zero) → invalid JSON → `parseVisionResponse` discarded the WHOLE extraction. Fix in `ollama-vision-extract-lib.mjs`: `jsonText.replace(/([:,\[])(\s*)(-?)\.(\d)/g, "$1$2$30.$4")` — inserts the zero ONLY in JSON value position (quoted strings untouched). +2 tests (54 total). Live: the `.171″` dim recovered as 4.3434mm, F1 0.8 vs truth.

**Gotcha:** under full-fleet load (~200 /loop sessions + a big model pull) COLD VLMs starve and curl-timeout (exit 28) >300s. Ollama config is already correct (`MAX_LOADED_MODELS=6`, `NUM_PARALLEL=2`, `KEEP_ALIVE=-1`). Pre-warm via `/api/generate keep_alive:-1`, or run when fleet is quiet (warm page ≈ 40s).

Next: paired ensemble-vs-best-single F1 benchmark (extend `bench-vision-ocr-ab.mjs`); wire `cadDispatcher:cad_pdf_blueprint_extract_ensemble`. Wiki [[vlm-ensemble-ocr-and-leading-dot-parse-fix]]. See [[reference_xray_vision_ab_benchmark_2026_06_03]], [[reference_xray_ocr_closed_loop_2026_06_01]].
