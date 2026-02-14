# PRISM MCP Server - Complete Tool Registry (332 tools)
# Extracted: 2026-02-05 from dist/index.js + source files
# This is the MASTER REFERENCE. Keep in sync after any tool add/remove.

## DATA ACCESS (14)
material_get, material_search, material_compare
machine_get, machine_search, machine_capabilities
tool_get, tool_search, tool_recommend
alarm_decode, alarm_search, alarm_fix
formula_get, formula_calculate

## CALCULATIONS - CORE (8)
calc_cutting_force, calc_tool_life, calc_flow_stress, calc_surface_finish
calc_mrr, calc_speed_feed, calc_power, calc_chip_load

## CALCULATIONS - ADVANCED (6)
calc_stability, calc_deflection, calc_thermal
calc_cost_optimize, calc_multi_optimize, calc_productivity

## CALCULATIONS - TOOLPATH (7)
calc_engagement, calc_trochoidal, calc_hsm, calc_scallop
calc_stepover, calc_cycle_time, calc_arc_fit

## PHYSICS ENGINES (3)
prism_speed_feed, prism_cutting_force, prism_tool_life

## SAFETY - COLLISION (8)
check_toolpath_collision, validate_rapid_moves, check_fixture_clearance
calculate_safe_approach, detect_near_miss, generate_collision_report
validate_tool_clearance, check_5axis_head_clearance

## SAFETY - COOLANT (5)
validate_coolant_flow, check_through_spindle_coolant, calculate_chip_evacuation
validate_mql_parameters, get_coolant_recommendations

## SAFETY - SPINDLE (5)
check_spindle_torque, check_spindle_power, validate_spindle_speed
monitor_spindle_thermal, get_spindle_safe_envelope

## SAFETY - TOOL BREAKAGE (5)
predict_tool_breakage, calculate_tool_stress, check_chip_load_limits
estimate_tool_fatigue, get_safe_cutting_limits

## SAFETY - WORKHOLDING (6)
calculate_clamp_force_required, validate_workholding_setup
check_pullout_resistance, analyze_liftoff_moment
calculate_part_deflection, validate_vacuum_fixture

## THREADING (12)
calculate_tap_drill, calculate_thread_mill_params, calculate_thread_depth
calculate_engagement_percent, get_thread_specifications, get_go_nogo_gauges
calculate_pitch_diameter, calculate_minor_major_diameter, select_thread_insert
calculate_thread_cutting_params, validate_thread_fit_class, generate_thread_gcode

## TOOLPATH STRATEGY (8)
toolpath_strategy_select, toolpath_params_calculate, toolpath_strategy_search
toolpath_strategy_list, toolpath_strategy_info, toolpath_stats
toolpath_material_strategies, toolpath_prism_novel

## VALIDATION (7)
validate_material, validate_kienzle, validate_taylor, validate_johnson_cook
validate_safety, validate_completeness, validate_anti_regression

## OMEGA (5)
omega_compute, omega_breakdown, omega_validate, omega_optimize, omega_history

## FORMULAS (2)
prism_formula_calc, prism_formula_optimize

## ORCHESTRATION - AGENTS (20)
agent_list, agent_get, agent_search, agent_find_for_task, agent_invoke, agent_stats
agent_execute, agent_execute_parallel, agent_execute_pipeline
plan_create, plan_execute, plan_status, queue_stats, session_list
prism_agent_list, prism_agent_invoke, prism_agent_swarm
prism_cognitive_init, prism_cognitive_check, prism_combination_ilp

## ORCHESTRATION - SWARMS (6)
swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline
swarm_status, swarm_patterns

## HOOKS V2 (8)
hook_list_v2, hook_get_v2, hook_execute, hook_chain, hook_toggle
event_emit, event_list, event_history

## HOOKS V3 (10)
prism_hook_fire_v2, prism_hook_chain_execute, prism_hook_status_v2
prism_hook_history_v2, prism_hook_enable_v2, prism_hook_disable_v2
prism_hook_coverage_v2, prism_hook_gaps_v2, prism_hook_performance_v2
prism_hook_failures_v2

## HOOK MANAGEMENT (10)
prism_hook_fire, prism_hook_chain_v2, prism_hook_status
prism_hook_history, prism_hook_enable, prism_hook_disable
prism_hook_coverage, prism_hook_gaps, prism_hook_performance, prism_hook_failures

## LEGACY HOOKS (5)
hook_list, hook_get, hook_search, hook_stats, hook_fire, hook_cognitive

## KNOWLEDGE & SKILLS (17)
knowledge_search, knowledge_cross_query, knowledge_formula, knowledge_relations, knowledge_stats
skill_list, skill_get, skill_content, skill_find_for_task, skill_search
skill_load, skill_recommend, skill_analyze, skill_chain, skill_search_v2, skill_stats_v2
prism_skill_list, prism_skill_load, prism_skill_search, prism_knowledge_query
prism_module_list, prism_module_load

## SCRIPTS (10)
script_list, script_get, script_search, script_command, script_execute, script_stats
script_execute_v2, script_search_v2, script_queue, script_recommend, script_history

## RALPH LOOP - LIVE API (3)
prism_ralph_loop, prism_ralph_scrutinize, prism_ralph_assess

## AUTOPILOT (8)
prism_autopilot, prism_autopilot_quick, prism_brainstorm_lenses
prism_ralph_loop_lite, prism_formula_optimize
prism_autopilot_v2, prism_registry_status, prism_working_tools

## SESSION & CONTEXT (12)
prism_session_start_v2, prism_session_end_v2, prism_auto_checkpoint
prism_quick_resume_v2, prism_context_pressure, prism_context_size
prism_context_compress, prism_context_expand, prism_compaction_detect
prism_transcript_read, prism_state_reconstruct, prism_session_recover

## STATE & MEMORY (8)
prism_state_load, prism_state_save, prism_state_checkpoint
prism_state_diff, prism_handoff_prepare, prism_resume_session
prism_memory_save, prism_memory_recall

## DEVELOPMENT PROTOCOL (12)
prism_sp_brainstorm, prism_sp_plan, prism_sp_execute
prism_sp_review_spec, prism_sp_review_quality, prism_sp_debug
prism_cognitive_bayes, prism_cognitive_rl
prism_evidence_level, prism_validate_gates_full, prism_validate_mathplan, prism_dev_protocol

## CONTEXT ENGINEERING / MANUS LAWS (11)
prism_kv_sort_json, prism_kv_check_stability, prism_tool_mask_state
prism_memory_externalize, prism_memory_restore
prism_todo_update, prism_todo_read
prism_error_preserve, prism_error_patterns
prism_vary_response, prism_context_attention_anchor

## MANUS INTEGRATION (7)
prism_manus_create_task, prism_manus_task_status, prism_manus_task_result
prism_manus_cancel_task, prism_manus_list_tasks, prism_manus_web_research
prism_manus_code_sandbox

## DEV HOOKS (4)
prism_dev_hook_trigger, prism_dev_hook_list, prism_dev_hook_chain, prism_dev_hook_stats

## TEAMS (4)
prism_team_spawn, prism_team_broadcast, prism_team_create_task, prism_team_heartbeat

## GSD (6)
prism_gsd_core, prism_gsd_quick, prism_gsd_get
prism_resources_summary, prism_quick_resume, prism_session_start_full, prism_session_end_full

## GENERATORS (6)
get_hook_generator_stats, list_hook_domains, generate_hooks
generate_hooks_batch, validate_generated_hooks, get_domain_template

## DESKTOP COMMANDER (external MCP - 19 tools)
read_file, read_multiple_files, write_file, write_pdf, edit_block
create_directory, list_directory, move_file, get_file_info
start_process, read_process_output, interact_with_process
force_terminate, list_sessions, list_processes, kill_process
start_search, get_more_search_results, stop_search, list_searches
get_config, set_config_value, get_usage_stats, get_recent_tool_calls

## PDF TOOLS (external MCP - 11 tools)
list_pdfs, read_pdf_fields, fill_pdf, bulk_fill_from_csv
save_profile, load_profile, list_profiles, fill_with_profile
extract_to_csv, validate_pdf, read_pdf_content, get_pdf_resource_uri

## COLLISION RENAMES (for reference)
# skill_stats → skill_stats_v2 (skillToolsV2.ts)
# skill_search → skill_search_v2 (skillToolsV2.ts)
# script_search → script_search_v2 (scriptToolsV2.ts)
# script_execute → script_execute_v2 (scriptToolsV2.ts)
# prism_ralph_loop → prism_ralph_loop_lite (autoPilotTools.ts)
# hook_get → hook_get_v2 (hookToolsV2.ts)
# hook_list → hook_list_v2 (hookToolsV2.ts)
# 9 hook mgmt → *_v2 suffix (hookManagementTools.ts)
# 3 session → *_v2 suffix (sessionLifecycleTools.ts)
