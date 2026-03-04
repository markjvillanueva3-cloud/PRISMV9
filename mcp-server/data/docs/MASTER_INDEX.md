# PRISM MCP Server — Master Index
# Verified: 2026-02-28 (QA-MS14 Final Audit Complete — 15 milestones, 94 units)
# Source: C:\PRISM\mcp-server\src
# TRUTH SOURCE — Counts verified by QA-MS0 static code analysis

## 1. DISPATCHERS (46 dispatchers, 1103 verified actions)
## NOTE: Previous count of 684 was undercounted. QA-MS0 audit found 376 undocumented actions.
## Largest delta: prism_intelligence (27→489), prism_calc (21→56), prism_orchestrate (14→27)

### prism_atcs (atcsDispatcher.ts, 1077L)
Actions (10): task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan

### prism_autopilot_d (autoPilotDispatcher.ts, 143L)
Actions (7): autopilot, autopilot_quick, brainstorm_lenses, formula_optimize, autopilot_v2, registry_status, working_tools

### prism_autonomous (autonomousDispatcher.ts, 1070L)
Actions (8): auto_configure, auto_plan, auto_execute, auto_status, auto_validate, auto_dry_run, auto_pause, auto_resume

### prism_calc (calcDispatcher.ts, 1520L)
Actions (72): cutting_force, tool_life, speed_feed, flow_stress, surface_finish, mrr, power, torque, chip_load, stability, deflection, thermal, cost_optimize, multi_optimize, productivity, engagement, trochoidal, hsm, scallop, stepover, cycle_time, arc_fit, chip_thinning, multi_pass, coolant_strategy, gcode_snippet, tolerance_analysis, fit_analysis, gcode_generate, decision_tree, render_report, campaign_create, campaign_validate, campaign_optimize, campaign_cycle_time, inference_chain, wear_prediction, process_cost_calc, uncertainty_chain, controller_optimize, surface_integrity_predict, chatter_predict, thermal_compensate, unified_machining_model, coupling_sensitivity, optimize_parameters, optimize_sequence, sustainability_report, eco_optimize, fixture_recommend, drilling_force, algorithm_calculate, algorithm_validate, algorithm_list, algorithm_info, algorithm_batch, algorithm_benchmark, wear_progression, drill_breakthrough, thermal_growth, bore_finishing, finishing_pass, turning_force, tapping_torque, power_budget, tool_deflection_predict, chip_formation, specific_cutting_energy, roughness_convert, peck_drill_optimize, drill_cycle_optimize, coating_select

### prism_context (contextDispatcher.ts, 726L)
Actions (18): kv_sort_json, kv_check_stability, tool_mask_state, memory_externalize, memory_restore, todo_update, todo_read, error_preserve, error_patterns, vary_response, team_spawn, team_broadcast, team_create_task, team_heartbeat, attention_score, focus_optimize, relevance_filter, context_monitor_check

### prism_data (dataDispatcher.ts, ~700L)
Actions (27): material_get, material_search, material_compare, machine_get, machine_search, machine_capabilities, tool_get, tool_search, tool_recommend, tool_facets, alarm_decode, alarm_search, alarm_fix, formula_get, formula_calculate, cross_query, machine_toolholder_match, alarm_diagnose, speed_feed_calc, tool_compare, material_substitute, coolant_get, coolant_search, coolant_recommend, coating_get, coating_search, coating_recommend

### prism_dev (devDispatcher.ts, 481L)
Actions (9): session_boot, build, code_template, code_search, file_read, file_write, server_info, test_smoke, test_results

### prism_doc (documentDispatcher.ts, 199L)
Actions (7): list, read, write, append, roadmap_status, action_tracker, migrate

### prism_generator (generatorDispatcher.ts, 175L)
Actions (6): stats, list_domains, generate, generate_batch, validate, get_template

### prism_gsd (gsdDispatcher.ts, 199L)
Actions (6): core, quick, get, dev_protocol, resources_summary, quick_resume

### prism_guard (guardDispatcher.ts, 728L)
Actions (14): decision_log, failure_library, error_capture, pre_write_gate, pre_write_diff, pre_call_validate, autohook_status, autohook_test, pattern_scan, pattern_history, learning_query, learning_save, lkg_status, priority_score

### prism_hook (hookDispatcher.ts, 130L)
Actions (18): list, get, execute, chain, toggle, emit, event_list, event_history, fire, chain_v2, status, history, enable, disable, coverage, gaps, performance, failures

### prism_knowledge (knowledgeDispatcher.ts, 82L)
Actions (5): search, cross_query, formula, relations, stats

### prism_manus (manusDispatcher.ts, 286L)
Actions (11): create_task, task_status, task_result, cancel_task, list_tasks, knowledge_lookup, code_reasoning, hook_trigger, hook_list, hook_chain, hook_stats

### prism_memory (memoryDispatcher.ts, 182L)
Actions (6): get_health, trace_decision, find_similar, get_session, get_node, run_integrity

### prism_omega (omegaDispatcher.ts, 124L)
Actions (5): compute, breakdown, validate, optimize, history

### prism_orchestrate (orchestrationDispatcher.ts, 132L)
Actions (14): agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status, queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline, swarm_status, swarm_patterns

### prism_pfp (pfpDispatcher.ts, 176L)
Actions (6): get_dashboard, assess_risk, get_patterns, get_history, force_extract, update_config

### prism_product (productDispatcher.ts, 250L) — SYS-MS1-U00
Actions (40): sfc_calculate, sfc_compare, sfc_optimize, sfc_quick, sfc_materials, sfc_tools, sfc_formulas, sfc_safety, sfc_history, sfc_get, ppg_validate, ppg_translate, ppg_templates, ppg_generate, ppg_controllers, ppg_compare, ppg_syntax, ppg_batch, ppg_history, ppg_get, shop_job, shop_cost, shop_quote, shop_schedule, shop_dashboard, shop_report, shop_compare, shop_materials, shop_history, shop_get, acnc_program, acnc_feature, acnc_simulate, acnc_output, acnc_tools, acnc_strategy, acnc_validate, acnc_batch, acnc_history, acnc_get

### prism_ralph (ralphDispatcher.ts, 131L)
Actions (3): loop, scrutinize, assess

### prism_safety (safetyDispatcher.ts, 75L)
Actions (29): check_toolpath_collision, validate_rapid_moves, check_fixture_clearance, calculate_safe_approach, detect_near_miss, generate_collision_report, validate_tool_clearance, check_5axis_head_clearance, validate_coolant_flow, check_through_spindle_coolant, calculate_chip_evacuation, validate_mql_parameters, get_coolant_recommendations, check_spindle_torque, check_spindle_power, validate_spindle_speed, monitor_spindle_thermal, get_spindle_safe_envelope, predict_tool_breakage, calculate_tool_stress, check_chip_load_limits, estimate_tool_fatigue, get_safe_cutting_limits, calculate_clamp_force_required, validate_workholding_setup, check_pullout_resistance, analyze_liftoff_moment, calculate_part_deflection, validate_vacuum_fixture

### prism_session (sessionDispatcher.ts, 881L)
Actions (30): state_load, state_save, state_checkpoint, state_diff, handoff_prepare, resume_session, memory_save, memory_recall, context_pressure, context_size, context_compress, context_expand, compaction_detect, transcript_read, state_reconstruct, session_recover, quick_resume, session_start, session_end, auto_checkpoint, wip_capture, wip_list, wip_restore, state_rollback, resume_score, checkpoint_enhanced, workflow_start, workflow_advance, workflow_status, workflow_complete

### prism_skill_script (skillScriptDispatcher.ts, 469L)
Actions (23): skill_list, skill_get, skill_search, skill_find_for_task, skill_content, skill_stats, script_list, script_get, script_search, script_command, script_execute, script_stats, skill_load, skill_recommend, skill_analyze, skill_chain, skill_search_v2, skill_stats_v2, script_execute_v2, script_queue, script_recommend, script_search_v2, script_history

### prism_sp (spDispatcher.ts, 524L)
Actions (19): brainstorm, plan, execute, review_spec, review_quality, debug, cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl, combination_ilp, context_kv_optimize, context_attention_anchor, context_error_preserve, session_start_full, session_end_full, evidence_level, validate_gates_full, validate_mathplan

### prism_telemetry (telemetryDispatcher.ts, 227L)
Actions (7): get_dashboard, get_detail, get_anomalies, get_optimization, acknowledge, freeze_weights, unfreeze_weights

### prism_thread (threadDispatcher.ts, 84L)
Actions (12): calculate_tap_drill, calculate_thread_mill_params, calculate_thread_depth, calculate_engagement_percent, get_thread_specifications, get_go_nogo_gauges, calculate_pitch_diameter, calculate_minor_major_diameter, select_thread_insert, calculate_thread_cutting_params, validate_thread_fit_class, generate_thread_gcode

### prism_toolpath (toolpathDispatcher.ts, 104L)
Actions (8): strategy_select, params_calculate, strategy_search, strategy_list, strategy_info, stats, material_strategies, prism_novel

### prism_validate (validationDispatcher.ts, 78L)
Actions (7): material, kienzle, taylor, johnson_cook, safety, completeness, anti_regression

### prism_nl_hook (nlHookDispatcher.ts, 112L) — F6
Actions (8): create, parse, approve, remove, list, get, stats, config

### prism_compliance (complianceDispatcher.ts, 94L) — F8
Actions (8): apply_template, remove_template, list_templates, audit_status, check_compliance, resolve_conflicts, gap_analysis, config

### prism_tenant (tenantDispatcher.ts, 95L) — F5
Actions (15): create, get, list, suspend, reactivate, delete, get_context, check_limit, publish_pattern, consume_patterns, promote_pattern, quarantine_pattern, slb_stats, stats, config

### prism_bridge (bridgeDispatcher.ts, 100L) — F7
Actions (13): register_endpoint, remove_endpoint, set_status, list_endpoints, create_key, revoke_key, validate_key, list_keys, route, route_map, health, stats, config

### prism_machine_live (machineLiveDispatcher.ts, 260L) — SYS-MS1-U01
Actions (40): machine_register, machine_unregister, machine_list, machine_connect, machine_disconnect, machine_live_status, machine_all_status, machine_ingest, chatter_detect_live, tool_wear_start, tool_wear_update, tool_wear_status, thermal_update, thermal_status, alert_acknowledge, alert_history, adaptive_chipload, adaptive_chatter, adaptive_wear, adaptive_thermal, adaptive_override, adaptive_status, adaptive_config, adaptive_log, adaptive_history, adaptive_get, maint_analyze, maint_trend, maint_predict, maint_schedule, maint_models, maint_thresholds, maint_alerts, maint_status, maint_history, maint_get, tool_crib_status, digital_twin_state, predictive_maintenance_alert, energy_report

### prism_integration (integrationDispatcher.ts, 225L) — SYS-MS1-U02
Actions (42): cam_recommend, cam_export, cam_analyze_op, cam_tool_library, cam_tool_get, cam_systems, dnc_generate, dnc_send, dnc_compare, dnc_verify, dnc_qr, dnc_systems, dnc_history, dnc_get, erp_import_wo, erp_get_plan, erp_cost_feedback, erp_cost_history, erp_quality_import, erp_quality_history, erp_tool_inventory, erp_tool_update, erp_systems, erp_wo_list, mobile_lookup, mobile_voice, mobile_alarm, mobile_timer_start, mobile_timer_check, mobile_timer_reset, mobile_timer_list, mobile_cache, measure_cmm_import, measure_cmm_history, measure_cmm_get, measure_surface, measure_surface_history, measure_probe_record, measure_probe_drift, measure_probe_history, measure_bias_detect, measure_summary

### prism_knowledge_ext (knowledgeExtDispatcher.ts, 240L) — SYS-MS1-U03
Actions (40): apprentice_explain, apprentice_lesson, apprentice_lessons, apprentice_assess, apprentice_capture, apprentice_knowledge, apprentice_challenge, apprentice_materials, apprentice_history, apprentice_get, genome_lookup, genome_predict, genome_similar, genome_compare, genome_list, genome_fingerprint, genome_behavioral, genome_search, genome_history, genome_get, graph_query, graph_infer, graph_discover, graph_predict, graph_traverse, graph_add, graph_search, graph_stats, graph_history, graph_get, learn_contribute, learn_query, learn_aggregate, learn_anonymize, learn_network_stats, learn_opt_control, learn_correction, learn_transparency, learn_history, learn_get

### prism_diagnosis (diagnosisDispatcher.ts, 237L) — SYS-MS1-U04
Actions (38): forensic_tool_autopsy, forensic_chip_analysis, forensic_surface_defect, forensic_crash, forensic_failure_modes, forensic_chip_types, forensic_surface_types, forensic_crash_types, forensic_history, forensic_get, inverse_solve, inverse_surface, inverse_tool_life, inverse_dimensional, inverse_chatter, inverse_troubleshoot, inverse_history, inverse_get, genplan_plan, genplan_features, genplan_setups, genplan_operations, genplan_optimize, genplan_tools, genplan_cycle, genplan_cost, genplan_risk, genplan_get, sustain_optimize, sustain_compare, sustain_energy, sustain_carbon, sustain_coolant, sustain_nearnet, sustain_report, sustain_materials, sustain_history, sustain_get

### prism_intelligence (intelligenceDispatcher.ts, 620L) — SLIMMED (SYS-MS1-U05)
Actions (49 core + 200 deprecated forwarding): job_plan, setup_sheet, process_cost, material_recommend, tool_recommend, machine_recommend, what_if, failure_diagnose, parameter_optimize, cycle_time_estimate, quality_predict, job_record, job_insights, algorithm_select, machine_utilization, decompose_intent, format_response, workflow_match, workflow_get, workflow_list, onboarding_welcome, onboarding_state, onboarding_record, onboarding_suggestion, onboarding_reset, setup_sheet_format, setup_sheet_template, skill_list, skill_get, skill_search, skill_match, skill_steps, skill_for_persona, conversation_context, conversation_transition, job_start, job_update, job_find, job_resume, job_complete, job_list_recent, assist_list, assist_get, assist_search, assist_match, assist_explain, assist_confidence, assist_mistakes, assist_safety
NOTE: 200 deprecated actions still accepted for backward compatibility, forwarded to prism_product (40), prism_machine_live (40), prism_integration (42), prism_knowledge_ext (40), prism_diagnosis (38).

### prism_l2 (l2EngineDispatcher.ts)
Actions (38): aiml_predict, aiml_classify, aiml_anomaly, aiml_cluster, aiml_models, cad_geometry, cad_mesh, cad_curve, cad_capabilities, cam_toolpath, cam_gcode, cam_collision, cam_chip_thinning, cam_capabilities, file_parse, file_generate, file_formats, sim_gcode, sim_cycle_time, sim_verify, sim_capabilities, viz_scene, viz_toolpath, viz_heatmap, viz_presets, report_setup_sheet, report_cost, report_tool_list, report_speed_feed, report_alarm, report_inspection, report_templates, settings_get, settings_update, settings_convert, settings_presets, settings_safety, settings_apply_preset

### prism_cad (cadDispatcher.ts)
Actions (13): geometry_create, geometry_transform, geometry_analyze, mesh_generate, mesh_import, mesh_export, feature_recognize, feature_edit, stock_model, wcs_setup, dfm_check, face_mill_select, deep_hole_technique

### prism_cam (camDispatcher.ts)
Actions (11): toolpath_generate, toolpath_simulate, toolpath_optimize, post_process, collision_check_full, stock_update, tool_assembly, fixture_setup, nesting_optimize, cam_strategy_recommend, cam_safety_validate

### prism_quality (qualityDispatcher.ts)
Actions (8): spc_calculate, cpk_predict, cmm_plan, measurement_analyze, tolerance_stack, gdt_validate, bias_correct, gauge_rr

### prism_process_control (processControlDispatcher.ts)
Actions (6): ctc_analyze, ctc_optimal_gain, ctc_autocorrelation, spc_ewma, spc_cusum, doe_analyze

### prism_export (exportDispatcher.ts)
Actions (8): render_pdf, render_csv, render_excel, render_dxf, render_step, render_gcode, render_setup_sheet, batch_export

### prism_scheduling (schedulingDispatcher.ts)
Actions (8): job_schedule, machine_assign, capacity_plan, priority_queue, bottleneck_find, lead_time_estimate, due_date_track, resource_balance

### prism_turning (turningDispatcher.ts)
Actions (7): chuck_force, tailstock, steady_rest, live_tool, bar_pull, thread_single_point, part_off_force

### prism_5axis (fiveAxisDispatcher.ts)
Actions (5): rtcp_calc, singularity_check, tilt_optimize, work_envelope, inverse_kin

### prism_edm (edmDispatcher.ts)
Actions (4): electrode_design, wire_settings, surface_integrity, micro_edm

### prism_grinding (grindingDispatcher.ts)
Actions (6): wheel_select, dress_params, burn_threshold, surface_integrity, grinding_force, surface_finish_predict

### prism_industry (industryDispatcher.ts)
Actions (4): aerospace_check, medical_check, automotive_check, oil_gas_check

### prism_automation (automationDispatcher.ts)
Actions (5): oee_calc, bottleneck, digital_thread, work_instructions, shift_handoff

### prism_auth (authDispatcher.ts)
Actions (8): login, register, refresh_token, change_password, role_assign, permission_check, session_manage, mfa_setup

### prism_doc_learn (documentLearningDispatcher.ts)
Actions (5): doc_upload, doc_extract, doc_list, doc_get, doc_delete

### prism_shop_practice (shopPracticeDispatcher.ts) — CC-MS6
Actions (12): practice_ingest, practice_search, practice_get, practice_list, practice_audit, practice_recommend, tree_build, tree_navigate, tree_search, tips_add, tips_get, tips_conflicts

**Total: 52 dispatchers, 1280 actions** (updated FORGE-TRIPLE 2026-03-01, +1 dispatcher, +12 shop practice actions)

---

## 2. DECISION TREE — What Tool For What Task

Manufacturing calculation → prism_calc (21) + prism_safety (29)
Material/machine/tool data → prism_data (27)
Coolant/coating lookup → prism_data (coolant_get, coolant_search, coolant_recommend, coating_get, coating_search, coating_recommend)
Thread operations → prism_thread (12)
Toolpath strategy → prism_toolpath (8)
Alarm decode/fix → prism_data (alarm_decode, alarm_search, alarm_fix)
Session management → prism_session (30)
Context/attention → prism_context (18)
Read/write docs → prism_doc (7)
Find skills/scripts → prism_skill_script (23)
Hook management → prism_hook (18)
Quality validation → prism_validate (7) + prism_omega (5) + prism_ralph (3)
Reasoning/enforcement → prism_guard (14)
Agent orchestration → prism_orchestrate (14)
Autonomous tasks → prism_atcs (10) + prism_autonomous (8)
Workflow orchestration → prism_autopilot_d (8)
System diagnostics → prism_telemetry (7) + prism_pfp (6) + prism_memory (6)
GSD/protocol reference → prism_gsd (6)
Development workflow → prism_dev (9) + prism_sp (19)
Code generation → prism_generator (6)
Shop practices/troubleshooting → prism_shop_practice (12): practice KB, trouble trees, material tips
Document learning → prism_doc_learn (5): PDF/doc upload, extraction, management
External research → prism_manus (11)
Knowledge query → prism_knowledge (5)
Natural language hooks → prism_nl_hook (8)
Compliance templates → prism_compliance (8)
Multi-tenant management → prism_tenant (15)
Protocol bridge / API gateway → prism_bridge (13)
Manufacturing intelligence → prism_intelligence (50)
Machine telemetry/adaptive → prism_machine_live (40)
CAM/DNC/ERP/mobile/measurement → prism_integration (42)
Knowledge graph/apprentice/genome → prism_knowledge_ext (40)
Forensics/inverse/genplan/sustain → prism_diagnosis (38)
Product SFC/PPG/Shop/ACNC → prism_product (40)
L2 engine access (AI/CAD/CAM/sim/viz) → prism_l2 (38)
CAD geometry/mesh/DfM → prism_cad (13)
CAM toolpath/post/strategy → prism_cam (11)
Quality/SPC/GD&T → prism_quality (8)
Export (PDF/CSV/Excel/DXF/STEP) → prism_export (8)
Job scheduling → prism_scheduling (8)
Turning operations → prism_turning (6)
5-axis operations → prism_5axis (5)
EDM operations → prism_edm (4)
Grinding operations → prism_grinding (4)
Industry compliance → prism_industry (4)
Automation/OEE → prism_automation (5)
Auth/RBAC → prism_auth (8)

---

## 3. SEQUENCING GUIDES — Common Workflows

### ROUTING: Choose manual or orchestrated
| Complexity | Steps | Route | Tool |
|-----------|-------|-------|------|
| Simple | 1-3 | Manual sequence | See guides below |
| Medium | 4-8 | AutoPilot Quick | prism_autopilot_d→autopilot_quick |
| Complex | 8+ | AutoPilot Full | prism_autopilot_d→autopilot |
| Multi-session | Spans windows | ATCS | prism_atcs→task_init |
| Parallel tasks | Independent | Swarm | prism_orchestrate→swarm_parallel |

### 3.1 Session Lifecycle
START: prism_dev→session_boot → prism_context→todo_update
END: prism_session→state_save → prism_doc→append(ACTION_TRACKER.md) → prism_context→todo_update

### 3.2 Small Code Change (<50 lines)
prism_dev→file_read → prism_dev→file_write → prism_dev→build → prism_dev→test_smoke

### 3.3 Large Code Change (>50 lines)
prism_sp→plan → [approval] → prism_dev→file_read → prism_dev→file_write (chunked) → prism_dev→build → prism_dev→test_smoke

### 3.4 Multi-Step Feature (workflow tracking)
prism_session→workflow_start → prism_sp→brainstorm → prism_sp→plan → [work] → prism_session→workflow_advance → [work] → prism_session→workflow_complete

### 3.5 Manufacturing Calculation
prism_data→material_get → prism_calc→[calculation] → prism_safety→[validation] → prism_validate→safety

### 3.5b SFC Calculation (with coolant/coating correction)
prism_data→material_get(kc1_1, mc) → prism_data→coolant_recommend(material_group) → prism_data→coating_recommend(material_group) → prism_calc→cutting_force (Kienzle × coolant.force_reduction × coating.friction_factor) → prism_safety→check_spindle_power

### 3.6 Thread Calculation
prism_thread→get_thread_specifications → prism_thread→calculate_tap_drill → prism_thread→generate_thread_gcode → prism_safety→check_chip_load_limits

### 3.7 Toolpath Strategy
prism_data→material_get → prism_toolpath→strategy_select → prism_toolpath→params_calculate → prism_calc→speed_feed → prism_safety→[validation]

### 3.8 Alarm Investigation
prism_data→alarm_decode → prism_data→alarm_search → prism_data→alarm_fix → prism_knowledge→search

### 3.9 Quality Validation (quick)
prism_validate→safety → prism_omega→compute

### 3.10 Quality Validation (full release)
prism_validate→safety → prism_ralph→loop → prism_omega→compute → prism_ralph→assess

### 3.11 Debugging
prism_sp→debug → prism_dev→code_search → prism_dev→file_read → prism_dev→file_write → prism_dev→build → prism_dev→test_smoke

### 3.12 Autonomous Task
prism_atcs→task_init → prism_autonomous→auto_plan → prism_autonomous→auto_execute → prism_atcs→queue_next → prism_autonomous→auto_status

### 3.13 Hook Management
prism_hook→list → prism_hook→coverage → prism_hook→gaps → prism_generator→generate → prism_hook→execute

### 3.14 Compaction Recovery
[L3 auto-fires] → prism_session→quick_resume → prism_context→todo_read → continue from last step

### 3.15 Knowledge Query
prism_knowledge→search → prism_knowledge→cross_query → prism_knowledge→relations

### 3.16 Agent/Swarm Orchestration
prism_orchestrate→agent_execute | swarm_execute → prism_orchestrate→swarm_status → prism_orchestrate→swarm_patterns

### 3.17 Document Management
prism_doc→list → prism_doc→read → prism_doc→write|append → prism_validate→anti_regression

### 3.18 Skill/Script Discovery
prism_skill_script→skill_search → prism_skill_script→skill_content → prism_skill_script→skill_load

### 3.19 System Diagnostics
prism_telemetry→get_dashboard → prism_pfp→get_dashboard → prism_pfp→assess_risk → prism_memory→get_health

### 3.20 Guard/Enforcement Check
prism_guard→pre_call_validate → [action] → prism_guard→decision_log → prism_guard→error_capture (if error)

### 3.21 New Dispatcher Action (meta-development)
prism_dev→file_read(dispatcher.ts) → prism_dev→file_write(add action) → prism_dev→build → update MASTER_INDEX.md → update GSD

### 3.22 Full Brainstorm-to-Ship Pipeline
**ORCHESTRATED (preferred):** prism_autopilot_d→autopilot (does ALL of the below automatically)
**Manual fallback:** prism_sp→brainstorm → prism_sp→plan → prism_sp→execute → prism_sp→review_quality → prism_validate→safety → prism_ralph→loop → prism_omega→compute

### 3.23 Natural Language Hook Creation (F6)
User describes hook in plain English → prism_nl_hook→create (auto-pipeline: parse→compile→validate→sandbox→deploy)
Review pending: prism_nl_hook→list(status=pending) → prism_nl_hook→approve(hook_id)
Remove: prism_nl_hook→remove(hook_id)

### 3.24 Compliance Template Provisioning (F8)
prism_compliance→list_templates → prism_compliance→apply_template(template_id, disclaimer_acknowledged=true) → prism_compliance→check_compliance(template_id) → prism_compliance→gap_analysis(template_id)
Multi-template conflicts: prism_compliance→resolve_conflicts
Periodic audit: Auto-fires every 25 calls via synergyComplianceAudit()

### 3.25 Tenant Management (F5)
prism_tenant→create(name) → prism_tenant→get_context(tenant_id) → [work in tenant scope]
SLB: prism_tenant→publish_pattern → prism_tenant→consume_patterns → prism_tenant→promote_pattern
Lifecycle: prism_tenant→suspend → prism_tenant→reactivate | prism_tenant→delete (2-phase)

### 3.26 API Key + Endpoint Management (F7)
prism_bridge→create_key(name, scopes) → prism_bridge→register_endpoint(protocol, path, dispatcher, action) → prism_bridge→route(request) → prism_bridge→route_map
Health: prism_bridge→health

---

## 4. ENGINES (143 exported + 63 unwired = 206 total .ts files)
## Regenerated: SYS-MS5 audit (2026-02-28) — updated FORGE-ENGINES R4 (2026-03-03)

### 4a. Calculation Engines (25 exported)
- ManufacturingCalculations.ts (991L) — Kienzle cutting force, Taylor tool life, J-C flow stress, speed/feed, MRR, surface finish
- AdvancedCalculations.ts (639L) — Stability lobes, tool deflection, cutting temperature, cost optimization
- ToolpathCalculations.ts (1304L) — Engagement angles, trochoidal, HSM, scallop height, stepover
- PhysicsPredictionEngine.ts (1023L) — Chip formation, SLD, chatter detection (DFT), thermal partition
- OptimizationEngine.ts (1094L) — GA/NSGA-II, SA, PSO, Bayesian optimization
- DimensionalAnalysisEngine.ts (224L) — Dimensional analysis and unit conversion
- InverseSolverEngine.ts (741L) — Inverse parameter solving (target → input)
- AlgorithmEngine.ts (257L) — Algorithm registry gateway, 50 algorithms
- AlgorithmGatewayEngine.ts (1608L) — Algorithm dispatch routing
- ToleranceEngine.ts (541L) — Tolerance stack-up analysis (RSS)
- ToolWearProgressionEngine.ts (210L) — Usui/Taylor flank wear VB(t) simulation, RUL prediction, wear stage tracking
- GrindingForceEngine.ts (225L) — Malkin specific grinding energy, force/power/temperature/burn risk
- DrillBreakthroughForceEngine.ts (200L) — Drilling thrust force, exit breakthrough spike, burr risk prediction
- ThermalGrowthCompensationEngine.ts (195L) — Spindle/tool/workpiece thermal expansion, Z-axis error prediction (Bryan/ISO 230-3)
- BoreFinishingEngine.ts (210L) — Honing prediction via Preston's equation, crosshatch angle, stone life estimation
- FinishingPassOptimizationEngine.ts (210L) — Spring pass depth via Euler-Bernoulli deflection, finishing feed optimization
- TurningForceEngine.ts (260L) — Kienzle turning force with Fc/Ff/Fp decomposition, 5 operations (longitudinal/facing/parting/boring/grooving)
- TappingTorqueEngine.ts (272L) — Tapping torque, breakage risk scoring, form/cut tap differentiation, blind hole chip packing
- CuttingPowerBudgetEngine.ts (260L) — Spindle torque-speed curve, power/torque utilization, inverse feed solver, max MRR
- ToolDeflectionPredictionEngine.ts (230L) — Euler-Bernoulli cantilever beam deflection, stepped shaft, bending stress, safety factor
- ChipFormationPredictionEngine.ts (240L) — Merchant's shear angle, chip compression ratio, chip type classification, BUE prediction
- SpecificCuttingEnergyEngine.ts (235L) — Specific energy (J/mm³), energy efficiency, CO₂ per part, energy cost (Gutowski/ISO 14955)
- GrindingSurfaceFinishEngine.ts (200L) — Malkin kinematic roughness (Ra/Rz), dressing/spark-out/coolant/material correction factors
- DrillCycleOptimizationEngine.ts (230L) — Drill cycle selection (standard/peck/chip_break/gun_drill/BTA), peck depth optimization
- ToolCoatingSelectionEngine.ts (260L) — 10 coatings × 16 materials scoring, operation/coolant/interruption/substrate factors

### 4b. Safety Engines (7 exported)
- CoolantValidationEngine.ts (767L) — Coolant flow, MQL validation, dry machining safety
- SpindleProtectionEngine.ts (1009L) — Spindle overload, vibration monitoring
- ToolBreakageEngine.ts (1071L) — Tool breakage prediction and monitoring
- WorkEnvelopeValidatorEngine.ts (201L) — Work envelope limits, C-axis validation
- RTCP_CompensationEngine.ts (213L) — Rotary tool center point compensation
- CollisionDetectionEngine.ts (278L) — Real-time collision detection
- HyperMillSafetyHooks.ts (252L) — hyperMILL safety validations: clearance plane, negative allowance, geometry check, measurement system, HPM inserts, rest material

### 4c. Manufacturing Process Engines (16 exported)
- PostProcessorEngine.ts (381L) — G-code post-processing, 6 controller dialects
- ThreadCalculationEngine.ts (659L) — Thread cutting calculations, 12 standards
- SinglePointThreadEngine.ts (238L) — Single point threading parameters
- WireEDMSettingsEngine.ts (166L) — Wire EDM spark gap, skim passes
- EDMSurfaceIntegrityEngine.ts (156L) — EDM surface integrity analysis
- MicroEDMEngine.ts (123L) — Micro EDM settings
- ElectrodeDesignEngine.ts (155L) — EDM electrode design
- LiveToolingEngine.ts (137L) — Live tooling speed/feed for turning centers
- BarPullerTimingEngine.ts (112L) — Bar puller cycle timing
- GCodeOptimizationEngine.ts (265L) — G-code optimization passes
- GCodeTemplateEngine.ts (1592L) — G-code template generation
- ToolpathGenerationEngine.ts (237L) — Toolpath generation engine
- SimulationEngine.ts (598L) — Machining simulation
- StockModelEngine.ts (201L) — Stock model tracking
- SteadyRestPlacementEngine.ts (133L) — Steady rest placement for long parts
- TailstockForceEngine.ts (165L) — Tailstock force calculations

### 4d. Workholding Engines (6 exported)
- WorkholdingEngine.ts (1486L) — Workholding selection and force analysis
- WorkholdingIntelligenceEngine.ts (481L) — Smart workholding recommendations
- ChuckJawForceEngine.ts (184L) — Chuck jaw gripping force calculations
- ModularFixtureLayoutEngine.ts (153L) — Modular fixture layout optimization
- WorkCoordinateEngine.ts (227L) — Work coordinate system setup
- CollisionEngine.ts (2089L) — Full collision analysis engine

### 4e. CAD/CAM Engines (9 exported)
- CADKernelEngine.ts (758L) — CAD geometry kernel (BREP, CSG)
- CAMKernelEngine.ts (874L) — CAM kernel operations
- CAMIntegrationEngine.ts (1230L) — CAM system integration
- CadBridge.ts (390L) — Python CAD engine bridge (OpenCascade)
- FeatureRecognitionEngine.ts (247L) — Feature recognition from geometry
- GeometryEngine.ts (224L) — Geometry operations facade
- MeshEngine.ts (286L) — Mesh generation and operations
- ToolAssemblyEngine.ts (182L) — Tool assembly management (holder + collet + tool, gauge length, stickout, runout)
- HyperMillStrategyEngine.ts (441L) — hyperMILL CAM strategy selector: 25 strategies (2D/3D/turning), slope-dependent selection, material warnings
- CycleToControlEngine.ts — Discrete cycle-to-cycle (CtC) feedback control: P/I controllers, variance ratio, Cpk improvement, optimal gain search, autocorrelation analysis. Source: MIT 2.830J Lectures 20-21 (Hardt/Siu)
- SPCChartingEngine.ts — Advanced SPC charts: EWMA, CUSUM, Moving Average, Xbar-S with ARL estimation, time-varying limits, out-of-control detection. Source: MIT 2.830J Lecture 9
- DOEAnalysisEngine.ts — Design of Experiments: full factorial 2^k, fractional factorial 2^{k-p}, ANOVA with F-tests, effect estimation, residual normality, R² reporting. Source: MIT 2.830J Lectures 13-14
- DfMRulesEngine.ts — Design for Manufacturability rules checker: 8 feature type checks (wall/cavity/hole/thread/undercut/tall/small/fillet), tolerance feasibility, face mill geometry selection (45°/90°/button), deep hole technique by L/D ratio, CNC machine cost estimation. Source: CNC Complete Engineering Guide, CNCCookbook guides

### 4f. Intelligence & Knowledge Engines (14 exported)
- IntelligenceEngine.ts (2564L) — Intelligence mega-engine (250 actions)
- KnowledgeGraphEngine.ts (919L) — Knowledge graph operations
- KnowledgeQueryEngine.ts (1196L) — Knowledge query with TF-IDF search
- FederatedLearningEngine.ts (826L) — Federated learning across instances
- ApprenticeEngine.ts (621L) — Apprentice learning engine
- ManufacturingGenomeEngine.ts (445L) — Manufacturing genome patterns
- ConversationalMemoryEngine.ts (453L) — Conversation memory management
- OnboardingEngine.ts (265L) — User onboarding workflows
- JobLearningEngine.ts (442L) — Job-level learning and optimization
- InferenceChainEngine.ts (1103L) — Multi-step inference chains
- IntentDecompositionEngine.ts (692L) — Intent decomposition and routing
- AIMLEngine.ts (694L) — AI/ML inference engine
- DecisionTreeEngine.ts (1467L) — Decision tree engine (CART)
- SourceCatalogAggregator.ts (174L) — Source catalog aggregation

### 4g. Product Engines (2 exported)
- ProductEngine.ts (2590L) — SFC/PPG/Shop/ACNC product calculations
- PFPEngine.ts (797L) — F1 Process Fingerprint engine

### 4h. Infrastructure Engines (21 exported)
- EventBus.ts (1202L) — Async event bus for hook system
- HookEngine.ts (819L) — Hook event-bus system
- HookExecutor.ts (851L) — Hook phase-chain executor
- NLHookEngine.ts (952L) — F6 Natural language hook creation
- ComplianceEngine.ts (824L) — F8 Regulatory compliance (ITAR/FDA/AS9100/ISO13485)
- CertificateEngine.ts (642L) — F4 Certificate generation
- MultiTenantEngine.ts (590L) — F5 Multi-tenant isolation
- TenantEngine.ts (189L) — Tenant management operations
- AuthEngine.ts (327L) — Authentication engine
- ComputationCache.ts (406L) — Computation result caching
- DiffEngine.ts (175L) — Diff computation engine
- FileIOEngine.ts (784L) — File I/O operations
- ExportEngine.ts (187L) — Export engine
- SettingsEngine.ts (303L) — Settings management
- ContextBudgetEngine.ts (162L) — Context budget tracking
- SessionLifecycleEngine.ts (354L) — Session lifecycle management
- BatchProcessor.ts (302L) — Batch processing engine
- ProtocolBridgeEngine.ts (593L) — F7 Protocol bridge
- ResponseTemplateEngine.ts (669L) — Response template engine
- ResponseFormatterEngine.ts (676L) — Response formatting
- MemoryGraphEngine.ts (920L) — F2 Memory graph engine

### 4i. Monitoring & Telemetry Engines (7 exported)
- TelemetryEngine.ts (606L) — F3 Telemetry collection
- MachineConnectivityEngine.ts (849L) — Machine connectivity (MTConnect/OPC-UA)
- AdaptiveControlEngine.ts (672L) — Adaptive control loops
- PredictiveMaintenanceEngine.ts (825L) — Predictive maintenance
- PredictiveFailureEngine.ts (793L) — Predictive failure analysis
- OEECalculatorEngine.ts (132L) — OEE calculation
- BottleneckIdentificationEngine.ts (126L) — Bottleneck identification

### 4j. Execution & Orchestration Engines (11 exported)
- AgentExecutor.ts (835L) — Agent execution engine
- SkillExecutor.ts (861L) — Skill execution engine
- SkillAutoLoader.ts (433L) — Skill auto-loading
- SkillBundleEngine.ts (238L) — Skill bundling
- ScriptExecutor.ts (829L) — Script execution
- SwarmExecutor.ts (991L) — Swarm execution engine
- SwarmGroupExecutor.ts (357L) — Swarm group orchestration
- ManusATCSBridge.ts (305L) — Manus ATCS bridge
- RoadmapExecutor.ts (849L) — Roadmap task execution
- TaskAgentClassifier.ts (630L) — Task classification for agent routing
- WorkflowChainsEngine.ts (478L) — Workflow chain execution

### 4k. Reporting & Visualization Engines (5 exported)
- ReportEngine.ts (395L) — Report generation
- ReportRenderer.ts (1161L) — Report rendering (PDF/HTML)
- VisualizationEngine.ts (476L) — Data visualization
- SetupSheetEngine.ts (566L) — Setup sheet generation
- DigitalWorkInstructionEngine.ts (145L) — Digital work instructions

### 4l. Industry & Enterprise Engines (10 exported)
- ERPIntegrationEngine.ts (592L) — ERP system integration
- ShopSchedulerEngine.ts (735L) — Shop scheduling engine
- SchedulingEngine.ts (233L) — Scheduling operations
- SustainabilityEngine.ts (862L) — Sustainability analysis
- QualityPredictionEngine.ts (279L) — Quality prediction
- MeasurementIntegrationEngine.ts (562L) — CMM/measurement integration
- DNCTransferEngine.ts (518L) — DNC file transfer
- MobileInterfaceEngine.ts (396L) — Mobile interface engine
- ShiftHandoffEngine.ts (110L) — Shift handoff management
- DigitalThreadEngine.ts (109L) — Digital thread traceability

### 4m. Multi-Axis & Geometry Engines (5 exported)
- SingularityAvoidanceEngine.ts (219L) — 5-axis singularity avoidance
- TiltAngleOptimizationEngine.ts (183L) — 5-axis tilt angle optimization
- InverseKinematicsSolverEngine.ts (198L) — Inverse kinematics solver
- ToleranceStackEngine.ts (231L) — Tolerance stack analysis
- GenerativeProcessEngine.ts (1147L) — Generative process planning

### 4n. Specialty Engines (4 exported)
- CampaignEngine.ts (1421L) — Campaign management engine
- FailureForensicsEngine.ts (527L) — Failure forensics analysis
- UserAssistanceSkillsEngine.ts (541L) — User assistance skills
- UserWorkflowSkillsEngine.ts (606L) — User workflow skills

### 4o. Unwired Engines (63 on-disk, not in index.ts barrel export)
Reserved for future wiring. Top 10 by size:
- ProcessPlanEngine.ts (363L), FixtureDesignEngine.ts (334L), MasterIndexGenerator.ts (323L)
- TroubleshootingEngine.ts (315L), DigitalTwinEngine.ts (311L), ToolSelectionEngine.ts (277L)
- BatchOptimizationEngine.ts (241L), HarmonicAnalysisEngine.ts (234L), DampingOptimizationEngine.ts (234L)
- ClampingSimEngine.ts (234L)
Total unwired: 63 files (RegenerativeChatterPredictor wired in FORGE-ENGINES)

### index.ts (1720L) — Barrel export file re-exporting 140 engines

## 5. REGISTRIES (19 files)

- AgentRegistry.ts (634L)
- AlarmRegistry.ts (578L)
- BaseRegistry.ts (367L)
- FormulaRegistry.ts (734L)
- HookRegistry.ts (1000L)
- MachineRegistry.ts (542L)
- MaterialRegistry.ts (595L)
- ScriptRegistry.ts (815L)
- SkillRegistry.ts (1472L)
- ToolRegistry.ts (538L)
- ToolpathStrategyRegistry.ts (4449L)
- ToolpathStrategyRegistry_Part1.ts (704L)
- alarm-registry.ts (398L)
- base.ts (242L)
- index.ts (40L)
- machine-registry.ts (229L)
- manager.ts (438L)
- material-registry.ts (348L)
- tool-registry.ts (325L)

## 6. CADENCE & HOOKS

- autoHookWrapper.ts (1559L)
- cadenceExecutor.ts (2246L)

## 7. PYTHON SCRIPTS (C:\PRISM\scripts\core) — 73 scripts, ~35430L

## 8. DATA FILES

- Materials: 64 JSON files (C:\PRISM\data\materials)
- Machines (data): 37 JSON files (C:\PRISM\data\machines)
- Machines (extracted): 38 JSON files (C:\PRISM\extracted\machines)
- Controllers/Alarms (data): 3 JSON files (C:\PRISM\data\controllers)
- Controllers/Alarms (extracted): 65 JSON files (C:\PRISM\extracted\controllers)
- Tools: 8 JSON files (C:\PRISM\data\tools)

## 9. TYPE DEFINITIONS

- bridge-types.ts (143L) — F7
- certificate-types.ts (106L) — F4
- compliance-types.ts (211L) — F8
- coordinationTypes.ts (73L) — Multi-Claude schemas (ClaimRecord, InstanceRecord, CoordinationMessage, RoadmapRegistry)
- graph-types.ts (193L) — F2
- nl-hook-types.ts (216L) — F6
- pfp-types.ts (186L) — F1
- prism-schema.ts (689L)
- telemetry-types.ts (246L) — F3
- tenant-types.ts (161L) — F5

## 10. CONFIG

- api-config.ts (136L)

## 11. SKILLS (C:\PRISM\skills-consolidated)

Total skill files: 119

## 12. GSD PROTOCOL FILES

- DEV_PROTOCOL.md (165L)
- GSD_QUICK.md (87L)

## 13. DOCUMENTATION

- ACTION_TRACKER.md
- CONTEXT_BUDGET_AUDIT.md
- FEATURE_ROADMAP_F1-F8.md
- HSS_OPTIMIZATION_ROADMAP.md
- MASTER_INDEX.md (this file)
- PRIORITY_ROADMAP.md
- TOOL_ORCHESTRATION_MAP.md
- W4_ASSESSMENT.md
- W6_ROADMAP.md

## 14. SERVICES & MULTI-CLAUDE COORDINATION

### TaskClaimService (services/TaskClaimService.ts, 404L)
- Atomic `mkdir`-based locking (NTFS + ext4 safe)
- Protocol: claim -> heartbeat (60s) -> release; stale reap at 5min
- Functions: claim(), release(), heartbeat(), reapStaleClaims(), getClaimedUnitIds(), claimBatch(), releaseAll()
- Instance management: registerInstance(), getActiveInstances()
- Messaging: postMessage(), getMessages()
- Activity logging: logActivity() (rolling 500-entry per milestone)
- Data dir: mcp-server/data/claims/ + mcp-server/data/coordination/

### RoadmapLoader (services/RoadmapLoader.ts, ~230L)
- TTL-cached I/O for roadmap-index.json + milestone envelopes
- loadIndex(), loadMilestone(), loadRegistry(), registerInRegistry()
- Integration: loadClaimedIds() bridges to TaskClaimService

### Orchestration Dispatcher Actions (prism_orchestrate)
- roadmap_claim: Atomic unit claim via TaskClaimService
- roadmap_release: Release claimed unit
- roadmap_heartbeat: Renew claim timestamp
- roadmap_discover: List roadmaps, active claims, instances; reap stale
- roadmap_register: Register milestones into registry

### Cadence Integration (cadenceExecutor.ts, function 15)
- autoRoadmapHeartbeat: Reads ACTIVE_CLAIM.json, auto-fires heartbeat()
- Zero-config keep-alive for long-running sessions

### Coordination Schemas (schemas/coordinationTypes.ts, 73L)
- ClaimRecord, InstanceRecord, CoordinationMessage, RoadmapRegistry, RoadmapRegistryEntry

### Action Param Schemas (SYS-MS6 — 7 schema files, 147 actions validated)
- actionSchemaTypes.ts — Shared types (ActionSchemaMap, ValidationResult)
- calcActionSchemas.ts — 48 prism_calc action schemas
- safetyActionSchemas.ts — 29 prism_safety action schemas (STRICT)
- fiveAxisActionSchemas.ts — 5 prism_5axis action schemas (STRICT)
- threadActionSchemas.ts — 13 prism_thread action schemas
- dataActionSchemas.ts — 35 prism_data action schemas (LOOSE)
- toolpathActionSchemas.ts — 9 prism_toolpath action schemas
- exportActionSchemas.ts — 8 prism_export action schemas

### Validation Middleware (SYS-MS6)
- validation/actionParamValidator.ts — Standalone validator with coercion + structured errors
- utils/dispatcherMiddleware.ts — validateActionParams() with type coercion (string→number/boolean)

## 15. SUMMARY (Updated 2026-03-01, SYS-MS6 schema validation)

- Dispatchers: 46 (1103 verified actions — QA-MS0 audit + SYS-MS1)
- Engines: 125 active barrel exports + 66 unwired on disk = 191 total .ts files (SYS-MS5 audit)
- Algorithms: 50 standalone Algorithm<I,O> implementations (QA-MS5 verified)
- Registries: 15 (material, machine, tool, alarm, formula, agent, hook, skill, script, toolpath + 5 more)
- Services: 2 (TaskClaimService, RoadmapLoader) — multi-Claude coordination
- Skills: 153 with SKILL.md (C:\PRISM\skills-consolidated)
- Scripts: 275 Python/PowerShell (C:\PRISM\scripts)
- Agents: 70 definitions (14 OPUS, 35 SONNET, 9 HAIKU)
- Cadences: 103 functions (QA-MS13 verified)
- Hooks: 220 total (179 domain + 41 Phase0) — QA-MS12 verified
- Tests: 43 test files, 1243 total (1242 passing, 1 pre-existing Merchant's force_ratios)
- Type definitions: 13 files (including coordinationTypes.ts)
- Formulas: 500 (11 built-in + 489 JSON) — QA-MS7 verified
- Coordination files: TaskClaimService + 5 orchestration actions
- Build: npm run build (esbuild) → dist/index.js, 6.6MB, 0 TS errors
- Action Param Schemas: 8 files covering 7 dispatchers, 147 actions (SYS-MS6)
- Slash commands: 34 (16 core + 10 forge family + 8 utility)
- Roadmap: v5.3.0, 94 milestones, 68 complete

### F-SERIES FEATURES (all Ralph-validated A-/A, Ω≥0.89)
| Feature | Engine | Dispatcher | Ω Score |
|---------|--------|------------|---------|
| F1 PFP | PFPEngine.ts | prism_pfp | ~0.89 |
| F2 Memory Graph | MemoryGraphEngine.ts | prism_memory | 0.91 |
| F3 Telemetry | TelemetryEngine.ts | prism_telemetry | ~0.90 |
| F4 Certificates | CertificateEngine.ts | (auto via hooks) | 0.917 |
| F5 Multi-Tenant | MultiTenantEngine.ts | prism_tenant | 0.898 |
| F6 NL Hooks | NLHookEngine.ts | prism_nl_hook | ~0.91 |
| F7 Protocol Bridge | ProtocolBridgeEngine.ts | prism_bridge | 0.892 |
| F8 Compliance | ComplianceEngine.ts | prism_compliance | 0.912 |

## 10. CLAUDE.md MODULAR ARCHITECTURE (SYS-MS0)
| File | Lines | Role | Loads When |
|------|-------|------|------------|
| C:/PRISM/CLAUDE.md | 25 | Project pointer + claude-flow ref | Any PRISM work |
| C:/PRISM/docs/CLAUDE.md | 7 | Directory redirect | docs/ work |
| mcp-server/CLAUDE.md | 69 | Core rules (safety, build, conventions) | mcp-server/ work |
| src/engines/CLAUDE.md | 35 | Engine conventions, AtomicValue schema | Engine work |
| src/tools/dispatchers/CLAUDE.md | 36 | Dispatcher conventions, action routing | Dispatcher work |
| **Total** | **172** | **90% reduction from 1,656 lines** | **~2.1K tokens (was ~16.7K)** |
