# MASTER INDEX COMPACT
**Generated:** 2026-04-22
**Auto-regenerable** — see scripts/generate-master-index.mjs

## Inventory Snapshot
- Engines:      2739
- Dispatchers:  90
- Actions:      6755
- Algorithms:   53
- Registries:   26
- Tests:        2659
- Hooks:        291 (53 source + 238 claude)
- Commands:     465 (133 local + 332 user)

## Pointers (canonical sources)
| File | Purpose |
|------|---------|
| PRISM-INVENTORY-LATEST.md | Live counts (auto-regen on SessionStart) |
| data/docs/gsd/GSD_QUICK.md | Session lifecycle, hooks, dispatcher decision tree |
| data/docs/gsd/GSD_MICRO.md | Compact one-page reference |
| data/docs/gsd/DEV_PROTOCOL.md | Development workflow and implementation rules |
| data/docs/gsd/DSL_PROTOCOL.md | Token economy, RTK, output compression |
| data/docs/gsd/TDD_PROTOCOL.md | Test requirements and patterns |
| data/docs/gsd/HOOKS_REFERENCE.md | Complete 69-hook documentation |
| data/docs/ENGINE_DIGEST.md | 1-line per engine (2739 engines) |
| data/docs/DISPATCHER_DIGEST.md | Dispatcher index with action counts |
| data/docs/DIRECTORY_DIGEST.md | File-system directory purposes |
| state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md | JM Die paths, AI inventory |
| state/shared/PRISM_SHARED_INDEX_SURFACES.md | Cross-agent search surfaces |

## Hard-Block Methods
- duplicationGuardEngine.mustCheckBeforeCreating(type,name,desc) — THROWS on duplicate
- duplicationGuardEngine.mustNotReExtract(sourceId) — THROWS on re-extract

## Key Environment
- RTK: `rtk <cmd>` for token compression (vitest 99%, tsc 83%, git 59-80%)
- Build: `npm run build:fast` (3s), `npm run build` (30s)
- Ollama: Prompt rewriter at localhost:11434 (qwen2.5-coder)

## Mill Dispatcher (prism_mill)
First-class MCP surface for milling — 49 actions. Facade chain:

```
prism_mill → MillMasterOrchestratorFacadeEngine
               ├─ MillingAGIMasterEngine (AGI reasoning)
               ├─ MillAISelfAwarenessIntegrationEngine (capability discovery)
               ├─ CAMAGIMasterOrchestratorEngine (cross-CAM routing)
               ├─ MillStrategyNeuralEngine (neural strategy)
               ├─ MillDeepLearningEngine (ML predictions)
               ├─ MillPatternMinerEngine (tribal patterns)
               ├─ MillPrintToProgramEngine (print-to-program)
               ├─ MillKinematicsCollisionEngine (collision/envelope)
               ├─ DigitalTwinSyncEngine (twin sync)
               └─ ToolpathStrategyEngine (adaptive toolpath)
```

**Action groups:**
- Print-to-Program: `mill_print_to_program`, `mill_feature_recognize`, `mill_process_plan`, `mill_generate_gcode`, `mill_validate_program`
- Strategy: `mill_strategy_select`, `mill_strategy_recommend`, `mill_strategy_compare`, `mill_strategy_optimize`
- Toolpath: `mill_toolpath_generate`, `mill_toolpath_simulate`, `mill_toolpath_optimize`, `mill_toolpath_rest`, `mill_toolpath_adaptive`, `mill_toolpath_hsm`, `mill_toolpath_trochoidal`
- Physics: `mill_force_calculate`, `mill_deflection_check`, `mill_chatter_predict`, `mill_thermal_analyze`, `mill_power_verify`
- Collision: `mill_collision_check`, `mill_collision_zones`, `mill_kinematics_verify`, `mill_work_envelope`
- Tools: `mill_tool_recommend`, `mill_tool_assembly`, `mill_tool_holder_match`
- AGI: `mill_agi_orchestrate`, `mill_neural_recommend`, `mill_deeplearn_predict`, `mill_pattern_mine`, `mill_wisdom_query`
- Self-Awareness: `mill_selfaware_registry`, `mill_selfaware_recommend`, `mill_selfaware_find`, `mill_selfaware_stats`
- Twin: `mill_twin_sync`, `mill_twin_predict`, `mill_twin_calibrate`
- Scientific: `mill_scientific_analyze`, `mill_scientific_optimize`, `mill_uncertainty_quantify`
- Quick: `mill_quick_speed_feed`, `mill_quick_cycle_time`, `mill_quick_cost_estimate`
- Validation: `mill_validate_setup`, `mill_validate_safety`, `mill_spc_analyze`

## See Also
- /forge skill (Phase 0 reads this file)
- CLAUDE.md files point here for awareness
- GSD docs at data/docs/gsd/ for operational protocols
