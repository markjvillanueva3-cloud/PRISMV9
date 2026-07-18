# TOKEN-SAVINGS-PIVOT/U-PSN-ACTION-HINT — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-ACTION-HINT (slot:alpha iter22-followup): inline concrete MCP action under every classifier nudge

**Commit:** `4690e17f3b9b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:16:53-05:00
**Tags:** token-savings-pivot, u-psn-action-hint, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-ACTION-HINT (slot:alpha iter22-followup): inline concrete MCP action under every classifier nudge

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PSN-ACTION-HINT (slot:alpha iter22-followup): inline concrete MCP action under every classifier nudge

iter22 (U-NUDGE-SELF-AWARENESS) added "_prefer the MCP action it names_"
advisory but several top-firing classifiers — doctrineSurface (~35% of
fires), backendAuditChain, isBroadGlob — emit nudges that don't actually
NAME a concrete dispatcher:action. Operator/model can't follow without
re-deriving. Take-rate stuck at 0/39.

Fix: _PREFERRED_ACTION_FOR_CLASSIFIER map (reverse of mcp-route-takeup
._ACTION_TO_CLASSIFIERS) + appendActionHints() pure function. After
classification + telemetry record, every classifier with a known target
gets a "→ Take this route now: \`prism_*:action\`" line appended.

PSN synergy round-trip:
  • PRISM OS dispatcher knowledge encoded in the map
  • Tribal/wiki injection upstream is unchanged (no double-fire)
  • Take-up credits the hinted action (cross-checked at build time —
    every action in the new map is in the takeup credit set, asserted
    by test 'PSN synergy: every action ... credited by mcp-route-takeup')
  • Ollama route messages deliberately excluded — they already name
    dispatcher:action inline; double-hint would contradict

Build floor (per comprehensive-build-enforce):
  • 23 tests across 8 spanning classifiers + 4 failure modes + adversarial
    null/undefined/non-string/non-array inputs
  • Round-trip assertion: extractMcpAction(takeup) recognizes the hinted
    action shape — operator taking the hinted route WILL get credited
  • Live verified during this commit: see the doctrineSurface nudge
    rendered with the new "→ Take this route now: prism_session:
    dispatcher_map_compact" suffix
  • Knob PRISM_MCP_ROUTE_ACTION_HINT_DISABLE=1 reverts

23/23 node:test pass.
```

## Files touched (8)
- .../hooks/__tests__/mcp-route-action-hint.test.mjs |  202 +++
- .claude/hooks/mcp-route-suggest.mjs                |   57 +
- mcp-server/data/milestones/FLEET-REAPER-MS3.json   |   14 +-
- state/shared/BUILD_STATE.json                      | 1418 ++++++++++----------
- state/shared/BUILD_STATE.md                        |  173 +--
- state/shared/CLOSE-OUT-DEFERRED.md                 |    3 +
- state/shared/RECENT-SHIPMENTS-2026-05-23.md        |   14 +
- 7 files changed, 1075 insertions(+), 806 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4690e17f3b9b`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._