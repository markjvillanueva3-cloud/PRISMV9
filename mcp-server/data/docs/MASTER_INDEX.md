# PRISM MCP Server — Master Index
# Verified: 2026-02-27 (QA-MS0 Baseline Audit Complete)
# Source: C:\PRISM\mcp-server\src
# TRUTH SOURCE — Counts verified by QA-MS0 static code analysis

## 1. DISPATCHERS (45 dispatchers, 1060 verified actions)
## NOTE: Previous count of 684 was undercounted. QA-MS0 audit found 376 undocumented actions.
## Largest delta: prism_intelligence (27→489), prism_calc (21→56), prism_orchestrate (14→27)

### prism_atcs (atcsDispatcher.ts, 1077L)
Actions (10): task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan

### prism_autopilot_d (autoPilotDispatcher.ts, 143L)
Actions (8): autopilot, autopilot_quick, brainstorm_lenses, ralph_loop_lite, formula_optimize, autopilot_v2, registry_status, working_tools

### prism_autonomous (autonomousDispatcher.ts, 1070L)
Actions (8): auto_configure, auto_plan, auto_execute, auto_status, auto_validate, auto_dry_run, auto_pause, auto_resume

### prism_calc (calcDispatcher.ts, 462L)
Actions (21): cutting_force, tool_life, speed_feed, flow_stress, surface_finish, mrr, power, chip_load, stability, deflection, thermal, cost_optimize, multi_optimize, productivity, engagement, trochoidal, hsm, scallop, stepover, cycle_time, arc_fit

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
Actions (11): create_task, task_status, task_result, cancel_task, list_tasks, web_research, code_sandbox, hook_trigger, hook_list, hook_chain, hook_stats

### prism_memory (memoryDispatcher.ts, 182L)
Actions (6): get_health, trace_decision, find_similar, get_session, get_node, run_integrity

### prism_omega (omegaDispatcher.ts, 124L)
Actions (5): compute, breakdown, validate, optimize, history

### prism_orchestrate (orchestrationDispatcher.ts, 132L)
Actions (14): agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status, queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline, swarm_status, swarm_patterns

### prism_pfp (pfpDispatcher.ts, 176L)
Actions (6): get_dashboard, assess_risk, get_patterns, get_history, force_extract, update_config

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

### prism_intelligence (intelligenceDispatcher.ts) — MEGA-DISPATCHER
Actions (489 total = 250 main + 239 sub-engine): MAIN: job_plan, setup_sheet, process_cost, material_recommend, tool_recommend, machine_recommend, what_if, failure_diagnose, parameter_optimize, cycle_time_estimate, quality_predict, job_record, job_insights, algorithm_select, shop_schedule, machine_utilization, decompose_intent, format_response, workflow_match, workflow_get, workflow_list, onboarding_welcome, onboarding_state, onboarding_record, onboarding_suggestion, onboarding_reset, setup_sheet_format, setup_sheet_template, skill_list, skill_get, skill_search, skill_match, skill_steps, skill_for_persona, conversation_context, conversation_transition, job_start, job_update, job_find, job_resume, job_complete, job_list_recent, assist_list, assist_get, assist_search, assist_match, assist_explain, assist_confidence, assist_mistakes, assist_safety, + ~200 more main actions + 31 sub-engine arrays (LEARNING_ACTIONS, SCHEDULER_ACTIONS, PFP_ACTIONS, MEMORY_ACTIONS, TELEMETRY_ACTIONS, etc.)
NOTE: Full action list requires QA-MS6 decomposition audit. This dispatcher holds 46% of all system actions.

### prism_l2 (l2EngineDispatcher.ts)
Actions (38): aiml_predict, aiml_classify, aiml_anomaly, aiml_cluster, aiml_models, cad_geometry, cad_mesh, cad_curve, cad_capabilities, cam_toolpath, cam_gcode, cam_collision, cam_chip_thinning, cam_capabilities, file_parse, file_generate, file_formats, sim_gcode, sim_cycle_time, sim_verify, sim_capabilities, viz_scene, viz_toolpath, viz_heatmap, viz_presets, report_setup_sheet, report_cost, report_tool_list, report_speed_feed, report_alarm, report_inspection, report_templates, settings_get, settings_update, settings_convert, settings_presets, settings_safety, settings_apply_preset

### prism_cad (cadDispatcher.ts)
Actions (10): geometry_create, geometry_transform, geometry_analyze, mesh_generate, mesh_import, mesh_export, feature_recognize, feature_edit, stock_model, wcs_setup

### prism_cam (camDispatcher.ts)
Actions (9): toolpath_generate, toolpath_simulate, toolpath_optimize, post_process, collision_check_full, stock_update, tool_assembly, fixture_setup, nesting_optimize

### prism_quality (qualityDispatcher.ts)
Actions (8): spc_calculate, cpk_predict, cmm_plan, measurement_analyze, tolerance_stack, gdt_validate, bias_correct, gauge_rr

### prism_export (exportDispatcher.ts)
Actions (8): render_pdf, render_csv, render_excel, render_dxf, render_step, render_gcode, render_setup_sheet, batch_export

### prism_scheduling (schedulingDispatcher.ts)
Actions (8): job_schedule, machine_assign, capacity_plan, priority_queue, bottleneck_find, lead_time_estimate, due_date_track, resource_balance

### prism_turning (turningDispatcher.ts)
Actions (6): chuck_force, tailstock, steady_rest, live_tool, bar_pull, thread_single_point

### prism_5axis (fiveAxisDispatcher.ts)
Actions (5): rtcp_calc, singularity_check, tilt_optimize, work_envelope, inverse_kin

### prism_edm (edmDispatcher.ts)
Actions (4): electrode_design, wire_settings, surface_integrity, micro_edm

### prism_grinding (grindingDispatcher.ts)
Actions (4): wheel_select, dress_params, burn_threshold, surface_integrity

### prism_industry (industryDispatcher.ts)
Actions (4): aerospace_check, medical_check, automotive_check, oil_gas_check

### prism_automation (automationDispatcher.ts)
Actions (5): oee_calc, bottleneck, digital_thread, work_instructions, shift_handoff

### prism_auth (authDispatcher.ts)
Actions (8): login, register, refresh_token, change_password, role_assign, permission_check, session_manage, mfa_setup

**Total: 45 dispatchers, 1060 actions** (verified QA-MS0 2026-02-27)

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
External research → prism_manus (11)
Knowledge query → prism_knowledge (5)
Natural language hooks → prism_nl_hook (8)
Compliance templates → prism_compliance (8)
Multi-tenant management → prism_tenant (15)
Protocol bridge / API gateway → prism_bridge (13)
Manufacturing intelligence → prism_intelligence (27)
L2 engine access (AI/CAD/CAM/sim/viz) → prism_l2 (38)
CAD geometry/mesh → prism_cad (10)
CAM toolpath/post → prism_cam (9)
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

## 4. ENGINES (102 files — see SYSTEM_ARCHITECTURE.json for full list)

- AdvancedCalculations.ts (623L)
- AgentExecutor.ts (818L)
- BatchProcessor.ts (233L)
- CalcHookMiddleware.ts (269L)
- CertificateEngine.ts (620L) — F4
- CollisionEngine.ts (1923L)
- ComplianceEngine.ts (722L) — F8
- ComputationCache.ts (420L)
- CoolantValidationEngine.ts (752L)
- DiffEngine.ts (196L)
- EventBus.ts (656L)
- HookEngine.ts (802L)
- HookExecutor.ts (835L)
- KnowledgeQueryEngine.ts (871L)
- ManufacturingCalculations.ts (550L)
- MemoryGraphEngine.ts (774L) — F2
- MultiTenantEngine.ts (592L) — F5
- NLHookEngine.ts (920L) — F6
- PFPEngine.ts (765L) — F1
- PredictiveFailureEngine.ts (807L)
- ProtocolBridgeEngine.ts (484L) — F7
- ResponseTemplateEngine.ts (669L)
- ScriptExecutor.ts (754L)
- SessionLifecycleEngine.ts (351L)
- SkillExecutor.ts (868L)
- SpindleProtectionEngine.ts (901L)
- SwarmExecutor.ts (953L)
- TelemetryEngine.ts (615L) — F3
- ThreadCalculationEngine.ts (658L)
- ToolBreakageEngine.ts (1071L)
- ToolpathCalculations.ts (672L)
- WorkholdingEngine.ts (1409L)
- index.ts (300L)

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

## 14. SUMMARY (Updated 2026-02-27)

- Dispatchers: 45 (684 verified actions)
- Engines: 102 TypeScript engine files (see SYSTEM_ARCHITECTURE.json)
- Algorithms: 54 standalone Algorithm<I,O> implementations
- Registries: 22 (material, machine, tool, alarm, formula, agent, hook, skill, script, toolpath, coating, coolant, database, post-processor, knowledge-base, + defaults)
- Skills: 153 with SKILL.md (C:\PRISM\skills-consolidated)
- Scripts: 275 Python/PowerShell (C:\PRISM\scripts)
- Agents: 70 definitions (14 OPUS, 35 SONNET, 9 HAIKU)
- DSL Abbreviations: 300 entries across 19 categories
- Tests: 32 test files, 1080 passing
- Hooks (TS): 22 hook modules
- Type definitions: 12 files
- Extracted assets: 522 files across 23 directories
- State/checkpoint files: 240
- Knowledge base files: 58
- Coordination files: 13
- Build: npm run build (esbuild) → dist/index.js
- Master schema: SYSTEM_ARCHITECTURE.json (single source of truth)

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
