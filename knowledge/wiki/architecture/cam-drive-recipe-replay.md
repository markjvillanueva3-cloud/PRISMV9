---
title: CAM-Drive Recipe Replay (autonomous LLM-free CAM programming)
slug: cam-drive-recipe-replay
kind: architecture
status: built
date: 2026-05-31
owner: kilo (CAM)
---

# CAM-Drive Recipe Replay — autonomous PRISM-AI CAM programming

**What:** lets PRISM AI replay a full Fusion-360 CAM-drive procedure (open → insert → stock → mate → setup → ops → post) on any part with **zero LLM in the loop**. The operator directive was *"track and map everything you do so it can be automated by the prism ai systems without your input."* This is that system.

## The 5 pieces (CAMDRIVE-RECIPE-ENGINE-MS0, slot kilo)

| Piece | File | Role |
|---|---|---|
| **Decision rules** | `state/shared/cam-drive/decision-rules.json` | 13 deterministic rules (the judgment calls as formulas): placement, riser/fixture-clearance, parting (geometry-driven), stock oversize, WCS=stock-bottom-center, per-feature strategy table, spindle-matched tool argmax (cost-eff×MRR), Kienzle/Taylor/chipload/deflection feeds (delegated to `prism_cam` physics actions — never inlined), gate. Learning-loop-tunable. |
| **Recipe** | `state/shared/cam-drive/recipes/<id>.json` | parameterized step list `{stepId, stage, endpoint, bodyTemplate(${...}), decisionRuleRef[], gate, verify, onFail}`. First: `UPSET_OP1_5AX_2026-05-31` (17 steps). |
| **Schema** | `mcp-server/src/schemas/camDriveRecipeSchema.ts` | Zod v4 contract for recipe + decision-rule registry. Round-trip verified vs the shipped JSON. |
| **Engine** | `mcp-server/src/engines/CAMDriveRecipeEngine.ts` | `compile(recipe, rules, probe, toolLib, deps?)` evaluates rules vs a live `/cam/geometry-detail` probe + resolves `${...}` placeholders; `execute(resolved, deps)` runs steps (gate→actuate→verify→trace→outcome); `replay({reSolveRules})`. Pure-core + injected deps. |
| **Adapter** | `mcp-server/src/engines/CAMDriveRecipeAdapter.ts` | `buildCamDriveDeps()` binds the engine's deps to REAL singletons: `camDriveGateEngine.gate`, `outcomeCaptureBusEngine.record`, Fusion :18365 bridge, tier-2 trace ledger, `ActionTraceEngine.recordTrace`. |

## Dispatcher surface (prism_cam)
- `cam_drive_recipe_compile` — pure preview (resolve placeholders, no actuation)
- `cam_drive_recipe_execute` — compile + execute via the real adapter (gate enforced per-op)
- `cam_drive_recipe_replay` — `{reSolveRules}` (re-probe for a moved/resized part vs verbatim)
- `cam_drive_trace_query` — read the tier-2 trace ledger

## Safety (load-bearing)
- **Gate derived from STAGE** (`op_create`/`post`), independent of operator-authored `step.gate` — an un-gated cutting step CANNOT actuate. Compile-time refinement throws on a missing gate.
- **`needsOperatorConfirm`** (e.g. parting fell to a mid-height guess) forces a gate-to-operator before actuation.
- **A throwing gate fails CLOSED.** units≠inch rejected at compile (no 25.4× scale error). Outcome enum is v1.0.0-safe (`recommendation_emitted`/`system`/`mill`) — verified against the REAL OutcomeCaptureBus.

## Learning loop closure
`execute()` emits `outcomeCaptureBusEngine.record(lineage_id=recipeId:runId)` → `outcomes/mill.jsonl` → `SelfLearningLoopOrchestratorEngine` → `OutcomeFeedbackWireEngine.computeCorpusDelta()` (≥50 outcomes) → `MillingMetaLearningEngine` re-tunes `strategy.by_feature` + `tool.rank` weights → written back to `decision-rules.json`. Closed loop, no new bus.

## Verification
40 vitest: `CAMDriveRecipeEngine.test.ts` (31, hermetic), `CAMDriveRecipeAdapter.e2e.test.ts` (5, **real** gate+outcome bus, only the network bridge stubbed), `camDispatcher.recipe-wire.test.ts` (4, enum anti-regression). 2-reviewer per-file scrutiny PASS (found+fixed 3 P0s the mocked tests missed: gate-bypass, outcome-enum-kills-learning-loop, retry-noop). tsc-clean.

## Provenance + next
Mapped by the `cam-drive-automation-map` workflow (5-agent discovery+design). NEXT (deferred, optional): `cam-drive-trace.mjs` PostToolUse hook (tier-1 trace of *direct* cam_drive_* calls — the engine already self-traces recipe runs). Memory: [[reference_kilo_cam_drive_recipe_engine_2026_05_31]]. Spec: `state/shared/cam-drive/CAMDRIVE-RECIPE-ENGINE-SPEC.md`.
