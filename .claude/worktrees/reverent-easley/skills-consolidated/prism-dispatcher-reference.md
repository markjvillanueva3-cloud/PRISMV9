# PRISM Dispatcher Reference v2.0
> 31 dispatchers → 368 actions → replaces ~180 individual tools
> Pattern: `prism:prism_<dispatcher>` action=`<action_name>` params={...}

## Quick Lookup Table

| Dispatcher | Tool Name | Key Actions |
|-----------|-----------|-------------|
| data | `prism:prism_data` | material_get, material_search, material_compare, machine_get, machine_search, machine_capabilities, tool_get, tool_search, tool_recommend, alarm_decode, alarm_search, alarm_fix, formula_get, formula_calculate |
| calc | `prism:prism_calc` | cutting_force, tool_life, speed_feed, flow_stress, surface_finish, mrr, power, chip_load, stability, deflection, thermal, cost_optimize, multi_optimize, productivity, engagement, trochoidal, hsm, scallop, stepover, cycle_time, arc_fit |
| safety | `prism:prism_safety` | check_toolpath_collision, validate_rapid_moves, check_fixture_clearance, calculate_safe_approach, detect_near_miss, generate_collision_report, validate_tool_clearance, check_5axis_head_clearance, validate_coolant_flow, check_through_spindle_coolant, calculate_chip_evacuation, validate_mql_parameters, get_coolant_recommendations, check_spindle_torque, check_spindle_power, validate_spindle_speed, monitor_spindle_thermal, get_spindle_safe_envelope, predict_tool_breakage, calculate_tool_stress, check_chip_load_limits, estimate_tool_fatigue, get_safe_cutting_limits, calculate_clamp_force_required, validate_workholding_setup, check_pullout_resistance, analyze_liftoff_moment, calculate_part_deflection, validate_vacuum_fixture |
| thread | `prism:prism_thread` | calculate_tap_drill, calculate_thread_mill_params, calculate_thread_depth, calculate_engagement_percent, get_thread_specifications, get_go_nogo_gauges, calculate_pitch_diameter, calculate_minor_major_diameter, select_thread_insert, calculate_thread_cutting_params, validate_thread_fit_class, generate_thread_gcode |
| toolpath | `prism:prism_toolpath` | strategy_select, params_calculate, strategy_search, strategy_list, strategy_info, stats, material_strategies, prism_novel |
| hook | `prism:prism_hook` | list, get, execute, chain, toggle, emit, event_list, event_history, fire, chain_v2, status, history, enable, disable, coverage, gaps, performance, failures |
| validate | `prism:prism_validate` | material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression |
| omega | `prism:prism_omega` | compute, breakdown, validate, optimize, history |
| session | `prism:prism_session` | state_load, state_save, state_checkpoint, state_diff, handoff_prepare, resume_session, memory_save, memory_recall, context_pressure, context_size, context_compress, context_expand, compaction_detect, transcript_read, state_reconstruct, session_recover, quick_resume, session_start, session_end, auto_checkpoint |
| context | `prism:prism_context` | kv_sort_json, kv_check_stability, tool_mask_state, memory_externalize, memory_restore, todo_update, todo_read, error_preserve, error_patterns, vary_response, team_spawn, team_broadcast, team_create_task, team_heartbeat |
| sp | `prism:prism_sp` | brainstorm, plan, execute, review_spec, review_quality, debug, cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl, combination_ilp, context_kv_optimize, context_attention_anchor, context_error_preserve, session_start_full, session_end_full, evidence_level, validate_gates_full, validate_mathplan |
| skillScript | `prism:prism_skill_script` | skill_list, skill_get, skill_search, skill_find_for_task, skill_content, skill_stats, script_list, script_get, script_search, script_command, script_execute, script_stats, skill_load, skill_recommend, skill_analyze, skill_chain, skill_search_v2, skill_stats_v2, script_execute_v2, script_queue, script_recommend, script_search_v2, script_history |
| knowledge | `prism:prism_knowledge` | search, cross_query, formula, relations, stats |
| orchestrate | `prism:prism_orchestrate` | agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status, queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline, swarm_status, swarm_patterns |
| doc | `prism:prism_doc` | list, read, write, append, roadmap_status, action_tracker, migrate |
| dev | `prism:prism_dev` | session_boot, build, code_template, code_search, file_read, file_write, server_info |
| gsd | `prism:prism_gsd` | core, quick, get, dev_protocol, resources_summary, quick_resume |
| guard | `prism:prism_guard` | decision_log, failure_library, error_capture, pre_write_gate, pre_write_diff, pre_call_validate, autohook_status, autohook_test |
| ralph | `prism:prism_ralph` | loop, scrutinize, assess |
| autopilot | `prism:prism_autopilot_d` | autopilot, autopilot_quick, brainstorm_lenses, ralph_loop_lite, formula_optimize, autopilot_v2, registry_status, working_tools |
| generator | `prism:prism_generator` | stats, list_domains, generate, generate_batch, validate, get_template |
| manus | `prism:prism_manus` | create_task, task_status, task_result, cancel_task, list_tasks, web_research, code_sandbox, hook_trigger, hook_list, hook_chain, hook_stats |
| atcs | `prism:prism_atcs` | task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan |
| autonomous | `prism:prism_autonomous` | auto_configure, auto_plan, auto_execute, auto_status, auto_validate, auto_dry_run, auto_pause, auto_resume |
| telemetry | `prism:prism_telemetry` | get_dashboard, get_detail, get_anomalies, get_optimization, acknowledge, freeze_weights, unfreeze_weights |
| pfp | `prism:prism_pfp` | get_dashboard, assess_risk, get_patterns, get_history, force_extract, update_config |
| memory | `prism:prism_memory` | get_health, trace_decision, find_similar, get_session, get_node, run_integrity |
| nl_hook | `prism:prism_nl_hook` | create, parse, approve, remove, list, get, stats, config |
| compliance | `prism:prism_compliance` | apply_template, remove_template, list_templates, audit_status, check_compliance, resolve_conflicts, gap_analysis, config |
| tenant | `prism:prism_tenant` | create, get, list, suspend, reactivate, delete, get_context, check_limit, publish_pattern, consume_patterns, promote_pattern, quarantine_pattern, slb_stats, stats, config |
| bridge | `prism:prism_bridge` | register_endpoint, remove_endpoint, set_status, list_endpoints, create_key, revoke_key, validate_key, list_keys, route, route_map, health, stats, config |

## Common Param Patterns

All dispatchers share the same call signature:
```
prism:<tool_name> { action: "<action_name>", params: { ...action_specific_params } }
```

### Data Dispatcher Examples
```
material_search: params: { query: "Ti-6Al-4V" } or { iso_group: "S" }
material_get: params: { id: "MAT-0001" } or { name: "4140" }
alarm_decode: params: { code: "100", controller: "fanuc" }
machine_search: params: { query: "DMG MORI" }
tool_recommend: params: { material_id: "MAT-0001", operation: "turning" }
```

### Calc Dispatcher Examples
```
cutting_force: params: { material: "steel_4140", depth: 2, feed: 0.2, speed: 200 }
tool_life: params: { speed: 200, material: "steel_4140", feed: 0.2 }
speed_feed: params: { material: "steel_4140", tool_diameter: 12, operation: "milling" }
surface_finish: params: { feed: 0.15, nose_radius: 0.8 }
```

### Safety Dispatcher Examples
```
check_spindle_power: params: { required_power: 15, spindle_max: 22 }
predict_tool_breakage: params: { tool_diameter: 10, cutting_force: 1500, material: "carbide" }
validate_workholding_setup: params: { cutting_force: 2000, clamp_force: 5000 }
```

### Session Dispatcher Examples
```
state_save: params: {} (saves current state)
context_pressure: params: {} (returns buffer zone status)
auto_checkpoint: params: {} (saves if cadence threshold met)
```

## Legacy → Dispatcher Migration Map

| Old Individual Tool | New Dispatcher Call |
|---|---|
| `prism:material_search` | `prism:prism_data` action=`material_search` |
| `prism:calc_cutting_force` | `prism:prism_calc` action=`cutting_force` |
| `prism:check_spindle_power` | `prism:prism_safety` action=`check_spindle_power` |
| `prism:validate_anti_regression` | `prism:prism_validate` action=`anti_regression` |
| `prism:omega_compute` | `prism:prism_omega` action=`compute` |
| `prism:prism_state_save` | `prism:prism_session` action=`state_save` |
| `prism:prism_todo_update` | `prism:prism_context` action=`todo_update` |
| `prism:prism_doc_read` | `prism:prism_doc` action=`read` |
| `prism:prism_build` | `prism:prism_dev` action=`build` |
| `prism:prism_sp_brainstorm` | `prism:prism_sp` action=`brainstorm` |
| `prism:prism_ralph_loop` | `prism:prism_ralph` action=`loop` |
| `prism:knowledge_search` | `prism:prism_knowledge` action=`search` |
| `prism:skill_find_for_task` | `prism:prism_skill_script` action=`skill_find_for_task` |
| `prism:hook_fire` | `prism:prism_hook` action=`fire` |
