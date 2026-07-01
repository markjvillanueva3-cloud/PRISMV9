# WEDM-NEXT-MS0/U-WN06 — [MAIN] [WEDM-NEXT-MS0]/U-WN06+U-WN08-CLOSEOUT (slot:charlie iter2): envelope close-out — silent drift verified

**Commit:** `bd6931867bfd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T13:07:40-05:00
**Tags:** wedm-next-ms0, u-wn06, auto-distilled

## Subject
[MAIN] [WEDM-NEXT-MS0]/U-WN06+U-WN08-CLOSEOUT (slot:charlie iter2): envelope close-out — silent drift verified

## Body
```
[MAIN] [WEDM-NEXT-MS0]/U-WN06+U-WN08-CLOSEOUT (slot:charlie iter2): envelope close-out — silent drift verified

Both engines + tests + edmDispatcher wiring shipped 2026-04-27; envelope never flipped from pending → complete.

U-WN06 WEDMRecastLayerMLEngine — ML prediction of recast layer thickness
  - engine: 21.5KB (mcp-server/src/engines/WEDMRecastLayerMLEngine.ts)
  - test:   14.2KB (mcp-server/src/__tests__/WEDMRecastLayerMLEngine.test.ts)
  - wired:  edmDispatcher.ts (1 ref)

U-WN08 WEDMWireBreakPredictorEngine — ML model for wire break risk prediction
  - engine: 17.6KB (mcp-server/src/engines/WEDMWireBreakPredictorEngine.ts)
  - test:   11.0KB (mcp-server/src/__tests__/WEDMWireBreakPredictorEngine.test.ts)
  - wired:  edmDispatcher.ts (1 ref)

Envelope changes (WEDM-NEXT-MS0.json):
  - U-WN06 status: pending → complete + completed_at + closeout_note
  - U-WN08 status: pending → complete + completed_at + closeout_note
  - completed_units: 6 → 8

Derived state regenerated:
  - state/shared/MILESTONE_PROGRESS.{json,md} (rebuilt via build-milestone-progress.mjs)
  - state/shared/CLOSE-OUT-CANDIDATES.{json,md} (refreshed via audit-close-out-candidates.mjs)

Pre-flight: /goal Stop-gate freshness BLOCKER cleared (audit was 14.7h stale).
Doctrine: CLAUDE.md §CLOSE-OUT AUTOMATION + feedback_auto_close_out + feedback_silent_close_out_drift.
```

## Files touched (16)
- mcp-server/data/milestones/WEDM-NEXT-MS0.json      |  14 +-
- .../web/src/__tests__/academyStorageKey.test.ts    | 129 ++++++++++++++++++
- mcp-server/web/src/__tests__/useStudentId.test.tsx |  70 ++++++++++
- .../web/src/components/learning/CourseCatalog.tsx  |   3 +-
- .../web/src/components/learning/CourseDetail.tsx   |   3 +-
- .../web/src/components/learning/LessonView.tsx     |   3 +-
- mcp-server/web/src/contexts/AuthContext.tsx        |  45 +++++++
- mcp-server/web/src/hooks/useCourses.ts             |  63 +++++++--
- mcp-server/web/src/hooks/useStudentId.ts           |  23 ++++
- mcp-server/web/src/lib/academyStorageKey.ts        |  97 ++++++++++++++
_(+6 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bd6931867bfd`
- Milestone envelope: `mcp-server/data/milestones/WEDM-NEXT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._