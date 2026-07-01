# BLUEPRINT-VISION-OCR/U-XRAY-P15-REGION-GLUE-LIB — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-GLUE-LIB (slot:xray): P1.5 step 2 core -- pure region-glue orchestration (fraction->pixel scale + recall-first full-page union)

**Commit:** `5db3d88b15eb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:27:47-05:00
**Tags:** blueprint-vision-ocr, u-xray-p15-region-glue-lib, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-GLUE-LIB (slot:xray): P1.5 step 2 core -- pure region-glue orchestration (fraction->pixel scale + recall-first full-page union)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-P15-REGION-GLUE-LIB (slot:xray): P1.5 step 2 core -- pure region-glue orchestration (fraction->pixel scale + recall-first full-page union)

P1.5 step 2 verifiable GPU-free core (R13 core-before-integration): scripts/lib/region-glue-lib.mjs converts the region-classifier-lib routing decision into the concrete inputs the live glue needs -- scaleBboxToPixels (the critical fractional-bbox->integer-pixel seam; degenerate <1px crop -> null -> caller full-page-floors it, no silent recall loss), buildRegionCropSpecs ({id,x,y,w,h} for crop-image-tiles.py), buildMergeTiles (region rects + a whole-page full_page overlap tile), mergeRegionResults (delegates to the proven vision-tiling-lib mergeTiledDimensions -- R8 reuse). LOAD-BEARING recall-first contract: the full-page floor ALWAYS participates in the merge, so a full-page-only dim is never lost; the full_page overlap tile collapses a region+full-page duplicate (no double-count) while the merges non-transitive clique guard keeps two distinct same-valued features in non-overlapping regions separate. 12 reference-value tests incl. a LIVE integration through the real mergeTiledDimensions (collapse + full-page-only-kept + region-only-added + distinct-features-separate, concrete counts). Pure (only imports the pure sibling), ASCII-clean. Per-file 2-arm scrutiny PASS (0 P0/P1). NEXT: step 3 = the live scripts/region-classify.mjs (render->segment->crop->extract->mergeRegionResults) + opt-in --region-route wiring + recall validation vs the 0.43 baseline (the step-3 commit must add a real E2E on a live multi-page print).
```

## Files touched (3)
- scripts/lib/region-glue-lib.mjs      | 151 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/region-glue-lib.test.mjs | 146 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 297 insertions(+)

## Lessons surfaced in commit body
- tiles.py), buildMergeTiles (region rects + a whole-page full_page overlap tile), mergeRegionResults (delegates to the proven vision-tiling-lib mergeTiledDimensions -- R8 reuse). LOAD-BEARING recall-first contract: the full-page floor ALWAYS participates in the merge, so a full-page-only dim is never lost; the full_page overlap tile collapses a region+full-page duplicate (no double-count) while the me
- TiledDimensions (collapse + full-page-only-kept + region-only-added + distinct-features-separate, concrete counts). Pure (only imports the pure sibling), ASCII-clean. Per-file 2-arm scrutiny PASS (0 P0/P1). NEXT: step 3 = the live scripts/region-classify.mjs (render->segment->crop->extract->mergeRegionResults) + opt-in --region-route wiring + recall validation vs the 0.43 baseline (the step-3 commit

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5db3d88b15eb`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._