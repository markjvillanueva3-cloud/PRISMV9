# MILL Deep Audit — Agent 2: Dispatcher Actions

**Status:** Mill dispatcher (`prism_mill`) is fully functional and properly registered in MCP. **3 critical gaps surfaced.**

## Executive Summary

- **103 actions** across 10 categories with comprehensive Zod schema validation
- **49 fully-wired** (47.6%) using lazy `callOrThrow` pattern
- **54 half-wired** (52.4%) — Batch 1-5 unwired engines use direct imports, not lazy-loaded
- **0 orphan actions** ✓
- **Schema coverage: 103/103** (file: `src/schemas/millActionSchemas.ts`, 1,298 lines)

## CRITICAL — Mill Router NOT Registered (BUG-1)

**File:** `H:/PRISM/mcp-server/src/routes/index.ts`
**Status:** `createMillingRouter()` is defined in `routes/milling.ts` (519 LOC, 12 endpoints) but **NEVER imported or mounted**.

**Fix (3 lines):**
```typescript
// Line 43:
import { createMillingRouter } from "./milling.js";

// Line 134:
app.use("/api/v1/milling", createMillingRouter(callTool));
```

**Impact:** All `/api/v1/milling/*` endpoints return 404. Frontend pages exist but cannot reach backend.

## Action Coverage by Category

### Fully-Wired (49 actions)
- **Print-to-Program** (5): `mill_print_to_program`, `mill_feature_recognize`, `mill_process_plan`, `mill_generate_gcode`, `mill_validate_program`
- **Strategy** (4): `mill_strategy_select`, `mill_strategy_recommend`, `mill_strategy_compare`, `mill_strategy_optimize`
- **Toolpath** (7): `mill_toolpath_generate`, `mill_toolpath_simulate`, `mill_toolpath_optimize`, `mill_toolpath_rest`, `mill_toolpath_adaptive`, `mill_toolpath_hsm`, `mill_toolpath_trochoidal`
- **Physics** (5): `mill_force_calculate`, `mill_deflection_check`, `mill_chatter_predict`, `mill_thermal_analyze`, `mill_power_verify`
- **Collision** (4): `mill_collision_check`, `mill_collision_zones`, `mill_kinematics_verify`, `mill_work_envelope`
- **Tool Selection** (3): `mill_tool_recommend`, `mill_tool_assembly`, `mill_tool_holder_match`
- **AI/AGI** (5): `mill_agi_orchestrate`, `mill_neural_recommend`, `mill_deeplearn_predict`, `mill_pattern_mine`, `mill_wisdom_query`
- **Self-Awareness** (4): `mill_selfaware_registry`, `mill_selfaware_recommend`, `mill_selfaware_find`, `mill_selfaware_stats`
- **Digital Twin** (3): `mill_twin_sync`, `mill_twin_predict`, `mill_twin_calibrate`
- **Scientific** (3): `mill_scientific_analyze`, `mill_scientific_optimize`, `mill_uncertainty_quantify`
- **Quick** (3): `mill_quick_speed_feed`, `mill_quick_cycle_time`, `mill_quick_cost_estimate`
- **L2 Aggregator** (4): `mill_ai_orchestrate`, `mill_turn_orchestrate`, `mill_5axis_orchestrate`, `mill_multiaxis_orchestrate`
- **Tribal** (4): `mill_tribal_query`, `mill_tribal_get`, `mill_tribal_add`, `mill_tribal_stats`
- **E2E + Trace** (3): `mill_e2e_workflow`, `mill_trace_record`, `mill_trace_query`
- **Inference** (1): `mill_inference_run`
- **Validation** (3): `mill_validate_setup`, `mill_validate_safety`, `mill_spc_analyze`

### Half-Wired (54 actions, Batches 1-5)
Direct imports instead of `callOrThrow` pattern:
- **Batch 1** (6): `mill_helical_calc`, `mill_high_feed_calc`, `mill_program_parse`, `mill_resource_query`, `mill_strategy_list`, `mill_strategy_for_feature`
- **Batch 2** (6): `mill_neural_cognitive_process`, `mill_critical_analyze`, `mill_meta_learn_record`, `mill_meta_learn_self_assess`, `mill_ai_parse_nl_query`, `mill_ai_archive_stats`
- **Batch 3** (6): `mill_physics_force`, `mill_physics_tool_life`, `mill_program_pattern_analyze`, `mill_rl_select_action`, `mill_head_recommend`, `mill_machine_intel_get`
- **Batch 4** (6): `mill_deep_reason`, `mill_deep_integrate`, `mill_knowledge_search`, `mill_knowledge_stats`, `mill_ai_unified_recommend`, `mill_milling_twin_sync`
- **Batch 5** (6): `mill_agi_quick_analyze`, `mill_knowledge_orch_recommend`, `mill_troubleshoot`, `mill_lora_cadence_state`, `mill_online_record_step`, `mill_online_detect_drift`
- Additional 24 direct-import actions

## Frontend Caller Analysis

- ❌ **No `mill_*` action calls found in web UI** (`web/src/api/`)
- ❌ Milling router endpoints defined but unreachable
- ⚠️ All dispatcher actions unused from frontend perspective

**Implication:** Milling functionality is MCP-only; no web UI integration until router fix lands.

## Cross-Dispatcher

- ✅ No action name collisions with `camDispatcher.ts`
- ✅ `mill_turn_*` actions properly routed
- ✅ `mill_5axis_orchestrate` handles forwarding to FiveAxisAggregatorEngine

## Recommendations

1. **P0 (5 minutes):** Fix BUG-1 router registration
2. **P1 (Optional refactor):** Migrate Batch 1-5 from direct imports to lazy `callOrThrow` pattern for consistency
3. **P2:** Add auth middleware to milling routes (currently no auth on any endpoint)

## File Path Reference

```
src/index.ts:166                    Dispatcher import ✓
src/index.ts:666                    Dispatcher registered ✓
src/routes/index.ts                 ❌ MISSING router import + mount
src/routes/milling.ts               519 lines, 12 endpoints, ready
src/tools/dispatchers/millDispatcher.ts   901 lines, 103 actions
src/schemas/millActionSchemas.ts    1,298 lines, 103 schemas
web/src/api/                        ❌ No mill_* calls
```
