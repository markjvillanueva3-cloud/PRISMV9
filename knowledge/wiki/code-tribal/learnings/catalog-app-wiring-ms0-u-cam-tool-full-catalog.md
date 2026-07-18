# CATALOG-APP-WIRING-MS0/U-CAM-TOOL-FULL-CATALOG — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-FULL-CATALOG (slot:romeo): lift the 5000-tool cap on hyperMILL + Mastercam tool exports -> full catalog

**Commit:** `6064ace7a40e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:09:39-05:00
**Tags:** catalog-app-wiring-ms0, u-cam-tool-full-catalog, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-FULL-CATALOG (slot:romeo): lift the 5000-tool cap on hyperMILL + Mastercam tool exports -> full catalog

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CATALOG-APP-WIRING-MS0]/U-CAM-TOOL-FULL-CATALOG (slot:romeo): lift the 5000-tool cap on hyperMILL + Mastercam tool exports -> full catalog

Both tool exporters silently capped their catalog query at max_results:5000 while the
catalog is ~74K tools, so a 'full catalog' export to hyperMILL/Mastercam dropped ~93%
of the tool DB -- same silent-under-export class as the Fusion 20-cap (U3). The method
JSDoc said 'full catalog' but the impl emitted a 5000 slice.

Fix (mirror Fusion U3 cap-lift): default ceiling 5000 -> 100_000 (full catalog for a
~74K catalog), keeping max_tools as an explicit DOWN-limit knob:
- MastercamToolExportEngine: exportLibrary maxTools default + _queryCatalog default + doc
- HyperMillToolExportEngine: exportToHMT catalog-fallback + _queryCatalog default; add
  max_tools to HMExportOptions so the fallback is overridable

Found via local-LLM offload (qwen2.5-coder:32b flagged the Mastercam maxTools cap; verified
against source). LIVE round-trip through prism_cam: both mastercam_tool_export +
hypermill_tool_export now return >5000 tools (mastercam 2.1s, hypermill 1.5s); explicit
max_tools:100 still caps to <=100 (knob preserved). 6/6 tests.
```

## Files touched (4)
- mcp-server/src/__tests__/CamToolExportFullCatalog.test.ts | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HyperMillToolExportEngine.ts       |  8 ++++++--
- mcp-server/src/engines/MastercamToolExportEngine.ts       |  9 ++++++---
- 3 files changed, 83 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- till caps to <=100 (knob preserved). 6/6 tests.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6064ace7a40e`
- Milestone envelope: `mcp-server/data/milestones/CATALOG-APP-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._