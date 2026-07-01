# BLUEPRINT-VISION-OCR/U-XRAY-EXTRACT-ROUTER-QUALITY — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-QUALITY (slot:xray): extend the extraction->feature fan-out with the quality chain (FAI + SPC)

**Commit:** `b67dc5d1cad8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:19:22-05:00
**Tags:** blueprint-vision-ocr, u-xray-extract-router-quality, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-QUALITY (slot:xray): extend the extraction->feature fan-out with the quality chain (FAI + SPC)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-QUALITY (slot:xray): extend the extraction->feature fan-out with the quality chain (FAI + SPC)

Completes the quality feature family on the consumer-router (11 -> 13 consumers), the surveyed top-3 gap. 2 new ConsumerSpecs, both disk-verified on prism_quality:
- fai_run -> prism_quality:fai_run  -- AS9102 first-article form auto-population from dims + GD&T + title_block. COMMITMENT (a below-floor OCR char must NOT auto-populate a signed acceptance form) -> confirm-gates on needs_confirm(dims)+needs_confirm(gdt). Eligible iff dims OR gd&t.
- spc_calculate -> prism_quality:spc_calculate -- Cpk/Ppk from extracted nominal+tolerance limits. ADVISORY (analysis the operator reviews). Eligible iff dims>0.

GD&T now drives BOTH inspection_plan and fai_run (the form records GD&T characteristics) -- the gd&t-only fixture correctly yields 2 eligible consumers. COMMITMENT set now 4 (quote/program/inspection/fai_run).
TEST: 20 affected green (consumer count + all summary reference-values updated 11->13, R9 intent; gd&t-only + includeIneligible cases recomputed for the 2-driver case); tsc-clean.
```

## Files touched (4)
- mcp-server/src/__tests__/blueprintExtractionRouter.test.ts           | 51 ++++++++++++++++++++++++++------------------
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts | 21 +++++++++---------
- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts | 37 ++++++++++++++++++++++++++++++++
- 3 files changed, 78 insertions(+), 31 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b67dc5d1cad8`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._