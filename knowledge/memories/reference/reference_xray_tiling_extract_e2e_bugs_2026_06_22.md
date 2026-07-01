---
name: reference_xray_tiling_extract_e2e_bugs_2026_06_22
description: P0.2 tiling end-to-end (crop->ensemble-OCR->merge) shipped + live-validated (+3 dim recall lift); 4 bugs caught (3 by the live E2E that the mock hid, 1 by scrutiny) -- fused-shape mismatch, models_ok=0 false-success, 32b empty-trap, baseline parity. xray commit d012c5e0a5
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.278Z
aliases: reference_xray_tiling_extract_e2e_bugs_2026_06_22
---


**U-XRAY-TILING-EXTRACT (slot:xray, 2026-06-22, commit `d012c5e0a5`).** Wires the P0.2 tiling pure-core ([[reference_xray_tiling_clique_not_unionfind_2026_06_22]]) into a real pipeline: `scripts/vision-tiling-extract.mjs` (`extractWithTiling(opts, deps)` pure over injectable `readImageSize`/`cropTiles`/`runEnsemble`) + `scripts/lib/crop-image-tiles.py` (one PIL process crops all tiles). Split page PNG -> overlapping tiles -> crop each -> OCR each via `runEnsembleOverImage` -> `mergeTiledDimensions`.

**R15 live E2E** (real 3400x2200 print `extrude_punch.png`, qwen3-vl:8b-instruct): TILING **11 dims vs full-page BASELINE 8** = **+3 NEW dims the single pass missed, 0 dropped**. The dense-page recall lever works. Artifact `state/shared/ocr-training-loop/tiling-e2e-extrude_punch.json`.

**The headline lesson: a mock that matches the WRONG shape hides the integration bug; only the live E2E caught it (R15 "validate on live data").** The unit tests passed with a mock returning the `extractDimension` shape, but `runEnsembleOverImage` (vision-ensemble-fuse) actually emits a DIFFERENT shape -- and the merge silently mis-handled it. The "pure-core + injected-readers MUST ship a real-data E2E" rule exists precisely for this.

**4 bugs (3 caught by the live E2E, 1 by 2-arm scrutiny), all fixed + regression-tested:**
1. **Fused-ensemble shape != extractDimension shape.** `fuseEnsemble` emits `{type, value_mm, raw_texts:[], agreement_confidence}`; `extractDimension` emits `{type, nominal_mm, raw_text:string, confidence}`. My merge keyed on `nominal_mm` (always null for fused) -> fell back to empty raw -> over-collapsed 5 distinct dims into 1-per-type. Fix: shape-tolerant accessors `dimValueMm`/`dimRawText`/`dimConfidence` in `vision-tiling-lib.mjs` reading BOTH shapes. **Lesson: when a function consumes "a dimension", enumerate EVERY producer's actual field names -- two PRISM dim shapes exist (extractDimension vs fuseEnsemble); a consumer must read both or be told which.**
2. **`runEnsembleOverImage` returns top-level `error:null` even when `models_ok=0`** (every model failed, e.g. an "empty response"). My orchestrator counted those tiles as OCR-ok. Fix: gate success on `models_ok > 0`. **Lesson: a wrapper's top-level `error` can be null while all its inner units failed -- check the success COUNT, not just the error field (R12).**
3. **The 32b qwen + the plain `qwen3-vl:8b` thinking variant return EMPTY** on these prints (the backlog's documented 32b empty-output / thinking-trap). The reliable model is **`qwen3-vl:8b-instruct`** (the lib `DEFAULT_VISION_MODEL`). The CLI defaults to it.
4. **(scrutiny P1, parity bug) the BASELINE path had the SAME `models_ok=0` trap.** I fixed it on the tile loop but not the symmetric baseline call -- a silently-failed baseline (0 dims, error=null) made `computeLift` report `newInTiled = ALL tiled dims`, a FABRICATED recall-lift headline (the tool fabricating its own success evidence). Fix: `baseline.ok` + `lift.baselineFailed` flag it; the CLI refuses to print a lift from a failed baseline. **Lesson: when you fix an accounting trap on one branch, grep for every SYMMETRIC branch with the same upstream contract.**

**Honest open caveat (R12, documented, NOT fixed):** a few tiles emit UNCONVERTED units -- `Ø.94` as `value_mm=0.940` (read as mm) vs the correct `23.876` (.94 inch -> mm). Root: tiles that do NOT contain the title block lose the global drawing-units context, so the per-tile VLM guesses the unit (and `assumeUnits` is only a fallback, overridden by a per-dim `unit` guess). The merge keeps both (recall-first) rather than collapse same-raw different-value dims. **Follow-up: make the global units AUTHORITATIVE for tiles (force-override per-tile unit guesses), since tiling structurally strips the title block from most tiles.**

37 tests (24 lib + 13 orchestrator). Both per-file scrutiny arms PASS after the P1 fix. Sibling: [[reference_xray_tiling_clique_not_unionfind_2026_06_22]]. Backlog: [[blueprint-reading-improvement-backlog-2026-06-19]] (P0.2 was the highest-leverage OPEN recall lever).
