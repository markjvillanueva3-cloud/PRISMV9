# ZULU-ORCHESTRATOR-MS0/U-ZULU05 — [MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU05 (slot:bravo): backend-dev priority payload — 28/28 tests

**Commit:** `1a88d07f71ef` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T12:10:11-05:00
**Tags:** zulu-orchestrator-ms0, u-zulu05, auto-distilled

## Subject
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU05 (slot:bravo): backend-dev priority payload — 28/28 tests

## Body
```
[MAIN] [ZULU-ORCHESTRATOR-MS0]/U-ZULU05 (slot:bravo): backend-dev priority payload — 28/28 tests

Pure functions only (no I/O, hermetic): BACKEND_DEV_PREFIXES (frozen),
isBackendDevUnit, sortBackendDevFirst, buildCheckinPayload,
buildCompactThenCheckinPayload. Composes the priority-filter directive
the U-ZULU02 main loop appends to SendKeys post-/compact /checkin-<slot>
text so the chat's next /pick-unit is biased toward
U-WIRE*/U-BRIDGE*/U-HOOK*/U-INFRA*/U-DEVTOOL*/U-CK* FIRST.

Standing doctrine: [[feedback_prioritize_devtools_backend]] +
[[feedback_high_roi_backend_first_slot_queue]].
```

## Files touched (3)
- scripts/lib/zulu-bd-priority.mjs      |  75 ++++++++++++++
- scripts/lib/zulu-bd-priority.test.mjs | 184 +++++++++++++++++++++++++++++++++
- 2 files changed, 259 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a88d07f71ef`
- Milestone envelope: `mcp-server/data/milestones/ZULU-ORCHESTRATOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._