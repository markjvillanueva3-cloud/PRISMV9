---
name: reference_xray_vision_ab_benchmark_2026_06_03
description: "Blackwell vision-OCR A/B benchmark harness (xray) — the empirical gate vision-model-select referenced but never had; built+proven, empirical run blocked by ollama fleet contention"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.074Z
aliases: reference_xray_vision_ab_benchmark_2026_06_03
---


xray built the **vision-OCR A/B benchmark** — the empirical gate `scripts/lib/vision-model-select.mjs`
(U-XRAY-VISION-PROFILE) referenced as `bench-vision-ocr-ab.mjs` but which never existed, leaving the
Blackwell vision-model upgrade path dormant (a claim with no evidence).

**Shipped (3 files, all under `scripts/`):**
- `lib/vision-ab-compare.mjs` — pure verdict core (`perPrintF1`/`summarizeModelRun`/`rankModels`/`pairedF1Delta`/`determineWinner`/`buildUpgradeRecommendation`) + fenced impure paired-run shell. 3 honesty guards (aggregate F1 margin 0.02 + paired win-rate 0.5 + coverage floor 0.5) make noise→upgrade structurally hard; `stay` on baseline is the zero-regression default. 44 tests.
- `lib/vision-ab-compare.test.mjs` — reference-value tests, every verdict branch.
- `bench-vision-ocr-ab.mjs` — CLI: paired synthetic prints (one set, all models), warm-first, availability-gated, reuses ollama-vision-extract-lib + dimension-set-score + synthetic-print-gen.py (same primitives as `ocr-closed-loop.mjs`, across N models). 2-reviewer per-file scrutiny PASS 0 P0/P1; all reviewer P1/P2 fixed in-session (workdir-pid-scope, warm-failure guard, coverage floor, thinking-trap guard, envOverride pass, main-guard, difficulty validation).

**Repro:** `node scripts/bench-vision-ocr-ab.mjs --models qwen3-vl:8b-instruct,<candidate> --count 6 --report state/shared/vision-ocr-ab-report.json`

**Why it matters:** blueprint OCR is the upstream feeder for delta/cad, kilo/cam, charlie/quote, india/training — all route through the SAME vision-OCR chokepoint chosen by vision-model-select. Improving the model AT that seam is a build-once win that lifts every consumer; the gate belongs at the seam, not per-galaxy. That is the answer to "synergize with all domain galaxies."

**BLOCKER (R12, honest):** the empirical run did NOT complete — across 3 attempts (300s/240s warm, 600s no-warm) a vision-model cold-load+inference exceeded the timeout under live 26-slot fleet contention on the shared ollama queue (fleet actively serving resident `qwen2.5-coder:7b`). The bigger same-family test `qwen2.5vl:32b` also could not be pulled — network collapsed (387 KB/s, died at 8%/1.8 of 21 GB). `ocr-closed-loop.mjs` historically ran OCR ~49s warm when the fleet was quiet → blocker is environmental/transient, not the code. **Next step:** run when the fleet is idle (e.g. overnight) and/or after the 32B pull completes (the seam auto-includes it once in the ollama store). Likely deeper Blackwell OCR win = ollama `OLLAMA_MAX_LOADED_MODELS`/`NUM_PARALLEL` config to keep a vision model resident alongside the coder so OCR never pays a cold-load (operator/fleet-level, not taken autonomously).

**Gated:** the full print→cad→gcode→cad generation training (the goal-clear condition) remains gated on delta getting the CAD-generation pipeline working, per the work order.

Wiki: [[vision-ocr-ab-benchmark]]. Related: [[blueprint-vision-knowledge-index]], [[reference_xray_confidence_thresholds_reconciled]].
