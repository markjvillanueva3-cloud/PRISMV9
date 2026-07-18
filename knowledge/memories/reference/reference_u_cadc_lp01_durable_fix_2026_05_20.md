---
name: u-cadc-lp01-durable-fix-2026-05-20
description: U-CADC-LP01 recovery + 3-of-3 scrutiny caught a mock-hidden P0 (durable channel dead — 3 enum mismatches). Lesson — cross-engine contract tests must be non-mocked.
aliases: reference_u_cadc_lp01_durable_fix_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.234Z
---


# U-CADC-LP01 — durable-channel P0 (2026-05-20, slot delta)

Recovered an uncommitted unit the prior DELTA chat (`claude-c15271d5`) finished
but died before committing: `CADExecutionOutcomeBusEngine` (CAD-COMPLETE-MS0
closed-loop NN cluster, unit 1 of 6 — the chat had a target-6 loop queued at
iter 0). Committed `6d0b744959`; fix `a6bc393f37`.

**The bug — durable channel 100% dead in production.** `CADExecutionOutcomeBusEngine.publish()`
forwards every outcome to `outcomeCaptureBusEngine.record()` → `OutcomeEventSchema.safeParse()`.
The LP01 `record()` call was written against an *assumed* contract — **three** literal
values were not in the real schema enums, so safeParse rejected every event and
`record()` returned `ok:false` for all CAD outcomes:
1. `kind: "cad_execution_outcome"` — absent from `OutcomeKind`. Fixed: added as a base
   kind (NOT v1.1.0-gated — carries no version-guarded fields, valid under the default
   schemaVersion 1.0.0 `pickSchemaVersion()` stamps; V11_ONLY_KINDS untouched).
2. `source: "engine"` — not in `OutcomeSource` {operator,controller,cmm,sensor,system,
   import,erp,simulation,other}. Fixed → `"system"`.
3. `severity: "warning"` — not in `OutcomeSeverity` {info,low,medium,high,critical}.
   Fixed → failure branch `"medium"`.

**Why it was hidden + the lesson.** The sibling test `CADExecutionOutcomeBusEngine.test.ts`
`vi.mock`s `OutcomeCaptureBusEngine` — the stub `record()` returns `ok:true`
unconditionally, so all 22 tests passed against a dead channel. 3-of-3 scrutiny arm C
(analyst, integration-coupling weighted) caught bug #1 by cross-checking the enum;
arms A+B PASSed (structure/test-shape weighted — they did not cross-check). The
**non-mocked durable test** added in the fix (`CADExecutionOutcomeBusEngine.durable.test.ts`
— real `OutcomeCaptureBusEngine` + tmp rootDir + JSONL readback) then surfaced bugs
#2 and #3 that arm C had missed.

Root cause class: **R8** (call written without reading `OutcomeEventSchema`) + **R9**
(a mock-only test verifies the mock, not the contract). The type system missed it too —
`RecordOutcomeInput.source/severity` are loosely typed; only runtime `safeParse`
enforces the enums, and only a non-mocked test exercises that path.

**Standing takeaway:** any engine that emits onto a schema-validated bus needs a
non-mocked contract test (real consumer, real schema). A mocked-only test of a
cross-engine boundary is an R9 violation — it will go green on a dead channel.
See [[feedback_parallel_scrutiny_per_file]], [[feedback_verify_actual_contract_not_proxy]].

Tests: 25/25 engine (22 mocked + 3 durable) + 39/39 `outcomeEventSchema.v11` PASS.
3-of-3 re-review: A+B+C all PASS. Remaining CAD-COMPLETE-MS0 cluster: U-CADC-LP02/03/04,
U-CADC-NN01 (+1) — LP01 names LP02 (`CADPerAdapterFeedbackCollectorEngine`) as a consumer.
