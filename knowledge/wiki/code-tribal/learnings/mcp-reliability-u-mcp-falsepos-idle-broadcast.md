# MCP-RELIABILITY/U-MCP-FALSEPOS-IDLE-BROADCAST — [MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-IDLE-BROADCAST (slot:golf): kill the false fleet "/mcp reconnect -- every chat disconnected" broadcast on a healthy idle server

**Commit:** `80ce407d2c96` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T08:22:18-05:00
**Tags:** mcp-reliability, u-mcp-falsepos-idle-broadcast, auto-distilled

## Subject
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-IDLE-BROADCAST (slot:golf): kill the false fleet "/mcp reconnect -- every chat disconnected" broadcast on a healthy idle server

## Body
```
[MAIN-FORCE] [MCP-RELIABILITY]/U-MCP-FALSEPOS-IDLE-BROADCAST (slot:golf): kill the false fleet "/mcp reconnect -- every chat disconnected" broadcast on a healthy idle server

ROOT CAUSE (confirmed LIVE 2026-06-17, not inferred): operator "chats get disconnected
right away" = a FALSE fleet-wide broadcast, NOT a real disconnect. :3100 is healthy
(HTTP 200, peak_inflight=1 over 45min, 0 shed, 64/512 capacity ~64x oversized for actual
load). The live mcp-reconnect-signal.json was written ~2min before diagnosis by a PEER
chat (pid 43452) with reason "fleet MCP bridge count=0 (every chat disconnected)" while
the server was provably up. Chain: mcp-bridge-enforce-pretool.mjs (T0 PreToolUse) ->
readCachedServerUp() returns undefined when the UserPromptSubmit health cache is >120s
stale -> decideEnforcement(serverUp:undefined) takes the legacy broadcast-on-fleet-0 path
-> writes the signal -> every chat shows the false banner. The cache goes stale MID-TURN
on long turns/idle gaps (probe is turn-start-only, throttled 30s); 0 transient bridges is
the NORMAL idle resting state, not an outage.

FIX: cachedServerUpVerdict() (new, pure, exported) treats a last-known-HEALTHY probe within
a 900s suppress window (== broadcast TTL; knob PRISM_MCP_HEALTH_LASTKNOWN_MAX_AGE_MS) as
"server up" for broadcast SUPPRESSION only -- a server that probed healthy <=15min ago with
NO positive down-evidence must not trigger a fleet "everyone disconnected" alarm just
because 0 transient bridges are alive. Down direction is NEVER suppressed past the 120s
authoritative window, so a REAL outage still broadcasts: the next live turn re-probes :3100,
writes ok:false fresh, re-enabling the path. Hard-block (per-chat pid-dead/stale) untouched.

TESTS: +9 (7 pure verdict-matrix incl the exact 191s live value + boundary 900s + env-tunable
window + fail-safe null/NaN/negative; 2 round-trip -- 191s-stale-healthy => NO signal written,
>900s-stale => signal STILL written/no over-suppression). 18/18 pass.

Sibling of FIX #2 (9da42f74c6, fresh-cache suppress) -- this closes its documented idle-fleet
residual. Reapers/monitors confirmed active this session (Fleet Reaper + Memory Monitor
Ready/LastResult=0). NOTE: PRISM Fleet Task Health task still ABSENT (needs elevated re-reg).
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs | 80 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/mcp-bridge-enforce-pretool.mjs                | 39 ++++++++++++++++++++++++++++++++---
- 2 files changed, 116 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till broadcasts: the next live turn re-probes :3100,
- TILL written/no over-suppression). 18/18 pass.
- NOTE: PRISM Fleet Task Health task still ABSENT (needs elevated re-reg).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80ce407d2c96`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._