# FEATURE-ROUTING-GRAPH-MS0/U-CLASSIFY-RESEARCH — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-CLASSIFY-RESEARCH (slot:alpha): route research/investigate prompts correctly (were conf=0 'build' fallback)

**Commit:** `a0ea7a51e38e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T17:35:23-05:00
**Tags:** feature-routing-graph-ms0, u-classify-research, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-CLASSIFY-RESEARCH (slot:alpha): route research/investigate prompts correctly (were conf=0 'build' fallback)

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-CLASSIFY-RESEARCH (slot:alpha): route research/investigate prompts correctly (were conf=0 'build' fallback)

classifyRoutingClass fed prompt-route-inject the wrong order-of-operations for the 'learn' class
(18.9% of operator history): research/understand/investigate prompts hit the conf=0 'build' fallback.
Fix: high-precision PHRASE signals (not bare words, so a build prompt whose NAME contains the word is
not stolen): learn += deep research/research how|the|into/understand how|the/study the/read up on;
fix += investigate why|the/root cause/diagnose the|why. LIVE-verified target cases route correctly +
'build a research tool'/'build investigate dashboard'/'implement research mode' STAY build (P2 no-steal).
31/31 tests (+8 cases incl 3 no-steal regressions). Reviewer PASS. Advisory-only, no hard gate.
```

## Files touched (3)
- scripts/lib/feature-routing-graph.mjs      | 16 ++++++++++++++--
- scripts/lib/feature-routing-graph.test.mjs | 12 ++++++++++++
- 2 files changed, 26 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong order-of-operations for the 'learn' class

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a0ea7a51e38e`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._