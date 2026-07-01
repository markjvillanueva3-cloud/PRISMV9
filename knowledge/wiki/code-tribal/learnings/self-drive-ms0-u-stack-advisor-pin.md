# SELF-DRIVE-MS0/U-STACK-ADVISOR-PIN — [MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-PIN (slot:alpha): pin the advisor lane-consistency invariant + JSDoc/symmetry nits (3-of-3 arm A P2)

**Commit:** `29a6489999ee` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:48:32-05:00
**Tags:** self-drive-ms0, u-stack-advisor-pin, auto-distilled

## Subject
[MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-PIN (slot:alpha): pin the advisor lane-consistency invariant + JSDoc/symmetry nits (3-of-3 arm A P2)

## Body
```
[MAIN-FORCE] [SELF-DRIVE-MS0]/U-STACK-ADVISOR-PIN (slot:alpha): pin the advisor lane-consistency invariant + JSDoc/symmetry nits (3-of-3 arm A P2)

Arm A noted the advisor states the model lane from its OWN `reasoning` flag (not a live Ollama probe, by design) -- which must stay consistent with the canonical forge taxonomy. Added a self-defending test: for every intent, assert reasoning === !routeForgePhase(phase).mechanical, so a future re-categorization of any forge phase fails this test and forces the lane label back into sync (no silent drift). Also fixed the empty-prompt branch of classifyDevIntent to return `reasoning` (symmetry) + the JSDoc to document the field. 20/20 tests.
```

## Files touched (3)
- scripts/lib/loop-goal-stack-advisor.mjs      |  4 ++--
- scripts/lib/loop-goal-stack-advisor.test.mjs | 27 ++++++++++++++++++++++++++-
- 2 files changed, 28 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 29a6489999ee`
- Milestone envelope: `mcp-server/data/milestones/SELF-DRIVE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._