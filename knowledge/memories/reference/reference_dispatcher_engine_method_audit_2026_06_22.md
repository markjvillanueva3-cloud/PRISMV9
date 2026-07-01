---
name: reference_dispatcher_engine_method_audit_2026_06_22
description: "New 3rd-sibling detector audit-dispatcher-engine-methods.mjs found 61 silent runtime bugs (dispatcher calls a method the engine doesn't define, tsc-blind via getEngine():any); CK-MS11 probe cluster fixed; rest routed to domain slots via ledger"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.554Z
aliases: reference_dispatcher_engine_method_audit_2026_06_22
---


# Dispatcher->engine method-existence audit + CK-MS11 probe fix (2026-06-22, slot:bravo, claude-ab0dca09)

`/checkin-bravo /goal /loop complete remaining backend dev`. Backend remains MATURE (build green, 0 unwired engines — see [[reference_bravo_backend_milestone_reconcile_2026_06_21]]) so the high-ROI lane was a NEW bug CLASS, not new features.

## The bug class (new, tsc-invisible)
A dispatcher handler does `const eng = await getEngine("key"); eng.someMethod(...)` where `someMethod` does NOT exist on the resolved engine -> throws `"<fn> is not a function"` at RUNTIME. `getEngine()` returns `any`, so tsc never catches it. **Two existing detectors miss this:** `audit-dispatcher-ghost-actions.mjs` (romeo) catches actions with NO handler; `dispatcher-import-liveness.mjs` (tango) catches bad import NAMES. Neither checks the METHOD. This is the **3rd sibling**.

## Shipped
1. **U-CK-MS11-PROBE-WIRE-FIX** (commit `49c76b551b`): camDispatcher's 5 `probe_*_gen` actions called generateWCSSetup/generateFirstArticle/generateInProcessCheck/generateToolMeasure/generateAutoComp on `ProbingProgramEngine` ("probingProg") which only has `generate()`. Re-pointed to `probeRoutineGeneratorEngine` ("probeGen", already backs the sibling `probe_*` actions ~camDispatcher:6294): in_process->generatePartInspection, tool_measure->generateToolMeasurement, auto_comp->generatePartInspection({action_on_fail:"compensate"}) which emits `G10 L2 ... AUTO COMPENSATE`. ALSO fixed a 2nd latent bug: these cases used `return slimResponse(...)` (raw object) instead of the dominant `result = ...; break;` that the handler tail (camDispatcher:~20819) wraps in the MCP `{content:[{text}]}` envelope. 13-test round-trip suite (through prism_cam handler — a direct-engine test would NOT catch a routing bug). tsc green; cam-wiring-fixes 22/22.
2. **U-DISPATCHER-ENGINE-METHOD-AUDIT** (commit `cc03516d93`): `scripts/audit-dispatcher-engine-methods.mjs` (pure core + injectable readers + CLI, modeled on dispatcher-import-liveness) + 6-test suite. False-positive discipline LIVE/MISSING/INDETERMINATE: MISSING requires engine readable + class-shaped + method absent + full extends-chain resolvable-absent; unreadable/unresolved-base/non-class -> INDETERMINATE. KEYWORDS narrowed to pure statement keywords {if,for,while,switch,catch,return,throw,do} so a method literally named `export()`/`type()` is NOT false-flagged (caught MetricsEngine.export false-positive during validation). Found **61 real MISSING across 10 dispatchers** (camDispatcher 20, cncOps 8, resourceExtraction 8, edm 7, cad 5, quality 4, pp 3, resourceHarvester 3, mill 2, feasibility 1). Ledger: `state/shared/DISPATCHER-ENGINE-METHOD-AUDIT.{json,md}`.

## Why the other 61 were NOT blind-fixed (R12)
Verified the fixes are DOMAIN-SEMANTIC, not clean renames: cncOps `circular_interpolation_calculate` -> CircularInterpolationEngine has bore/boss/arcFeedComp (3 candidates); `helical_interpolation` -> threadMill/boreMill/ramp. Guessing a method in safety-critical CNC G-code is the DANGEROUS direction (a wrong method silently emits wrong G-code — worse than a visible throw). camDispatcher DFMFeedbackEngine has ONLY `analyze()` (suggestImprovements/generateReport are genuinely-missing capabilities, not renames); NLPCAMParserEngine has ONLY `parse()`. The probe fix worked only because `probeGen` ALREADY HAD all 4 methods. So the 61 are routed to owning domain slots (kilo/delta/mike/echo/foxtrot/juliett) via the ledger — the R5/R8 route-don't-centralize play.

## 3-of-3 scrutiny: PASS (all arms). Arm B spot-checked 6 of 61 findings = all genuine absences, ZERO false positives.

## Open / next-pass
- Fix the 61 by domain (ledger groups them by owner). Unambiguous single-target ones first; safety-critical ambiguous ones need operator/domain decision.
- P2 (logged, not blocking): auto_comp drops `offset_register`/`axis`/`max_comp_mm` (generatePartInspection hardcodes register 1/Z); ledger renderer has per-call-site duplicate rows (cosmetic).
- ENV (peer, not mine): working-tree `tsc` fails TS6053 on phantom `src/schemas/wedmPerceptionSchemas.ts` — peer churn in shared tree, my commits don't reference it.
- Consider wiring the detector into the standing fleet audit chain (auto-invocation) like its siblings.

Related: [[reference_bravo_backend_milestone_reconcile_2026_06_21]] · [[feedback_read_full_content_not_titles]] · [[feedback_wire_test_validate_all_galaxies]]
