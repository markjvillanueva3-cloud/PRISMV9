---
name: reference_oscar_sfc_outcome_bus_real_2026_06_22
description: "FIXED (slot:oscar 2026-06-22, U-SFC-OUTCOME-BUS-REAL): SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture() was hardwired `return true` -> stats().bus_capture_success_rate_pct was a fabricated constant 100% (R12 violation, flagged by bravo 2026-06-11 sweep + galaxy CLAUDE.md S5.5/S12). Now calls the real captureSFC (sfcOutcomeWire) and returns its `ok`, so the metric is truthful + the NineAxis layer actually reaches the canonical bus. The 'circular dep, capture happens upstream' rationale in the old comment was FALSE: captureSFC is sync middleware (lower layer), imported statically by 6 SF engines; the NineAxis orchestrator does NOT emit captureSFC for its own layer, so this bridge is the correct (non-duplicate) capture point. 8-test proof incl an R9 mixed-ratio test that fails against the old hardwired-true."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.709Z
aliases: reference_oscar_sfc_outcome_bus_real_2026_06_22
---


**SFC outcome-feedback bus capture made REAL (slot:oscar 2026-06-22, `U-SFC-OUTCOME-BUS-REAL`).** Closed the long-standing R12 open bug documented in the speed-feed galaxy doctrine (CLAUDE.md S5.5 / S12, MEMORY.md finding #1; originally flagged by bravo's 2026-06-11 SFC orphan-wire sweep).

## The bug
`SpeedFeedOutcomeFeedbackBridgeEngine.tryBusCapture()` was literally:
```ts
try { return true; } catch { return false; }
```
with a comment rationalizing it ("inline dynamic require would create a circular dep ... the bus capture happens upstream"). Consequence: every `capture()` set `bus_capture_ok: true` unconditionally -> `stats().bus_capture_success_rate_pct` was a **fabricated constant 100%**, and the `speedfeed_outcome_stats` dispatcher action EXPOSED that fake number. The NineAxis layer's recommendations never actually reached the canonical `sfcOutcomeWire` bus.

## Why the rationale was false (R8 read-before-write paid off)
- `captureSFC` (`src/middleware/sfcOutcomeWire.ts`) is a **synchronous**, fire-and-forget function (swallows its own errors, returns `{ ok, lineage_id, event_id, summary, warning? }`). No async/dynamic-import needed.
- It is **middleware** -- a strictly lower layer than engines -- and is already imported **statically** by 6 SF engines (Ultimate, AutoSpeedFeedCalculator, Lathe facade, MachineAware, SFCCalculate, DeepLearning). No circular dependency.
- The NineAxis orchestrator (`SpeedFeedNineAxisOrchestratorEngine.ts:680`) calls `bridge.capture()` but does **not** itself emit `captureSFC` for the NineAxis layer -> this bridge IS the correct, non-duplicate capture point for that layer.

## The fix
`tryBusCapture(input, result)` now statically imports + calls:
```ts
const emission = captureSFC({
  engine: "SpeedFeedNineAxisOrchestratorEngine",
  action: "sfc_nine_axis_run",
  context: { machine_id: input.machine?.name ?? "default_3axis_vmc", operation: result.sfc.resolved.operation },
  recommended: result.recommendation,
});
return emission.ok === true;
```
`try/catch` still defends (captureSFC is contracted never to throw, but a telemetry failure must report failure, never a false success, and must never break SFC computation).

## Tests (R9 -- the key one fails against the old code)
`SpeedFeedOutcomeFeedbackBridge-bus-capture.test.ts` (8 tests, captureSFC mocked to control bus success):
happy ok:true->100%; ok:false->0% (proves not hardwired); **mixed 2 ok + 1 fail -> 66.67%** (the R9 intent test -- impossible to pass under the old `return true`); captureSFC throws -> false; returns undefined -> false; wiring proof (called once with the NineAxis engine tag + action + recommendation payload); machine fallback; empty-buffer 0%. Existing `calcDispatcher.speedfeed-outcome-wire.test.ts` (9) + `SFOutcomeFeedbackLoopWire.test.ts` (7) still green = 24/24.

## Lesson (generalizable)
A stubbed boolean defended by a plausible-sounding comment ("happens upstream / circular dep") is exactly the R12 fail-loud trap -- it fabricates a success metric. Before trusting such a rationale, READ the dependency: here the "circular dep" was imaginary (middleware is a lower layer; 6 engines already import it statically). Doctrine updated in BOTH the galaxy CLAUDE.md (S2/S5.5/S6/S12) and MEMORY.md so no stale "KNOWN BUG / DO NOT trust" text survives the fix.
