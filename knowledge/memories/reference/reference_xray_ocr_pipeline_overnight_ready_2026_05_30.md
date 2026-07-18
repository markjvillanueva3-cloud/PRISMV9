---
name: reference_xray_ocr_pipeline_overnight_ready_2026_05_30
description: blueprint-vision OCR pipeline — 5 of 6 pre-test blockers shipped; overnight batch armed; live validation gated on a quiet host
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.275Z
aliases: reference_xray_ocr_pipeline_overnight_ready_2026_05_30
---


**Blueprint-vision OCR is built + ready for an overnight unattended run** (slot:xray, 2026-05-30/31). Roadmap: `state/shared/specs/BLUEPRINT-VISION-OCR-UPGRADE-ROADMAP-2026-05-30.md` (verified by the xray-ocr-upgrade-hunt workflow: 14 upgrades, 6 pre-test blockers). 5 of 6 blockers shipped + 2-of-2 scrutiny each:

- **#3 rich multi-zone schema** + **#4 code-side unit conversion** — `8e30251534`. `scripts/lib/ollama-vision-extract-lib.mjs`: parseVisionResponse emits title_block + dimensions + gdt + notes + profiles + part_bounds + thickness + surface_finishes; `convertToMm` (inch→mm in CODE, unresolved units FLAGGED not silently assumed; the VLM ignores in-prompt conversion); `--assume-units in` for JM. 50/50 tests.
- **#1 multi-page** — `6f18162089`. Runner rendered page 0 only (76% page loss); now loops all pages (`selectPages` + `getPageCount` via `pdf-to-png.py --count`), one extraction/page. 8/8.
- **#2 scan preprocessing** — `43203e2b71`+`f8e08d0538`+`8bc846a5ba`. `pdf-to-png.py --grayscale` (csGRAY) / `--preprocess` (Otsu binarize + thin-line-safe connected-component despeckle; R12 degrade-to-grayscale if cv2 absent) / `--deskew` (conservative ≤10°). opencv-python-headless 4.13.0 + numpy 2.4.6 installed. 14/14.
- **#6 batch runner** — `a68b1f7048`+`ef100e4303`. `scripts/batch-ollama-vision-extract.mjs`: GPU-claim (unload coder→warm VL num_ctx 8192→confirm size_vram>0, fail-soft) + checkpoint/resume by source-PDF SHA-256 + `--time-budget-min` + per-print isolation (spawns the single runner, R8) + `--grayscale/--preprocess` (buildPrintArgs forwards correctly — a reviewer caught a silent --grayscale drop, fixed+tested) + summary JSON. 18/18. Worklist gen `scripts/build-blueprint-ocr-worklist.mjs` (`--scan-dir` walks JM tree) 7/7 → `state/shared/blueprint-ocr-worklist-pilot.txt` (400 real prints). Installer `.claude/helpers/install-blueprint-ocr-batch-task.ps1` (one-shot SYSTEM scheduled task).
- **render-timeout fix** `ff51fadd78`: PDF render spawn 60s→120s (PRISM_RENDER_TIMEOUT_MS) — host saturation starved the render at 60s.
- **morning-review digest** `beb15116b6` (2-of-2 PASS): `scripts/blueprint-ocr-review.mjs` — GPU-free consumer of the overnight batch. Reads `blueprint-accuracy-events.jsonl` outcome_records → ok/coverage-rate, confidence bands, avg dims/print, unit-resolved rate, datum-deficient GD&T, punch-lists (low-conf<0.70 / no-dims / unresolved-unit) + samples. `aggregateEvents` pure, `confidenceBand` exported, 9/9 tests. **Morning step:** `node scripts/blueprint-ocr-review.mjs --summary <batch-summary> --samples 5`. P2 notes logged (not blocking): `ok_rate` is a coverage proxy not accuracy (both reviewers flagged — consider `dim_coverage_rate` rename); stream-read-error swallowed as empty (advisory digest, acceptable).

**#5 model bake-off = DEFERRED — but the SCORER ALREADY EXISTS (R8, do NOT rebuild).** `GroundTruthValidationEngine` is the conformal scorer: `extractionMatches()` (relative-tolerance numeric match, line ~861) + per-dim-tolerance regression scorer (`perDimTolerancePct`, lines ~716-748) + `conformalCoverage` (line ~880). The remaining #5 gaps are NOT scoring: (a) a **CAD-label materializer** — parse ~14 DXF (DIMENSION entities) + ~63 STEP (AP242 PMI / bbox+hole-dia) → ground-truth dim triples joined to the supervised pairs; (b) the **live VLM run** (GPU-gated). Best built NEXT SESSION paired with the live run, **wiring to GroundTruthValidationEngine** (not a new harness), and informed by tonight's batch results (if qwen2.5vl:7b's overnight output is strong the bake-off may be moot). qwen2.5vl:7b is the proven default. Not blocking the overnight corpus run.

**THE GATE (unchanged + now decisive):** live validation + the batch are blocked by **host saturation** — with the full chat fleet running, even the PDF render starves (>60s) and qwen2.5vl is evicted to CPU within seconds (4-5min/page → timeout). Proven 8+ times. Programmatic GPU-claim is NOT enough. **The fix is an idle host: close the other chats.** OVERNIGHT RUNBOOK (operator, after closing peer chats):
```
node H:/prism/scripts/batch-ollama-vision-extract.mjs --worklist H:/prism/state/shared/blueprint-ocr-worklist-pilot.txt --grayscale --assume-units in --time-budget-min 420 --summary H:/prism/state/shared/blueprint-ocr-batch-summary.json
```
(leave the terminal open; ~400 prints × ~75s ≈ resumes via SHA checkpoint across nights). Robust alt: the scheduled-task installer (elevated PS, survives closing all windows). Morning review: the summary JSON + `state/shared/blueprint-accuracy-events.jsonl` (one outcome_record per page). See [[reference_xray_ocr_gateway_unblocked_2026_05_29]] · [[reference_xray_training_corpus_state_2026_05_29]].
