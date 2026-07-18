# SYSTEM-VIZ-HYGIENE/U-SVH-DRIFT-SKIP-VOCAB — [MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-DRIFT-SKIP-VOCAB (slot:sierra): audit-roadmap-drift skips terminal-status milestones (no cry-wolf on completed/shipped)

**Commit:** `fa30e8eef824` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:06:28-05:00
**Tags:** system-viz-hygiene, u-svh-drift-skip-vocab, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-DRIFT-SKIP-VOCAB (slot:sierra): audit-roadmap-drift skips terminal-status milestones (no cry-wolf on completed/shipped)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-DRIFT-SKIP-VOCAB (slot:sierra): audit-roadmap-drift skips terminal-status milestones (no cry-wolf on completed/shipped)

scripts/audit-roadmap-drift.mjs hardcoded an EXACT SKIP_STATUSES {complete,superseded,consolidated,deprecated} that missed the synonyms roadmap-index carries -- completed (DEV-VELOCITY-AUTOTRIGGER-MS0, FLEET-REAPER-MS1) + shipped/shipped-research-only -- so finished milestones were re-audited and could emit false drift. Sibling of U-SVH-MSPROGRESS-SUPERSEDED. Extracted pure tested scripts/lib/roadmap-terminal-status.mjs (isSkippable: exact terminal set + complete*/shipped* variants + null/garbage-safe; explicitly NOT in_progress/not_started/ready/deferred -> no over-suppression). 23 tests. Live: the 2 completed milestones dropped off the drift report (21 genuine drifts preserved, 0 completed/shipped still flagged).
```

## Files touched (4)
- scripts/audit-roadmap-drift.mjs              |  5 ++---
- scripts/lib/roadmap-terminal-status.mjs      | 48 ++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/roadmap-terminal-status.test.mjs | 62 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 112 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till flagged).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fa30e8eef824`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._