# CAMDriveRecipeEngine — autonomous CAM-drive replay (executor build spec)

**Status (2026-05-31, slot kilo /loop /yolo):**
- ✅ DONE: `camDriveRecipeSchema.ts` (Zod, round-trip verified) — commit U-CDRE-SCHEMA.
- ✅ DONE: `CAMDriveRecipeEngine.ts` compile/execute/replay + 31 hermetic tests, **2-reviewer per-file scrutiny PASS** (found+fixed 3 P0s incl. gate-bypass + outcome-enum-kills-learning-loop + retry-noop, and 7 P1s) — commit U-CDRE-ENGINE.
- ⏳ NEXT (this batch): dispatcher wiring (task #22) + PostToolUse trace hook + doc-reflection (task #23). **CRITICAL per reviewers: the dispatcher adapter MUST ship a real-adapter E2E (not hermetic mocks) — ground CAMDriveGateEngine.gate / Fusion360LiveBridgeEngine / OutcomeCaptureBusEngine.record / ActionTraceEngine.recordTrace against their REAL signatures before wiring; the engine emits recommendation_emitted/system/mill which is already enum-valid, but the adapter must map the rest. "Hermetic fakes don't prove production wiring" (the recurring regression class).**
**Source:** workflow `cam-drive-automation-map` (5-agent discovery + design, 2026-05-31). This spec persists that design.
**Principle:** wire into EXISTING PRISM infra — NO parallel system.

## What already exists (discovered — wire into these, don't rebuild)
- **Replay surface:** `Fusion360LiveBridgeEngine.executeActions(ExtractedAction[])` + typed `/cam/*` methods (:18365).
- **Safety fuse:** `CAMDriveGateEngine.gate({system,operation,params})` — ALREADY enforced inside `prism_cam:cam_drive_create_operation` (camDispatcher.ts ~L11465-11499).
- **Pipeline:** `AutoProgramOrchestratorEngine.run({inject_features, resume_from_stage:"cam_creation"})` — injection hooks exist (~L131-140, L801-823).
- **Trace recorder:** `ActionTraceEngine.recordTrace()` → `state/shared/action-traces.jsonl` (.strict() schema; queryable via `prism_session:action_trace_query`).
- **Learning loop (verbatim path):** `OutcomeCaptureBusEngine.record(domain,kind,source,lineage_id,actual,confidence)` → `OutcomeTraceEngine` → `mcp-server/data/state/outcomes/mill.jsonl` → `SelfLearningLoopOrchestratorEngine` polls → `TemplateApplicabilityClassifierEngine` classifies → `OutcomeFeedbackWireEngine.computeCorpusDelta()` at ≥50 outcomes → `MillingMetaLearningEngine` refits `strategy.by_feature` table + `tool.rank` weights → written back to `decision-rules.json`. **Closed loop, no new bus.**

## The real gap (what to build)
No "recipe compiler/executor" + no dispatcher action to "run these steps."

## Artifacts to build (R13 order)
1. `mcp-server/src/schemas/camDriveRecipe.schema.ts` (NEW) — Zod for recipe + step + decision-rule registry (schemaVersion 1.0.0; matches the shipped JSON).
2. `mcp-server/src/engines/CAMDriveRecipeEngine.ts` (NEW):
   - `compile(recipe, liveProbe, toolLib)` → ResolvedRecipe: evaluate each `step.decisionRuleRef` against `decision-rules.json` + live `/cam/geometry-detail` probe, fill every `${...}` in `bodyTemplate`. LLM-free.
   - `execute(resolvedRecipe, deps)` → run steps in order; CALL the existing `prism_cam` `cam_drive_*` actions (NOT re-implement bridge); doc/part/stock/mate steps call `Fusion360LiveBridgeEngine` methods. Gate enforced per-op (already). Write tier-1 trace via `actionTraceEngine.recordTrace()` + tier-2 via append to recipe trace ledger. Emit `outcomeCaptureBusEngine.record()` on completion.
   - `replay(recipe, {reSolveRules})` → reSolve against fresh probe (generalize to moved/resized part) OR verbatim (regression).
3. `mcp-server/src/tools/dispatchers/camDispatcher.ts` (EDIT) — add to ACTIONS enum + case statements (lazy import, alphabetical in cam_drive_ block):
   - `cam_drive_recipe_compile` (pure preview), `cam_drive_recipe_execute` (the missing "run recipe"; gate per-op), `cam_drive_recipe_replay`, `cam_drive_trace_query`.
4. `mcp-server/src/engines/__tests__/CAMDriveRecipeEngine.test.ts` (NEW, ≥10 hermetic cases, mocked bridge, no network): compile resolves placeholders from fixture probe; **gate BLOCKS an out-of-range op before actuation**; verify.passed gating; onFail policies; outcome emission shape == outcomes/mill.jsonl.
5. `mcp-server/src/__tests__/camDispatcher.recipe-wire.test.ts` (NEW, mirrors drive-wire test): 4 new actions registered + execute gated.
6. `.claude/hooks/cam-drive-trace.mjs` (NEW PostToolUse hook the ActionTraceEngine docstring anticipates): records `prism_cam:cam_drive_*` results to the sister ledger.
7. Doc-reflection (4 surfaces): `knowledge/wiki/architecture/cam-drive-recipe-replay.md` + `mcp-server/src/engines/cam/MEMORY.md` pointer + CLAUDE.md pointer + Obsidian memory.
8. `state/shared/INDEX.json` (EDIT) — add `camDrive{}` section indexing recipes/ + traces/ + decision-rules.json.

## Already shipped (foundation — this session)
- `state/shared/cam-drive/decision-rules.json` (13 rules) — the formulas that remove Claude from the loop.
- `state/shared/cam-drive/recipes/UPSET_OP1_5AX_2026-05-31.json` (17 steps).
- `state/shared/cam-drive/traces/UPSET_OP1_5AX_2026-05-31.jsonl` (6 lines — this session's real placement actions).

## Test gate
Hermetic, mocked bridge, ≥10 engine cases + dispatcher wire test. The executor ACTUATES a real 5-axis machine — full per-file scrutiny + 3-of-3 required before it drives anything live.
