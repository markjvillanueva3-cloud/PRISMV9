# SYSTEM-VIZ-HYGIENE/U-SVH-MSPROGRESS-SUPERSEDED — [MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-MSPROGRESS-SUPERSEDED (slot:sierra): stop counting superseded/shipped-status units as pending (kills false-positive milestone drift fleet-wide)

**Commit:** `78d28133bb31` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T17:28:11-05:00
**Tags:** system-viz-hygiene, u-svh-msprogress-superseded, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-MSPROGRESS-SUPERSEDED (slot:sierra): stop counting superseded/shipped-status units as pending (kills false-positive milestone drift fleet-wide)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ-HYGIENE]/U-SVH-MSPROGRESS-SUPERSEDED (slot:sierra): stop counting superseded/shipped-status units as pending (kills false-positive milestone drift fleet-wide)

build-milestone-progress.computeProgress mis-classified two envelope terminal statuses: (1) superseded units (deliberately not built) were counted toward pending -> falsely tripped claims_completed_but_units_pending on any milestone whose remainder is superseded; (2) shipped-status units (only complete/completed were recognized) with no reachable commit were mis-counted as pending. Fix: ENVELOPE_DONE {complete,completed,shipped} + TERMINAL_RESOLVED {superseded,cancelled,...}; per-unit resolved flag (mutually exclusive with shipped); accounted = shipped + resolved; drift + derivedStatus key off accounted. Wired to ALL consumers (R15): consolidate-roadmaps.collectPendingUnits + build-state-snapshot pending-rows now filter !shipped && !resolved so a superseded unit is never offered as a /pick-unit build candidate. Live: SYSTEM-VIZ-BRAIN-MS0 false-drift -> consistent (23 shipped + 3 resolved = 26, pending 0); fleet completed-but-pending flags 3 -> 2 (2 remaining are genuinely pending, correctly preserved). +7 tests (28 green across 2 suites). 2-agent scrutiny PASS; reviewer-B P1 (consumer wiring) fixed in this commit.
```

## Files touched (6)
- scripts/build-milestone-progress.mjs      |  54 +++++++++++++++++++++++++++++++++++++++++++++++-------
- scripts/build-milestone-progress.test.mjs | 100 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-state-snapshot.mjs          |   2 +-
- scripts/consolidate-roadmaps.mjs          |   6 +++++-
- scripts/consolidate-roadmaps.test.mjs     |  11 ++++++++---
- 5 files changed, 161 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 78d28133bb31`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._