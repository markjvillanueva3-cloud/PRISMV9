# TOKEN-SAVINGS-PIVOT/U-RTK-NUDGE-FALSE-POSITIVE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-RTK-NUDGE-FALSE-POSITIVE (slot:alpha): suppress the verbose-Bash rtk nudge on already-rtk'd commands

**Commit:** `415941b1f01b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:35:44-05:00
**Tags:** token-savings-pivot, u-rtk-nudge-false-positive, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-RTK-NUDGE-FALSE-POSITIVE (slot:alpha): suppress the verbose-Bash rtk nudge on already-rtk'd commands

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-PIVOT]/U-RTK-NUDGE-FALSE-POSITIVE (slot:alpha): suppress the verbose-Bash rtk nudge on already-rtk'd commands

Discovery #9 from [[reference_ultracode_highvalue_discovery_2026_06_09]]. isVerboseBash strips a leading 'rtk ' to detect the bare verb, so an already-rtk-prefixed verbose command ('rtk cat x', 'rtk git log -p') still classified as verbose -> the 'use rtk <cmd>' nudge re-fired on a command that ALREADY uses rtk. Pure noise: isVerboseBash is THIS session's top spend-summary classifier (16 fires). The operator already captured the 60-99% reduction.

FIX: export isAlreadyRtk(cmd) (strips leading time/env wrappers, then requires a real 'rtk <verb>' head; 'rtkfoo' is not rtk) + guard the nudge site: isVerboseBash(c) && !isAlreadyRtk(c). Surgical, 1 predicate + 1 guard clause.

VERIFIED: node --check clean; 4 regression tests (predicate edges + guard composition: rtk'd verbose -> suppress, un-rtk'd verbose -> fire, non-verbose -> no nudge). Single canonical hook copy (no H:/.claude or C: duplicate).

PRE-EXISTING (NOT this change): mcp-route-action-hint.test.mjs 'broad-Grep ... master_index_query suffix' fails on git HEAD independent of this commit (verified via git stash) -- appendActionHints/broad-Grep path, untouched here, possibly peer-uncommitted WIP. Flagged for the owner; out of this unit's scope.
```

## Files touched (3)
- .claude/hooks/__tests__/mcp-route-suggest-rtk-guard.test.mjs | 46 ++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/mcp-route-suggest.mjs                          | 17 ++++++++++++++++-
- 2 files changed, 62 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till classified as verbose -> the 'use rtk <cmd>' nudge re-fired on a command that ALREADY uses rtk. Pure noise: isVerboseBash is THIS session's top spend-summary classifier (16 fires). The operator already captured the 60-99% reduction.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 415941b1f01b`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._