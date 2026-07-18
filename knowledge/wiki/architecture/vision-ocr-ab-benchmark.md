---
title: Vision-OCR A/B Benchmark (Blackwell OCR upgrade gate)
type: architecture
domain: blueprint-vision
slot: xray
created: 2026-06-03
tags: [ocr, blueprint-vision, blackwell, gpu, ollama, benchmark, vision-model-select, xray]
---

# Vision-OCR A/B Benchmark — the empirical gate for the Blackwell OCR upgrade

## Why this exists
`scripts/lib/vision-model-select.mjs` (U-XRAY-VISION-PROFILE) added a **Blackwell-aware
vision-model upgrade seam**: on a big-VRAM host (≥40 GB → the 96 GB RTX 6000 Blackwell)
it can swap the proven 8 GB-safe default `qwen3-vl:8b-instruct` for a larger GPU-resident
vision model **iff** that model is pulled AND beats the default on blueprint OCR. But the
seam's header explicitly defers the "does it actually beat it?" question to *"the A/B
benchmark `bench-vision-ocr-ab.mjs`"* — **a file that never existed**. The seam was a
claim with no evidence; the upgrade path was dormant.

This unit builds that gate. It converts the dormant Blackwell upgrade from an assumption
into a one-command **measurement** (R9/R12: improvement must be measured, not asserted).

## Components (all under `scripts/`)
| File | Role |
|------|------|
| `lib/vision-ab-compare.mjs` | **Pure verdict core** + fenced impure paired-run shell. 44 tests. |
| `lib/vision-ab-compare.test.mjs` | Reference-value tests for every verdict branch. |
| `bench-vision-ocr-ab.mjs` | **CLI orchestrator** — the file the seam references. |

### Pure verdict core (`vision-ab-compare.mjs`)
- `perPrintF1` · `summarizeModelRun` · `rankModels` · `pairedF1Delta` · `determineWinner`
  · `buildUpgradeRecommendation` — all I/O-free, deterministic (Date/random quarantined
  in the impure shell), total (NaN/Infinity/null/empty → 0/null, never throws).
- **Three independent honesty guards** make noise→upgrade structurally hard:
  1. **aggregate margin** — candidate must beat baseline micro-F1 by `DEFAULT_F1_MARGIN` (0.02).
  2. **paired win-rate** — must also win ≥ `DEFAULT_MIN_WIN_RATE` (0.5) of the *same* prints
     (within-subjects, so a single lucky print can't carry it).
  3. **coverage floor** — must OCR ≥ `DEFAULT_MIN_COVERAGE` (0.5) of prints (F1 on a partial
     set is not comparable to a full-coverage baseline).
- Verdict is `upgrade` | `stay` | `inconclusive`. **`stay` on the baseline is the
  zero-regression default**; `inconclusive` only when the baseline never ran (no floor).
- `buildUpgradeRecommendation` plugs straight into `vision-model-select` (recommends
  adding the winner to `BIG_VISION_PREFERENCE` / `PRISM_VISION_MODEL`) and refuses to
  recommend a thinking-trap tag the seam would silently skip.

### CLI (`bench-vision-ocr-ab.mjs`)
- **Paired design**: generates N synthetic prints ONCE (seeded → byte-identical images +
  perfect ground truth via `lib/synthetic-print-gen.py`), runs every model over the SAME
  prints. Reuses `ollama-vision-extract-lib` (prompt/request/parse) + `dimension-set-score`
  (scoring) — same primitives as `ocr-closed-loop.mjs`, run across N models instead of 1.
- **Warm-first**: each model gets one discarded OCR call before the timed prints, so a
  fresh big model's cold-load is not charged as a per-print timeout (fail-SAFE: a warm
  failure only *under*-credits a candidate, surfaced loudly, never a false upgrade).
- **Availability-gated** (only pulled models run, via ollama `/api/tags`); auto-discovers
  pulled vision models; excludes thinking-traps; baseline always included (needs a floor).
- R12 honesty: per-model coverage, `genFailures`, `warmFailures`, synthetic-capability
  caveat in both the JSON report and the console; exit 2 if nothing OCR'd.

## Usage
```bash
node scripts/bench-vision-ocr-ab.mjs \
  --models qwen3-vl:8b-instruct,qwen2.5vl:32b --count 6 --difficulty easy \
  --report state/shared/vision-ocr-ab-report.json
# verdict + recommendation printed; report JSON written atomically.
```
`--difficulty hard` adds tolerances/GD&T/noise. Knobs: `--margin --min-win-rate
--min-coverage --max-time-sec --no-warm --baseline`.

## Synergy — why building the gate HERE serves every domain galaxy
Blueprint OCR is the upstream feeder for **delta/cad** (print→CAD), **kilo/cam**
(print→program), **charlie/quote** (blueprint→quote), and **india/training** (training
pairs). They all route through the *same* vision-OCR chokepoint (`cadDispatcher:
cad_pdf_blueprint_extract`, etc.) whose model is chosen by `vision-model-select`.
Improving the model **at that seam is a build-once win that lifts every consumer at
once** — which is exactly why the empirical gate belongs at the seam, not per-galaxy.

## Status / known blocker (R12, 2026-06-03)
- Harness **built + proven**: 44 unit tests green; 2 independent reviewers PASS, 0 P0/P1
  (per-file scrutiny gate), each reviewer's P1/P2 findings fixed in-session
  (workdir-collision, warm-failure guard, coverage floor, thinking-trap guard,
  envOverride, main-guard, difficulty validation).
- **Empirical run blocked by live ollama contention**: on the shared Blackwell, loading a
  vision model for OCR exceeded a 240 s ceiling while the 26-slot fleet actively served
  the resident `qwen2.5-coder:7b` through the same ollama queue. The bigger same-family
  test (`qwen2.5vl:32b`) also could not complete — the pull stalled (network 387 KB/s,
  died at 8 %). **Run when the fleet is idle and/or after the 32B finishes pulling**; the
  seam auto-includes the 32B once it is in the ollama store.
- The likely real Blackwell OCR win beyond model size is **ollama config** to keep a
  vision model resident alongside the coder (`OLLAMA_MAX_LOADED_MODELS`/`NUM_PARALLEL`)
  so OCR never pays a cold-load — an operator/fleet-level change (not taken autonomously).

## See also
- [[blueprint-vision-knowledge-index]] · `scripts/lib/vision-model-select.mjs`
- `scripts/ocr-closed-loop.mjs` (single-model synthetic loop) · `scripts/run-ocr-benchmark.mjs` (U-TDP04 corpus benchmark)
- Memory: [[reference_xray_vision_ab_benchmark_2026_06_03]]
