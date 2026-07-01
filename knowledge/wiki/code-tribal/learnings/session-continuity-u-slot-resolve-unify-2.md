# SESSION-CONTINUITY/U-SLOT-RESOLVE-UNIFY-2 — [MAIN-FORCE] [SESSION-CONTINUITY]/U-SLOT-RESOLVE-UNIFY-2 (slot:alpha): migrate the last 3 divergent slot resolvers to the shared canonical one

**Commit:** `d6dd75cc1c3a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:57:57-05:00
**Tags:** session-continuity, u-slot-resolve-unify-2, auto-distilled

## Subject
[MAIN-FORCE] [SESSION-CONTINUITY]/U-SLOT-RESOLVE-UNIFY-2 (slot:alpha): migrate the last 3 divergent slot resolvers to the shared canonical one

## Body
```
[MAIN-FORCE] [SESSION-CONTINUITY]/U-SLOT-RESOLVE-UNIFY-2 (slot:alpha): migrate the last 3 divergent slot resolvers to the shared canonical one

R15 apply-to-all follow-up to U-SLOT-RESOLVE-UNIFY (0a393d5325): both per-file
scrutiny arms found 3 MORE resolvers on the same compaction/handoff path with
the identical pure-lenient peer-leak (exact line never fires on a full-UUID
sessionId vs a stored claude-<8hex>):
 - stop-task-boundary-compact-nudge.mjs resolveSlotChat -- reads the SAME
   token-budget-<slot>.json as precompact-auto-trigger; mis-resolve nudges the
   wrong slot to /compact.
 - zulu-advisory-inject.mjs + zebra-advisory-inject.mjs resolveSlotFromSlotsFile
   -- the CHO clear/compact advisory slot.

All three delegate to resolveSlotShared (derives claude-<8hex>, EXACT before
lenient). Exported signatures + sentinels preserved. The divergent-resolver
class is now eliminated across precompaction + compaction + handoff + advisory
nudges -- ONE canonical resolver fleet-wide.

Tests: zulu 23/23, zebra 19/19 (exit 0), stop-task-boundary 19/19; all import-load clean.
```

## Files touched (4)
- .claude/hooks/stop-task-boundary-compact-nudge.mjs |  20 +++------
- .claude/hooks/zebra-advisory-inject.mjs            | 143 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/zulu-advisory-inject.mjs             |  12 +++---
- 3 files changed, 156 insertions(+), 19 deletions(-)

## Lessons surfaced in commit body
- wrong slot to /compact.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6dd75cc1c3a`
- Milestone envelope: `mcp-server/data/milestones/SESSION-CONTINUITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._