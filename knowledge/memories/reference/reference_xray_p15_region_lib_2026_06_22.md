---
name: reference_xray_p15_region_lib_2026_06_22
description: P1.5 step 1 shipped -- pure region-classifier-lib (layout-aware blueprint region segmentation + data-loss-safe routing); next = step 2 glue (slot:xray 2026-06-22)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_p15_region_lib_2026_06_22
---


**U-XRAY-P15-REGION-LIB** (commit `0a41c90a4c`, branch `cad-fusion-live-ms0`, slot:xray, 2026-06-22). 2 files, 663 insertions. The first build unit of P1.5 (layout-aware region routing) from the blueprint-reading-improvement-backlog-2026-06-19.

**What it is:** `scripts/lib/region-classifier-lib.mjs` -- the PURE, GPU-free core that segments a blueprint page into layout regions `{bbox,region_kind,confidence}` and routes each to an extractor. Mirrors the shipped `page-classifier-lib.mjs` pure-lib + thin-glue split (R8/R11). Exports: `buildRegionSegmentPrompt`, `buildRegionSegmentRequestBody`, `validateBbox`, `parseRegionSegmentResponse`, `routeRegion`, `decideRegionRouting` + `REGION_KINDS`/`EXTRACTORS`/floor constants.

**Routing map (recall-first):** drawing_view->vlm_ocr, dimension_table->table_parser, title_block->field_parser, bom/notes->light, other/unknown->vlm_ocr. Every region WITH a bbox extracts something; the only true drop is the lossless full-page fallback.

**LOAD-BEARING contract (the design's whole point):** DATA-LOSS-SAFE, inverse of the page classifier. `decideRegionRouting` returns `route:"full_page"` whenever the segmentation is untrusted -- parse-fail / empty / confidence floor not strictly positive / fewer than `minTrustedRegions` valid regions at/above the floor. Region routing can ONLY ADD recall on top of the proven full-page OCR floor; it must never replace it with a worse box-cropped subset (the VLM's bbox accuracy is unproven). bbox is NORMALIZED fractions [0,1] (resolution-independent; the glue scales to pixels). Each region carries a stable `id` (r0/r1/...) for the step-2 crop+merge seam.

**Gates:** 22 reference-value/invariant tests (happy + >=3 failure + >=2 adversarial; the data-loss boundaries are test-pinned -- a test FAILS if the lib starts routing untrusted box-crops). ASCII-clean, pure (no fs/fetch). Per-file 3-agent scrutiny PASS (code-analyzer + test-review-agent + reviewer; 0 P0/P1; 2 P2 glue-seam notes, the `id` field applied inline per R16).

**NEXT (P1.5 remaining, dependency order):**
1. **Step 2 = `scripts/region-classify.mjs` glue** -- render page -> segment (curl->Ollama qwen3-vl:8b) -> crop each region via `scripts/lib/crop-image-tiles.py` (multiply fractional bbox by page-pixel dims, reshape to `{id,x,y,w,h}`) -> per-region extract -> merge dims via `scripts/lib/vision-tiling-lib.mjs mergeTiledDimensions` (pass region rects as `opts.tiles` for overlap-aware dedupe). MUST also run a full-page floor pass and UNION (recall can only increase).
2. **Step 3** = opt-in `--region-route` wiring into `blueprint-ocr-training-loop.mjs` + `validate-perfect-parts.mjs` (parallel to `--tile`).
3. **Validate** = measured recall lift vs the 0.43 full-page baseline (part 05850, 3-page lathe scan) -- decide region-routing vs tiling by the NUMBER, not "looks better".

Related: [[reference_post_ship_blueprint-vision-ocr-u-xray-p15-design]] · [[reference_xray_perfect_parts_gt_source_2026_06_22]] · the page-classifier sibling `scripts/lib/page-classifier-lib.mjs`.
