# SELF-COMPACT-FIX/U-YELLOW-BRANCH — [MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-BRANCH (slot:bravo): self-compaction never activated in the prudent band -- ROOT CAUSE: deriveZebraDecision had NO YELLOW branch (only GREEN=suppress + RED/CRITICAL=compact), so the 25-65% band fell through to noop; /compact was only ever recommended at RED (>65%, near native ~95% autocompact), defeating proactive 'compact when prudent'. FIX: (1) YELLOW branch honoring the token-awareness writer's own action (wrap-up/compact -> recommend compact; mild -> noop; stale -> noop); (2) slot-context-bundle-inject now surfaces the actionable self-compact.mjs command on recommend:compact (was just showing 'compact' with no actuation); (3) fixed stale zebra-context-bundle.mjs import that left the test DORMANT since the rename. Live-validated: this chat's real YELLOW/wrap-up now -> recommend=compact; 137/137 tests (+7 YELLOW). Actuator itself already works (dry-run resolved WT tab 'BRAVO').

**Commit:** `e92d13b56aed` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:58:19-05:00
**Tags:** self-compact-fix, u-yellow-branch, auto-distilled

## Subject
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-BRANCH (slot:bravo): self-compaction never activated in the prudent band -- ROOT CAUSE: deriveZebraDecision had NO YELLOW branch (only GREEN=suppress + RED/CRITICAL=compact), so the 25-65% band fell through to noop; /compact was only ever recommended at RED (>65%, near native ~95% autocompact), defeating proactive 'compact when prudent'. FIX: (1) YELLOW branch honoring the token-awareness writer's own action (wrap-up/compact -> recommend compact; mild -> noop; stale -> noop); (2) slot-context-bundle-inject now surfaces the actionable self-compact.mjs command on recommend:compact (was just showing 'compact' with no actuation); (3) fixed stale zebra-context-bundle.mjs import that left the test DORMANT since the rename. Live-validated: this chat's real YELLOW/wrap-up now -> recommend=compact; 137/137 tests (+7 YELLOW). Actuator itself already works (dry-run resolved WT tab 'BRAVO').

## Body
```
[MAIN-FORCE] [SELF-COMPACT-FIX]/U-YELLOW-BRANCH (slot:bravo): self-compaction never activated in the prudent band -- ROOT CAUSE: deriveZebraDecision had NO YELLOW branch (only GREEN=suppress + RED/CRITICAL=compact), so the 25-65% band fell through to noop; /compact was only ever recommended at RED (>65%, near native ~95% autocompact), defeating proactive 'compact when prudent'. FIX: (1) YELLOW branch honoring the token-awareness writer's own action (wrap-up/compact -> recommend compact; mild -> noop; stale -> noop); (2) slot-context-bundle-inject now surfaces the actionable self-compact.mjs command on recommend:compact (was just showing 'compact' with no actuation); (3) fixed stale zebra-context-bundle.mjs import that left the test DORMANT since the rename. Live-validated: this chat's real YELLOW/wrap-up now -> recommend=compact; 137/137 tests (+7 YELLOW). Actuator itself already works (dry-run resolved WT tab 'BRAVO').
```

## Files touched (4)
- .claude/hooks/slot-context-bundle-inject.mjs | 10 +++++++++-
- scripts/lib/zulu-context-bundle.mjs          | 21 +++++++++++++++++++++
- scripts/lib/zulu-context-bundle.test.mjs     | 43 ++++++++++++++++++++++++++++++++++++++++++-
- 3 files changed, 72 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e92d13b56aed`
- Milestone envelope: `mcp-server/data/milestones/SELF-COMPACT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._