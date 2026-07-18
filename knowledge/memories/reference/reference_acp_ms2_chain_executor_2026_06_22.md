---
name: reference-acp-ms2-chain-executor-2026-06-22
description: ACP-MS2 shipped the AutomationChainEngine.executeChain executor (the telemetry PRODUCER) emitting budget_exceeded/timeout; scrutiny caught a dispatcher-boundary allow-set drift (R15 wire-to-ALL-surfaces). slot:alpha.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.460Z
aliases: reference_acp_ms2_chain_executor_2026_06_22
---


# ACP-MS2 chain executor -- the telemetry producer (slot:alpha, 2026-06-22)

**Commit `09b9992220`** `[MAIN-FORCE] [ACP-MS2]/U-ACP-CHAIN-EXECUTOR` on cad-fusion-live-ms0. 6 files, +543/-32, 114 tests green (10 executor + 19 conformance + 36 schema + 35 telemetry + 14 dispatcher-boundary), 0 tsc errors.

## What shipped
`AutomationChainEngine.executeChain(taskClass, runner, opts)` -- the missing PRODUCER. Before this, the engine only classified/resolved static chain definitions; nothing executed steps, enforced budget/timeout, or emitted the schema's `timeout`/`budget_exceeded` statuses (they were defined in `TelemetryEventStatusSchema` but unreachable). The executor:
- runs each `ChainStep` via a caller-injected `ChainStepRunner` (engine stays PURE -- all I/O in the callback);
- enforces `token_budget` (cumulative spend > budget -> terminal `budget_exceeded`, abort) and per-step `timeout_ms` (real `Promise.race` + always-cleared timer -> terminal `timeout`);
- applies `TIER_FAIL_RULES` retries (critical=0 retries, standard=1, background=2) on required steps; non-required step failure -> `skipped` + degrade-continue;
- emits exactly TWO chain-level telemetry events per run (one `started` + one terminal) so the aggregator's per-chain rates stay in [0,1]; full per-step log returned in the result, not ingested;
- `opts.ingest` (default false) opts into feeding AutomationChainTelemetryEngine.

## Coupled R7 reconciliation (same commit)
- Removed the engine's LOCAL 4-value `TelemetryEvent` interface; single-sourced `TelemetryEvent` + `TelemetryEventStatus` from `automationChainSchema.ts` (import + re-export, preserving the public type-import API the 5 consumers use). The local redeclaration couldn't even express the 2 statuses the executor now produces.
- `AutomationChainTelemetryEngine` `ALLOWED_STATUSES` now derived from `TelemetryEventStatusSchema.options` (was a hard-coded 4-value literal) -> can never drift from the contract again. `timeout`/`budget_exceeded` routed to the `failed` (downgrade) counter -- purely additive, those statuses were previously unreachable at ingest.

## THE LESSON (R15 wire-to-ALL-surfaces; scrutiny-caught P1)
Per-file 2-arm scrutiny: arm B PASS, **arm A (code-analyzer) FAIL on a real P1** -- the dispatcher front door `telemetryActionSchemas.ts` `automation_chain_record.status` still pinned the OLD 4-value `z.enum`, so an external caller forwarding an executor's `budget_exceeded`/`timeout` event through `prism_telemetry:automation_chain_record` would be rejected at `validateActionParams` BEFORE `ingest()` ran. The in-process `executeChain({ingest:true})` path bypasses the dispatcher, so the test suite never exercised the gap. **Widening a producer's output contract means widening EVERY surface that re-validates it -- engine type + aggregator allow-set + the DISPATCHER action schema.** Fixed by single-sourcing the dispatcher enum from `TelemetryEventStatusSchema.options` too + a new `telemetryActionSchemas.test.ts` (14 tests) that locks the boundary (the dispatcher schema had ZERO test coverage before -- which is why the drift was invisible). Also corrected a now-false conformance test block that asserted the engine "cannot emit timeout/budget_exceeded" (R9 -- a test must encode current truth).

## Pattern worth reusing
When you add a PRODUCER of a previously-defined-but-unreachable value: grep every CONSUMER that re-validates that value (engine type, aggregator allow-set, dispatcher action schema, any zod boundary) and single-source them all from the one canonical enum. A `.passthrough()` on a dispatcher object does NOT relax a declared enum field. Related: [[reference_precompact_hookspecificoutput_contract_fix_2026_06_22]] (sibling contract-drift fix this session).
