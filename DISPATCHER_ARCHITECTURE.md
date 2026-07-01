# PRISM Mega-Dispatcher Architecture
> ⚠️ **HISTORICAL** — Consolidation COMPLETE. See MASTER_INDEX.md for current: 31 dispatchers, 368 actions.
> **Original:** 321 tools × ~250 tokens/schema = ~80K tokens loaded every conversation
> **Achieved:** 31 dispatchers × ~500 tokens/schema = ~15.5K tokens loaded every conversation
> **Savings:** ~65K tokens/conversation = 32% of context window recovered

## Problem

Every MCP tool's full JSON schema (name, description, all parameters, enums, defaults) is injected into Claude's system prompt at conversation start. 321 tools means ~80K tokens burned before the user says anything. Most conversations use <20 tools.

## Solution: Domain Dispatchers

Replace N individual tools with 1 dispatcher per domain. Each dispatcher has:
- `domain` or implicit from tool name
- `action` enum (replaces individual tool names)
- `params` object (flexible per-action)

## Dispatcher Map (321 tools → 20 dispatchers)

### 1. `prism_data` — Data Access (14 → 1)
**Actions:** material_get, material_search, material_compare, machine_get, machine_search, machine_capabilities, tool_get, tool_search, tool_recommend, alarm_decode, alarm_search, alarm_fix, formula_get, formula_calculate
**Replaces:** registerDataAccessToolsV2 (14 tools)

### 2. `prism_calc` — Manufacturing Calculations (21 → 1)
**Actions:** cutting_force, tool_life, speed_feed, flow_stress, surface_finish, mrr, power, chip_load, stability, deflection, thermal, cost_optimize, multi_optimize, productivity, engagement, trochoidal, hsm, scallop, stepover, cycle_time, arc_fit
**Replaces:** calculationsV2 (8) + advancedCalculationsV2 (6) + toolpathCalculationsV2 (7)

### 3. `prism_safety` — Safety-Critical Validations (29 → 1)
**Actions:** check_collision, validate_rapids, check_fixture, safe_approach, near_miss, collision_report, tool_clearance, head_5axis, validate_coolant, check_tsc, chip_evacuation, validate_mql, coolant_recommend, check_torque, check_power, validate_speed, monitor_thermal, spindle_envelope, predict_breakage, tool_stress, chip_load_limits, tool_fatigue, safe_cutting_limits, clamp_force, validate_workholding, check_pullout, liftoff_moment, part_deflection, validate_vacuum
**Replaces:** collisionTools (8) + coolantTools (5) + spindleTools (5) + breakageTools (5) + workholdingTools (6)

### 4. `prism_thread` — Threading (12 → 1)
**Actions:** tap_drill, thread_mill_params, thread_depth, engagement_percent, thread_specs, go_nogo, pitch_diameter, minor_major, select_insert, cutting_params, validate_fit, generate_gcode
**Replaces:** registerThreadTools (12)

### 5. `prism_toolpath` — Toolpath Strategies (8 → 1)
**Actions:** strategy_select, params_calculate, strategy_search, strategy_list, strategy_info, stats, material_strategies, prism_novel
**Replaces:** registerToolpathTools (8)

### 6. `prism_agent` — Agent Orchestration (22 → 1)
**Actions:** list, get, search, find_for_task, invoke, execute, execute_parallel, execute_pipeline, stats, plan_create, plan_execute, plan_status, queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline, swarm_status, swarm_patterns, team_spawn, team_broadcast
**Replaces:** orchestrationV2 (8) + swarmV2 (6) + teams (4) + misc agent tools (4)

### 7. `prism_hook` — Hook Lifecycle (28 → 1)
**Actions:** list, get, search, fire, chain, execute, toggle, status, history, enable, disable, coverage, gaps, performance, failures, cognitive, autohook_status, autohook_test, generator_stats, list_domains, generate, generate_batch, validate_generated, get_template, fire_v2, chain_v2, status_v2, history_v2
**Replaces:** hookToolsV2 (8) + hookToolsV3 (10) + hookManagement (10) + autoHook (2) + generator (6)
**Note:** Heavily deduplicate — many v2/v3 overlaps exist here too

### 8. `prism_skill` — Skills & Scripts (17 → 1)
**Actions:** skill_list, skill_get, skill_search, skill_load, skill_recommend, skill_analyze, skill_chain, skill_content, skill_find, skill_stats, script_list, script_get, script_search, script_execute, script_queue, script_recommend, script_history
**Replaces:** knowledgeV2 (12) + skillToolsV2 (6) + scriptToolsV2 (5)
**Note:** Deduplicate overlapping skill tools between knowledgeV2 and skillToolsV2

### 9. `prism_session` — Session Lifecycle (18 → 1)
**Actions:** boot, start, end, checkpoint, auto_checkpoint, quick_resume, state_load, state_save, state_diff, state_checkpoint, state_reconstruct, handoff, recover, compaction_detect, transcript_read, memory_save, memory_recall, context_pressure
**Replaces:** stateTools + sessionTools + compaction tools + memory tools

### 10. `prism_context` — Context Engineering (14 → 1)
**Actions:** kv_sort, kv_check, attention_anchor, error_preserve, error_patterns, vary_response, memory_externalize, memory_restore, todo_update, todo_read, context_size, context_compress, context_expand, tool_mask_state
**Replaces:** contextEngineeringTools (14)

### 11. `prism_knowledge` — Knowledge Engine (5 → 1)
**Actions:** search, cross_query, formula_find, relations, stats
**Replaces:** knowledgeQueryTools (5)

### 12. `prism_dev` — Development Protocol (24 → 1)
**Actions:** brainstorm, plan, execute, review_spec, review_quality, debug, cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl, evidence_level, validate_gates, validate_mathplan, combination_ilp, error_capture, decision_log, failure_library, pre_write_gate, pre_write_diff, pre_call_validate
**Replaces:** developmentProtocolTools (24) + guard tools (6)
**Note:** Guard tools (error_capture, decision_log, failure_library, pre_write_*) merge here

### 13. `prism_doc` — Document Management (7 → 1)
**Actions:** list, read, write, append, migrate, roadmap_status, action_tracker
**Replaces:** docTools (7)

### 14. `prism_validate` — Validation Suite (7 → 1)
**Actions:** material, kienzle, taylor, johnson_cook, safety_score, completeness, anti_regression
**Replaces:** validationTools (7)

### 15. `prism_omega` — Quality Scoring (5 → 1)
**Actions:** compute, breakdown, validate, optimize, history
**Replaces:** omegaTools (5)

### 16. `prism_gsd` — GSD Instructions (8 → 1)
**Actions:** core, quick, get_section, dev_protocol, resources_summary, quick_resume, registry_status, working_tools
**Replaces:** gsdTools (6) + registry_status + working_tools

### 17. `prism_ralph` — Ralph Validation (3 → 1)
**Actions:** loop, scrutinize, assess
**Replaces:** ralphTools (3)

### 18. `prism_autopilot` — Orchestration (5 → 1)
**Actions:** full, quick, v2, brainstorm_lenses, formula_optimize
**Replaces:** autoPilotTools (5)

### 19. `prism_manus` — Manus AI Integration (7 → 1)
**Actions:** create_task, task_status, task_result, cancel, list_tasks, web_research, code_sandbox
**Replaces:** manusTools (7) + dev hooks (4)

### 20. `prism_build` — Build & Code (6 → 1)
**Actions:** build, code_template, code_search, file_read, file_write, server_info
**Replaces:** buildTools (6)

## Summary

| # | Dispatcher | Current Tools | Actions |
|---|-----------|---------------|---------|
| 1 | prism_data | 14 | 14 |
| 2 | prism_calc | 21 | 21 |
| 3 | prism_safety | 29 | 29 |
| 4 | prism_thread | 12 | 12 |
| 5 | prism_toolpath | 8 | 8 |
| 6 | prism_agent | 22 | 22 |
| 7 | prism_hook | 28→~18 | ~18 (dedup v2/v3) |
| 8 | prism_skill | 17→~14 | ~14 (dedup) |
| 9 | prism_session | 18 | 18 |
| 10 | prism_context | 14 | 14 |
| 11 | prism_knowledge | 5 | 5 |
| 12 | prism_dev | 30→~20 | ~20 (merge guards) |
| 13 | prism_doc | 7 | 7 |
| 14 | prism_validate | 7 | 7 |
| 15 | prism_omega | 5 | 5 |
| 16 | prism_gsd | 8 | 8 |
| 17 | prism_ralph | 3 | 3 |
| 18 | prism_autopilot | 5 | 5 |
| 19 | prism_manus | 11 | 11 |
| 20 | prism_build | 6 | 6 |
| **TOTAL** | **321 → 20** | **~250 actions** |

## Schema Pattern (each dispatcher)

```typescript
server.tool("prism_calc", {
  description: "Manufacturing calculations: cutting_force, tool_life, speed_feed, mrr, power, surface_finish, stability, deflection, thermal, cost, engagement, trochoidal, hsm, scallop, stepover, cycle_time, arc_fit, flow_stress, chip_load, multi_optimize, productivity",
  inputSchema: z.object({
    action: z.enum(["cutting_force", "tool_life", "speed_feed", ...]),
    params: z.record(z.any()).describe("Action-specific parameters")
  })
}, async ({ action, params }) => {
  // Route to existing implementation
  switch(action) {
    case "cutting_force": return calcCuttingForce(params);
    case "tool_life": return calcToolLife(params);
    // ...
  }
});
```

## Token Math

**Before:** 321 tools × ~250 tokens/tool = ~80,250 tokens
**After:** 20 dispatchers × ~500 tokens/dispatcher = ~10,000 tokens
**Savings:** ~70,000 tokens per conversation (35% of 200K context)

Each dispatcher description is ~2 lines listing actions. Each has 2 params (action enum + params object).
Vs current: each tool has full multi-line description + 5-15 typed parameters + nested objects.

## Implementation Plan

### Phase A: Build dispatcher framework (1 session)
- Generic dispatcher factory function
- Action routing with validation
- Error handling and unknown action rejection
- Backward compatibility: old tool names still work during migration

### Phase B: Migrate by priority (2-3 sessions)
1. **prism_safety** (29→1) — biggest single win, all parameterless
2. **prism_thread** (12→1) — all parameterless
3. **prism_toolpath** (8→1) — all parameterless
4. **prism_hook** (28→~18→1) — massive dedup opportunity
5. **prism_calc** (21→1) — high value
6. **prism_agent** (22→1) — high value
7. **prism_context** (14→1) + **prism_dev** (24→1) — session tooling
8. Everything else

### Phase C: Cleanup (0.5 session)
- Remove old registration files
- Update GSD, memories, skills
- Validate all actions work
- Measure actual token savings

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Lose per-parameter Zod validation | Dispatcher validates params internally per-action |
| Claude forgets action names | Action list in description, common patterns in skills |
| Debugging harder (generic params) | Error messages include expected params per action |
| Breaking change for any external consumers | Keep old tool names as aliases during transition |

## Decision Record
- **Decision:** Mega-dispatcher over multi-server or dynamic registration
- **Reasoning:** Works today, no client dependency, biggest token savings, simplest implementation
- **Revisit if:** Claude Desktop implements proper tools/list_changed or lazy tool loading
