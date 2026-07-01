---
name: reference_kilo_cam_drive_recipe_engine_2026_05_31
description: "CAMDRIVE-RECIPE-ENGINE-MS0 (slot kilo, 2026-05-31): the autonomous LLM-free CAM-drive replay system — prism_cam:cam_drive_recipe_execute runs a full Fusion CAM program (open→insert→stock→mate→setup→ops→post) from a recipe + decision-rules with zero LLM. Built from the operator directive 'track + map everything for automation without your input.'"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.632Z
aliases: reference_kilo_cam_drive_recipe_engine_2026_05_31
---


**CAMDRIVE-RECIPE-ENGINE-MS0** (slot kilo, 2026-05-31, /goal /loop /yolo). Operator: *"track and map everything you do so it can be automated by the prism ai systems without your input."*

**Invoke:** `prism_cam:cam_drive_recipe_execute {recipe, decisionRules, probe, toolLib, runId?}` runs the whole CAM-drive autonomously. Also `_compile` (preview), `_replay {reSolveRules}`, `cam_drive_trace_query`.

**5 pieces (all committed to slot/kilo):**
- `state/shared/cam-drive/decision-rules.json` — 13 deterministic rules (the judgment calls as formulas; learning-loop-tunable; constants NEVER inlined — feeds delegate to prism_cam physics actions).
- `state/shared/cam-drive/recipes/UPSET_OP1_5AX_2026-05-31.json` — 17-step parameterized recipe.
- `mcp-server/src/schemas/camDriveRecipeSchema.ts` — Zod contract (round-trip verified).
- `mcp-server/src/engines/CAMDriveRecipeEngine.ts` — compile/execute/replay (pure-core + injected deps).
- `mcp-server/src/engines/CAMDriveRecipeAdapter.ts` — `buildCamDriveDeps()` binds REAL camDriveGateEngine/outcomeCaptureBusEngine/Fusion-bridge/ActionTrace.

**Wired:** camDispatcher ACTIONS + 4 cases (cam_drive_recipe_{compile,execute,replay} + cam_drive_trace_query).

**Tests:** 40 vitest (31 engine hermetic + 5 real-adapter E2E + 4 dispatcher-wire). **2-reviewer per-file scrutiny PASS** — found+fixed 3 P0s mocked tests missed: (1) gate-bypass (gate now stage-derived, not operator-authored), (2) outcome enum `cycle_result`/`cam-drive-replay` would throw in prod killing the learning loop → fixed to `recommendation_emitted`/`system`/`mill` + real-bus parse oracle, (3) `onFail:retry` silently degraded to abort → implemented. tsc-clean (the hook's "548" is a stale baseline-cache artifact; real `npx tsc --noEmit` = 0).

**Learning loop:** execute() → outcomeCaptureBus.record(lineage=recipeId:runId) → outcomes/mill.jsonl → SelfLearningLoop → OutcomeFeedbackWire(≥50) → MillingMetaLearning re-tunes decision-rules.json.

**Safety:** stage-derived gate (op_create/post can't actuate un-gated) + compile-time refinement; needsOperatorConfirm forces operator gate; throwing gate fails closed; units≠inch rejected at compile (no 25.4× error).

**Deferred (optional):** `cam-drive-trace.mjs` PostToolUse hook (tier-1 trace of DIRECT cam_drive_* calls — engine already self-traces recipe runs). **Known artifact:** the camDispatcher commit shows a whole-file EOL-normalization diff (functionally sound — 40/40 + tsc 0; flag for golf integration merge).

Pairs with [[feedback_setup_extra_material_fixture_clearance]] (the riser rule, a decision rule in the registry), [[reference_kilo_cam_drive_ms0_2026_05_29]] (the live-drive add-in), [[feedback_jm_folder_top_of_cad_cam_search]]. Wiki: [[cam-drive-recipe-replay]]. Spec: `state/shared/cam-drive/CAMDRIVE-RECIPE-ENGINE-SPEC.md`.
