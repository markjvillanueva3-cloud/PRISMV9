---
name: reference_xray_format_json_fix_2026_06_11
description: "U-XRAY-FORMAT-JSON-FIX shipped+live-validated — optional Ollama format:json constrained decode recovers qwen2.5vl:7b runaway-JSON dropout in the OCR pipeline"
type: reference
galaxy: blueprint-vision
source: prism-memory
synced: 2026-06-27T20:30:47.273Z
aliases: reference_xray_format_json_fix_2026_06_11
---


**U-XRAY-FORMAT-JSON-FIX SHIPPED + LIVE-VALIDATED** (slot:xray, 2026-06-11, /goal /loop). Commit `ea9f3a151d` on `slot/xray`. The top-ROI lever from the 2026-06-10 yield-mechanics finding is now built.

**What:** threaded an OPTIONAL, **DEFAULT-OFF** Ollama `format` param (string `"json"` or a JSON-schema object) through the vision-extraction chain so constrained JSON decoding can be opted in:
- `scripts/lib/ollama-vision-extract-lib.mjs` `buildOllamaRequestBody()` — `format` added as a **top-level** field (sibling of stream/think, NEVER inside `options{}` — Ollama ignores it there) via `...(opts.format ? { format: opts.format } : {})`.
- `scripts/run-ollama-vision-extract.mjs` — `--format-json` CLI flag + `parseArgs` (now exported) + `callOllamaVision` 6th param.
- `scripts/lib/vision-ensemble-fuse.mjs` — `ocrImageWithModelAsync` + `runEnsembleOverImage` thread `format`.
- DEFAULT-OFF invariant: unset -> spread omits the key -> **byte-identical legacy body** (mutation-tested).

**Why it works:** qwen2.5vl:7b occasionally free-generates a runaway repetitive blob that hits `num_predict:4096` mid-structure -> malformed JSON -> `repairTruncatedJson` can't save it -> whole print dropped (~30-37% of prints). Grammar-constrained decoding structurally cannot emit the runaway blob.

**Live validation (real JM print, qwen2.5vl:7b, same image A/B):** format OFF -> `parse fail: Unterminated fractional number line 310 col 23`, whole print **DROPPED** (21960ms). format ON -> **ok, 12 dimensions extracted** (18758ms, FASTER). Clean dropped->recovered reproduction on real data. Corpus-wide magnitude A/B = separate `U-XRAY-BENCH-AB-RUN` (needs quiet GPU window).

**Tests:** 10 new (111/111 green) — happy / falsy-omit / schema-object / byte-identical-legacy across all 3 sites. Per-file scrutiny 2/2 PASS (one reviewer mutation-tested every layer).

**Branch note:** built via checkout-forward (slot/xray is 874 behind main; domain code lives on `cad-fusion-live-ms0`). Deps `dimension-set-score.mjs` + `pdf-to-png.py` checkout-forwarded. Per [[feedback_xray_commit_to_slot_branch]] — never rebase the gap.

**Retention anchor:** full domain regain in `state/shared/specs/XRAY-REGAIN-LEDGER-2026-06-11.md` (committed `9e33eefcdb`): 64 shipped / 17 open / 3 unwired / 10 dormant + ROI queue. Next ROI: U-XRAY-BENCH-AB-RUN (run the dormant bench A/B), U-XRAY-BPA-CONSUMER-WIRE (schedule accuracy consumer), U-XRAY-CALIB-EXPAND, U-XRAY-CLOSEOUT-DEBT (22 silent-close-out units). See [[reference_xray_ocr_yield_mechanics_2026_06_10]].
