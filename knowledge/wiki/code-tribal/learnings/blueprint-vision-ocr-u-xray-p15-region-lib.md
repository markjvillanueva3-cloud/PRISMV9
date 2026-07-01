# BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-LIB — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-LIB (slot:xray): P1.5 step 1 -- pure region-classifier-lib (layout-aware segmentation + data-loss-safe routing)

**Commit:** `0a41c90a4c3f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:16:22-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-region-lib, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-LIB (slot:xray): P1.5 step 1 -- pure region-classifier-lib (layout-aware segmentation + data-loss-safe routing)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-LIB (slot:xray): P1.5 step 1 -- pure region-classifier-lib (layout-aware segmentation + data-loss-safe routing)

Implements the P1.5 design (blueprint-reading-improvement-backlog-2026-06-19 lines 38-46) step 1: the PURE, GPU-free core that segments a blueprint page into layout regions {bbox,region_kind,confidence} and routes each to an extractor (drawing_view->vlm_ocr, dimension_table->table_parser, title_block->field_parser, bom/notes->light). Mirrors the shipped page-classifier-lib pure-lib+thin-glue split (R11/R8). LOAD-BEARING data-loss-safe bias (inverse of the page classifier): decideRegionRouting falls back to route:full_page whenever the segmentation is untrusted (parse-fail/empty/floor-not-positive/below minTrustedRegions valid regions at the confidence floor) -- region routing can only ADD recall on the full-page floor, never replace it with a box-cropped subset. Recall-first: every region with a bbox extracts something; the only true drop is the lossless full_page fallback. Each region carries a stable sequential id (r0/r1/...) for the step-2 crop+merge seam. 22 real reference-value/invariant tests (happy + >=3 failure + >=2 adversarial; data-loss boundaries test-pinned). ASCII-clean, pure. Per-file 3-agent scrutiny PASS (0 P0/P1). NEXT: step 2 region-classify.mjs glue, then --region-route wiring, then recall validation vs the 0.43 baseline.
```

## Files touched (3)
- scripts/lib/region-classifier-lib.mjs      | 373 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/region-classifier-lib.test.mjs | 290 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 663 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a41c90a4c3f`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._