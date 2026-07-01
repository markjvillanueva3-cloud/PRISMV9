# FLEET-HYGIENE/U-FTH-DOLLAR-SKIP — [MAIN-FORCE] [FLEET-HYGIENE]/U-FTH-DOLLAR-SKIP (slot:golf): discoverInstallerTasks skips unexpanded $-template-literal task names. The galaxy-mine installer registers -TaskName "PRISM Galaxy Mine ($Galaxy)" (a runtime PS variable); discovery captured the literal $Galaxy as a phantom task name that false-flagged as installer-drift (the recurring test #69 RED, partial). Now any captured name containing $ is skipped -- live discovery 0 $-phantoms (was 1; count 60). +1 test (phantom skipped, real sibling kept). NOTE: this is 1 of the #69 drift items; the full KNOWN_PRISM_TASKS<->installer reconciliation (15 missing + the Zulu-Orchestrator no-discoverable-installer stale + owner-map/EXPECTED invariants) is a separate dedicated-pass unit, fully enumerated in HANDOFF-Claude-golf.

**Commit:** `ecd6defde761` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:24:04-05:00
**Tags:** fleet-hygiene, u-fth-dollar-skip, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-FTH-DOLLAR-SKIP (slot:golf): discoverInstallerTasks skips unexpanded $-template-literal task names. The galaxy-mine installer registers -TaskName "PRISM Galaxy Mine ($Galaxy)" (a runtime PS variable); discovery captured the literal $Galaxy as a phantom task name that false-flagged as installer-drift (the recurring test #69 RED, partial). Now any captured name containing $ is skipped -- live discovery 0 $-phantoms (was 1; count 60). +1 test (phantom skipped, real sibling kept). NOTE: this is 1 of the #69 drift items; the full KNOWN_PRISM_TASKS<->installer reconciliation (15 missing + the Zulu-Orchestrator no-discoverable-installer stale + owner-map/EXPECTED invariants) is a separate dedicated-pass unit, fully enumerated in HANDOFF-Claude-golf.

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-FTH-DOLLAR-SKIP (slot:golf): discoverInstallerTasks skips unexpanded $-template-literal task names. The galaxy-mine installer registers -TaskName "PRISM Galaxy Mine ($Galaxy)" (a runtime PS variable); discovery captured the literal $Galaxy as a phantom task name that false-flagged as installer-drift (the recurring test #69 RED, partial). Now any captured name containing $ is skipped -- live discovery 0 $-phantoms (was 1; count 60). +1 test (phantom skipped, real sibling kept). NOTE: this is 1 of the #69 drift items; the full KNOWN_PRISM_TASKS<->installer reconciliation (15 missing + the Zulu-Orchestrator no-discoverable-installer stale + owner-map/EXPECTED invariants) is a separate dedicated-pass unit, fully enumerated in HANDOFF-Claude-golf.
```

## Files touched (3)
- scripts/__tests__/fleet-task-health-watch.test.mjs | 13 +++++++++++++
- scripts/fleet-task-health-watch.mjs                |  6 ++++++
- 2 files changed, 19 insertions(+)

## Lessons surfaced in commit body
- NOTE: this is 1 of the #69 drift items; the full KNOWN_PRISM_TASKS<->installer reconciliation (15 missing + the Zulu-Orchestrator no-discoverable-installer stale + owner-map/EXPECTED invariants) is a separate dedicated-pass unit, fully enumerated in HANDOFF-Claude-golf.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ecd6defde761`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._