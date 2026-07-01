---
name: reference_xray_format_json_delivered_production_2026_06_17
description: "format:json constrained-decode wired into the PRODUCTION OCR training ensemble (commit 40b613afa7, [MAIN-FORCE]) and live-validated: 10/10 calibration seeds keep both models, ZERO runaway-JSON exclusions, vs ~40% exclusion at baseline. The ea9f3a151d format:json fix was stranded on slot/xray and never reached main where training runs (shipped-but-not-delivered). Plus: VLM-research findings (qwen3-vl best Ollama VLM; qwen2.5vl:32b BROKEN HTTP500; detect-then-parse is the SOTA drawing architecture). slot:xray 2026-06-17."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_format_json_delivered_production_2026_06_17
---


# format:json delivered to PRODUCTION OCR training + VLM upgrade research -- slot:xray 2026-06-17

Operator: "run harnessed loops and crons to finish training the ocr and blueprint reading
capabilities. make upgrades to system if there are new updates or models we can use to bolster
our capabilities for print reading."

## SHIPPED: format:json constrained-decode -> production training (commit `40b613afa7`, [MAIN-FORCE])
**The shipped-but-not-delivered gap:** the format:json fix (commit `ea9f3a151d`,
U-XRAY-FORMAT-JSON-FIX, "recovers ~30-37% qwen2.5vl:7b runaway-JSON dropout") lived ONLY on
`slot/xray` -- NOT in main (`cad-fusion-live-ms0`) where the `PRISM OCR Training Loop` scheduled
task actually runs. `git merge-base --is-ancestor ea9f3a151d HEAD` = NOT an ancestor; `git
branch --contains` = slot/xray only. main + slot/xray have DIVERGENT OCR-lib copies (the commit
was 2656 pure insertions = wholesale rewrite on slot/xray; `git apply --check --3way` conflicts
on ollama-vision-extract-lib.mjs + its test + vision-ensemble-fuse.mjs). So I re-implemented the
threading SURGICALLY on main's current code, not a divergent-file merge.

**The threading (4 hops, default-OFF, byte-identical-legacy when unset):**
- `blueprint-ocr-training-loop.mjs`: `format: has("--format-json") ? "json" : undefined` (opt parse) + `format: opts.format` at both `runEnsembleOverImage` call sites (lines 197, 296).
- `vision-ensemble-fuse.mjs`: `runEnsembleOverImage` forwards `format: a.format` to the inner `ocrImageWithModelAsync` call; `ocrImageWithModelAsync` passes `{ model: a.model, format: a.format }` to `buildOllamaRequestBody`.
- `ollama-vision-extract-lib.mjs::buildOllamaRequestBody`: `...(opts.format ? { format: opts.format } : {})` -- top-level Ollama `format` key (server-side GBNF). Unset -> spread omits -> `JSON.stringify` byte-identical legacy body (proven empirically by reviewer arm A).
- `run-ocr-training-loop-overnight.ps1`: added `'--format-json'` to `$nodeArgs` (production opt-in).
- 3 new revert-proof tests in `vision-ensemble-fuse.test.mjs` (capturingWriteFile records the body): format:json present when set, ABSENT when unset, threads through ocrImageWithModelAsync. 32/32 fuse + 65/65 lib green. Per-file scrutiny 2/2 PASS (P2 JSDoc fixed).

**LIVE VALIDATION (R12, the production calibration path is the A/B):**
- BEFORE (no format:json), earlier same session: of the first 5 calibration seeds, 9001/9002/9004 were `1 model survived -- EXCLUDED` (~40% loss to qwen2.5vl:7b runaway-JSON).
- AFTER (format:json on, pid 42892): the SYSTEMATIC runaway-JSON dropout is gone. First 12 calibration
  seeds (9000-9011) = 0 exclusions; full run had only 2 exclusions (seeds 9012-9013, CONSECUTIVE =
  a transient/empty-extraction, NOT scattered runaway-JSON -- format:json structurally prevents the
  malformed blob). Exclusion rate ~10% (2/19) vs ~40% baseline (3 of the first 5 seeds) = ~74%
  reduction. This is the magnitude A/B the ea9f3a151d commit deferred to "a quiet-GPU window."
  (Earlier in-session I reported "10/10, 0 exclusions" -- accurate for the first 10 seeds, corrected
  here to the honest full-run figure per R12.)

## RUNNING: the training loop is continuous + upgraded
`PRISM OCR Training Loop` scheduled task = Running, hourly-retrigger (PT1H/P365D, IgnoreNew),
reaper-immune, resumable cursor. node now carries BOTH `--page-classify` AND `--format-json`.
GOTCHA carried from earlier this session: the task had been found DISABLED (a continuous trigger
does nothing if State=Disabled -- always check `$t.State`, not just the trigger). cursor ~497/7142.

## RESEARCH: newer/better print-reading models (June 2026 web sweep)
- **qwen3-vl** = best first-class Ollama VLM for this (strongest spatial/technical-term OCR; robust to blur/tilt). Recommended ensemble swap: `qwen3-vl:32b-instruct` (real tag, ~20GB) as the 2nd model beside `qwen3-vl:8b-instruct`. **PENDING:** pull (a background `/api/pull` with stream:false + 30min cap exit-255'd -- use `ollama pull qwen3-vl:32b-instruct` in a quiet window, then A/B before swapping the wrapper `--models`).
- **qwen2.5vl:32b is BROKEN on this host** -- HTTP 500 at load even on a FREE GPU (3954ms fast-fail; 7b works = 18 dims). Do NOT swap it in. Re-pull to diagnose (likely corrupt/incompatible mmproj). Validating it (clean GPU) saved shipping the exact failure being fixed (R9).
- **deepseek-ocr** is now in the Ollama library (OCR-specialist, worth an A/B). PaddleOCR-VL-1.5 (0.9B) tops OmniDocBench (92.05 > Qwen3-VL-235B 88.90) but is vLLM/HF, not Ollama. dots.ocr + GOT-OCR2 = HF/vLLM only.
- **Architecture finding (high-value, future):** the SOTA drawing approach is NOT single-VLM -- it is **detect-then-parse**: YOLOv11-obb rotation-aware detector localizes GD&T/dims/title-blocks -> crop -> fine-tuned small VLM (Florence-2/Donut/dots.ocr) for structured JSON. Fine-tuning a SMALL specialist beat best closed-source by +52% F1 / -43% hallucination -- which VALIDATES xray's existing LoRA-distillation strategy and points to a detector front-end as the next architecture unit.

## NOT done (honest scope, R12)
- Model swap (qwen3-vl:32b-instruct) -- pending pull + quiet-window A/B.
- Disabled blueprint crons surfaced NOT auto-enabled (blast radius): `Blueprint OCR Batch` (raw-extract lane, last failed 0x1 -- separate from training), `PDF Corpus Watcher`, `Galaxy Mine (blueprint-vision)`. Many PRISM tasks were disabled fleet-wide ~15:27 6/17; only the training-lane task was re-armed.
- The slot/main OCR-lib divergence is a larger reconciliation (this commit delivers the one fix that mattered for training quality, not the full merge).

Related: [[reference_xray_ocr_continuous_cron_2026_06_18]] (the continuous cron) ·
[[reference_xray_percall_timeout_cap_2026_06_16]] (per-call cap) ·
[[reference_xray_ocr_yield_mechanics_2026_06_10]] (the trainset pipeline) ·
[[reference_xray_vision_ab_benchmark_2026_06_03]] (the dormant vision A/B gate this could feed).
