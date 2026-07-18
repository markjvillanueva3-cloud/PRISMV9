---
title: CMCCL ledger reland + setConfig mutate-then-validate pollution
type: lesson
slot: india
date: 2026-06-15
tags: [dispatcher-wiring, orphan-rescue, R12, validate-before-assign, ai-training]
commit: cad-fusion-live-ms0 (aiReasoningDispatcher + LoRADriftCoordinatorEngine)
---

# CMCCL ledger reland + setConfig pollution (slot:india 2026-06-15)

## Two lessons from wiring 18 DATA-only prism_ai actions across 6 india AI engines.

### Lesson 1 -- "test is RED" != "wrapper-path bug". Grep the action for dispatcher refs FIRST.
`ai-dispatcher-ledger-wire.test.ts` (CAM-ML-CLOSEDLOOP-MS0 U-CMCCL09/10) was red with 17 failures.
A prior session mis-diagnosed it as "the tests assert top-level `r.X` but the dispatcher now wraps
`{success:true, data: slimResponse(result)}`, so they need `r.data.X`." That was WRONG. The real cause:
all 10 `ledger_*`/`ledger_drift_*` actions had **ZERO refs in any dispatcher** -- the engines
(MasterAITrainingLedgerEngine, LoRADriftCoordinatorEngine) shipped complete under U-CMCCL09/10 but the
dispatcher wiring **never landed on cad-fusion-live-ms0**. The test was `@ts-nocheck`'d (never type-checked
or run green) until `6ec393cf41` (U-EFF16) stripped the directive, exposing it red.

> **Rule:** before assuming a red dispatcher test is a contract/shape mismatch, `grep -c '"<action>"|case "<action>"'`
> the dispatcher. **0 refs = UNWIRED** (a wire-the-surface job), a categorically bigger fix than a
> `r.` -> `r.data.` assertion sweep. Verify the *actual* failure (`Unknown action: X` in the error) before
> picking the fix. (R12; sibling of [[feedback_read_full_content_not_titles]].)

The fix was: wire all 10 actions (ACTIONS+SCHEMAS+case+union spread) + update only the ~13 SUCCESS
assertions to `r.data.*` (error assertions stay `r.error` because validation guards `return dispatcherError(...)`
and engine throws are caught by the outer try -> both top-level). 39 -> 41 green.

### Lesson 2 -- wiring an engine can EXPOSE a latent engine bug. Validate-before-assign.
`LoRADriftCoordinatorEngine.setConfig` was **mutate-then-validate**:
```ts
this.config = { ...this.config, ...patch };   // assigns FIRST
if (this.config.coordinatedThreshold < 2) throw ...   // validates AFTER
```
Harmless while only in-process callers used it. The moment `ledger_drift_config{set}` made it
dispatcher-reachable, a rejected `{coordinatedThreshold:0}` left the singleton at threshold 0 -- and
`shouldTriggerMasterRetrain()` (`activePipelines().length >= 0`) then fires a **master retrain on EVERY
single-pipeline drift**. A real false-trigger, reachable from the wire.

> **Rule:** validate a CANDIDATE (`const next = {...this.config, ...patch}`) and assign `this.config = next`
> only after all checks pass. A rejected patch must leave state FULLY unchanged (no partial apply of valid
> sibling fields). When you dispatcher-wire an engine, audit its setters for mutate-then-validate.
> (operator fix-inline doctrine [[feedback_auto_fix_and_blackwell_fleet_enforced]].)

### Corollary -- the WIRE owns input guards for pure compute/IO engines.
`detect()` (FFT/wavelet O(n log n)) and `getPending()` (disk scan) do NOT guard their own input. The
dispatcher case owns: non-empty finite-number `samples` + positive `sample_rate_hz` + a 250000-sample
DoS cap; the pure engine stays a pure kernel.

## Verify
`cd mcp-server && npx vitest run src/__tests__/ai-dispatcher-ledger-wire.test.ts src/__tests__/LoRADriftCoordinatorEngine.test.ts` -> 88/88. tsc: 0 errors in the 4 changed files.
Memory: [[reference_cmccl_ledger_reland_2026_06_15]].
