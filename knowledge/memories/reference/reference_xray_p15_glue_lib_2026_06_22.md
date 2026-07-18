---
name: reference_xray_p15_glue_lib_2026_06_22
description: P1.5 step 2 core shipped -- pure region-glue-lib (fraction->pixel scale + recall-first full-page union via a whole-page overlap tile); next = live region-classify.mjs (slot:xray 2026-06-22)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.276Z
aliases: reference_xray_p15_glue_lib_2026_06_22
---


**U-XRAY-P15-REGION-GLUE-LIB** (commit on `cad-fusion-live-ms0`, slot:xray, 2026-06-22). 2 files, 297 insertions. Step-2 verifiable core of P1.5 region routing (after step-1 `region-classifier-lib`, [[reference_xray_p15_region_lib_2026_06_22]]).

**What it is:** `scripts/lib/region-glue-lib.mjs` -- the PURE (no fs/fetch/subprocess) orchestration core that turns the `decideRegionRouting` output into the concrete inputs the live glue needs. Exports: `scaleBboxToPixels`, `buildRegionCropSpecs`, `buildMergeTiles`, `mergeRegionResults`, `FULL_PAGE_TILE_ID`.

**The critical seam (scrutiny P2.2):** `region-classifier-lib` emits NORMALIZED fractional bboxes [0,1]; `crop-image-tiles.py` needs INTEGER PIXEL `{id,x,y,w,h}` (`im.crop((x,y,x+w,y+h))`). `scaleBboxToPixels` does the conversion + clamps to page; a degenerate (<1px) result returns null so the caller full-page-floors that region (a missed scaling crops a ~1px box = silent recall loss).

**The non-obvious correctness insight (recall-first union):** the LOAD-BEARING contract is region routing can only ADD recall on the full-page floor, never replace it. `mergeRegionResults` always includes the full-page floor pass as a participating perTile entry (keyed `full_page`) and delegates to the proven `vision-tiling-lib mergeTiledDimensions` (R8 reuse, not reinvent). The trick: `buildMergeTiles` injects a WHOLE-PAGE `full_page` overlap tile `[0,0,W,H]` so the merge's overlap-topology collapses a region+full-page DUPLICATE (no double-count), WHILE the merge's NON-TRANSITIVE greedy-clique guard keeps two distinct same-valued features in non-overlapping regions SEPARATE (full_page corroborates one clique only; the other survives). Net: full-page-only dim never lost, region-only dim added, dup de-duped, distinct features not over-merged.

**Gates:** 12 reference-value tests incl. a LIVE integration through the real `mergeTiledDimensions` (collapse + full-page-only-kept + region-only-added + distinct-features-separate, concrete counts) -- the union would FAIL the test if it silently dropped a full-page dim or over-merged. ASCII-clean, pure. Per-file 2-arm scrutiny PASS (code-analyzer + reviewer, 0 P0/P1; one expected P2: unwired until the step-2b glue lands -- R13 order).

**NEXT = step 2b** (live): `scripts/region-classify.mjs` -- render -> segment (Ollama qwen3-vl:8b) -> decideRegionRouting -> (full_page: full-page OCR | region_route: buildRegionCropSpecs -> crop-image-tiles.py -> per-region extract by spec.extractor -> mergeRegionResults with full-page floor). Mirror `scripts/page-classify.mjs` + `scripts/vision-tiling-extract.mjs` (the tiling glue sibling). The step-2b commit MUST add a real E2E on a live multi-page print. Then **step 3** = opt-in `--region-route` wiring into `blueprint-ocr-training-loop.mjs` + `validate-perfect-parts.mjs`, then **validate** recall vs the 0.43 baseline (part 05850).
