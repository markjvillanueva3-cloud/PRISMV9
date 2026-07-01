# TOOL-LIBRARIES/U-FUSION-CLOUD-PUBLISH — [MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-CLOUD-PUBLISH (slot:romeo): one-click Fusion script to publish all Local PRISM_* tool libs -> Cloud (Team hub) for coworker access

**Commit:** `26094778d8ef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:49:34-05:00
**Tags:** tool-libraries, u-fusion-cloud-publish, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-CLOUD-PUBLISH (slot:romeo): one-click Fusion script to publish all Local PRISM_* tool libs -> Cloud (Team hub) for coworker access

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-FUSION-CLOUD-PUBLISH (slot:romeo): one-click Fusion script to publish all Local PRISM_* tool libs -> Cloud (Team hub) for coworker access

Operator (Team hub) wants the inch libraries in Fusion Cloud so coworkers can access them. Cloud writes require adsk.cam inside the authenticated Fusion seat (no file path; the :18361/:18360 PRISMBridge is down now), so this is a standalone Fusion Script the operator runs in their seat (Utilities -> Scripts and Add-Ins -> add folder -> Run).

Verified against the live Fusion-2704 API quirks (reference_fusion_live_tool_libraries_2026_06_15): no toolLibraryUrls; childAssetURLs returns a URLVector (iterate, no .count); URL has no .clone(); importToolLibrary(url, ToolLibrary, name) imports the library OBJECT. Hardened against the 2 details unverifiable offline: createFolder return (falls back to cloud root) + URL.leafName (parses toString() fallback). Recurses Local folders, publishes every PRISM_* lib to Cloud/"PRISM Tooling (inch)", reports published/skipped/errors in a dialog.

R12: this adsk code CANNOT be unit-tested offline (no adsk module) -- py_compile syntax-clean only. Needs one live run in the operator s seat to confirm (the result dialog surfaces any Fusion-2704 API quirk for a fast fix). Manual 60-sec drag-drop (Tool Library dialog Local->Cloud copy) remains the zero-code fallback.
```

## Files touched (2)
- scripts/fusion360-prism-addin/publish_libraries_to_cloud.py | 123 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 123 insertions(+)

## Lessons surfaced in commit body
- tilities -> Scripts and Add-Ins -> add folder -> Run).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 26094778d8ef`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._