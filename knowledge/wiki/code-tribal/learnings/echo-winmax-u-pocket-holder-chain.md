# ECHO-WINMAX/U-POCKET-HOLDER-CHAIN — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POCKET-HOLDER-CHAIN: CAM tools+holders -> holder-aware pockets -> post-param auto-populate

**Commit:** `805b8149a8f7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T19:31:27-05:00
**Tags:** echo-winmax, u-pocket-holder-chain, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POCKET-HOLDER-CHAIN: CAM tools+holders -> holder-aware pockets -> post-param auto-populate

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ECHO-WINMAX]/U-POCKET-HOLDER-CHAIN: CAM tools+holders -> holder-aware pockets -> post-param auto-populate

Closes the operator-named gap: "whatever tool the user populates their CAM program with, ALONG WITH
TOOL HOLDER, auto-populates the pocket inputs in the post-processor." (Prior session claim that this
was built was WRONG — verified the file had ZERO holder support; this is the real build.)
winmax-tool-pocket-autoselect.mjs now does the full chain:

- HOLDER CARRY-THROUGH: normalizeHolder() (type/gauge_length/projection/coupling, nested or flat
  fields) + normalizeTool carries it + uses holder gauge as cal_length when absent. toolSignature is
  HOLDER-AWARE: same cutter in a different holder/gauge = its own pocket (different Z tool-length
  offset); holderless tools get a uniform ||H:- suffix so EXISTING dedup is unchanged. toDefineToolCourses
  emits holderType/gaugeLength/coupling for the WinMax Tool Setup form.
- CAM INGEST: toolsToOps() adapts a CAM tool-library export (universal_tool_export CSV rows OR a
  per-CAM extractor JSON: hypermill_extract_tools / cam_fusion360_tool_parse / mastercam_tool_import)
  -> the autoselect op-list. readToolsFile()/parseToolCsv() accept CSV or JSON. CLI: --from-tools.
- POST AUTO-POPULATE: buildPostParams() turns the deduped pocket map -> master_post_hurco_v11 params
  (operations[] with tool_number + geometry + HOLDER + machine; inch->mm only when units=inch).
  CLI: --emit post-params.

VERIFIED (node-direct; vitest env-unrunnable under fleet contention): 20/20 invariant checks incl
existing holderless dedup preserved, holder-aware split/merge, units (mm unchanged / inch x25.4),
toolsToOps CSV+nested, parseToolCsv, drill op_type. Live chain: CAM CSV (4 tools, 1 dup ER32) -> 3
pockets with holders (CAT40 SHRINK g100, ER32 g80, CAT40 g120) -> post params (3 ops + holders + machine).

REMAINING (honest, task #10): live read of a CAM program FILE (.f3d/.mcam/hyperMILL project) ->
tool+holder list runs through the per-CAM extractor MCP actions; --from-tools consumes their output
(or the universal_tool_export CSV) but auto-invoking the extractor on a live file needs MCP up +
per-CAM wiring + confirming each extractor returns holder data. The dedup+holder+post-populate core
is done and CAM-agnostic.
```

## Files touched (3)
- scripts/winmax-tool-pocket-autoselect.mjs      | 158 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------
- scripts/winmax-tool-pocket-autoselect.test.mjs |  91 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 238 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- WRONG — verified the file had ZERO holder support; this is the real build.)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 805b8149a8f7`
- Milestone envelope: `mcp-server/data/milestones/ECHO-WINMAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._