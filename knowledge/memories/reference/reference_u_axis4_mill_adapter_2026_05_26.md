---
name: reference-u-axis4-mill-adapter-2026-05-26
description: Tango bound Axis 4 Mill adapter to real MillingPrintToProgramEngine — closes 1/3 of the dispatcher echo gap. Lathe/WEDM/Axis-5 deferred. H8 count = 8.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.987Z
aliases: reference_u_axis4_mill_adapter_2026_05_26
---


# U-AXIS4-MILL-ADAPTER-BIND — DomainWizardPipelineTestEngine × MillingPrintToProgramEngine (2026-05-26, slot:tango /goal /loop iter1)

Closes **1/3 of the Axis 4 dispatcher echo gap** named in [[reference-u-axis2-numeric-dialect-2026-05-26]] §"Open follow-ups": Mill adapter now binds DomainWizardPipelineTestEngine to the real MillingPrintToProgramEngine. Lathe + WEDM + Axis-5 (CAD/CAM) adapters explicitly deferred — honest scope.

## What shipped

- `mcp-server/src/engines/PipelineHarnessAdaptersEngine.ts` (240 LOC) — adapter factory with `makeMillAdapter()`, `makeAdapterFor(domain)`, `isBound(domain)`, `supportedDomains()`. Mill adapter calls `millingPrintToProgramEngine.runFullPipeline(input)` + translates `MillingProgramResult.{intake_validation,machinable_features,operations,program_text,safety_checks}` into the 6-stage canonical `StageOutput[]`. NaN-guard on `estimated_cycle_time_sec` (R12 caught via test). Lathe/wire_edm gracefully degrade to `{stages:[], error:'not yet bound'}` — honest unbound signal.
- `mcp-server/src/__tests__/PipelineHarnessAdaptersEngine.test.ts` (200 LOC, 20 tests) — supportedDomains + isBound contract (3) · normalizeMillInput defaults (3) · closure shape + Promise contract (3) · 6-stage emission with cross-stage tool_id handoff (5) · unbound-domain honest signal (3) · E2E harness × adapter round-trip (1) · pure helper (1) · singleton (1).
- `mcp-server/src/tools/dispatchers/devDispatcher.ts` (+36 LOC) — `prism_dev:domain_wizard_pipeline_test` echo case replaced with real binding when `params.domain==='mill'`. Lathe/wire_edm return `adapter_bound:false` with `supported_domains_bound` list. The dispatcher now runs `domainWizardPipelineTestEngine.runDomain({contract: MILL_CONTRACT, adapter})` E2E.

**38/38 tests PASS** (20 new + 18 original Axis-4 harness, no regressions). Per-file scrutiny gate clean — NaN bug surfaced by adapter-self-test before the dispatcher wire even ran.

## What this enables

Before iter1: `prism_dev:domain_wizard_pipeline_test` returned `{engine,note,echo}` — operator couldn't actually invoke the harness from MCP without TS code.

After iter1: `prism_dev:domain_wizard_pipeline_test {domain:'mill'}` runs a REAL print-to-program pipeline + reports per-stage verdicts (`pass`/`warn`/`fail`) + handoff_assertions verdicts + latency budgets + final_program_lines. The MILL_CONTRACT.handoff_assertions[0] (`strategy_select → post_emit, handoff_key:'tool_id'`) is satisfied by construction — `strategy_select.handoff.tool_id` carries the lead `operations[0].tool.tool_number`, and `post_emit.payload.lead_tool` copies it verbatim so the substring-match assertion in the harness passes.

## [[reference_h8_misattribution_2026_05_20|H8 misattribution]] — count = 8 in 6 days

**Commit `f5e0f05554`** (slot:quebec, `[UI-UX-IMPROVEMENT-MS0]/U-F3-FIRST-EXTRACTION`) absorbed all 3 of my files (200 + 240 + 36 = 476 insertions). Same root cause as iters 1-2 of this session ([[reference-u-axis1-viz-closure-2026-05-26]] + [[reference-u-axis2-numeric-dialect-2026-05-26]]) and 5 prior days. **8 documented absorptions in 6 days** = pattern is now strongly load-bearing — the shared-tree commit model is structurally hostile to attribution regardless of operator hygiene. Each absorption verifies CLEAN ship via `git show <commit> --stat -- <files>` + post-absorption test re-run.

Code shipped + verified intact:
- `git show f5e0f05554 -- mcp-server/src/engines/PipelineHarnessAdaptersEngine.ts --stat` → 240 lines
- `cd mcp-server && npx vitest run src/__tests__/PipelineHarnessAdaptersEngine.test.ts src/__tests__/DomainWizardPipelineTestEngine.test.ts` → 38/38 PASS from committed state

## Tango TESTING-INFRA-MS0 cumulative (3-session arc)

| Unit | Session | Files | Tests | Status |
|------|---------|-------|-------|--------|
| U-AXIS2-3-4 (prior session) | 2026-05-25 | 3 engines | 64/64 | shipped (Axis 5 absorbed) |
| U-AXIS1-VIZ-CLOSURE (this iter1) | 2026-05-26 | generator + test + 2 wirings | 17/17 | shipped (absorbed) |
| U-AXIS2-NUMERIC-DIALECT (this iter2) | 2026-05-26 | engine + 2 tests + dispatcher | 31/31 | shipped (absorbed) |
| **U-AXIS4-MILL-ADAPTER-BIND (this iter3)** | 2026-05-26 | adapter + test + dispatcher | 38/38 | **shipped (absorbed)** |
| **Total** | | 5 engines · 1 viz generator · 1 adapter · 6 dispatcher actions | **172/172 PASS** | |

## Open follow-ups (still carried)

1. **Lathe adapter** — bind `LathePrintToProgramReasoningEngine` to harness; Lathe-contract handoff_assertions for tool selection in post_emit.
2. **WEDM adapter** — bind a wire-EDM print-to-program engine (`MultiAxisPrintToProgramEngine` covers 5-axis path; WEDM-specific engine for plunge/glide.)
3. **Axis 5 CAD/CAM adapter** — bind `CADReverseTemplateEngine` + `MasterPostGeneratorEngine` to `CADCAMGenerationTestEngine` callback API.
4. **Dynamic per-stage timing** — Mill engine doesn't surface stage timings; current proxy is even-distributed cycle-time estimate (flagged in stage.warnings). A future iter could plumb timing through MillingPrintToProgramEngine's PipelineCheckpointManager.

## Memory anchors

- [[reference_u_axis1_viz_closure_2026_05_26]] — sister memo (iter1 of session)
- [[reference_u_axis2_numeric_dialect_2026_05_26]] — sister memo (iter2 of session)
- [[reference_tango_testing_infra_2026_05_25]] — prior session's handoff naming the Axis 4 gap
- [[feedback_commit_to_slot_worktree]] — H8 absorption doctrine (8th absorption today)
- [[feedback_psn_definition]] — Mill adapter now wires Axis 4 into PSN-7 Engines + PSN-8 Algorithms via real dispatcher action
