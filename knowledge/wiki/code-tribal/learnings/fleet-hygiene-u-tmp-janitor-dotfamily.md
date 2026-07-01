# FLEET-HYGIENE/U-TMP-JANITOR-DOTFAMILY — [MAIN] [FLEET-HYGIENE]/U-TMP-JANITOR-DOTFAMILY (slot:golf): sweep .tmp.<pid>[.<rand>] orphan family

**Commit:** `a66fdb4e3270` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T16:48:07-05:00
**Tags:** fleet-hygiene, u-tmp-janitor-dotfamily, auto-distilled

## Subject
[MAIN] [FLEET-HYGIENE]/U-TMP-JANITOR-DOTFAMILY (slot:golf): sweep .tmp.<pid>[.<rand>] orphan family

## Body
```
[MAIN] [FLEET-HYGIENE]/U-TMP-JANITOR-DOTFAMILY (slot:golf): sweep .tmp.<pid>[.<rand>] orphan family

tmp-orphan-janitor matched 3 patterns (.tmp-<pid>, .<pid>.tmp, .<pid>.<hex>.tmp)
but NOT the dot-after-tmp family <name>.tmp.<pid>[.<base36>] used by MACHINE_REGISTRY,
fleet-reaper-crash-watch, fleet-task-health + 20+ sibling atomic-writers. 65 orphans
measured unswept (golf 2026-05-31). Broaden pidOf + isTmpName + perBase strip; the
required \d+ after .tmp. excludes real *.tmp.json files. All dead-pid-OR-age + TOCTOU
+ lock gates preserved. 21/21 tests (3 new incl config.tmp.json false-positive guard);
real-data dry-run: 68 scanned, 3 alive spared, 0 wrong reclaim.
```

## Files touched (3)
- scripts/tmp-orphan-janitor.mjs      | 16 ++++++++++++++--
- scripts/tmp-orphan-janitor.test.mjs | 22 ++++++++++++++++++++++
- 2 files changed, 36 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong reclaim.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a66fdb4e3270`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._