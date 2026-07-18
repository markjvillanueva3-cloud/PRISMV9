# BLUEPRINT-VISION/U-XRAY-EXTRACT-ROUTER-GAP-CLOSE — [MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-EXTRACT-ROUTER-GAP-CLOSE (slot:xray): wire 4 last GAP-matrix consumers into blueprintExtractionRouter (16->20)

**Commit:** `73474abaee6a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:06:28-05:00
**Tags:** blueprint-vision, u-xray-extract-router-gap-close, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-EXTRACT-ROUTER-GAP-CLOSE (slot:xray): wire 4 last GAP-matrix consumers into blueprintExtractionRouter (16->20)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION]/U-XRAY-EXTRACT-ROUTER-GAP-CLOSE (slot:xray): wire 4 last GAP-matrix consumers into blueprintExtractionRouter (16->20)

smart_tool_select(prism_cam:smart_tool_select), stock_allowance(prism_calc:stock_allowance), lathe_workholding(prism_turning:lathe_workholding_select_jaw), setup_sheet(prism_cam:setup_sheet_generate) -- all advisory, eligible dims>0, each action disk-verified (enum+case). Closes the consumer-application-map section-2 GAP matrix: all 9 candidates now wired; the other 5 (fai_run/spc/cmm/job/material_price) were ALREADY in the router -- doc-corrected the stale section-1 count 11->20. 26 tests green (19 router unit incl new gap-close describe + 7 prism_cad round-trip), tsc-clean, per-file 2-arm scrutiny both PASS. [MAIN-FORCE]: slot/xray worktree stale, fleet-infra on shared cad-fusion-live-ms0.
```

## Files touched (5)
- knowledge/wiki/architecture/blueprint-extraction-consumer-application-map-2026-06-24.md | 24 +++++++++++++++++++++---
- mcp-server/src/__tests__/blueprintExtractionRouter.test.ts                              | 78 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------
- mcp-server/src/__tests__/cadDispatcher.blueprintExtractRoute.test.ts                    | 13 +++++++------
- mcp-server/src/engines/blueprint-vision/blueprintExtractionRouter.ts                    | 78 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 171 insertions(+), 22 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 73474abaee6a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._