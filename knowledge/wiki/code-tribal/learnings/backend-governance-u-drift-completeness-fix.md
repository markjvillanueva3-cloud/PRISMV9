# BACKEND-GOVERNANCE/U-DRIFT-COMPLETENESS-FIX — [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-GOVERNANCE]/U-DRIFT-COMPLETENESS-FIX (slot:bravo): detector now recognizes completed/shipped/done, not just 'complete'

**Commit:** `54ca90e5afe1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:11:23-05:00
**Tags:** backend-governance, u-drift-completeness-fix, auto-distilled

## Subject
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-GOVERNANCE]/U-DRIFT-COMPLETENESS-FIX (slot:bravo): detector now recognizes completed/shipped/done, not just 'complete'

## Body
```
[MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-GOVERNANCE]/U-DRIFT-COMPLETENESS-FIX (slot:bravo): detector now recognizes completed/shipped/done, not just 'complete'

R12 bug found while closing HERMES-MASTER-ORCHESTRATOR-MS0: envelopes mix unit status
'complete' vs 'completed' (+ 'shipped'/'done'). The detector's status!=='complete' filter
treated 'completed' units as still-open -> per-milestone over-count of open/drift units.
Added isUnitComplete() (DONE_STATUSES set, case-insensitive); analyzeMilestone uses it.
+2 tests (isUnitComplete conventions + 'completed'-excluded-from-notComplete regression). 24/24.
Work-list artifact regenerated.
```

## Files touched (4)
- scripts/lib/engine-existence-drift-lib.mjs                |  11 +-
- scripts/lib/engine-existence-drift-lib.test.mjs           |  20 ++-
- state/shared/specs/ENGINE-EXISTENCE-DRIFT-2026-06-21.json | 924 ++++++++-----------------------------------------------------------------------------------------------------------------
- 3 files changed, 90 insertions(+), 865 deletions(-)

## Lessons surfaced in commit body
- till-open -> per-milestone over-count of open/drift units.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54ca90e5afe1`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-GOVERNANCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._