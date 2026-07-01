# TOKEN-SAVINGS-PIVOT/U-MCP-ROUTE-TAKEUP — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP (slot:alpha iter8): take-rate measurement hook

**Commit:** `fbf39cb036e0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:02:38-05:00
**Tags:** token-savings-pivot, u-mcp-route-takeup, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP (slot:alpha iter8): take-rate measurement hook

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-MCP-ROUTE-TAKEUP (slot:alpha iter8): take-rate measurement hook

Closes follow-up #2 from iter-5 memory — measures the take-rate that
/route-suggest-stats had been ESTIMATING at 30% doctrine.

`mcp-route-takeup.mjs` is a PostToolUse hook. Fires after every tool
call. When the tool is an mcp__prism_*__* dispatcher invocation, it:
  1. Extracts the canonical action key (e.g. prism_session:master_index_query)
  2. Reads the route-suggest sidecar
  3. Finds recent (≤60s) TOKEN-SAVE fires in this session whose
     classifier maps to the just-invoked MCP action
  4. Credits each matching classifier with a takeup increment

Action → classifier map (iter1+iter2 nudge targets):
  prism_session:master_index_query → isBroadGrep, isLargeRead, isBroadGlob
  prism_session:action_search      → isVerboseBash
  prism_dev:code_search            → isBroadGrep, isVerboseBash
  prism_dev:file_write             → isLargeWrite

Sidecar extension (schema 1.0.0, additive):
  takeups[]             — last 100 take-up events (cap mirrors recent[])
  takeupTotals          — { totalTakeups, byClassifier }
  lastTakeupAt          — ISO timestamp

Same safety properties as iter-3 sidecar writer:
  - Per-PID temp + rename atomicity
  - 26-chat-fleet safe (concurrent RMW may lose 1 increment, never corrupts)
  - Best-effort try/catch — telemetry NEVER fails the hook
  - Cross-session leakage prevention: sessionId prefix-match required
  - PRISM_MCP_ROUTE_TAKEUP_DISABLE=1 disables sidecar writes

Tests: 13/13 PASS — extractMcpAction (5 cases) + classifiersTakenBy
(8 cases including dedupe, window expiry, cross-session, malformed
input).

Live smoke: fresh broad-Grep fire → invoke prism_session:master_index_query
within window → takeupTotals.totalTakeups=1, byClassifier.isBroadGrep=1,
takeups[0].mcpAction="prism_session:master_index_query". Round-trip works.

Wired in C:\Users\wompu\.claude\settings.json PostToolUse "" matcher
chain after skill-auto-trigger (auto-mirrored to H:).
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-route-takeup.test.mjs | 128 +++++++++++++++++++
- .claude/hooks/mcp-route-takeup.mjs                | 144 ++++++++++++++++++++++
- 2 files changed, 272 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fbf39cb036e0`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._