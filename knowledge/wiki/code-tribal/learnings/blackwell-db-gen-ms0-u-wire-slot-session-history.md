# BLACKWELL-DB-GEN-MS0/U-WIRE-SLOT-SESSION-HISTORY — [MAIN-FORCE] [BLACKWELL-DB-GEN-MS0]/U-WIRE-SLOT-SESSION-HISTORY (slot:india): wire slot_session_history_read into prism_session + land orphaned test

**Commit:** `d62bf202478b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T18:33:19-05:00
**Tags:** blackwell-db-gen-ms0, u-wire-slot-session-history, auto-distilled

## Subject
[MAIN-FORCE] [BLACKWELL-DB-GEN-MS0]/U-WIRE-SLOT-SESSION-HISTORY (slot:india): wire slot_session_history_read into prism_session + land orphaned test

## Body
```
[MAIN-FORCE] [BLACKWELL-DB-GEN-MS0]/U-WIRE-SLOT-SESSION-HISTORY (slot:india): wire slot_session_history_read into prism_session + land orphaned test

4th orphaned-wire closure this session. romeo's U-WIRE-SLOT-SESSION-HISTORY test
(sessionDispatcher.slot-session-history-wire.test.ts) was UNTRACKED -- written but
the dispatcher impl never landed (4/4 failed). SlotSessionHistoryEngine is a verified
GENUINE_ORPHAN (classify-engine-reachability.mjs).

WIRE: new prism_session action slot_session_history_read -- the readAll() read surface
honoring a CUSTOM baseDir, distinct from the 3 existing papa/golf singleton surfaces
(slot_session_fleet_state / _latest / _history) which are DEFAULT_BASE_DIR-locked.
- Instantiates `new SlotSessionHistoryEngine({baseDir})` for the override.
- PATH-TRAVERSAL GUARD: baseDir is confined to dirname(DEFAULT_BASE_DIR) = state/shared
  via path.relative; an escaping value returns {success:false, error:"...escapes the
  slot-sessions root"} (test: ../../../../../../etc rejected).
- readAll keeps only entries with valid eventType+slot+sessionId (anti-stub: the fixture's
  missing-sessionId + corrupt lines are dropped -> count 2 of 4).
- + per-action Zod schema (slot enum + optional baseDir string).

Eval gate: 4/4 vitest green, tsc --noEmit clean. Closes the next item in
[[reference_orphaned_dispatcher_wire_backlog_2026_06_22]].
```

## Files touched (4)
- .../src/__tests__/sessionDispatcher.slot-session-history-wire.test.ts       | 102 ++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/sessionActionSchemas.ts                              |   4 ++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                       |  27 ++++++++++
- 3 files changed, 133 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d62bf202478b`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-DB-GEN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._