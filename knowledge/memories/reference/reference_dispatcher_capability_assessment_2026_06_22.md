---
name: reference_dispatcher_capability_assessment_2026_06_22
description: "Full dispatcher-layer assessment (111 dispatchers / 14257 actions): verdict ~85% ENHANCE-not-build; genuine P0 = 61 method-mismatches; the 5 dormant dispatchers are KNOWN+classified by tango's standing tool (machine/security = operator-safety-decision, NOT blind-wire)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.553Z
aliases: reference_dispatcher_capability_assessment_2026_06_22
---


# Dispatcher capability assessment (2026-06-22, slot:bravo, claude-ab0dca09)

Operator: "full assessment on current dispatcher capabilities, do we need to enhance or build more?" Ran a 6-dimension parallel Workflow (`wf_bfbc1792-5ff`, 7 agents) + verified P0 claims against source. Full spec: `state/shared/specs/DISPATCHER-CAPABILITY-ASSESSMENT-2026-06-22.md`.

## Verdict: ~85% ENHANCE/HARDEN, ~15% BUILD-NEW. The architecture is sound; debt is concentrated integrity+hygiene on existing capability. Do NOT expand the surface.

## VERIFIED (against source)
- **111 dispatcher files, 14,257 advertised actions.** Hub `bindDispatchers()` in `mcp-server/src/index.ts` (NOT dispatchers/index.ts — that doesn't exist) makes 100-101 register calls.
- **Genuine P0 = the 61 method-mismatches** (reachable-but-throw; my detector, ledger `DISPATCHER-ENGINE-METHOD-AUDIT.md`).
- `camDispatcher` = 20,804 lines / 2,488 actions (17% of fleet, one file).
- **cadAutomation frontend-404**: `web/src/api/cadAIStateMachine.ts:57` fetches `/dispatch/prism_cad_automation` which is dormant → real loose end (delta's call).

## KEY RECONCILIATION (R8/R12 — the workflow OVER-claimed; I corrected it)
The "unregistered dispatchers = accidental P0 orphans, wire them" framing was WRONG. **Tango already found + classified them 2026-06-15** via the standing tool **`scripts/dispatcher-registration-coverage.mjs`** (8/8). Live: 101/106 wired (95%), **5 dormant, ALL classified, ZERO blind-register candidates**:
- `prism_ai` → intentionally-skipped (name-collision, registering crashes boot — `index.ts:104`).
- `prism_cad_automation` → cross-lane (delta); `prism_cam_function` → cross-lane (kilo).
- `prism_machine` (~69) + `prism_security` (~227) → **safety-sensitive: needs OPERATOR intent-confirmation before registration; DO NOT blind-wire** (exposing machine-control/security as MCP has safety implications; conservative bias — false-skip safe, false-register can crash boot/expose unsafe control).

So the ~660 actions in the dormant dispatchers are **deliberately dormant + owner/operator-gated, NOT rot**. Lesson: ALWAYS reconcile an audit finding against existing fleet work + standing tools before reporting it as a new bug — the memory recall surfaced tango's prior classification and stopped me recommending the operator wire 296 safety-sensitive actions blind.

## Estimates (agent, unverified): schema pass-through advisory-not-enforcing (~40% calc unvalidated, 2334 `params as any`); 52% dispatchers zero-test (root cause of the 61); sfc_ registered 3× (last-wins).

## Enhance work (P1): fail-loud the schema pass-through (`dispatcherMiddleware.ts:83`); fill calc/cam schemas; one wire test per zero-coverage dispatcher; split camDispatcher; dedup sfc_. Build (P2, only if owner-driven): prism_probing (xray), prism_erp_live (hotel), prism_gnn=wire mlDispatcher (india), prism_fleet (golf). NOT-ready: prism_swiss/prism_laser (engines don't exist — R13).

Related: [[reference_dispatcher_engine_method_audit_2026_06_22]] · [[reference_tango_dispatcher_registration_coverage_2026_06_15]] · [[reference_tango_register_unwired_bridge_dispatcher_2026_06_15]]
