# SYSTEM-VIZ/U-VIZ-HARDEN-COMMIT-RESERVATION-LESSON — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-HARDEN-COMMIT-RESERVATION-LESSON (slot:sierra): wiki lesson + galaxy gotcha -- never raise the fleet hook heap (Windows commit-reservation trap)

**Commit:** `385c5972c058` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:05:23-05:00
**Tags:** system-viz, u-viz-harden-commit-reservation-lesson, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-HARDEN-COMMIT-RESERVATION-LESSON (slot:sierra): wiki lesson + galaxy gotcha -- never raise the fleet hook heap (Windows commit-reservation trap)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-HARDEN-COMMIT-RESERVATION-LESSON (slot:sierra): wiki lesson + galaxy gotcha -- never raise the fleet hook heap (Windows commit-reservation trap)

Hardening (knowledge): captures the 2026-06-23 near-miss where the OBVIOUS fix for
the master-index sidecar ceiling (raise the hook heap so the 267MB sidecar loads)
would REINTRODUCE the documented MCP-FLEET-CAPACITY over-commit outage -- on Windows
--max-old-space-size is a COMMIT RESERVATION (~84 hook procs x raised-heap -> commit
ceiling -> Windows refuses spawns -> "MCP Server failing"). Caught in review before
shipping; the dangerous change was reverted (live portable-node untouched).

- knowledge/wiki/lessons/windows-commit-reservation-hook-heap.md: the trap, the
  load-bearing rationale (verbatim from portable-node header), do/don't, the
  ensure-heap-floor-is-for-SPAWNS-not-hooks distinction, and the verify-before-fixing
  checklist. Bug-finding->wiki gate.
- system-viz/CLAUDE.md s6 (What NOT to do): a NEVER pointer so the next sierra chat
  sees it before touching the heap (R15 discoverability into auto-loaded doctrine).

Prevents an outage-class regression from recurring. The 384MB cap + architecture-graph
fallback is DELIBERATE; the only safe full-coverage path is sharding (deferred, scoped).
```

## Files touched (3)
- .../windows-commit-reservation-hook-heap.md        | 61 ++++++++++++++++++++++
- mcp-server/src/engines/system-viz/CLAUDE.md        |  5 ++
- 2 files changed, 66 insertions(+)

## Lessons surfaced in commit body
- LESSON (slot:sierra): wiki lesson + galaxy gotcha -- never raise the fleet hook heap (Windows commit-reservation trap)
- lessons/windows-commit-reservation-hook-heap.md: the trap, the

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 385c5972c058`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._