---
name: reference_stale_multicomponent_test_reconcile_2026_06_20
description: Reconciling a stale multi-component wiring test (engine grew a component the test scaffold predates) is NOT a simple additive change -- the helper fns + lifecycle tests are interdependent.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.210Z
aliases: reference_stale_multicomponent_test_reconcile_2026_06_20
---


**Finding (slot:india, 2026-06-20, while clearing AI-substrate RED).** `XProcNeuralAutoFireEngine.test.ts` had 4 pre-existing fails because the engine's `ALL_COMPONENTS` grew to 7 (added `conformal_monitor_bridge`, NN-STACK-INTEG-MS0/U-NN-INTEG-04, properly subscribed at engine L286) but the test scaffold still tracked 6: `COMPONENT_KEYS` (6 entries), `allActive()`/`noneActive()` helpers (6 `isSubscribedToOutcomes()` checks), `hardResetAll()` (no conformal reset), and a hardcoded "the other five" enabled-list assertion.

**The trap:** I tried a "comprehensive" scaffold update (add conformal to all 6 spots at once). It FIXED the 3 deepEqual/component-list fails but BROKE 3 OTHER previously-passing tests (failure-isolation, activate->deactivate->activate cycle, dispatch-deactivate) -> 4 fails became 7. Reverted to the pre-existing 4 (R12 -- never ship a worse state).

**Why it broke:** the scaffold pieces are INTERDEPENDENT. `allActive()`/`noneActive()` are consumed by the cycle + isolation tests; adding `conformal.isSubscribedToOutcomes()` to them makes those tests REQUIRE conformal to subscribe/unsubscribe correctly in EVERY lifecycle flow (cold activate, re-activate after deactivate, partial-failure activate). Adding `ConformalCalibrationMonitorEngine.reset()` to `hardResetAll` also changed cross-test leak behavior. The conformal `not_owned`-on-deactivate symptom needs per-flow tracing, not a blanket scaffold edit.

**Why:** a stale multi-component test isn't "add the missing name N places." The helpers encode lifecycle invariants; a new component must satisfy them in activate/deactivate/cycle/failure paths, which requires verifying that component's subscribe/unsubscribe is functional in each path FIRST.

**How to apply:** when an engine grows a component a wiring test predates: (1) verify the new component's subscribe/unsubscribe/isSubscribed works in EACH lifecycle flow (cold activate, re-activate, partial-fail) via a focused single-assertion test BEFORE touching shared helpers; (2) update the scaffold ONE assertion at a time, running between each, not all-at-once; (3) if a scaffold edit trades known fails for new ones, REVERT and defer -- a subtle multi-component reconciliation is not a safe last-iteration/rushed fix. Sibling of [[reference_xproc_fallthrough_severed_2026_06_20]] (same engine family).

**VALIDATED 2026-06-21 (U-XPROCAUTOFIRE-CONFORMAL-SCAFFOLD, XProcAutoFire 29/33 -> 33/33):** the retry SUCCEEDED by diagnosing the FULL mechanism first, then editing all 9 interdependent spots together. The mechanism: conformal_monitor_bridge subscribes to `outcome.completed`; `ConformalCalibrationMonitorEngine.reset()` only freshStates calibration and does NOT null the bus-subscription pointer (only `unsubscribeFromOutcomes()` does) -- so `hardResetAll` using reset() left a stale pointer -> every activate saw `alreadySubscribed` -> `not_owned`. The 9 spots: import; hardResetAll -> unsubscribeFromOutcomes (NOT reset); allActive/noneActive += conformal; COMPONENT_KEYS += conformal; subscriberCount("outcome.completed") 4->5; isolation enabled-list += conformal; owned-count 5->6; status components.length 6->7. KEY DELTA vs the failed all-at-once: (a) unsubscribe not reset, (b) the THREE count bumps (5,6,7) the blind edit missed. Lesson reinforced: the all-at-once BLIND edit traded 4 fails for 7; the all-at-once MECHANISM-FIRST edit cleared all 4 + the dependent counts -- it is not "incremental vs batch" that matters, it is "blind vs fully-diagnosed". All 4 neural-batch RED (PhysicsNeuralBridge/NeuralRouting/WireEDMNeural/XProcAutoFire) now green; india AI-substrate fully clean.
