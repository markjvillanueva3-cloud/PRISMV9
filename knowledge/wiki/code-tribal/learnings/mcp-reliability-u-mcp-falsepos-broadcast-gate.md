# MCP-RELIABILITY/U-MCP-FALSEPOS-BROADCAST-GATE — [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-BROADCAST-GATE (slot:golf): suppress false /mcp-reconnect fleet broadcast on a HEALTHY server with 0 idle transient bridges

**Commit:** `9da42f74c61c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T23:29:59-05:00
**Tags:** mcp-reliability, u-mcp-falsepos-broadcast-gate, auto-distilled

## Subject
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-BROADCAST-GATE (slot:golf): suppress false /mcp-reconnect fleet broadcast on a HEALTHY server with 0 idle transient bridges

## Body
```
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-BROADCAST-GATE (slot:golf): suppress false /mcp-reconnect fleet broadcast on a HEALTHY server with 0 idle transient bridges

Sibling of the per-turn-banner fix (4c7fba6287). mcp-http-bridge procs are TRANSIENT
stdio->HTTP shims that spawn/serve/exit (1486 spawn cycles in the log; 0-live is the
resting value between request bursts; only 4 REAL terminal bridge deaths exist fleet-wide).
decideEnforcement treated a bare fleet enum-cache count of 0 as a fleet OUTAGE and wrote
mcp-reconnect-signal.json -> chronic false /mcp-reconnect banner on every chat.

Fix: decideEnforcement takes optional serverUp; broadcast fires only when
fleetOut && serverUp !== true. The pretool hook reads the cached :3100 /health probe
(mcp-connectivity-check.mjs, 30s throttle) via readCachedServerUp -> true ONLY when fresh
(<=120s) AND lastStatus.ok===true, else undefined so legacy broadcast-on-fleet-0 is preserved.
Genuine server-down (ok:false / stale cache) -> undefined -> still broadcasts. The per-chat
HARD-BLOCK (pid-dead/stale-heartbeat) is untouched; back-compat (undefined caller) intact.

CONNECTIVITY_STATE env-overridable (PRISM_MCP_CONNECTIVITY_STATE_FILE) for hermetic tests.
Lib 25/25 + pretool round-trip 9/9. Per-file 2-arm scrutiny PASS, zero findings: contract
verified byte-identical to writer schema (mcp-connectivity-check.mjs:266) -- fix is LIVE not inert.
```

## Files touched (5)
- .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs | 157 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/mcp-bridge-enforce-pretool.mjs                | 195 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-bridge-enforce.mjs                          | 172 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-bridge-enforce.test.mjs                     | 272 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 796 insertions(+)

## Lessons surfaced in commit body
- till broadcasts. The per-chat

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9da42f74c61c`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._