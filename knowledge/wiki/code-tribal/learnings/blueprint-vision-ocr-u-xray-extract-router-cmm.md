# BLUEPRINT-VISION-OCR/U-XRAY-EXTRACT-ROUTER-CMM — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-CMM (slot:xray): add cmm_plan_path -> completes the quality consumer family on the blueprint router

**Commit:** `c547d47ab433` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:21:28-05:00
**Tags:** blueprint-vision-ocr, u-xray-extract-router-cmm, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-CMM (slot:xray): add cmm_plan_path -> completes the quality consumer family on the blueprint router

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-EXTRACT-ROUTER-CMM (slot:xray): add cmm_plan_path -> completes the quality consumer family on the blueprint router

Adds the surveyed section-2 cmm_plan_path consumer to the blueprint router (15->16). prism_calc:cmm_plan_path (disk-verified), COMMITMENT like inspection_plan/fai_run -- a CMM probe sequence built from unconfirmed dims/GD&T mis-measures acceptance, so it confirm-gates on needs_confirm(dims)+needs_confirm(gdt). Eligible iff dims OR gd&t. GD&T now drives inspection_plan + fai_run + cmm_plan_path (the 3 quality consumers). 20 affected tests green (reference-values 15->16, R9); the quality family (inspection/FAI/SPC/CMM) is complete. Remaining section-2 (smart_tool_select/setup_sheet) queued.
```

## Files touched (4)
- mcp-server/src/__tests__/blueprintExtractionRouter.test.ts           | 37 +++++++++++++++++++++----------------
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts | 14 +++++++-------
- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts | 20 ++++++++++++++++++++
- 3 files changed, 48 insertions(+), 23 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c547d47ab433`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._