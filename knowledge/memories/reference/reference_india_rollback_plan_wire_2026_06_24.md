---
name: reference_india_rollback_plan_wire_2026_06_24
description: india dark-facade NEEDS-BUILD tier 2026-06-24 — 3 shipped (rollback_plan_build, operator_dashboard_orchestrate, machine_lora_base_info) + 2 needs-design (print_corpus, roadmap_dag)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.621Z
aliases: reference_india_rollback_plan_wire_2026_06_24
---


# india dark-facade NEEDS-BUILD tier — 3 shipped + 2 needs-design (2026-06-24, slot:india)

Cleared india's solo dark-facade NEEDS-BUILD queue across two post-compact resumes.
**3 units shipped (each: real method + dispatcher rewire + real-path test + 2-arm scrutiny
PASS + committed); 2 honestly classified needs-design (NOT solo-shippable).**

## Shipped (3)

1. **U-ROLLBACK-PLAN-WIRE** — `rollback_plan_build` (`orchestrationDispatcher.ts` ~1132) probed
   `.plan/.generate/.run` (none exist). Real = `planRollback(unitId, steps)` POSITIONAL
   (`RollbackPlannerEngine.ts:70`), self-validating; `verify:true` -> `planAndVerify`
   (dry-run via CounterfactualBuildSimulator). 6/6 tests.
2. **U-OPDASH-ORCH-WIRE** — `operator_dashboard_orchestrate` (~1044) probed `.run/.orchestrate/.analyze`
   (none). BUILT `orchestrate(input)` on `OperatorDashboardOrchestratorEngineImpl` composing
   getStatus(237)/getAlerts(480)/getShiftSummary(510) FAIL-SOFT per section (errors/sections_failed
   map) + self-validates core live signals. Extracted shared `filterAlertsView` (getAlerts refactored
   to it, byte-identical, proven by 19/19 existing test). 2 P2 fixes: min_severity coerce-to-info;
   overall_risk SAFETY-DIRECTION RED when status section fails (not GREEN). 8/8 new tests.
3. **U-MACHINE-LORA-INFO-WIRE** — `machine_lora_base_info` (`aiReasoningDispatcher.ts` ~4541) probed
   `getInfo()/.info` on the `machineLoRABase` FACTORY OBJECT (none). Added pure `getInfo()`
   (`MachineLoRABaseEngine.ts`) returning helpers + canonical DEFAULT_SPLIT/DEFAULT_CADENCE (copies)
   + 8 machine types. Rewired to BARE `result = machineLoRABase.getInfo()` (executeAIReasoningAction
   single-wraps `{success,data:result}`; inner `{success,data}` = double-wrap bug, the dark-case form).
   3/3 tests assert against canonical defaults. Pattern: mit_course_knowledge_query is the bare-form precedent.

## Needs-design (2 — do NOT naively wire; would crash/hang/stub)

- **`print_corpus_orchestrate`** (`orchestrationDispatcher.ts:1170`): `PrintCorpusOrchestratorEngine`
  ctor REQUIRES a `PrintCorpusTableWriter` (dispatcher's arg-less `new` -> `this.writer` undefined ->
  crash). Real entrypoint `scan(req)` requires an `extractFn` CLOSURE (vision/OCR backend) + does a
  long-running, side-effecting full-corpus filesystem walk + disk writes -> WRONG for a synchronous
  MCP action; needs async-job semantics (the CLI `scripts/scan-print-corpus.mjs` already provides them).
  **Owner = xray (blueprint-vision/OCR galaxy)**, as an async-job design, not an india unit.
- **`roadmap_dag_build`**: `RoadmapDAGEngine.load()` hangs/throws (~5min) — reverted to facade last
  session. Needs bounded/cached/async load design.

Fleet backlog: 72 cross-domain dark actions -> owning slots via `scripts/audit-dark-facade-actions.mjs`
(calc/physics = oscar SAFETY-CRITICAL, never touch from india; quality/cam/turning/cad/auth = respective slots).

Cross-cutting gotcha (hit on all 3): the dispatcher `responseSlimmer` prunes null + empty arrays, so a
returned `[]`/`null` field arrives as `undefined` — tests must treat absent as empty/null and assert
POSITIVE evidence. See [[reference_dark_facade_action_class_2026_06_23]] for the fleet-wide class + recipe.
