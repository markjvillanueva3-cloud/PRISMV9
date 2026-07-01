# TOKEN-SAVINGS-PIVOT/U-WEBSEARCH-KB-ROUTE — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-WEBSEARCH-KB-ROUTE (slot:alpha iter20): credit WebSearch route to prism_knowledge:search

**Commit:** `0a9d0b918f2b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T21:50:37-05:00
**Tags:** token-savings-pivot, u-websearch-kb-route, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-WEBSEARCH-KB-ROUTE (slot:alpha iter20): credit WebSearch route to prism_knowledge:search

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-WEBSEARCH-KB-ROUTE (slot:alpha iter20): credit WebSearch route to prism_knowledge:search

/goal pivot expansion — closes the WebSearch credit gap.

Before: WebSearch fired the `isBroadWebSearch` classifier but the takeup map
had NO MCP action that could credit it. WebSearch nudges were uncreditable —
even if the model perfectly routed via prism_knowledge, the take-rate stayed
artificially low.

After:
- mcp-route-takeup.mjs: prism_knowledge:search + prism_knowledge:cross_query
  + prism_session:master_index_query all credit isBroadWebSearch
- mcp-route-suggest.mjs: WebSearch nudge detects internal-query keywords
  (prism_/engine/dispatcher/wiki/tribal/kienzle/taylor/JM Die/roadmap/etc)
  and routes to prism_knowledge:search FIRST instead of Ollama-summary
- Tests: 5 new test cases (18 total, all pass)

The internal-query route is the high-ROI path — PRISM concepts can't be
found on the open web anyway, so WebSearch on them is pure waste.
```

## Files touched (7)
- .claude/hooks/__tests__/mcp-route-takeup.test.mjs |  54 ++
- .claude/hooks/mcp-route-suggest.mjs               |  19 +-
- .claude/hooks/mcp-route-takeup.mjs                |   8 +-
- state/shared/MILESTONE_PROGRESS.json              | 740 ++++++++++++----------
- state/shared/MILESTONE_PROGRESS.md                |  28 +-
- state/shared/U-CK11-PHASE2D-SHADOW-DECISIONS.md   |  18 +-
- 6 files changed, 503 insertions(+), 364 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a9d0b918f2b`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._