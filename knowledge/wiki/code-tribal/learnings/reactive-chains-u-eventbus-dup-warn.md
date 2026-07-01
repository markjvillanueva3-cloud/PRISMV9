# REACTIVE-CHAINS/U-EVENTBUS-DUP-WARN — [MAIN-FORCE] [REACTIVE-CHAINS]/U-EVENTBUS-DUP-WARN (slot:bravo): fail-loud guard on EventBus.registerAction duplicate names -- close the collision CLASS, not just the instance

**Commit:** `62a464cca74e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:34:54-05:00
**Tags:** reactive-chains, u-eventbus-dup-warn, auto-distilled

## Subject
[MAIN-FORCE] [REACTIVE-CHAINS]/U-EVENTBUS-DUP-WARN (slot:bravo): fail-loud guard on EventBus.registerAction duplicate names -- close the collision CLASS, not just the instance

## Body
```
[MAIN-FORCE] [REACTIVE-CHAINS]/U-EVENTBUS-DUP-WARN (slot:bravo): fail-loud guard on EventBus.registerAction duplicate names -- close the collision CLASS, not just the instance

The scrutiny on U-REOPT-COLLISION-FIX surfaced the root footgun (P2): EventBus.registerAction is this.actionRegistry.set(name,handler) (EventBus.ts:1230) -- silent last-writer-wins, NO dup-check -- so ANY future two-module same-name registration silently clobbers a handler (exactly the reoptimize_schedule bug). FIX (R16, close the class): warn loudly when registering a name that is ALREADY registered. Behavior PRESERVED -- still overwrites (back-compat: legitimate re-registration / hot-reload allowed across all 23 EventBus importers); the guard only ADDS a log.warn. Census confirms zero duplicate action names today, so it fires only on a real future collision.

R9: +4 real behavioral tests (spy the live  singleton EventBus imports): no-warn on distinct names; warn-exactly-once naming the offender on a 2nd registration; warn-per-duplicate on a 3rd; and the overwrite is PRESERVED (a chain runs the latest handler). 4/4; reactive-chains-collision 3/3 (no regression). Additive + behavior-preserving; pairs with U-REOPT-COLLISION-FIX. 2-arm scrutiny running post-commit (preserving work at session-limit edge, R12).
```

## Files touched (3)
- mcp-server/src/__tests__/eventbus-dup-action-guard.test.ts | 67 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/EventBus.ts                         | 11 +++++++++
- 2 files changed, 78 insertions(+)

## Lessons surfaced in commit body
- till overwrites (back-compat: legitimate re-registration / hot-reload allowed across all 23 EventBus importers); the guard only ADDS a log.warn. Census confirms zero duplicate action names today, so it fires only on a real future collision.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62a464cca74e`
- Milestone envelope: `mcp-server/data/milestones/REACTIVE-CHAINS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._