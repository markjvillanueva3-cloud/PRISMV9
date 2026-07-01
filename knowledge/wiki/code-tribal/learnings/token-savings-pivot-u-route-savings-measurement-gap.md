# TOKEN-SAVINGS-PIVOT/U-ROUTE-SAVINGS-MEASUREMENT-GAP — [MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-SAVINGS-MEASUREMENT-GAP (slot:alpha): banner labels 0-takeups-on-many-fires as a measurement gap, not below-target

**Commit:** `4462a430bbdc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T21:32:40-05:00
**Tags:** token-savings-pivot, u-route-savings-measurement-gap, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-SAVINGS-MEASUREMENT-GAP (slot:alpha): banner labels 0-takeups-on-many-fires as a measurement gap, not below-target

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS-PIVOT]/U-ROUTE-SAVINGS-MEASUREMENT-GAP (slot:alpha): banner labels 0-takeups-on-many-fires as a measurement gap, not below-target

The SessionStart route-savings banner showed '0/382 below 30% target', sending every chat to chase a behavioral fix. But the takeup hook (mcp-route-takeup.mjs) only credits a nudge when a prism_*:* MCP action runs in-window, so a persistently-offline MCP bridge (port 3100, down this session per the SessionStart warning) zeroes the take-rate REGARDLESS of behavior. 0 takeups on 382 fires is a measurement/environment gap, not the model ignoring suggestions -- the dominant classifiers (isLargeRead 182, isVerboseBash 139) are tool-usage patterns whose only takeup signal is an MCP action call.

Fix mirrors the mcp-route-takerate audit's existing verify-wiring/takeup-wiring-broken doctrine (same 50-fire floor): when totalTakeups==0 && totalFires>=50, formatBanner emits 'likely a MEASUREMENT GAP ... /route-suggest-stats to verify' instead of 'below target'. takeups>0 OR <50 fires keep the honest below-target framing. Supersedes the prior U-PSN-BANNER-FAIL-LOUD test intent (updated, not weakened). Sibling of CAG-HITRATE-HONESTY -- both telemetry surfaces now distinguish measurement gaps from real problems. Tests: 45 (was 41, +4 incl 50/49 boundary + takeups>0). Live: 0/382 now shows the gap label. ASCII-clean.
```

## Files touched (3)
- .claude/hooks/__tests__/route-savings-session-start-banner.test.mjs | 37 ++++++++++++++++++++++++++++++++++---
- .claude/hooks/route-savings-session-start-inject.mjs                | 18 ++++++++++++++++--
- 2 files changed, 50 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4462a430bbdc`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._