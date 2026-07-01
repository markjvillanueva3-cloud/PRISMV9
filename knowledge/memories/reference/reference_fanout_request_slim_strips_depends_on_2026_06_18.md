---
name: reference_fanout_request_slim_strips_depends_on_2026_06_18
description: "A Zod-required array field that can be empty + is returned through ok()/slimResponse loses its empty value, breaking the downstream re-parse -- give it .default([])."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.572Z
aliases: reference_fanout_request_slim_strips_depends_on_2026_06_18
---


**FanoutPlanRequest round-trip silently corrupted by slimResponse (slot:bravo, 2026-06-18, U-GOAL-DECOMPOSER `31cd3ed86c`)** -- caught by per-file 2-arm scrutiny arm A (analyst), missed by arm B.

**The bug class (instance):** `HermesGoalDecomposerEngine.decompose()` returns a `FanoutPlanRequest` whose LEAF subtasks have `depends_on: []`. The dispatcher returns it via `ok({ request })`, and `ok()` pipes every payload through `slimResponse` (`mcp-server/src/utils/responseSlimmer.ts:43` -- `if (Array.isArray(value) && value.length === 0) continue;`), which DROPS the empty `depends_on` key from each leaf. When that JSON is fed back to the next pipeline step (`prism_session:project_governed_schedule` / `wave_loop_step`), `FanoutPlanRequestSchema.parse(req)` (`ZuluWaveSchedulerEngine.ts:585`) threw **"Required"** on every leaf, because `SubtaskSchema.depends_on` was `z.array(z.string()).max(20)` with NO default. So the C1 front-end's output was unconsumable by the C1 executor it exists to feed. It passed green because NO test round-tripped the *returned* request through slimResponse + re-parse (the happy unit test asserted the engine's direct return, which never hits slimResponse).

**Fix (root-cause):** `SubtaskSchema.depends_on: z.array(z.string()).max(20).default([])` (`HermesParallelFanoutPlannerEngine.ts:23`). `absent === leaf === []` is the correct semantics; additive-only (`z.infer` OUTPUT type stays required `string[]`, so `type Subtask` + every consumer is unchanged). Hardens EVERY schema consumer, not just my dispatcher path. Plus a fail-first regression test (`sessionDispatcher.hermesDecompose.e2e.test.ts`) that stubs the Ollama singleton, drives the LIVE decompose path, and asserts the returned `request` re-parses with leaf `depends_on === []`.

**Why / How to apply (generalizable):** Any Zod-**required** array field that can legitimately be EMPTY, on an object that is ever returned through `ok()`/`slimResponse` (or any serializer that drops empty arrays) and re-parsed downstream, MUST carry `.default([])` (or the object must be slim-exempt). Otherwise the empty value is stripped on the wire and the re-parse throws "Required". This is the round-trip sibling of the known slimResponse-strips-empty-arrays class -- the new wrinkle is that a *re-validating consumer* turns the silent strip into a hard parse throw. When you build any X -> serialize -> consume pipeline, add a test that round-trips the ACTUAL produced object through the real return path (not the engine's direct return), so the slim+re-parse seam is exercised. → [[feedback_wire_test_validate_all_galaxies]] · sibling [[reference_slimresponse_strips_empty_arrays]]
