# WIRING/U-ACSERVER-RESOLVE — [MAIN-FORCE] [WIRING]/U-ACSERVER-RESOLVE (slot:romeo, for kilo): resolve the HyperMillAC orphan -- rename (kill collision) + fix 2 error-path bugs + track + honest WIRE-EXEMPT

**Commit:** `30e225404cad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T14:57:01-05:00
**Tags:** wiring, u-acserver-resolve, auto-distilled

## Subject
[MAIN-FORCE] [WIRING]/U-ACSERVER-RESOLVE (slot:romeo, for kilo): resolve the HyperMillAC orphan -- rename (kill collision) + fix 2 error-path bugs + track + honest WIRE-EXEMPT

## Body
```
[MAIN-FORCE] [WIRING]/U-ACSERVER-RESOLVE (slot:romeo, for kilo): resolve the HyperMillAC orphan -- rename (kill collision) + fix 2 error-path bugs + track + honest WIRE-EXEMPT

Resolves the orphan romeo flagged to kilo (03c5a33c5b). The untracked standalone
HyperMillACBridgeEngine.ts (loopback HTTP companion server for OPEN MIND AC) collided
on class + singleton name with the OUTBOUND CAM-API bridge in BatchCAMAPIBridgeEngines.ts
(the camDispatcher-wired one). Confirmed COMPLEMENTARY, not redundant (inbound HTTP server
vs outbound API bridge) -> keep + fix, not delete.

Actions:
- Renamed class/singleton/file HyperMillACBridgeEngine -> HyperMillACServerEngine (kills the
  collision + import-confusion hazard; it IS a server per its own header).
- FIXED 2 real adversarial-test failures (arm C caught these):
  (1) Oversize >1MB: req.destroy() raced the 413 flush -> client ECONNRESET. Now sets
      Connection:close so node tears down AFTER the 413 flushes -> client reads the 413.
  (2) Malformed JSON: the TEST hardcoded Content-Length:13 for a 12-byte body -> server
      correctly waited for byte 13 -> 60s hang. Fixed to Buffer.byteLength (test bug).
- Test now 20 passed / 1 skipped / 0 failed (was 2 failed, 60s hang); tsc clean.
- Tracked both files + honest WIRE-EXEMPT tag (server start/stop lifecycle, host/operator
  started -- NOT a request/response prism_* action; reason is TRUE this time, no fabricated
  consumer -- the R12 lesson from 03c5a33c5b applied).
```

## Files touched (3)
- mcp-server/src/__tests__/HyperMillACServerEngine.test.ts | 331 +++++++++++++++++++++++++
- mcp-server/src/engines/HyperMillACServerEngine.ts        | 487 +++++++++++++++++++++++++++++++++++++
- 2 files changed, 818 insertions(+)

## Lessons surfaced in commit body
- lesson from 03c5a33c5b applied).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 30e225404cad`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._