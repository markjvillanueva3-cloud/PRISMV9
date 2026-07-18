# TOKEN-SAVINGS/U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH — [MAIN-FORCE] [TOKEN-SAVINGS]/U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH (slot:alpha): interim-suppress the net-negative isVerboseBash route nudge

**Commit:** `e0b3df1ea0d0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T09:22:08-05:00
**Tags:** token-savings, u-mcp-route-suppress-isverbosebash, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH (slot:alpha): interim-suppress the net-negative isVerboseBash route nudge

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-MCP-ROUTE-SUPPRESS-ISVERBOSEBASH (slot:alpha): interim-suppress the net-negative isVerboseBash route nudge

The take-rate audit (scripts/audit-mcp-route-takerate.mjs, 2026-06-20) flags
isVerboseBash suppress-candidate: 417 fires / 0 takes / 51.4% fire-share /
credit-path PROVEN LIVE (genuine-low-take-rate) -- the dominant route-suggest
noise generator after backendAuditChain. The route-suggest-decay actor will NOT
auto-mute it (it needs the exact suppress verdict + takes>0 as a measurement-gap
guard), so per feedback_low_take_rate_nudges_are_net_negative this is the
operator-decided interim static drop while the comprehensive decay-actor fix
stays queued.

New pure exported applyInterimSuppress + _INTERIM_LOW_TAKE_SUPPRESS set (mirrors
appendActionHints), wired into main after _recordRouteFires so the fire is still
counted (telemetry/audit keep measuring the would-be need; revisit if take-rate
rises). Reversible: PRISM_MCP_ROUTE_INTERIM_SUPPRESS=0.

Tests: 11/11 new + 29/29 redundancy regression. LIVE A/B through the real hook:
default -> nudge suppressed; knob=0 -> nudge restored. Only isVerboseBash dropped
(isLargeRead=verify-wiring, isBroadGrep=keep left untouched -- data-gated).
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-route-suggest-interim-suppress.test.mjs | 111 ++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/mcp-route-suggest.mjs                                 |  42 +++++++++++++++++
- 2 files changed, 153 insertions(+)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e0b3df1ea0d0`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._