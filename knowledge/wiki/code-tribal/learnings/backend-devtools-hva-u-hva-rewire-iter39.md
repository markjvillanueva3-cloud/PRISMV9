# BACKEND-DEVTOOLS-HVA/U-HVA-REWIRE-ITER39 — [MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER39: EventBus — TSC -1

**Commit:** `c78dd8fed75f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:52:17-05:00
**Tags:** backend-devtools-hva, u-hva-rewire-iter39, auto-distilled

## Subject
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER39: EventBus — TSC -1

## Body
```
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER39: EventBus — TSC -1

EventCategory union grew to 19 members (ERP categories INTEG-MS0 +
scheduling/capacity INTEG-MS3) but `getStats()` initializer at L923 still
only seeded the original 10 — TS2740 fired the moment the union widened.

Fix: extend the `eventsByCategory` literal with the 9 missing keys
(invoice, gl, accounting, shipping, job, estimate, cycle_time, capacity,
schedule) all initialized to 0. Comments segment by feature-source so
future additions know where to slot.

This is pure infrastructure (event-counting dispatch), not domain logic —
the ERP/scheduling category names live in the union; the EventBus engine
is type-tracking-only and has no manufacturing-physics scope.

TSC: 1126 → 1125 (-1). Cumulative session: 1259 → 1125 (-134).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- mcp-server/src/engines/EventBus.ts | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c78dd8fed75f`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEVTOOLS-HVA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._