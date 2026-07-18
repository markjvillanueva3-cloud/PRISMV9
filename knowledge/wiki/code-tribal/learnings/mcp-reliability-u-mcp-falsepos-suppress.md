# MCP-RELIABILITY/U-MCP-FALSEPOS-SUPPRESS — [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-SUPPRESS (slot:golf): suppress per-turn fleet-0 "MCP BRIDGE DOWN" false-positive on a healthy server

**Commit:** `4c7fba628723` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T23:14:18-05:00
**Tags:** mcp-reliability, u-mcp-falsepos-suppress, auto-distilled

## Subject
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-SUPPRESS (slot:golf): suppress per-turn fleet-0 "MCP BRIDGE DOWN" false-positive on a healthy server

## Body
```
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-SUPPRESS (slot:golf): suppress per-turn fleet-0 "MCP BRIDGE DOWN" false-positive on a healthy server

Operator: "chats get disconnected right away ... fix and improve mcp server."

ROOT CAUSE (617-session study + live 32-concurrent load test): server is NOT broken --
:3100 served 32 concurrent initialize requests sub-second, 0 errors / 0 sheds
(peak_inflight over 6h = 6 vs limits 64/512). The "disconnect" is mcp-connectivity-check's
fleet-wide countBridges()===0 -> buildDegradedBanner firing "MCP BRIDGE DOWN / every chat
disconnected" EVERY idle turn (196 hits in just 8 transcripts) because bridges are transient
(1486 spawn/exit cycles; 0-live-bridges is the normal idle resting state). Only 4 REAL
terminal bridge deaths exist across the entire log history.

FIX:
- gate the fleet-0 banner behind off-by-default PRISM_MCP_FLEET0_BANNER=1 (legacy path
  preserved/restorable; the precise per-chat sentinel + server-DOWN auto-reconnect paths are
  untouched -- both still catch real disconnects).
- bump DEFAULT_TIMEOUT_MS 1000->3000: a 1s probe timeout false-flags a slow-but-healthy :3100
  as DISCONNECTED under load (2026-05-29 fleet-scale root cause; test asserted 3000 since
  2026-06-12 but the constant was never bumped).

37/37 tests pass (2 false-banner tests inverted to assert silence + knob-restore test added).
Per-file 2-arm scrutiny PASS/PASS, no P0/P1.
```

## Files touched (3)
- .claude/hooks/mcp-connectivity-check.mjs      | 36 ++++++++++++++++++++++++++++++------
- .claude/hooks/mcp-connectivity-check.test.mjs | 24 +++++++++++++++++++++---
- 2 files changed, 51 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till catch real disconnects).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c7fba628723`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._