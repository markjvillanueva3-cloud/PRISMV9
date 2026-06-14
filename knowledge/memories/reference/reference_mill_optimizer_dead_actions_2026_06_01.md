---
name: reference_mill_optimizer_dead_actions_2026_06_01
description: "4 prism_mill dispatcher actions route to non-existent MillProgramOptimizerEngine methods (optimizeStrategy/optimizeToolpath/estimateCycleTime/estimateCost) -> [NOT_WIRED] at runtime. Found 2026-06-01."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.216Z
aliases: reference_mill_optimizer_dead_actions_2026_06_01
---


# 4 dead prism_mill actions → MillProgramOptimizerEngine (slot foxtrot, 2026-06-01)

**Finding:** `MillProgramOptimizerEngine.ts` (class, no extends) exposes ONLY `optimizeAllPrograms()` and `optimizeProgram(filePath)` — both **file-path / trained-AI batch** based. It does **NOT** have `optimizeStrategy`, `optimizeToolpath`, `estimateCycleTime`, or `estimateCost`.

`millDispatcher.ts` wires 4 actions to those non-existent methods via single-candidate `callOrThrow`:
- L417 → `callOrThrow(getEngine("optimizer"), ["optimizeStrategy"], …)`
- L434 → `["optimizeToolpath"]`
- L692 → `["estimateCycleTime"]`
- L696 → `["estimateCost"]`

`callOrThrow` throws `[NOT_WIRED]` when no candidate method exists → **all 4 actions throw at runtime**. Same class as the R1 stub-routing bug fixed earlier this session (5 mill_toolpath_* actions → non-existent methods on the ToolpathStrategy stub). Fails LOUD (not silent/unsafe), but 4 advertised mill actions are dead.

**Fix (fresh-context, ~1 unit):** read the 4 switch cases in millDispatcher.ts (action names at L417/434/692/696) to learn each action's intent, then for each either (a) point at the engine that actually has the method (e.g. cycle-time lives on `ProgramCompareEngine.compareCycleTime` / its module `estimateCycleTime`; cost likely `estimateCost` on a costing engine), or (b) add the real method to MillProgramOptimizerEngine, or (c) re-point to the correct optimizer. Add a round-trip test per action (the R1 pattern). Verify with the wiring-audit.

**Also (rec#3-gen):** MillProgramOptimizerEngine is NOT the program-string→string transformer rec#3 needs — its `optimizeProgram(filePath)` is file+trained-AI. Use `AutoSpeedFeedEngine` (line-by-line text S/F) for the `mill_program_enhance` composition instead.

## Status (2026-06-01, foxtrot — verify-first done)
- **1 of 4 FIXED:** `mill_quick_cycle_time` re-pointed to new `ProgramCompareEngine.programCycleTime()` (+ pure length/feed parametric fallback) — commit U-MILL-CYCLE-TIME-WIRE, 5/5 tests.
- **3 NEED DESIGN — no clean existing-method re-point (verified; do NOT guess a wire):**
  - `mill_strategy_optimize` schema `{strategy, parameters, objective}` OPTIMIZES a given strategy's params toward an objective. `MillStrategyNeuralEngine.predict(StrategyFeatureVector)` only RANKS which strategy to pick — wrong contract. Needs a real parameter optimizer.
  - `mill_toolpath_optimize` wants to improve an EXISTING toolpath. `AdaptiveToolpathRouterEngine.route()` GENERATES one (already wired to `mill_toolpath_generate`) — re-pointing duplicates. Needs a distinct optimize-existing path.
  - `mill_quick_cost_estimate` = cycle_time × machine hourly_rate (+ material/tooling). Cost/quote = CHARLIE/HOTEL lane — route to a costing engine (ShopConfig has hourly_rate per VMC), don't build in the mill dispatcher.

## How to apply
- Before composing/relying on a dispatcher action, confirm the target method EXISTS on the engine (grep the engine file). `callOrThrow` single-candidate arrays silently advertise dead actions until called.
- Relates: [[reference_programcompare_modal_regex_bug_2026_06_01]] · [[reference_mill_course_plotting_substrate_2026_05_31]] · [[feedback_always_capture_lessons]]
