# PEER-REPO-DRIFT — Intel-Ollama-Obsidian P13-U04

Generated: 2026-05-06T18:24:20.781Z

## Summary

- **Repos scanned:** 43
- **Total dispatchers:** 3561
- **Total drifted actions:** 81279

Canonical: `H:/prism`

## By repo

| repo | dispatchers | missing-from-peer | extra-in-peer | drift total |
|------|-------------|--------------------|---------------|-------------|
| `prism-agi-infra-a` | 86 | 2677 | 736 | 3413 |
| `prism-ai-aware` | 87 | 2300 | 840 | 3140 |
| `prism-cad-complete` | 88 | 1465 | 47 | 1512 |
| `prism-cad-sw-fidx` | 90 | 566 | 84 | 650 |
| `prism-cadc34-rescue` | 0 | 0 | 0 | 0 |
| `prism-cam-engine-fixes` | 90 | 408 | 0 | 408 |
| `prism-cam-exhaust` | 88 | 1590 | 118 | 1708 |
| `prism-cam-exhaust-ms0` | 90 | 80 | 61 | 141 |
| `prism-cam-ms1-93a0` | 90 | 566 | 52 | 618 |
| `prism-cam-spcfai-ms0` | 91 | 284 | 69 | 353 |
| `prism-claudemd-enforcement` | 90 | 868 | 0 | 868 |
| `prism-engine-wire-ms0` | 90 | 566 | 0 | 566 |
| `prism-file-claim-fix` | 28 | 1950 | 0 | 1950 |
| `prism-forge-archive` | 87 | 2291 | 962 | 3253 |
| `prism-fresh` | 87 | 2292 | 962 | 3254 |
| `prism-fusion-ms1` | 90 | 566 | 13 | 579 |
| `prism-hypermill-ms1` | 90 | 566 | 13 | 579 |
| `prism-intel-p8` | 90 | 566 | 180 | 746 |
| `prism-iooms0` | 87 | 2286 | 1013 | 3299 |
| `prism-iooms1` | 90 | 566 | 8 | 574 |
| `prism-knowledge-wiki` | 91 | 827 | 11 | 838 |
| `prism-lathe-master` | 86 | 2300 | 886 | 3186 |
| `prism-lathe-pro-v3` | 87 | 2292 | 963 | 3255 |
| `prism-lathe-pro-v3-bookkeeping` | 90 | 135 | 0 | 135 |
| `prism-lathe-prod-ready` | 89 | 1274 | 2 | 1276 |
| `prism-mcat-p1u03` | 87 | 2300 | 845 | 3145 |
| `prism-merge-staging` | 87 | 2283 | 997 | 3280 |
| `prism-mill-master` | 88 | 2289 | 969 | 3258 |
| `prism-mill-p06` | 87 | 2292 | 917 | 3209 |
| `prism-mill-worktree` | 88 | 2289 | 991 | 3280 |
| `prism-phase-e` | 86 | 2310 | 755 | 3065 |
| `prism-pp-agi-u06` | 87 | 2300 | 840 | 3140 |
| `prism-pp-master` | 87 | 2292 | 917 | 3209 |
| `prism-ppg-advancedpost` | 90 | 422 | 0 | 422 |
| `prism-ppgh05` | 90 | 256 | 7 | 263 |
| `prism-session-efficiency` | 88 | 1891 | 0 | 1891 |
| `prism-tsc-cleanup` | 90 | 733 | 1 | 734 |
| `prism-universal-skills` | 87 | 2292 | 962 | 3254 |
| `prism-ussh` | 86 | 2300 | 840 | 3140 |
| `prism-ussh-p2` | 87 | 2292 | 917 | 3209 |
| `prism-ussh-sci` | 87 | 2292 | 962 | 3254 |
| `prism-wedm-agi` | 87 | 2297 | 928 | 3225 |
| `prism-xproc-neural` | 0 | 0 | 0 | 0 |

## Per-dispatcher drift

### `prism-agi-infra-a`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (361): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +355 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (15): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +9 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1139): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1133 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (113): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +107 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (360): `pp_agi_context`, `pp_agi_health`, `pp_agi_plan`, `pp_agi_run`, `pp_agi_stats`, `pp_agi_verify`, +354 more
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-ai-aware`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (424): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +418 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-cad-complete`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **cadAutomationDispatcher**
  - missing from peer (321): `batch_coverage_report`, `batch_extract`, `batch_validate`, `cad_access_audit`, `cad_access_check`, `cad_access_checkin`, +315 more
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (724): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +718 more
  - extra in peer (47): `esprit_bridge_cancel`, `esprit_bridge_configure`, `esprit_bridge_connect`, `esprit_bridge_disconnect`, `esprit_bridge_dispose`, `esprit_bridge_get_config`, +41 more
- **contextDispatcher**
  - missing from peer (11): `chat_post`, `chat_read`, `claim_file`, `presence`, `priority_classify_task`, `priority_compute_relevance`, +5 more
- **dataDispatcher**
  - missing from peer (56): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +50 more
- **devDispatcher**
  - missing from peer (55): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `audit_harness_security`, +49 more
- **edmDispatcher**
  - missing from peer (24): `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, `sinker_edm_wear_compensate`, +18 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-cad-sw-fidx`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
  - extra in peer (80): `cad_esprit_plan_execution`, `cad_esprit_render_kbm`, `cad_fusion360_find_parameter`, `cad_fusion360_get_index`, `cad_fusion360_get_operation`, `cad_fusion360_list_modules`, +74 more
- **calcDispatcher**
  - extra in peer (2): `cross_process_sf_capabilities`, `cross_process_sf_recommend`
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
  - extra in peer (2): `cross_process_post_capabilities`, `cross_process_post_emit`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-cam-engine-fixes`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (240): `cam_ai_validate`, `cam_calibration_calibrate`, `cam_calibration_calibrate_decision`, `cam_calibration_clear_outcomes`, `cam_calibration_get_outcome_count`, `cam_calibration_metrics`, +234 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-cam-exhaust`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **businessDispatcher**
  - missing from peer (31): `lathe_actual_cost_accuracy`, `lathe_actual_cost_reconcile`, `lathe_agi_adjustment`, `lathe_agi_confidence`, `lathe_agi_feedback`, `lathe_agi_history`, +25 more
- **cadAutomationDispatcher**
  - missing from peer (321): `batch_coverage_report`, `batch_extract`, `batch_validate`, `cad_access_audit`, `cad_access_check`, `cad_access_checkin`, +315 more
- **cadDispatcher**
  - missing from peer (69): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +63 more
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (723): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +717 more
  - extra in peer (118): `bobcad_by_category`, `bobcad_dynamic_motion_envelope`, `bobcad_find_param`, `bobcad_get_op`, `bobcad_index`, `bobcad_list_ops`, +112 more
- **contextDispatcher**
  - missing from peer (11): `chat_post`, `chat_read`, `claim_file`, `presence`, `priority_classify_task`, `priority_compute_relevance`, +5 more
- **dataDispatcher**
  - missing from peer (56): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +50 more
- **devDispatcher**
  - missing from peer (55): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `audit_harness_security`, +49 more
- **edmDispatcher**
  - missing from peer (50): `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, `sinker_edm_wear_compensate`, +44 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-cam-exhaust-ms0`

- **cadDispatcher**
  - missing from peer (19): `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, `cad_class_predict_fidelity`, `cad_class_template`, `cad_corpus_apply_learned`, +13 more
- **camDispatcher**
  - extra in peer (61): `AlTiN`, `DLC`, `H`, `K`, `M`, `N`, +55 more
- **intelligenceDispatcher**
  - missing from peer (61): `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, `xproc_bandit_stats`, `xproc_bandit_update`, +55 more

### `prism-cam-ms1-93a0`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
  - extra in peer (52): `cad_fusion360_find_parameter`, `cad_fusion360_get_index`, `cad_fusion360_get_operation`, `cad_fusion360_list_modules`, `cad_fusion360_list_operations`, `cad_fusion360_load_errors`, +46 more
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-cam-spcfai-ms0`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (108): `cam_ai_validate`, `cam_calibration_calibrate`, `cam_calibration_calibrate_decision`, `cam_calibration_clear_outcomes`, `cam_calibration_get_outcome_count`, `cam_calibration_metrics`, +102 more
  - extra in peer (61): `cam_fusion360_fai_apply_measurements`, `cam_fusion360_fai_create_form1`, `cam_fusion360_fai_extract_characteristics`, `cam_fusion360_fai_generate_report`, `cam_fusion360_fai_stats`, `cam_fusion360_spc_analyze_job`, +55 more
- **camFunctionDispatcher**
  - missing from peer (8): `cam_func_agi_reason`, `cam_func_feature_recognize`, `cam_func_param_optimize`, `cam_func_route`, `cam_func_strategy_recommend`, `cam_func_translate`, +2 more
  - extra in peer (8): `cam_fn_optimize_params`, `cam_fn_reason`, `cam_fn_recognize_features`, `cam_fn_recommend_strategy`, `cam_fn_route`, `cam_fn_translate`, +2 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-claudemd-enforcement`

- **adaptiveControlDispatcher**
  - missing from peer (5): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`
- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **calcDispatcher**
  - missing from peer (12): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `chatter_neural_classify`, `chip_formation_predict`, +6 more
- **camDispatcher**
  - missing from peer (634): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +628 more
- **dataDispatcher**
  - missing from peer (10): `material_equivalent_lookup`, `material_interpolation_find`, `material_selection_recommend`, `tool_assembly_build`, `tool_catalog_adaptive_recommend`, `tool_coating_select`, +4 more
- **devDispatcher**
  - missing from peer (16): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `audit_harness_security`, +10 more
- **guardDispatcher**
  - missing from peer (4): `error_ledger_append`, `error_ledger_append_and_embed`, `error_ledger_recall_similar`, `error_ledger_recent`
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (6): `self_awareness_build`, `self_awareness_context_summary`, `self_awareness_health`, `self_awareness_quick_stats`, `self_awareness_recommended_actions`, `self_awareness_search`

### `prism-engine-wire-ms0`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-file-claim-fix`

- **adaptiveControlDispatcher**
  - missing from peer (23): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_feed`, `adaptive_feed_tune`, `adaptive_override_calc`, `adaptive_spindle`, +17 more
- **atcsDispatcher**
  - missing from peer (12): `assemble`, `batch_validate`, `checkpoint`, `delegate_to_manus`, `poll_delegated`, `queue_next`, +6 more
- **authDispatcher**
  - missing from peer (8): `change_password`, `login`, `mfa_setup`, `permission_check`, `refresh_token`, `register`, +2 more
- **automationDispatcher**
  - missing from peer (5): `bottleneck`, `digital_thread`, `oee_calc`, `shift_handoff`, `work_instructions`
- **autonomousDispatcher**
  - missing from peer (8): `auto_configure`, `auto_dry_run`, `auto_execute`, `auto_pause`, `auto_plan`, `auto_resume`, +2 more
- **autoPilotDispatcher**
  - missing from peer (7): `autopilot`, `autopilot_quick`, `autopilot_v2`, `brainstorm_lenses`, `formula_optimize`, `registry_status`, +1 more
- **bridgeDispatcher**
  - missing from peer (13): `config`, `create_key`, `health`, `list_endpoints`, `list_keys`, `register_endpoint`, +7 more
- **businessDispatcher**
  - missing from peer (383): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +377 more
- **cadAutomationDispatcher**
  - missing from peer (358): `airfoil_get`, `airfoil_interpolate`, `airfoil_list`, `airfoil_query`, `batch_coverage_report`, `batch_extract`, +352 more
- **cadDispatcher**
  - missing from peer (205): `assembly_add_component`, `assembly_add_mate`, `assembly_bom`, `assembly_create`, `assembly_position`, `assembly_to_cadquery`, +199 more
- **cadRegressionDispatcher**
  - missing from peer (25): `cad_artifact_list`, `cad_artifact_prune`, `cad_artifact_write`, `cad_checkpoint_load`, `cad_checkpoint_resume_diff`, `cad_checkpoint_save`, +19 more
- **complianceDispatcher**
  - missing from peer (17): `apply_template`, `audit_status`, `audit_trail`, `cert_manage`, `check_compliance`, `config`, +11 more
- **cplDispatcher**
  - missing from peer (54): `bar_stock_analyze`, `bar_stock_chatter`, `cam_validate`, `clothoid_blend`, `contact_full_integrity`, `contact_hertz`, +48 more
- **dataDispatcher**
  - missing from peer (215): `alarm_decode`, `alarm_diagnose`, `alarm_fix`, `alarm_fix_lookup`, `alarm_fix_search`, `alarm_fix_summary`, +209 more
- **fiveAxisDispatcher**
  - missing from peer (5): `inverse_kin`, `rtcp_calc`, `singularity_check`, `tilt_optimize`, `work_envelope`
- **holePatternDispatcher**
  - missing from peer (3): `hole_pattern_detect`, `hole_pattern_optimize`, `hole_pattern_program`
- **machineSetupDispatcher**
  - missing from peer (81): `alarm_intelligence_index`, `alarm_intelligence_lookup`, `alarm_intelligence_search`, `alarm_intelligence_stats`, `balancing_machine_calculate`, `cnc_maintenance_calculate`, +75 more
- **manusDispatcher**
  - missing from peer (11): `cancel_task`, `code_reasoning`, `create_task`, `hook_chain`, `hook_list`, `hook_stats`, +5 more
- **memoryDispatcher**
  - missing from peer (17): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `consolidate`, +11 more
- **monitoringDispatcher**
  - missing from peer (9): `grafana_configure_alerts`, `grafana_create_dashboard`, `grafana_export_simulation`, `grafana_export_spc`, `grafana_export_tool_life`, `grafana_manufacturing_dashboard`, +3 more
- **multiAxisProgramDispatcher**
  - missing from peer (2): `multiaxis_print_to_program`, `multiaxis_process_plan`
- **securityDispatcher**
  - missing from peer (408): `DENY`, `SAMEORIGIN`, `abstract`, `access`, `accountable`, `acl_check_access`, +402 more
- **turningDispatcher**
  - missing from peer (42): `bar_pull`, `bar_stock_cut_plan`, `chuck_force`, `hard_turn_decide`, `hard_turn_optimize`, `lathe_beam_deflection`, +36 more
- **turningProgramDispatcher**
  - missing from peer (14): `lathe_orchestrate`, `lathe_ui_submit`, `turning_apply_iso2768`, `turning_blueprint_intake`, `turning_cad_import`, `turning_feature_taxonomy`, +8 more
- **vibrationPhysicsDispatcher**
  - missing from peer (19): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`, `burr_formation_calculate`, `centerless_grinding_calculate`, `chip_conveyor_calculate`, +13 more
- **weldingJoiningDispatcher**
  - missing from peer (6): `adhesive_bond_calculate`, `brazing_soldering_calculate`, `ultrasonic_welding_calculate`, `weld_distortion_calculate`, `weld_strength_calculate`, `welding_calculate`

### `prism-forge-archive`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (460): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +454 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-fresh`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (460): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +454 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-fusion-ms1`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
  - extra in peer (13): `cam_autopop_get_canonical_schema`, `cam_autopop_get_mapping_rule`, `cam_autopop_list_cams`, `cam_autopop_list_entities`, `fusion360_function_index_get_cloud_and_mfg_ext_operations`, `fusion360_function_index_get_inspection_operations`, +7 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-hypermill-ms1`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
  - extra in peer (13): `cam_autopop_get_canonical_schema`, `cam_autopop_get_mapping_rule`, `cam_autopop_list_cams`, `cam_autopop_list_entities`, `fusion360_function_index_get_cloud_and_mfg_ext_operations`, `fusion360_function_index_get_inspection_operations`, +7 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-intel-p8`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
  - extra in peer (3): `blueprint_extract_features`, `freecad_build_script`, `text_to_cad_parse`
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
  - extra in peer (84): `edm_bimaterial_optimize`, `edm_cost_estimate`, `edm_feasibility_assess`, `edm_parameter_calc`, `edm_quality_plan_cmm`, `edm_surface_assess`, +78 more
- **devDispatcher**
  - extra in peer (1): `schema_coverage_audit`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more
- **orchestrationDispatcher**
  - extra in peer (3): `codex_delegate`, `codex_review`, `forge_team_review`
- **turningDispatcher**
  - extra in peer (89): `lathe_adaptive_record`, `lathe_agi_continuous_record`, `lathe_agi_feature_reason`, `lathe_agi_kg_query`, `lathe_agi_safety_check`, `lathe_ai_optimize_sequence`, +83 more

### `prism-iooms0`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (476): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +470 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (16): `audit_chain`, `auto_chain_read`, `auto_chain_run`, `auto_chain_summary`, `build_guard_quality_score`, `catalog_extract`, +10 more
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (40): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +34 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (22): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +16 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (29): `consensus_credit_apply_feed`, `consensus_credit_apply_result`, `consensus_credit_run_history`, `consensus_credit_run_stats`, `consensus_credit_status`, `consensus_dashboard`, +23 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (6): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`
  - extra in peer (5): `cross_session_recall`, `fabric_route`, `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-iooms1`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (398): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +392 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more
- **orchestrationDispatcher**
  - extra in peer (3): `codex_delegate`, `codex_review`, `forge_team_review`
- **turningDispatcher**
  - extra in peer (5): `swiss_emit_channel_files`, `swiss_guide_clearance`, `swiss_guide_feed_limits`, `swiss_part_transfer`, `swiss_route_decide`

### `prism-knowledge-wiki`

- **adaptiveControlDispatcher**
  - missing from peer (5): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`
- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **calcDispatcher**
  - missing from peer (12): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `chatter_neural_classify`, `chip_formation_predict`, +6 more
- **camDispatcher**
  - missing from peer (594): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +588 more
- **dataDispatcher**
  - missing from peer (10): `material_equivalent_lookup`, `material_interpolation_find`, `material_selection_recommend`, `tool_assembly_build`, `tool_catalog_adaptive_recommend`, `tool_coating_select`, +4 more
- **devDispatcher**
  - missing from peer (15): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `dev_auto_utilize_analyze`, +9 more
- **guardDispatcher**
  - missing from peer (4): `error_ledger_append`, `error_ledger_append_and_embed`, `error_ledger_recall_similar`, `error_ledger_recent`
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (6): `self_awareness_build`, `self_awareness_context_summary`, `self_awareness_health`, `self_awareness_quick_stats`, `self_awareness_recommended_actions`, `self_awareness_search`
- **wikiDispatcher**
  - extra in peer (11): `wiki_harvest_lessons`, `wiki_harvest_patterns`, `wiki_harvest_tribal`, `wiki_index_read`, `wiki_index_upsert`, `wiki_ingest_finalize`, +5 more

### `prism-lathe-master`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (424): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +418 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
  - extra in peer (7): `lathe_print_full`, `lathe_print_generate`, `lathe_print_ingest`, `lathe_print_plan`, `lathe_print_recognize`, `lathe_print_setup`, +1 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (185): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +179 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-lathe-pro-v3`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (460): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +454 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (148): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +142 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-lathe-pro-v3-bookkeeping`

- **cadDispatcher**
  - missing from peer (19): `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, `cad_class_predict_fidelity`, `cad_class_template`, `cad_corpus_apply_learned`, +13 more
- **camDispatcher**
  - missing from peer (1): `cam_ai_validate`
- **intelligenceDispatcher**
  - missing from peer (115): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +109 more

### `prism-lathe-prod-ready`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **cadAutomationDispatcher**
  - missing from peer (271): `cad_access_audit`, `cad_access_check`, `cad_access_checkin`, `cad_access_checkout`, `cad_access_grant`, `cad_access_revoke`, +265 more
- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **calcDispatcher**
  - missing from peer (14): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `chatter_neural_classify`, `chip_formation_predict`, +8 more
- **camDispatcher**
  - missing from peer (713): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +707 more
- **contextDispatcher**
  - missing from peer (5): `priority_classify_task`, `priority_compute_relevance`, `priority_plan_injections`, `priority_reset`, `priority_stats`
- **dataDispatcher**
  - missing from peer (10): `material_equivalent_lookup`, `material_interpolation_find`, `material_selection_recommend`, `tool_assembly_build`, `tool_catalog_adaptive_recommend`, `tool_coating_select`, +4 more
- **devDispatcher**
  - missing from peer (19): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `audit_harness_security`, +13 more
- **edmDispatcher**
  - missing from peer (8): `wedm_haz_compare`, `wedm_haz_predict`, `wedm_haz_stock_allowance`, `wedm_recast_ml_add_sample`, `wedm_recast_ml_predict`, `wedm_recast_ml_reset`, +2 more
- **guardDispatcher**
  - missing from peer (4): `error_ledger_append`, `error_ledger_append_and_embed`, `error_ledger_recall_similar`, `error_ledger_recent`
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (6): `self_awareness_build`, `self_awareness_context_summary`, `self_awareness_health`, `self_awareness_quick_stats`, `self_awareness_recommended_actions`, `self_awareness_search`
- **turningDispatcher**
  - missing from peer (6): `bar_stock_cut_plan`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, `turning_offset_wear`, `turning_robust_optimize`
  - extra in peer (2): `lathe_cadcam_recommend`, `lathe_thermal_band_check`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-mcat-p1u03`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (429): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +423 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-merge-staging`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (476): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +470 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (13): `auto_chain_read`, `auto_chain_run`, `auto_chain_summary`, `build_guard_quality_score`, `directive_summarize_build`, `directive_summarize_read`, +7 more
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (37): `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, `audit_schedule`, +31 more
  - extra in peer (4): `ccd_check_move`, `collision_obb_check`, `sem_sim_check`, `swiss_collision_check_all`
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (22): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +16 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (11): `diagnose_failure`, `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, +5 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (6): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`
  - extra in peer (6): `consensus_persist`, `consensus_recall`, `consensus_recent`, `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-mill-master`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (435): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +429 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1110): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1104 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **millDispatcher**
  - extra in peer (46): `mill_agi`, `mill_agi_counterfactual`, `mill_agi_explain`, `mill_agi_reason`, `mill_capability_exploit`, `mill_chatter_sld`, +40 more
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-mill-p06`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (429): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +423 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-mill-worktree`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (435): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +429 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1110): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1104 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **millDispatcher**
  - extra in peer (68): `mill_adaptive_stepdown`, `mill_agi`, `mill_agi_counterfactual`, `mill_agi_explain`, `mill_agi_reason`, `mill_capability_exploit`, +62 more
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-phase-e`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (361): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +355 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (15): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +9 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1127): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1121 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (113): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +107 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (5): `pp_label_batch`, `pp_label_export`, `pp_label_program`, `pp_label_stats`, `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-pp-agi-u06`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (424): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +418 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-pp-master`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (429): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +423 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-ppg-advancedpost`

- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **camDispatcher**
  - missing from peer (254): `cam_ai_validate`, `cam_calibration_calibrate`, `cam_calibration_calibrate_decision`, `cam_calibration_clear_outcomes`, `cam_calibration_get_outcome_count`, `cam_calibration_metrics`, +248 more
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-ppgh05`

- **cadDispatcher**
  - missing from peer (31): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +25 more
- **calcDispatcher**
  - extra in peer (1): `compute_arc_feed_factor`
- **camDispatcher**
  - missing from peer (108): `cam_ai_validate`, `cam_calibration_calibrate`, `cam_calibration_calibrate_decision`, `cam_calibration_clear_outcomes`, `cam_calibration_get_outcome_count`, `cam_calibration_metrics`, +102 more
  - extra in peer (6): `master_post_okuma_multus_b250`, `master_post_okuma_multus_b250_arc_feed`, `master_post_okuma_multus_b250_block_annotations`, `master_post_okuma_multus_b250_chip_load`, `master_post_okuma_multus_b250_spindle_warmup`, `master_post_okuma_multus_b250_thermal_comp`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more

### `prism-session-efficiency`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **businessDispatcher**
  - missing from peer (33): `lathe_actual_cost_accuracy`, `lathe_actual_cost_reconcile`, `lathe_agi_adjustment`, `lathe_agi_confidence`, `lathe_agi_feedback`, `lathe_agi_history`, +27 more
- **cadAutomationDispatcher**
  - missing from peer (321): `batch_coverage_report`, `batch_extract`, `batch_validate`, `cad_access_audit`, `cad_access_check`, `cad_access_checkin`, +315 more
- **cadDispatcher**
  - missing from peer (99): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +93 more
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (886): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +880 more
- **contextDispatcher**
  - missing from peer (11): `chat_post`, `chat_read`, `claim_file`, `presence`, `priority_classify_task`, `priority_compute_relevance`, +5 more
- **dataDispatcher**
  - missing from peer (56): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +50 more
- **devDispatcher**
  - missing from peer (126): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +120 more
- **edmDispatcher**
  - missing from peer (85): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +79 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-tsc-cleanup`

- **adaptiveControlDispatcher**
  - missing from peer (5): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`
- **cadAutomationDispatcher**
  - extra in peer (1): `cad_drawing_knowledge_calc`
- **cadDispatcher**
  - missing from peer (51): `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, `blueprint_to_all_cads_validate`, `cad_blueprint_flag_features`, `cad_blueprint_infer_class`, `cad_class_build_sequence`, +45 more
- **calcDispatcher**
  - missing from peer (12): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `chatter_neural_classify`, `chip_formation_predict`, +6 more
- **camDispatcher**
  - missing from peer (500): `cam_ai_validate`, `cam_assertion_bundle_audit`, `cam_assertion_bundle_by_name`, `cam_assertion_bundle_evaluate`, `cam_assertion_bundle_failed`, `cam_assertion_bundle_families`, +494 more
- **dataDispatcher**
  - missing from peer (10): `material_equivalent_lookup`, `material_interpolation_find`, `material_selection_recommend`, `tool_assembly_build`, `tool_catalog_adaptive_recommend`, `tool_coating_select`, +4 more
- **devDispatcher**
  - missing from peer (15): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `dev_auto_utilize_analyze`, +9 more
- **guardDispatcher**
  - missing from peer (4): `error_ledger_append`, `error_ledger_append_and_embed`, `error_ledger_recall_similar`, `error_ledger_recent`
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
- **intelligenceDispatcher**
  - missing from peer (117): `xproc_active_rationale`, `xproc_active_select`, `xproc_bandit_constants`, `xproc_bandit_register_arm`, `xproc_bandit_reset`, `xproc_bandit_select`, +111 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
- **sessionDispatcher**
  - missing from peer (6): `self_awareness_build`, `self_awareness_context_summary`, `self_awareness_health`, `self_awareness_quick_stats`, `self_awareness_recommended_actions`, `self_awareness_search`

### `prism-universal-skills`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (460): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +454 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-ussh`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (424): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +418 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-ussh-p2`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (429): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +423 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-ussh-sci`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (460): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +454 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1113): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1107 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (124): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +118 more
  - extra in peer (116): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `electrode_ai_cam`, `electrode_ai_full_design`, `electrode_ai_material`, +110 more
- **fiveAxisDispatcher**
  - extra in peer (14): `five_axis_ai_explain`, `five_axis_ai_nl`, `five_axis_ai_predict_life`, `five_axis_ai_rl`, `five_axis_ai_score`, `five_axis_ai_troubleshoot`, +8 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (75): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`, `mcat_acq_best`, `mcat_acq_compare`, +69 more
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (147): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +141 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

### `prism-wedm-agi`

- **adaptiveControlDispatcher**
  - missing from peer (11): `adaptive_chatter_analyze`, `adaptive_chipload_analyze`, `adaptive_override_calc`, `adaptive_thermal_analyze`, `adaptive_wear_analyze`, `calibration_drift`, +5 more
- **aiReasoningDispatcher**
  - extra in peer (424): `ai_registry_by_category`, `ai_registry_discover`, `ai_registry_domains`, `ai_registry_history`, `ai_registry_ingest`, `ai_registry_list`, +418 more
- **businessDispatcher**
  - missing from peer (382): `accounting_audit`, `accounting_validate`, `acct_bank_reconcile`, `acct_cost_to_complete`, `acct_multi_period_compare`, `acct_quickbooks_sync`, +376 more
  - extra in peer (20): `calculate_oee`, `day`, `estimate_cost`, `get_capacity`, `get_job_status`, `get_machine_rates`, +14 more
- **cadDispatcher**
  - missing from peer (139): `blisk_generate`, `blisk_list_profiles`, `blisk_recommend_blades`, `blisk_validate`, `blueprint_to_all_cads`, `blueprint_to_all_cads_capabilities`, +133 more
  - extra in peer (5): `cad_extract_brep`, `cad_extract_features`, `cad_extract_step`, `cad_index_directory`, `cad_wall_thickness`
- **calcDispatcher**
  - missing from peer (45): `adaptive_machining_process`, `adaptive_param_space_query`, `adaptive_param_space_record`, `adaptive_physics_bridge`, `bandit_register_arm`, `bandit_select_arm`, +39 more
- **camDispatcher**
  - missing from peer (1121): `alphacam_function_index_find_parameter`, `alphacam_function_index_get`, `alphacam_function_index_get_drilling_operations`, `alphacam_function_index_get_operation`, `alphacam_function_index_get_operations_by_category`, `alphacam_function_index_get_section`, +1115 more
- **contextDispatcher**
  - missing from peer (20): `chat_post`, `chat_read`, `claim_file`, `identity_capabilities`, `identity_check_boundary`, `identity_deregister`, +14 more
  - extra in peer (4): `window_map`, `window_reclaimable`, `window_stale_detect`, `window_utilization`
- **dataDispatcher**
  - missing from peer (53): `cmm_history_add`, `cmm_history_alerts`, `cmm_history_features`, `cmm_history_stats`, `cmm_history_trend`, `cmm_import_data`, +47 more
  - extra in peer (39): `employee_import`, `extract_document`, `extraction_approve`, `extraction_get`, `extraction_pending`, `extraction_reject`, +33 more
- **devDispatcher**
  - missing from peer (169): `adaptive_threshold_get`, `adaptive_threshold_get_all`, `adaptive_threshold_observe`, `adaptive_threshold_probability`, `adaptive_threshold_should_flag`, `anchor_claim`, +163 more
  - extra in peer (3): `utilization_gaps`, `utilization_map`, `utilization_report`
- **documentDispatcher**
  - extra in peer (7): `print_by_customer`, `print_get`, `print_ingest`, `print_link_part`, `print_revisions`, `print_search`, +1 more
- **edmDispatcher**
  - missing from peer (121): `auto_print_to_program_run`, `laser_lora_config`, `laser_lora_record`, `laser_lora_state`, `sinker_edm_electrode_plan`, `sinker_edm_flush_recommend`, +115 more
  - extra in peer (204): `eccentric_turning_controllers`, `eccentric_turning_generate`, `eccentric_turning_validate`, `edm_param_calculate`, `edm_postproc_extend`, `edm_wire_calculate`, +198 more
- **guardDispatcher**
  - missing from peer (44): `agi_containment_evaluate`, `agi_containment_evaluate_batch`, `audit_create_finding`, `audit_list`, `audit_query`, `audit_report`, +38 more
- **hookDispatcher**
  - missing from peer (5): `hook_bandit_select`, `hook_coverage_analyze`, `hook_efficiency_roi`, `hook_orch_plan`, `hook_telemetry_metrics`
  - extra in peer (21): `ai_classify`, `ai_feedback`, `ai_reason`, `ai_route`, `ai_stats`, `ai_suggest_upgrades`, +15 more
- **infraDispatcher**
  - missing from peer (17): `auth_health`, `calibration_overrides_preview`, `calibration_status`, `event_publish`, `event_recent`, `event_stats`, +11 more
  - extra in peer (10): `manifest_activate`, `manifest_deactivate`, `manifest_get`, `manifest_list`, `manifest_register`, `manifest_validate`, +4 more
- **intelligenceDispatcher**
  - missing from peer (140): `ai_backend_health`, `ai_backend_probe`, `ai_classify_task`, `ai_domain_list`, `ai_feature_by_category`, `ai_feature_discover`, +134 more
  - extra in peer (10): `sa_analyze_gap`, `sa_full_awareness`, `sa_how_do_i`, `sa_jm_die_summary`, `sa_proactive_check`, `sa_recommend_ai_features`, +4 more
- **knowledgeDispatcher**
  - extra in peer (3): `master_machinist_recommend`, `tribal_graph`, `tribal_recategorize`
- **machineSetupDispatcher**
  - extra in peer (4): `ctrlk_compare`, `ctrlk_get_all_profiles`, `ctrlk_get_profile`, `ctrlk_list_controllers`
- **memoryDispatcher**
  - missing from peer (8): `agent_memory_forget`, `agent_memory_query`, `agent_memory_reinforce`, `agent_memory_remember`, `agent_memory_stats`, `record_session_end`, +2 more
  - extra in peer (3): `pressure_get`, `pressure_recommend`, `pressure_record`
- **multiOpDispatcher**
  - extra in peer (3): `workflow_gap_analysis`, `workflow_list_templates`, `workflow_suggest`
- **orchestrationDispatcher**
  - extra in peer (6): `dlq_list`, `dlq_retry`, `pipeline_health`, `unified_classify`, `unified_execute`, `unified_route`
- **ppDispatcher**
  - missing from peer (1): `pp_okuma_b250_lathe_program`
- **sessionDispatcher**
  - missing from peer (10): `coordination_count`, `coordination_detect_conflicts`, `coordination_recent`, `coordination_record`, `self_awareness_build`, `self_awareness_context_summary`, +4 more
  - extra in peer (12): `context_chain_compaction`, `context_chain_health`, `context_chain_plan`, `context_chain_pressure`, `context_chain_prioritize`, `event_log`, +6 more
- **turningDispatcher**
  - missing from peer (8): `bar_stock_cut_plan`, `hard_turn_decide`, `hard_turn_optimize`, `turning_cpk_surrogate`, `turning_insert_life`, `turning_offset_probe`, +2 more
  - extra in peer (146): `lathe_active_feedback`, `lathe_active_select`, `lathe_active_suggest`, `lathe_anomaly_detect`, `lathe_anomaly_explain`, `lathe_anomaly_program`, +140 more
- **validationDispatcher**
  - extra in peer (4): `qt_compare`, `qt_list_cases`, `qt_parse_golden`, `qt_summary`
- **vibrationPhysicsDispatcher**
  - missing from peer (3): `adaptive_feed_get_tool`, `adaptive_feed_modulate`, `adaptive_feed_update_tool`

