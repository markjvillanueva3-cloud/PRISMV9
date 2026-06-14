---
name: reference_u_dispatcher_2026_05_16
description: U-DISPATCHER — wired prism_dev:roadmap_tool_plan_{query,build,coverage}. query=pure sidecar read; build/coverage=execFileSync subprocess delegation (R8). Per-file scrutiny caught the MS0 false-green recurring at the test-mock layer (ACTIONS z.enum missing → MockMCPServer bypassed it).
aliases: reference_u_dispatcher_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.999Z
---


**U-DISPATCHER shipped 2026-05-16** in `RGS-TOOL-AUTOINVOKE-MS1` (slot lima, `claude-02436db5`, 3 files). 9/9 wire tests GREEN, both per-file scrutiny arms PASS (Arm A FAIL→fixed→PASS, Arm B PASS-W-P1→fixed→PASS).

Closes the engine-wiring-doctrine violation: the tool-plan sidecar (`state/shared/roadmap-tool-plans.json`) had no dispatcher surface. Three `prism_dev` actions:
- `roadmap_tool_plan_query` — pure in-process JSON read; `plans[unitKey]` FLAT (post-P0-6a contract, no `.plan` nesting). <100ms hot-path-safe.
- `roadmap_tool_plan_coverage` — `execFileSync(process.execPath,[rgs-plan-coverage.mjs,--json])`; deterministic (no Ollama).
- `roadmap_tool_plan_build` — `execFileSync(process.execPath,[rgs-tool-planner.mjs,--unit <key>,--json,…])`; the script owns Ollama/lock/reader-composition.

**Design (R8):** `build`/`coverage` DELEGATE to the canonical `scripts/rgs-*.mjs` rather than re-implementing the Ollama reader / distributed lock / unit enumeration in TS — re-implementing would duplicate + drift. `execFileSync` (no shell) makes user-controlled `unit_key` injection-immune; Zod schema *additionally* `.regex(/^[A-Za-z0-9_:.\-]+$/)` + a runtime re-check in the `build` case (defense-in-depth, survives a refactor that calls the dispatcher past Zod).

**THE LOAD-BEARING LESSON — MS0's hermetic-fake hazard recurred one layer up.** Arm A (wiring) FAIL-P0: the 3 actions were in `ACTION_DEV_SCHEMAS` + case branches but **MISSING from the `ACTIONS` z.enum array**. The MCP SDK validates `action: z.enum(ACTIONS)` BEFORE the handler runs, so every production call would be rejected — but the `MockMCPServer` test harness calls `tool.handler({action,params})` directly, bypassing the SDK's enum validation. Result: 9/9 tests GREEN while production was 100% broken. **This is exactly the MS0 core lesson ("hermetic fakes don't prove production wiring") — except the fake was the TEST MOCK, not the readers.** The fix: append the 3 actions to the ACTIONS enum (1 line). Generalized rule: **a dispatcher-wire test using a mock server CANNOT prove the action is reachable — the `z.enum(ACTIONS)` parity must be verified separately (by the wiring-review-agent or a real-SDK integration test).** The MockMCPServer pattern in every `devDispatcher.*-wire.test.ts` shares this blind spot.

Arm B (reviewer) PASS-W-P1: the `coverage` E2E accepted both success AND structured-error, and the live sidecar has **0 plans** (schemaVersion 1.0.0 — it's populated by the nightly U-CRON replan, empty in a fresh checkout). So `withPlan<=totalOpen` reduced to `0<=4423` — a no-op stub would pass. Fixed with an anti-stub `expect(r.data.totalOpen as number).toBeGreaterThan(0)` — envelope enumeration yields ~4400+ open units; a hermetic stub returning `totalOpen:0` now FAILS, and only the real `execFileSync→script→JSON` round-trip satisfies it. The two "sidecar has hundreds of plans" comments were factually wrong (sidecar empty) and were corrected.

**Two more fixes during scrutiny:** (P2) build `it()` timeout 90s→130s — the dispatcher's `execFileSync` build budget is 120s; a 90s test timeout would vitest-kill the test before its structured-error path could fire (false-red under lock contention with the U-CRON nightly). (slimResponse) `expect(r.data.plan).toBeNull()` failed `expected undefined to be null` — the dispatcher pipes results through `responseSlimmer` which STRIPS null/undefined/empty keys ([[reference_slimresponse_strips_empty_arrays]]); fixed to `expect(r.data.plan ?? null).toBeNull()` (slimmer-tolerant, non-weakening — the `found:false` assertion above still rejects a `{found:true,plan:{...}}` stub).

**Verify:** `cd mcp-server && npx vitest run src/__tests__/devDispatcher.rgs-tool-plan-wire.test.ts` → 9/9. `npx tsc --noEmit | Select-String "devDispatcher\.ts|devActionSchemas\.ts"` → empty (repo has unrelated pre-existing tsc errors; anti-regression bar = no NEW errors in the 3 modified files).

**Deferred (P2/P3, both arms agree non-blocking):** `query` `found:true` happy path untested (sidecar empty in CI; coverage E2E carries the real-wiring proof); lock-contention surfaced with debug context but not machine-classifiable into a retry-able code; `stderr` envelope-id-warning noise could push the genuine cause out of the `.slice(-800)` tail on a real failure.

**MS1 progress: 4/8 complete** (U-INTEG-FIX-P0 `b287c1614`, U-CRON `025d5c248`, [[reference_u_domain_rules_2026_05_16|U-DOMAIN-RULES]] `e11def3f9`, U-DISPATCHER this commit). P1 remaining: [[reference_u_feedback_forcing_2026_05_17|U-FEEDBACK-FORCING]], U-RIE-ADAPTER, U-CALIBRATION, U-TRANSFER. Sister memories: [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]], [[reference_u_domain_rules_2026_05_16]], [[reference_slimresponse_strips_empty_arrays]].

---

## Collision-absorption disclosure (3-of-3 Arm C P1, resolved 2026-05-16)

Commit `c7157f898` absorbed an unrelated peer change via the commit-ownership collision: `git add mcp-server/src/tools/dispatchers/devDispatcher.ts` staged the WHOLE file, which already held claude-32a39c0c's uncommitted **PILLAR-TELEMETRY-FIX** (`pillar_score`/`pillar_summary` cases ~lines 410-437: live-resolve `resolveLivePillarInputs()`/`productPillarEngine.getSummaryLive()` when params absent, back-compat-guarded on explicit params). It rode along under the `[RGS-TOOL-AUTOINVOKE-MS1]/U-DISPATCHER` subject — undocumented in that commit's message/envelope/wiki.

**Correctness verified (the only thing that gates the 3-of-3):** `ProductPillarEngine.ts:359` exports `resolveLivePillarInputs`; `:472` defines the `getSummaryLive` method; devDispatcher.ts:2465 already imports both at the existing `pillar_*` call-site. Arm C's worst case ("missing exports → unhandled throw for no-param callers") does NOT materialize — the symbols exist and resolve. The pillar change is functional, not a latent bug.

**Resolution per lane discipline:** peer in-flight work is NOT reverted (claude-32a39c0c owns `ProductPillarEngine.ts`; reverting the dispatcher cases would clobber their PILLAR-TELEMETRY-FIX). The ride-along is DISCLOSED here + on the chat-bus + in the handoff (R12 fail-loud, not silent). Attribution is muddled (pillar fix lives under a U-DISPATCHER subject) but the code is correct. Same collision class as [[reference_coord_ms0_u4_collision]] / [[reference_fleet_reaper_ship_collision]] — document, don't re-create, don't revert.

**For the next chat / claude-32a39c0c:** the PILLAR-TELEMETRY-FIX shipped (in c7157f898, not a standalone commit). Do not rebuild it. If a standalone attribution/envelope entry is wanted, cherry-pick-document from c7157f898 — the pillar hunk is devDispatcher.ts ~410-437.
