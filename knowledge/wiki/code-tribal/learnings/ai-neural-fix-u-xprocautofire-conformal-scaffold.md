# AI-NEURAL-FIX/U-XPROCAUTOFIRE-CONFORMAL-SCAFFOLD — [MAIN-FORCE] [AI-NEURAL-FIX]/U-XPROCAUTOFIRE-CONFORMAL-SCAFFOLD (slot:india): reconcile the XProcNeuralAutoFire test scaffold with the 7th component (conformal_monitor_bridge) -- the deferred hard one, done right

**Commit:** `96562fbe108e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T23:59:55-05:00
**Tags:** ai-neural-fix, u-xprocautofire-conformal-scaffold, auto-distilled

## Subject
[MAIN-FORCE] [AI-NEURAL-FIX]/U-XPROCAUTOFIRE-CONFORMAL-SCAFFOLD (slot:india): reconcile the XProcNeuralAutoFire test scaffold with the 7th component (conformal_monitor_bridge) -- the deferred hard one, done right

## Body
```
[MAIN-FORCE] [AI-NEURAL-FIX]/U-XPROCAUTOFIRE-CONFORMAL-SCAFFOLD (slot:india): reconcile the XProcNeuralAutoFire test scaffold with the 7th component (conformal_monitor_bridge) -- the deferred hard one, done right

BUG (XProcNeuralAutoFireEngine.test.ts 4 fails): the engine's ALL_COMPONENTS grew to 7 (NN-STACK-INTEG-MS0/U-NN-INTEG-04 added conformal_monitor_bridge, which subscribes to outcome.completed at activate and unsubscribes at deactivate) but the test scaffold predated it and tracked only 6.

ROOT MECHANISM (fully traced before touching anything, per [[reference_stale_multicomponent_test_reconcile_2026_06_20]]): hardResetAll() wiped the bus (feedbackBusEngine.reset()) but NOT conformal's internal subscription pointer (ConformalCalibrationMonitorEngine.reset() only freshStates calibration -- it does NOT call unsubscribeFromOutcomes, which is the only thing that nulls this.subscription). So the stale pointer made every activate see alreadySubscribed=true -> action "already_active"/not_owned, never re-subscribing -> conformal stayed off the fresh bus -> the subscriberCount("outcome.completed")=4 assertion passed by accident while cold-activate/deactivate/status failed.

FIX (9 coordinated scaffold spots, ALL required together -- my first all-at-once attempt was reverted because it used reset() not unsubscribe AND missed the count bumps): import ConformalCalibrationMonitorEngine; hardResetAll -> unsubscribeFromOutcomes() (NOT reset); allActive()/noneActive() += conformal isSubscribed; COMPONENT_KEYS += conformal; subscriberCount("outcome.completed") 4->5 (conformal subscribes there); isolation-test enabled list += conformal; owned-count 5->6; status components.length 6->7. R9: every assertion still verifies real per-component activate/deactivate/status behavior -- coverage STRENGTHENED to the full 7-component contract, not weakened.

VERIFY: XProcNeuralAutoFireEngine.test.ts 29/33 -> 33/33; tsc 0 new errors (import resolves); test-only (engine already correct). CLOSES all 4 neural-batch RED files this continuation (PhysicsNeuralBridge + NeuralRouting + WireEDMNeural + XProcAutoFire). Lesson confirmed: diagnose the FULL mechanism (every interdependent count + the subscribe/leak semantics) BEFORE editing a multi-component test scaffold -- the all-at-once blind edit traded 4 fails for 7; the mechanism-first edit cleared all 4.
```

## Files touched (2)
- mcp-server/src/__tests__/XProcNeuralAutoFireEngine.test.ts | 23 ++++++++++++++---------
- 1 file changed, 14 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till verifies real per-component activate/deactivate/status behavior -- coverage STRENGTHENED to the full 7-component contract, not weakened.
- Lesson confirmed: diagnose the FULL mechanism (every interdependent count + the subscribe/leak semantics) BEFORE editing a multi-component test scaffold -- the all-at-once blind edit traded 4 fails for 7; the mechanism-first edit cleared all 4.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96562fbe108e`
- Milestone envelope: `mcp-server/data/milestones/AI-NEURAL-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._