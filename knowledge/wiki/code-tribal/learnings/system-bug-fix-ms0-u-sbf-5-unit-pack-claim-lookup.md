# SYSTEM-BUG-FIX-MS0/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP — [SYSTEM-BUG-FIX-MS0]/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP (slot:sierra): unit-knowledge-pack-inject read claims by NATO slot-name key but slot-task-claim.mjs keys claims by unitId -- the UserPromptSubmit injector silently no-op'd in production (never injected a unit pack). Resolve by each row's .slot field (freshest-by-heartbeat); the test fixtures encoded the same wrong shape (green-but-blind) so corrected them to the real unitId-keyed shape + added a regression test pinning real-vs-bug shapes. 35/35 tests. +audit doc re-run section

**Commit:** `3962eae3f9ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T01:31:45-05:00
**Tags:** system-bug-fix-ms0, u-sbf-5-unit-pack-claim-lookup, auto-distilled

## Subject
[SYSTEM-BUG-FIX-MS0]/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP (slot:sierra): unit-knowledge-pack-inject read claims by NATO slot-name key but slot-task-claim.mjs keys claims by unitId -- the UserPromptSubmit injector silently no-op'd in production (never injected a unit pack). Resolve by each row's .slot field (freshest-by-heartbeat); the test fixtures encoded the same wrong shape (green-but-blind) so corrected them to the real unitId-keyed shape + added a regression test pinning real-vs-bug shapes. 35/35 tests. +audit doc re-run section

## Body
```
[SYSTEM-BUG-FIX-MS0]/U-SBF-5-UNIT-PACK-CLAIM-LOOKUP (slot:sierra): unit-knowledge-pack-inject read claims by NATO slot-name key but slot-task-claim.mjs keys claims by unitId -- the UserPromptSubmit injector silently no-op'd in production (never injected a unit pack). Resolve by each row's .slot field (freshest-by-heartbeat); the test fixtures encoded the same wrong shape (green-but-blind) so corrected them to the real unitId-keyed shape + added a regression test pinning real-vs-bug shapes. 35/35 tests. +audit doc re-run section
```

## Files touched (4)
- .claude/hooks/unit-knowledge-pack-inject.mjs      | 17 +++++++++++++++--
- .claude/hooks/unit-knowledge-pack-inject.test.mjs | 12 ++++++++++--
- state/shared/specs/SYSTEM-BUG-AUDIT-2026-06-14.md |  9 +++++++--
- 3 files changed, 32 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong shape (green-but-blind) so corrected them to the real unitId-keyed shape + added a regression test pinning real-vs-bug shapes. 35/35 tests. +audit doc re-run section

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3962eae3f9ac`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-BUG-FIX-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._