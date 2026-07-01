---
name: reference_acp_ms0a_schema_contract_tests_2026_06_22
description: "ACP-MS0A (Automation Control Plane) contract schema was fully shipped on disk but had ZERO tests + a stale not_started milestone status; alpha froze it with 32 reference-value tests. Pattern: shipped-but-untested foundation schemas surface as phantom pick-unit picks (slot:alpha 2026-06-22)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.460Z
aliases: reference_acp_ms0a_schema_contract_tests_2026_06_22
---


# ACP-MS0A contract-schema tests + the shipped-but-untested-foundation pattern (slot:alpha 2026-06-22)

Commit `6b6d02c841` `[MAIN-FORCE] [ACP-MS0A]/U-ACP-SCHEMA-CONTRACT-TESTS` (cad-fusion-live-ms0).

## What happened
`pick-unit --slot alpha` surfaced `ACP-MS0A / P0-U03` ("downgrade/fail-closed behavior rules per chain tier") as the top devtools-tier candidate. Investigation found the ENTIRE milestone P0 is already implemented on disk in `mcp-server/src/schemas/automationChainSchema.ts` (every unit P0-U01..U05 present + `@milestone ACP-MS0A` tagged):
- P0-U01 `AutomationChainSchema` (id/steps/triggers/token_budget) · P0-U02 `Command/EventMappingSchema` · P0-U03 `FailBehaviorSchema`+`TierFailRulesSchema`+`TIER_FAIL_RULES` · P0-U04 `TelemetryEventSchema` · P0-U05 `BudgetEnforcementSchema`+`TOKEN_BUDGET_GUIDELINES`.

But: (1) **ZERO tests** (R9/R15 TEST leg missing); (2) the milestone JSON still says `status:"not_started"`; (3) no consumer import (expected -- consumers are the future ACP-MS1+ milestones: entry router into UserPromptSubmit, post-tool validation, context-trim). So the schema is the dependency-ordered FOUNDATION (R13) awaiting its MS1 consumers -- a legitimate not-yet-wired contract, not an orphan violation.

## The unit
Added `mcp-server/src/__tests__/automationChainSchema.test.ts` -- 32 reference-value/invariant tests that FREEZE the contract (the milestone's own exit-condition is "schema frozen and validated"; the tests ARE that validation). Coverage: enum vocabularies frozen; `TIER_FAIL_RULES` deep-equality on the behavioral projection (strips prose `description`) so any per-tier downgrade-semantics flip fails (critical=fail_closed/0-retries/abort, standard=degrade_warn/1/user, background=degrade_silent/2/log) + a standalone critical-tier safety invariant; `TOKEN_BUDGET_GUIDELINES` caps (entry 500 / coding 2K / autopilot 5K) + cheapest/dearest invariant; `AutomationChainSchema` happy + 4 failure modes + 2 adversarial (unknown-field strip via `"k" in parsed === false`, 0ms timeout reject); trigger priority bounds [1,100]; budget-enforcement defaults + >100pct reject; telemetry ISO-timestamp / non-negative-cost. 32/32, tsc-clean, 3-of-3 PASS (0 P0/P1; one P2 -- `ChainStepSchema` only transitively tested, deferrable).

## The reusable pattern (for any slot hunting FIXES/close-out)
A milestone's `status:"not_started"` does NOT mean nothing was built -- a prior session may have shipped the artifacts on disk without committing under the milestone id or marking the envelope. Before building a "not_started" pick: GLOB/READ the named deliverable file (here the schema). If it exists + is complete, the real gap is usually TESTS (R15 TEST leg) and/or a stale milestone status. Adding the missing tests is a clean, in-domain, dependency-correct unit (prove the foundation before consumers build on it). Do NOT hand-edit the milestone-envelope `status` -- `state/shared/MILESTONE_PROGRESS.{md,json}` is GENERATED (input = the envelope); reconcile via `scripts/build-milestone-progress.mjs` / a close-out pass. Sibling of [[feedback_read_full_content_not_titles]] + [[feedback_never_assume_data_file_contents]].

## Follow-ups (routed, not done here)
- ACP-MS0A milestone status still `not_started` (stale) -> reconcile via the generator/close-out (alpha did not hand-edit roadmap state).
- ACP-MS1+ (entry router into UserPromptSubmit, post-tool schema validation, context-trim by bundle type) are the schema's CONSUMERS -- the natural next ACP units, still `not_started`. Each would consume this now-frozen contract.
- P2: add a direct `ChainStepSchema` describe block (currently covered transitively via `AutomationChainSchema.steps`).
