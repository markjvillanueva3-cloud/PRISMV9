# FRONTEND-APP/U-Q-USEENTITLEMENT-TEST — [MAIN-FORCE] [FRONTEND-APP]/U-Q-USEENTITLEMENT-TEST (slot:quebec): R9 test for the gate foundation (deny-by-default + not-yet-live denial)

**Commit:** `e1884f8ed0b2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:05:40-05:00
**Tags:** frontend-app, u-q-useentitlement-test, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-USEENTITLEMENT-TEST (slot:quebec): R9 test for the gate foundation (deny-by-default + not-yet-live denial)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-USEENTITLEMENT-TEST (slot:quebec): R9 test for the gate foundation (deny-by-default + not-yet-live denial)

useEntitlement powers every FeatureGate. Locks the security invariant: a plan-load FAILURE denies every feature (never leak paid access on a network error); an UNKNOWN plan string normalizes to free; a NOT-YET-LIVE feature (quoting/erp) is denied even on enterprise; free includes the capped basic calc but no paid features; pro includes wizards+print but not cadcam (shop+); authenticated flag surfaced. 6/6 pass; concrete assertions only.
```

## Files touched (2)
- mcp-server/web/src/__tests__/useEntitlement.test.ts | 88 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 88 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e1884f8ed0b2`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._