# PRISM GSD v13.0 - Unified Build Edition
## Get Shit Done - 332 MCP Tools, esbuild, Zero Collisions

---

## SESSION START PROTOCOL (MANDATORY)

### Step 1: Load State
```
prism_quick_resume                        → Load CURRENT_STATE.json
```

### Step 2: Read Tracker
```
Desktop Commander:read_file               → C:\PRISM\state\ACTION_TRACKER.md
                                          → See DONE vs PENDING
                                          → NEVER duplicate completed work
```

### Step 3: Initialize
```
prism_todo_update                         → Anchor attention on current task
```

### Step 4: CHECK BEFORE CREATING
```
Desktop Commander:get_file_info           → ALWAYS check if file exists before write
```

---

## SESSION END PROTOCOL (MANDATORY)

### Step 1: Save State
```
prism_state_save(state={...})             → Persist to CURRENT_STATE.json
```

### Step 2: Update Tracker
```
Desktop Commander:write_file              → Update C:\PRISM\state\ACTION_TRACKER.md
```

### Step 3: Final Anchor
```
prism_todo_update                         → Final status for next session
```

---

## STATE FILES (C:\PRISM\state\)
| File | Purpose | Tool |
|------|---------|------|
| CURRENT_STATE.json | Machine state | prism_state_save/quick_resume |
| ACTION_TRACKER.md | Human tracker | DC:read_file/write_file |
| todo.md | Attention anchor | prism_todo_update |
| SESSION_MEMORY.json | Persistent memory | prism_memory_save/recall |

---

## 6 LAWS
1. **S(x)≥0.70** - Safety HARD BLOCK
2. **No placeholders** - 100% complete
3. **New≥Old** - Never lose data (validate_anti_regression)
4. **MCP First** - 332 tools before manual file ops
5. **NO DUPLICATES** - Check tracker + get_file_info BEFORE creating
6. **100% UTILIZATION** - If it exists, wire it

---

## BUILD SYSTEM

### Build Command (esbuild - 150ms, no memory issues)
```
cd C:\PRISM\mcp-server
npm run build                             → esbuild bundle (fast, default)
npm run build:tsc                         → TypeScript compiler (needs 8GB+ heap)
```

### Config Location
```
C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json
→ Points to: C:/PRISM/mcp-server/dist/index.js
```

### After Code Changes
```
1. npm run build                          → Rebuild (150ms)
2. Restart Claude Desktop                 → Pick up changes
```

---
## TOOL INVENTORY (332 MCP Tools)

### Data Access (15 tools)
material_get, material_search, material_compare, machine_get, machine_search,
machine_capabilities, tool_get, tool_search, tool_recommend, alarm_decode,
alarm_search, alarm_fix, formula_get, formula_calculate

### Calculations - Core (8 tools)
calc_cutting_force, calc_tool_life, calc_flow_stress, calc_surface_finish,
calc_mrr, calc_speed_feed, calc_power, calc_chip_load

### Calculations - Advanced (6 tools)
calc_stability, calc_deflection, calc_thermal, calc_cost_optimize,
calc_multi_optimize, calc_productivity

### Calculations - Toolpath (7 tools)
calc_engagement, calc_trochoidal, calc_hsm, calc_scallop, calc_stepover,
calc_cycle_time, calc_arc_fit

### Physics Engines (3 tools)
prism_speed_feed, prism_cutting_force, prism_tool_life

### Safety-Critical (41 tools)
**Collision Detection (8):** check_toolpath_collision, validate_rapid_moves,
  check_fixture_clearance, calculate_safe_approach, detect_near_miss,
  generate_collision_report, validate_tool_clearance, check_5axis_head_clearance
**Coolant (5):** validate_coolant_flow, check_through_spindle_coolant,
  calculate_chip_evacuation, validate_mql_parameters, get_coolant_recommendations
**Spindle (5):** check_spindle_torque, check_spindle_power, validate_spindle_speed,
  monitor_spindle_thermal, get_spindle_safe_envelope
**Tool Breakage (5):** predict_tool_breakage, calculate_tool_stress,
  check_chip_load_limits, estimate_tool_fatigue, get_safe_cutting_limits
**Workholding (6):** calculate_clamp_force_required, validate_workholding_setup,
  check_pullout_resistance, analyze_liftoff_moment, calculate_part_deflection,
  validate_vacuum_fixture
**Threading (12):** calculate_tap_drill, calculate_thread_mill_params,
  calculate_thread_depth, calculate_engagement_percent, get_thread_specifications,
  get_go_nogo_gauges, calculate_pitch_diameter, calculate_minor_major_diameter,
  select_thread_insert, calculate_thread_cutting_params, validate_thread_fit_class,
  generate_thread_gcode

### Toolpath Strategy (8 tools)
toolpath_strategy_select, toolpath_params_calculate, toolpath_strategy_search,
toolpath_strategy_list, toolpath_strategy_info, toolpath_stats,
toolpath_material_strategies, toolpath_prism_novel

### Orchestration - Agents (12 + 8 V2 = 20 tools)
agent_list, agent_get, agent_search, agent_find_for_task, agent_invoke, agent_stats,
agent_execute, agent_execute_parallel, agent_execute_pipeline,
plan_create, plan_execute, plan_status,
prism_agent_list, prism_agent_invoke, prism_agent_swarm,
prism_combination_ilp, queue_stats, session_list,
prism_cognitive_init, prism_cognitive_check

### Orchestration - Swarms (6 tools)
swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline,
swarm_status, swarm_patterns

### Hooks V2 + V3 + Management (28 tools)
hook_list_v2, hook_get_v2, hook_execute, hook_chain, hook_toggle,
event_emit, event_list, event_history,
prism_hook_fire_v2, prism_hook_chain_execute, prism_hook_status_v2,
prism_hook_history_v2, prism_hook_enable_v2, prism_hook_disable_v2,
prism_hook_coverage_v2, prism_hook_gaps_v2, prism_hook_performance_v2,
prism_hook_failures_v2,
prism_hook_fire, prism_hook_chain_v2, prism_hook_status,
prism_hook_history, prism_hook_enable, prism_hook_disable,
prism_hook_coverage, prism_hook_gaps, prism_hook_performance,
prism_hook_failures

### Knowledge (17 tools)
skill_list, skill_get, skill_search_v2, skill_find_for_task, skill_content, skill_stats_v2,
skill_load, skill_recommend, skill_analyze, skill_chain, skill_search,
script_list, script_get, script_search_v2, script_command, script_execute_v2, script_stats
knowledge_search, knowledge_cross_query, knowledge_formula,
knowledge_relations, knowledge_stats

### Validation (7 tools)
validate_material, validate_kienzle, validate_taylor, validate_johnson_cook,
validate_safety, validate_completeness, validate_anti_regression

### Omega (5 tools)
omega_compute, omega_breakdown, omega_validate, omega_optimize, omega_history

### Generator (6 tools)
get_hook_generator_stats, list_hook_domains, generate_hooks,
generate_hooks_batch, validate_generated_hooks, get_domain_template

### Session & Context (12 tools)
prism_session_start_v2, prism_session_end_v2, prism_auto_checkpoint,
prism_quick_resume_v2, prism_context_pressure, prism_context_size,
prism_context_compress, prism_context_expand, prism_compaction_detect,
prism_transcript_read, prism_state_reconstruct, prism_session_recover

### Development Protocol (12 tools)
prism_sp_brainstorm, prism_sp_plan, prism_sp_execute,
prism_sp_review_spec, prism_sp_review_quality, prism_sp_debug,
prism_cognitive_bayes, prism_cognitive_rl,
prism_evidence_level, prism_validate_gates_full, prism_validate_mathplan

### AutoPilot (8 tools)
prism_autopilot, prism_autopilot_quick, prism_brainstorm_lenses,
prism_ralph_loop_lite, prism_formula_optimize,
prism_autopilot_v2, prism_registry_status, prism_working_tools

### Ralph Loop (3 tools)
prism_ralph_loop, prism_ralph_scrutinize, prism_ralph_assess

### Manus Laws (11 tools)
prism_kv_sort_json, prism_kv_check_stability, prism_tool_mask_state,
prism_memory_externalize, prism_memory_restore,
prism_todo_update, prism_todo_read,
prism_error_preserve, prism_error_patterns,
prism_vary_response, prism_context_attention_anchor

### State & Memory (8 tools)
prism_state_load, prism_state_save, prism_state_checkpoint,
prism_state_diff, prism_handoff_prepare, prism_resume_session,
prism_memory_save, prism_memory_recall

### Manus Integration (6 tools)
prism_manus_create_task, prism_manus_task_status, prism_manus_task_result,
prism_manus_cancel_task, prism_manus_list_tasks, prism_manus_web_research,
prism_manus_code_sandbox

### Dev Hooks (4 tools)
prism_dev_hook_trigger, prism_dev_hook_list, prism_dev_hook_chain,
prism_dev_hook_stats

### Teams (4 tools)
prism_team_spawn, prism_team_broadcast, prism_team_create_task,
prism_team_heartbeat

### GSD Quick Ref (3 tools)
prism_gsd_core, prism_gsd_quick, prism_gsd_get

### Module & Skill Loader (4 tools)
prism_skill_list, prism_skill_load, prism_skill_search,
prism_module_list, prism_module_load, prism_knowledge_query

---

## REGISTRY SUMMARY (13,429 entries)
| Registry | Count | Notes |
|----------|-------|-------|
| Materials | 2,805 | Full Kienzle/Taylor/JC coefficients |
| Machines | 0 | Data files need loading |
| Tools | 0 | Data files need loading |
| Alarms | 10,033 | 12 controller families |
| Formulas | 10 | Core physics formulas |
| Agents | 75 | 3 tiers: OPUS/SONNET/HAIKU |
| Hooks | 25 | Built-in lifecycle hooks |
| Skills | 156 | Markdown skill files |
| Scripts | 325 | Automation scripts |

---

## OMEGA INTEGRATION
```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
HARD CONSTRAINT: S(x) ≥ 0.70 or BLOCKED
≥0.85 Excellent | ≥0.70 Release | <0.70 Block
```
Tools: omega_compute, omega_breakdown, omega_validate, omega_optimize, omega_history

---

## DECISION TREE: Which Tool?

```
Cutting parameters?    → prism_speed_feed (balanced/mrr/surface_finish/tool_life)
Cutting forces?        → calc_cutting_force or prism_cutting_force
Tool life?             → calc_tool_life or prism_tool_life
Surface finish?        → calc_surface_finish
Stability/chatter?     → calc_stability
Material lookup?       → material_get / material_search
Machine lookup?        → machine_get / machine_search
Alarm decode?          → alarm_decode (auto-detects controller)
Thread calc?           → calculate_tap_drill, get_thread_specifications
Toolpath strategy?     → toolpath_strategy_select
Multi-objective?       → calc_multi_optimize
Code quality?          → prism_ralph_loop (4-phase LIVE API)
Quick validate?        → prism_ralph_scrutinize
Full orchestration?    → prism_autopilot_v2
Cross-registry query?  → knowledge_cross_query
Find right skill?      → skill_recommend or skill_find_for_task
```

---

## BUFFER ZONES
🟢 0-8 calls | 🟡 9-14 (checkpoint) | 🔴 15-18 (urgent save) | ⚫ 19+ STOP

---

## COLLISION RENAMES (Reference)
These tools were renamed to avoid registration collisions:
| Original | Renamed To | File |
|----------|-----------|------|
| skill_stats | skill_stats_v2 | skillToolsV2.ts |
| skill_search | skill_search_v2 | skillToolsV2.ts |
| script_search | script_search_v2 | scriptToolsV2.ts |
| script_execute | script_execute_v2 | scriptToolsV2.ts |
| prism_ralph_loop | prism_ralph_loop_lite | autoPilotTools.ts |
| hook_get/list | hook_get_v2/list_v2 | hookToolsV2.ts |
| 9 hook mgmt tools | *_v2 suffix | hookManagementTools.ts |
| 3 session tools | *_v2 suffix | sessionLifecycleTools.ts |

---

## PHASE COMPLETION CHECKLIST (MANDATORY)
After ANY build/phase:
```
□ Skills: Create/update SKILL.md
□ Hooks: Register auto-triggers
□ GSD: Update this file
□ Memories: memory_user_edits
□ Orchestrators: Update routing tables
□ State: prism_state_save
□ Scripts: Update automation
```

---

**Version:** 13.0.0
**Updated:** 2026-02-05
**MCP Tools:** 332
**Registries:** 13,429 entries
**Build:** esbuild (~150ms)
**Server:** prism-mcp-server v2.9.0


## API KEY CONFIGURATION

### Location (dual-load for reliability)
```
PRIMARY: claude_desktop_config.json → env.ANTHROPIC_API_KEY
BACKUP:  C:\PRISM\mcp-server\.env → ANTHROPIC_API_KEY=sk-ant-...
```

### What it enables
| Tool | Without Key | With Key |
|------|-------------|----------|
| prism_ralph_loop | ⛔ BLOCKED | ✅ 4-phase LIVE validation |
| prism_ralph_scrutinize | ⛔ BLOCKED | ✅ LIVE scrutiny |
| prism_ralph_assess | ⛔ BLOCKED | ✅ OPUS assessment |
| agent_invoke/execute | Placeholder response | ✅ Real Claude API calls |
| swarm_execute | Placeholder | ✅ Real multi-agent |
| prism_agent_swarm | Placeholder | ✅ Real swarm patterns |

### Models Configured
```
OPUS:   claude-opus-4-20250514
SONNET: claude-sonnet-4-20250514
HAIKU:  claude-haiku-4-5-20241022
```

### Config file location
```
C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json
```
