# SYSTEM-SYNERGY/U-MCP-CMDMATCH-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-MCP-CMDMATCH-FIX (slot:golf): slash-agnostic cmdMatch + port-owner union — guard was BLIND to the real daemon

**Commit:** `ed6662f45eda` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T01:23:34-05:00
**Tags:** system-synergy, u-mcp-cmdmatch-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-MCP-CMDMATCH-FIX (slot:golf): slash-agnostic cmdMatch + port-owner union — guard was BLIND to the real daemon

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SYSTEM-SYNERGY]/U-MCP-CMDMATCH-FIX (slot:golf): slash-agnostic cmdMatch + port-owner union — guard was BLIND to the real daemon

Found via live diagnosis: the guard reported daemonCount=0 while pid 63828 owned
:3100 and was healthy. Root cause — the daemon's real command line is
'node H:/prism/mcp-server/dist/index.js' (FORWARD slashes, supervisor spawn) or
relative 'node dist/index.js' (helper spawn), but cmdMatch was backslash-only
'mcp-server\dist\index' → matched NEITHER → daemonPidsFor returned [] against
the live daemon. The hermetic classifier tests inject daemonPids, so the regex
was never exercised against a real cmd line (pure-core-tested / IO-regex-untested
gap). This made the reap logic unreliable: a forward-slash WEDGED daemon reads as
not-running (start, no reap) instead of all-wedged (reap+start).

Fix: (1) cmdMatch slash-agnostic 'mcp-server[\/]+dist[\/]+index'; (2) main()
unions the authoritative port-owner PID into the daemon set so a relative-path
serving daemon (no mcp-server prefix) is never under-counted; (3) exported pure
isMcpDaemonCmdline + 3 real-string tests (fwd-slash, backslash, no-false-positive)
that FAIL against the old backslash-only regex (R9).

17/17 tests. LIVE: daemonCount 0 -> 1 (guard now sees pid 63828). Found while
recovering the 3rd MCP outage this session (not-running -> --fix start ok, also
live-proving the not-running branch of U-MCP-FIXSTART).
```

## Files touched (3)
- scripts/singleton-service-guard.mjs      | 31 +++++++++++++++++++++++++++++--
- scripts/singleton-service-guard.test.mjs | 26 +++++++++++++++++++++++++-
- 2 files changed, 54 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed6662f45eda`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._