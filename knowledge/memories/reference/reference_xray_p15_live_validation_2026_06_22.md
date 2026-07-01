---
name: reference_xray_p15_live_validation_2026_06_22
description: "P1.5 region-routing LIVE E2E validation -- on a dense 3400x2200 blueprint, region routing extracted 28 dims where the full-page pass got 0 (slot:xray 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_p15_live_validation_2026_06_22
---


**P1.5 region-routing LIVE END-TO-END validation** (slot:xray, 2026-06-22). After building the full chain (region-classifier-lib + region-glue-lib + region-classify.mjs -- [[reference_xray_p15_region_lib_2026_06_22]], [[reference_xray_p15_glue_lib_2026_06_22]]), ran the complete live glue on a real blueprint to prove it on live data with numbers (R15 step 3).

**Command:** `node scripts/region-classify.mjs --image "<EXTRUDE PUNCH Drawing p0>.png" --model qwen3-vl:8b-instruct --force-units in --json` (the real curl->Ollama segment + crop-image-tiles.py + per-region ensemble OCR + full-page floor + mergeRegionResults union).

**Result (REAL numbers, R12-honest):**
- page 3400x2200 (large/dense single drawing page)
- `route=region_route`, decision: 4 trusted regions >= 0.7
- **regions_ocr_ok=4, regions_ocr_failed=0, dimension_count=28**
- **full_page_count=0** (the single full-page pass extracted ZERO dims; `models_ok=0` -> `baselineFailed=true` honestly flagged)
- lift: newInTiled=26 distinct, but `baselineFailed=true` so the lift is NOT a clean comparison (the baseline didn't successfully run) -- the glue correctly did NOT fabricate a "26 new dims" headline.

**What this validates:**
1. The full live region-routing chain works end-to-end on a real blueprint: segment -> 4 regions -> crop -> per-region OCR -> merge -> 28 dims.
2. **The P1.5 thesis is empirically confirmed:** on a dense/large page (3400x2200) the single full-page VLM pass FAILS (0 dims -- the documented dense-page / "skipped-ensemble-failed" failure mode: a huge image overflows the single pass), while region routing -- cropping into 4 smaller in-range regions -- RECOVERS 28 dims. This is exactly the recall leak P1.5 targets.
3. The data-loss-safe + R12 flags work: `baselineFailed` flagged, no fabricated lift.

**HONEST caveats / next (R12):**
- This is NOT yet the formal recall-vs-0.43 comparison (that is part 05850, a 3-page lathe scan, with the CNC-program answer key). This run had NO clean full-page baseline (the floor failed at 0), so it shows "region-route 28 vs full-page 0", not a recall RATE vs ground truth.
- NEXT: (a) step 3 = opt-in `--region-route` wiring into `blueprint-ocr-training-loop.mjs` + `validate-perfect-parts.mjs`; (b) run validate-perfect-parts `--region-route` on 05850 (where the GT answer key exists) for the formal recall number; (c) optionally investigate why the 3400x2200 full-page pass returns 0 (likely image-size/num_ctx overflow -- a separate full-page-pass improvement, orthogonal to region routing which already rescues it).
- The 28 region dims are unverified against a GT answer key on THIS print (no per-print GT loaded) -- the count proves extraction happened + region routing >> failed-full-page, not per-dim correctness.
