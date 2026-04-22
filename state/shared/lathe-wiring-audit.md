# Lathe Engine Dispatcher Wiring Audit — U-LTH02

**Generated:** 2026-04-17T01:58:22.797Z
**Source:** mcp-server/data/state/lathe-engine-registry.json (87 engines)
**Scan scope:** 86 dispatchers in src/tools/dispatchers/

## Summary

| Metric | Count | Percent |
|---|---:|---:|
| Total engines | 87 | 100% |
| Wired | 59 | 68% |
| Orphan | 28 | 32% |

## Wiring Distribution (dispatcher → engine count)

| Dispatcher | Engines Referenced |
|---|---:|
| turningDispatcher | 47 |
| aiReasoningDispatcher | 11 |
| turningProgramDispatcher | 1 |
| camDispatcher | 1 |

## WIRED Engines (59)

| Engine | Categories | Dispatchers | Sample Actions |
|---|---|---|---|
| LatheActiveLearningEngine | ml | turning | lathe_transfer_knowledge, lathe_transfer_material, lathe_transfer_machine, lathe_active_select |
| LatheActualFeedbackTuningEngine | process_control | turning | lathe_aux_axis_timing, lathe_feedback_tune |
| LatheAdvancedOperationsEngine | uncategorized | aiReasoning | lathe_learning_stats, lathe_live_tooling, lathe_polygon_turning, lathe_advanced_threading |
| LatheAIUltraEngine | orchestration | aiReasoning | ai_registry_by_category, ai_registry_history, lathe_ultra_get_controller, lathe_ultra_list_controllers |
| LatheAnomalyDetectionEngine | ml | turning | lathe_bayesian_optimize, lathe_bayesian_uncertainty, lathe_bayesian_pareto, lathe_anomaly_detect |
| LatheAttentionMechanismEngine | ml | turning | lathe_knowledge_generate_improvements, lathe_knowledge_best_practices, lathe_attention_analyze, lathe_attention_visualize |
| LatheAuxAxisTimingEngine | process_control | turning | lathe_part_cost_model, lathe_aux_axis_timing |
| LatheBayesianOptimizationEngine | ml | turning | lathe_meta_adapt, lathe_meta_few_shot, lathe_meta_prototype, lathe_bayesian_optimize |
| LatheBirdNestPredictorEngine | process_control | turning | lathe_bar_cut_plan, lathe_inspection_plan, lathe_birdnest_predict |
| LatheBlockEngagementSimulatorEngine | process_control | turning | lathe_tool_offset_sync, lathe_operator_audit, lathe_block_engagement_sim |
| LatheBlockTimeProfilerEngine | process_control | turning | lathe_stock_evolution, lathe_envelope_breach_replay, lathe_block_time_profile |
| LatheCAMIntelligenceEngine | intelligence | aiReasoning, turning | customer_search_profile, lathe_cam_template, lathe_cam_toolpath, lathe_cam_sequence |
| LatheCausalInferenceEngine | ml | turning | lathe_attention_analyze, lathe_attention_visualize, lathe_attention_dependencies, lathe_causal_effect |
| LatheChangeoverBriefEngine | programming | turning | lathe_dnc_transfer, lathe_mtconnect_status, lathe_changeover_brief, lathe_first_piece_approve |
| LatheChuckJawSetupEngine | setup_workholding | turning | lathe_probe_cycle, lathe_chuck_jaw_setup |
| LatheCoaxialityRunoutValidatorEngine | setup_workholding | turning | lathe_gdt_callout_parse, lathe_datum_reference_frame, lathe_coax_runout_validate |
| LatheCollisionZoneEngine | setup_workholding | turning | mill_turn_live_tool, mill_turn_sub_spindle, mill_turn_multi_channel, mill_turn_bar_feeder |
| LatheCoolantAdvisorEngine | process_control | turning | lathe_hard_turn_decide, lathe_coolant_advise |
| LatheCSSOptimizerEngine | process_control | turning | lathe_stock_feed_advance, lathe_stock_feed_yield, lathe_css_optimize, lathe_css_select_mode |
| LatheDatumReferenceFrameEngine | setup_workholding | turning | lathe_subspindle_purge_plan, lathe_gdt_callout_parse, lathe_datum_reference_frame |
| LatheDeepLearningEngine | ml | aiReasoning | lathe_check_operation, lathe_find_similar_jobs, lathe_process_feedback, lathe_adapt_parameters |
| LatheDeepReasoningEngine | reasoning | aiReasoning | lathe_cam_analyze, lathe_deep_process_plan, lathe_deep_optimize_setups, lathe_deep_chatter |
| LatheDeviationMapEngine | process_control | turning | lathe_envelope_breach_replay, lathe_block_time_profile, lathe_deviation_map |
| LatheEnsembleLearningEngine | ml | turning | lathe_causal_effect, lathe_causal_counterfactual, lathe_causal_discover, lathe_ensemble_predict |
| LatheEnvelopeBreachReplayEngine | programming, process_control | turning | lathe_block_engagement_sim, lathe_stock_evolution, lathe_envelope_breach_replay |
| LatheExpertAdvisorEngine | intelligence | aiReasoning | lathe_validate_setup, lathe_material_strategy, lathe_geometry_advice, lathe_operation_expertise |
| LatheFirstPieceApprovalEngine | post_processor, quality_pipeline | turning | lathe_dnc_transfer, lathe_mtconnect_status, lathe_changeover_brief, lathe_first_piece_approve |
| LatheGeneticAlgorithmEngine | ml | turning | lathe_anomaly_detect, lathe_anomaly_program, lathe_anomaly_explain, lathe_genetic_optimize |
| LatheIntelligenceEngine | intelligence | turning | lathe_beam_deflection, lathe_chip_breaking, lathe_peck_schedule, lathe_bore_dwell |
| LatheKnowledgeGraphEngine | ml, learning_pipeline | turning | lathe_ensemble_predict, lathe_ensemble_train, lathe_ensemble_evaluate, lathe_knowledge_graph_query |
| LatheMachineIntelligenceEngine | intelligence | aiReasoning | lathe_scenario_advice, lathe_machine_profile, lathe_machine_select, lathe_workholding_strategy |
| LatheMasterOrchestratorFacadeEngine | orchestration | turning | lathe_tribal_autoprogram, lathe_awareness_snapshot, lathe_compare_programming_costs, lathe_orchestrate_facade |
| LatheMetaLearningEngine | ml | turning | lathe_orchestrate_deep, lathe_orchestrate_quick, lathe_meta_adapt, lathe_meta_few_shot |
| LatheOnMachineProbeCycleEngine | setup_workholding | turning | lathe_mtconnect_status, lathe_changeover_brief, lathe_first_piece_approve, lathe_probe_cycle |
| LatheOpTimeBreakdownEngine | cost_business | turning | lathe_coolant_advise, lathe_op_time_breakdown |
| LatheOpusReasoningEngine | reasoning | turning | lathe_cam_interrupted_cut, lathe_opus_analyze, lathe_opus_optimize, lathe_opus_reasoning |
| LatheOrchestrationEngine | orchestration | turningProgram | turning_feature_taxonomy, turning_parse_fit, turning_apply_iso2768, lathe_ui_submit |
| LathePartCostModelEngine | cost_business | turning | lathe_bar_remnant_plan, lathe_part_cost_model |
| LathePartFamilyPlanningEngine | quality_pipeline | turning | lathe_tribal_autoprogram, lathe_awareness_snapshot, lathe_family_planning, lathe_program_signoff_dossier |
| LathePartingChipClearanceEngine | physics, process_control | turning | lathe_birdnest_predict, lathe_parting_chip_clearance |
| LathePostProcessorAIEngine | post_processor | aiReasoning | lathe_ultra_deep_reason, lathe_ultra_llm_query, lathe_ultra_get_post, post_ai_get_profile |
| LathePostProcessorEngine | post_processor | cam | cam, toolpath, post, collision |
| LathePredictiveIntelligenceEngine | intelligence | aiReasoning | lathe_deep_fmea, lathe_predict_tool_wear, lathe_predict_surface_finish, lathe_predict_thermal |
| LatheProgramBacktraceEngine | programming | turning | lathe_envelope_breach_replay, lathe_block_time_profile, lathe_deviation_map, lathe_program_backtrace |
| LatheProgramCatalogEngine | programming | turning | lathe_compare_programming_approaches, lathe_break_even_analysis, lathe_find_similar_programs, lathe_programming_history |
| LatheProgrammingCostEngine | programming, cost_business | turning | lathe_replay_frame_compile, lathe_macro_roi, lathe_estimate_programming_cost, lathe_compare_programming_approaches |
| LatheProgrammingStyleSelectorEngine | programming | turning | lathe_programming_history, lathe_catalog_stats, lathe_select_programming_style, lathe_compare_programming_costs |
| LatheProgramSignoffDossierEngine | programming | turning | lathe_block_time_profile, lathe_deviation_map, lathe_program_backtrace, lathe_program_signoff_dossier |
| LatheReinforcementLearningEngine | ml | turning | lathe_knowledge_graph_query, lathe_knowledge_graph_path, lathe_knowledge_graph_reason, lathe_rl_select_action |
| LatheReplayFrameCompilerEngine | programming | turning | lathe_program_backtrace, lathe_program_signoff_dossier, lathe_replay_frame_compile |
| LatheResourceKnowledgeEngine | learning_pipeline, intelligence | turning | lathe_opus_counterfactual, lathe_opus_hybrid_strategy, lathe_knowledge_detect_mistakes, lathe_knowledge_score_program |
| LatheScienceHardeningEngine | physics | turning | lathe_g71_type, lathe_boring_taper_comp, lathe_springback_comp, lathe_chatter_analysis |
| LatheStockEvolutionEngine | process_control | turning | lathe_operator_audit, lathe_block_engagement_sim, lathe_stock_evolution |
| LatheSubSpindleTransferPurgeEngine | ml, process_control | turning | lathe_parting_chip_clearance, lathe_subspindle_purge_plan |
| LatheTransferLearningEngine | ml | turning | lathe_genetic_optimize, lathe_genetic_nsga, lathe_genetic_sequence, lathe_transfer_knowledge |
| LatheTroubleshootingIntelligenceEngine | intelligence | aiReasoning | lathe_detect_anomalies, lathe_analyze_tool_overhang, lathe_analyze_workpiece_overhang, lathe_diagnose_chatter |
| LatheUnifiedAIEngine | uncategorized | aiReasoning | lathe_list_advanced_ops, lathe_generate_process_plan, lathe_generate_setup_sheet, lathe_adaptive_control |
| LatheUnifiedAIOrchestrator | orchestration | turning | lathe_rl_select_action, lathe_rl_train, lathe_rl_evaluate, lathe_orchestrate |
| LatheUnifiedScienceEngine | physics | turning | lathe_active_select, lathe_active_suggest, lathe_active_feedback, lathe_unified_analyze |

## ORPHAN Engines (28)

| Engine | Categories | LOC | Test? | Reason |
|---|---|---:|:-:|---|
| LatheAGICoreEngine | agi | 1174 | Y | No dispatcher references found |
| LatheAIFeatureRegistration | uncategorized | 591 | N | No dispatcher references found |
| LatheAIOrchestrationEngine | orchestration | 2477 | N | No dispatcher references found |
| LatheAIReasoningEngine | reasoning | 936 | N | No dispatcher references found |
| LatheAITrainingEngine | learning_pipeline | 955 | Y | No dispatcher references found |
| LatheChipMechanicsEngine | physics | 1984 | N | No dispatcher references found |
| LatheCuttingChemistryEngine | physics | 2295 | N | No dispatcher references found |
| LatheDeepAIHardeningEngine | uncategorized | 1935 | Y | No dispatcher references found |
| LatheDeepLearningIntelligenceEngine | ml, intelligence | 1415 | Y | No dispatcher references found |
| LatheDeepLogicEngine | reasoning | 2915 | N | No dispatcher references found |
| LatheFullArchiveTrainingEngine | learning_pipeline | 559 | N | No dispatcher references found |
| LatheJMDieKnowledgeEngine | learning_pipeline, intelligence | 1076 | N | No dispatcher references found |
| LatheKinematicsDeepLearningEngine | ml, physics | 1188 | Y | No dispatcher references found |
| LatheKnowledgeHarvesterEngine | learning_pipeline | 1104 | N | No dispatcher references found |
| LatheMetallurgyEngine | ml, physics | 2277 | N | No dispatcher references found |
| LatheMultiOpPlannerEngine | post_processor, programming | 481 | Y | No dispatcher references found |
| LatheNeuralIntelligenceEngine | ml, intelligence | 2610 | N | No dispatcher references found |
| LathePartClassifierEngine | quality_pipeline | 447 | Y | No dispatcher references found |
| LatheProgramOptimizerEngine | programming | 1513 | N | No dispatcher references found |
| LatheQualityGateEngine | quality_pipeline | 2430 | Y | No dispatcher references found |
| LatheSelfAwarenessIntegrationEngine | intelligence | 3199 | N | No dispatcher references found |
| LatheSequenceOptimizerEngine | programming | 419 | Y | No dispatcher references found |
| LatheShopAwareOptimizationEngine | intelligence | 778 | Y | No dispatcher references found |
| LatheThermodynamicsEngine | physics | 2799 | N | No dispatcher references found |
| LatheTransformerEngine | ml | 2467 | N | No dispatcher references found |
| LatheTribalInjectorEngine | intelligence | 317 | Y | No dispatcher references found |
| LatheUnifiedPhysicsOrchestrationEngine | physics, orchestration | 2586 | Y | No dispatcher references found |
| LatheWorkholdingEngine | setup_workholding | 648 | N | No dispatcher references found |

### Orphan Triage Guidance

Per U-LTH02 exit condition: **100% engines wired OR flagged orphan with reason**.
All 28 orphans above are flagged with reason "No dispatcher references found".

Triage categories (recommended):
- **Needs dispatcher wiring** — engine is user-facing capability, add action to appropriate dispatcher
- **Internal helper** — consumed only by other engines, no dispatcher needed (mark in registry)
- **Deprecated** — superseded, candidate for removal in cleanup phase
- **WIP/placeholder** — incomplete engine, scheduled for later roadmap phase

Follow-up unit candidate: U-LTH02b — triage each orphan and wire/mark/deprecate accordingly.

---

**Exit condition status:** PASS — all 87 engines accounted for (59 wired + 28 orphan with reason).
