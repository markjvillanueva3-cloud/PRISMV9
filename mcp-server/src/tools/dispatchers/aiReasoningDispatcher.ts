/**
 * AI Reasoning Dispatcher — Claude-Powered Intelligence Across PRISM
 *
 * Exposes the PRISMIntelligenceLayer via MCP for AI-powered:
 *   - Speed/Feed optimization
 *   - Tool selection
 *   - Operation sequencing
 *   - Toolpath strategy
 *   - Quote optimization
 *   - Error resolution
 *   - Safety validation
 *   - Feasibility analysis
 *   - Process planning
 *   - G-code optimization
 *
 * Tool: prism_ai
 * Actions: reason, speed_feed, tool_select, sequence, strategy, quote,
 *          resolve_error, safety_check, feasibility, process_plan, gcode, stats
 *
 * @module dispatchers/aiReasoningDispatcher
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";

const ACTIONS = [
  // AI Reasoning (12 actions)
  "reason",
  "speed_feed",
  "tool_select",
  "sequence",
  "strategy",
  "quote",
  "resolve_error",
  "safety_check",
  "feasibility",
  "process_plan",
  "gcode",
  "stats",
  // Multi-Agent Interface (AI-INTEG-MS0) - 14 actions
  "register_session",
  "update_session",
  "end_session",
  "list_sessions",
  "execute_chain",
  "claim_chain",
  "release_chain",
  "share_chain",
  "query_chains",
  "get_chain",
  "token_status",
  "allocate_tokens",
  "get_activity",
  "detect_conflicts",
  // Chain Sharing (AI-INTEG-MS1) - 7 actions
  "register_reasoning_chain",
  "share_reasoning_chain",
  "find_similar_chain",
  "validate_chain",
  "query_shared_chains",
  "extract_tribal",
  "chain_sharing_stats",
  // Opus Capability (AI-INTEG-MS2) - 6 actions
  "opus_execute",
  "opus_assess_complexity",
  "opus_validate_physics",
  "opus_translate_nl",
  "opus_generate_hypotheses",
  "opus_stats",
  // Neural Bridge (AI-INTEG-MS3) - 8 actions
  "neural_index_entity",
  "neural_batch_index",
  "neural_semantic_search",
  "neural_find_similar",
  "neural_graph_reasoning",
  "neural_detect_gaps",
  "neural_infer_relations",
  "neural_stats",
  // Agent Profiles (AI-INTEG-MS5) - 10 actions
  "profile_register",
  "profile_update",
  "profile_get",
  "profile_list",
  "profile_remove",
  "profile_match",
  "profile_best",
  "team_compose",
  "team_get",
  "profile_stats",
  // Advanced AI Reasoning (LLM-INTEL) - 24 actions
  // Chain-of-Thought (4)
  "cot_reason",
  "cot_adversarial",
  "cot_tree_search",
  "cot_stats",
  // Uncertainty Propagation (4)
  "uncertainty_analytical",
  "uncertainty_monte_carlo",
  "uncertainty_sobol",
  "uncertainty_stats",
  // Learning Adaptation (4)
  "learning_record",
  "learning_calibrate",
  "learning_patterns",
  "learning_stats",
  // Decision Reasoning (8)
  "decision_analyze",
  "decision_pareto",
  "decision_machine_select",
  "decision_tool_select",
  "decision_holder_select",
  "decision_fixture_select",
  "decision_material_select",
  "decision_stats",
  // Roadmap Intelligence (6)
  "roadmap_assess_complexity",
  "roadmap_optimize",
  "roadmap_predict_effort",
  "roadmap_record_outcome",
  "roadmap_health",
  "roadmap_build_vs_integrate",
  // Proactive Intelligence (4)
  "proactive_analyze",
  "proactive_anticipate",
  "proactive_patterns",
  "proactive_optimize",
  // Customer Knowledge Profiles (TK-MS11) - 8 actions
  "customer_profile_create",
  "customer_profile_get",
  "customer_profile_update",
  "customer_modifier_learn",
  "customer_modifier_apply",
  "customer_job_record",
  "customer_history_analyze",
  "customer_search_profile",
  // Lathe CAM Intelligence (LLM-INTEL-7) - 6 actions
  "lathe_cam_template",
  "lathe_cam_toolpath",
  "lathe_cam_sequence",
  "lathe_cam_workholding",
  "lathe_cam_mrr_optimize",
  "lathe_cam_analyze",
  // Lathe Deep Reasoning (LLM-INTEL-8) - 5 actions
  "lathe_deep_process_plan",
  "lathe_deep_optimize_setups",
  "lathe_deep_chatter",
  "lathe_deep_deflection",
  "lathe_deep_fmea",
  // Lathe Predictive Intelligence (LLM-INTEL-9) - 6 actions
  "lathe_predict_tool_wear",
  "lathe_predict_surface_finish",
  "lathe_predict_thermal",
  "lathe_predict_cycle_time",
  "lathe_predict_quality",
  "lathe_detect_anomalies",
  // Lathe Troubleshooting Intelligence (LLM-INTEL-10) - 6 actions
  "lathe_analyze_tool_overhang",
  "lathe_analyze_workpiece_overhang",
  "lathe_diagnose_chatter",
  "lathe_diagnose_error",
  "lathe_assess_breakage_risk",
  "lathe_validate_setup",
  // Lathe Expert Advisor (LLM-INTEL-11) - 7 actions
  "lathe_material_strategy",
  "lathe_geometry_advice",
  "lathe_operation_expertise",
  "lathe_select_tooling",
  "lathe_identify_pitfalls",
  "lathe_optimize_process",
  "lathe_scenario_advice",
  // LLM-INTEL-12: Machine Intelligence
  "lathe_machine_profile",
  "lathe_machine_select",
  "lathe_workholding_strategy",
  "lathe_tooling_config",
  "lathe_compare_machines",
  "lathe_list_machine_types",
  "lathe_check_operation",
  // LLM-INTEL-13: Deep Learning
  "lathe_find_similar_jobs",
  "lathe_process_feedback",
  "lathe_adapt_parameters",
  "lathe_synthesize_knowledge",
  "lathe_detect_anomaly",
  "lathe_analyze_trend",
  "lathe_confident_recommendation",
  "lathe_learning_stats",
  // LLM-INTEL-14: Advanced Operations
  "lathe_live_tooling",
  "lathe_polygon_turning",
  "lathe_advanced_threading",
  "lathe_grooving",
  "lathe_eccentric",
  "lathe_contour",
  "lathe_list_advanced_ops",
  // LLM-INTEL-15: Unified AI Orchestration
  "lathe_generate_process_plan",
  "lathe_generate_setup_sheet",
  "lathe_adaptive_control",
  "lathe_check_collisions",
  "lathe_match_tools",
  "lathe_optimize_plan",
  "lathe_analyze_comprehensive",
  // Swiss-Type Intelligence (LLM-INTEL-16) - 6 actions
  "swiss_analyze_guide_bushing",
  "swiss_optimize_gang_layout",
  "swiss_plan_spindle_sync",
  "swiss_plan_bar_feeding",
  "swiss_plan_backworking",
  "swiss_generate_process_plan",
  // Multi-Turret Sync (LLM-INTEL-17) - 5 actions
  "multiturret_plan_simultaneous",
  "multiturret_analyze_collisions",
  "multiturret_generate_sync_codes",
  "multiturret_analyze_balanced_cuts",
  "multiturret_optimize_cycle_time",
  // Multi-Spindle Automatic (LLM-INTEL-18) - 6 actions
  "multispindle_assign_stations",
  "multispindle_analyze_balance",
  "multispindle_decide_tooling",
  "multispindle_optimize_index",
  "multispindle_analyze_production",
  "multispindle_plan_backworking",
  // Complete Machining / WFL-style (LLM-INTEL-19) - 4 actions
  "complete_plan_single_setup",
  "complete_plan_baxis",
  "complete_plan_deep_hole",
  "complete_plan_gear_cutting",
  // Live Tooling Intelligence (LLM-INTEL-20) - 9 actions
  "live_analyze_capability",
  "live_plan_caxis",
  "live_plan_yaxis",
  "live_select_strategy",
  "live_plan_polygon",
  "live_plan_thread_mill",
  "live_plan_helical",
  "live_plan_offcenter",
  "live_generate_plan",
  // Turret Layout Intelligence (LLM-INTEL-21) - 6 actions
  "turret_analyze_interface",
  "turret_compare_interfaces",
  "turret_analyze_capability",
  "turret_optimize_layout",
  "turret_plan_gang",
  "turret_check_interference",
  // Milling Head Intelligence (LLM-INTEL-22) - 7 actions
  "milling_head_plan_baxis",
  "milling_head_analyze_orthogonal",
  "milling_head_plan_universal",
  "milling_head_analyze_angular",
  "milling_head_recommend",
  "milling_head_check_collision",
  "milling_head_plan_interpolation",
  // Advanced CNC Config (LLM-INTEL-23) - 8 actions
  "cnc_analyze_millturn",
  "cnc_plan_channel_sync",
  "cnc_analyze_interpolation",
  "cnc_analyze_hsm",
  "cnc_configure_collision",
  "cnc_compare_controllers",
  "cnc_setup_workplane",
  "cnc_plan_transfer",
  // Deep AI Intelligence (DeepAIIntelligenceEngine) - 12 actions
  "deep_reason",
  "deep_learn",
  "deep_logic",
  "extended_thinking",
  "llm_cli",
  "enhance_skill",
  "enhance_hook",
  "assist_command",
  "deep_reason_chain",
  "deep_reason_tree",
  "deep_reason_multi",
  "deep_analyze",
  // AI Feature Auto-Registry (AIFeatureAutoRegistryEngine) - 8 actions
  "ai_registry_ingest",
  "ai_registry_discover",
  "ai_registry_list",
  "ai_registry_route",
  "ai_registry_stats",
  "ai_registry_domains",
  "ai_registry_by_category",
  "ai_registry_history",
  // Lathe AI Ultra (LATHE-AI-ULTRA) - 10 actions
  "lathe_ultra_get_controller",
  "lathe_ultra_list_controllers",
  "lathe_ultra_compare_controllers",
  "lathe_ultra_assist_hardcode",
  "lathe_ultra_generate_macro",
  "lathe_ultra_translate_nl",
  "lathe_ultra_recommend_cam",
  "lathe_ultra_deep_reason",
  "lathe_ultra_llm_query",
  "lathe_ultra_get_post",
  // Lathe Post Processor AI (LATHE-POST-AI) - 10 actions
  "post_ai_get_profile",
  "post_ai_list_profiles",
  "post_ai_debug",
  "post_ai_recommend_cycle",
  "post_ai_translate",
  "post_ai_optimize",
  "post_ai_convert_macro",
  "post_ai_deep_reason",
  "post_ai_llm_query",
  "post_ai_learning_context",
  // Autonomous AI Orchestration (AutonomousAIOrchestrationEngine) - 12 actions
  "auto_execute",
  "auto_skill_chain",
  "auto_hook_chain",
  "auto_algorithm_select",
  "auto_formula_select",
  "auto_knowledge_plan",
  "auto_query_mit",
  "auto_query_catalogs",
  "auto_gsd_generate",
  "auto_history",
  "auto_learning_stats",
  "auto_summary",
  // Autonomous Session Integration (AutonomousSessionIntegrationEngine) - 6 actions
  "session_process",
  "session_health",
  "session_history",
  "session_clear",
  "session_update",
  "session_summary",
  // Proactive AI Intelligence (ProactiveAIIntelligenceEngine) - 8 actions
  // Renamed with proactive_ai_ prefix to avoid collision with
  // ProactiveIntelligenceEngine above (proactive_analyze, proactive_patterns).
  "proactive_ai_analyze",
  "proactive_ai_quick",
  "proactive_ai_anomaly",
  "proactive_ai_patterns",
  "proactive_ai_learn",
  "proactive_ai_calibration",
  "proactive_ai_thresholds",
  "proactive_ai_summary",
  // Cross-Disciplinary Deep Learning (CrossDisciplinaryDeepLearningEngine) - 8 actions
  "cross_domain_reason",
  "cross_domain_formula",
  "cross_domain_algorithm",
  "cross_domain_search",
  "cross_domain_list_formulas",
  "cross_domain_list_algorithms",
  "cross_domain_patterns",
  "cross_domain_stats",
  // Milling Ultimate AI (MILL-ULTIMATE-AI) - 8 actions
  "mill_ultimate_analyze",
  "mill_ultimate_quick",
  "mill_ultimate_explore",
  "mill_deep_reason",
  "mill_orchestrate",
  "mill_neural_predict",
  "mill_pareto_optimize",
  "mill_ultimate_stats",
  // Milling AI Unification (MILL-AI-UNIFICATION) - 4 actions
  "mill_unified_recommend",
  "mill_unified_quick",
  "mill_unified_inventory",
  "mill_unified_utilization",
  // Milling Deep Integration (MILL-DEEP-INTEGRATION) - 3 actions
  "mill_integrate_full",
  "mill_integrate_quick",
  "mill_integrate_sources",
  // Milling Critical Thinking (MILL-CRITICAL-THINKING) - 4 actions
  "mill_critical_analyze",
  "mill_critical_quick",
  "mill_critical_rootcause",
  "mill_critical_whatif",
  // Milling Hybrid Strategy (MILL-HYBRID-SYNTHESIS) - 4 actions
  "mill_hybrid_synthesize",
  "mill_hybrid_quick",
  "mill_hybrid_strategies",
  "mill_hybrid_synergy",
  // Milling Neural Cognitive (MILL-NEURAL-AGI) - 5 actions
  "mill_cognitive_process",
  "mill_cognitive_quick",
  "mill_cognitive_explain",
  "mill_cognitive_learn",
  "mill_cognitive_stats",
  // JM Die Mill Program Harvester (MILL-HARVEST) - 6 actions
  "mill_harvest_full",
  "mill_harvest_customer",
  "mill_harvest_tool",
  "mill_harvest_sequence",
  "mill_harvest_speeds_feeds",
  "mill_harvest_stats",
  // Milling Deep Knowledge Synthesis (MILL-DEEP-SYNTHESIS) - 5 actions
  "mill_synthesis_full",
  "mill_synthesis_quick",
  "mill_synthesis_sources",
  "mill_synthesis_search",
  "mill_synthesis_stats",
  // Milling Meta-Learning (MILL-META-LEARN) - 7 actions
  "mill_meta_learn",
  "mill_meta_feedback",
  "mill_meta_adapt",
  "mill_meta_patterns",
  "mill_meta_transfers",
  "mill_meta_assess",
  "mill_meta_stats",
  // Milling AGI Master (MILL-AGI-MASTER) - 6 actions
  "mill_agi_print_to_program",
  "mill_agi_quick_recommend",
  "mill_agi_wisdom",
  "mill_agi_validate",
  "mill_agi_categories",
  "mill_agi_stats",
  // Milling End-to-End Orchestration (MILL-E2E) - 4 actions
  "mill_e2e_execute",
  "mill_e2e_validate",
  "mill_e2e_template",
  "mill_e2e_stats",
  // Milling Unified Science Orchestration (MILL-SCIENCE) - 6 actions
  "mill_science_analyze",
  "mill_science_quick",
  "mill_science_material",
  "mill_science_tips",
  "mill_science_awareness",
  "mill_science_stats",
  // Milling Production Knowledge Harvester (MILL-HARVEST) - 6 actions
  "mill_harvest_jmdie",
  "mill_harvest_analyze",
  "mill_harvest_recommend",
  "mill_harvest_validate",
  "mill_harvest_tribal",
  "mill_harvest_stats",
  // Milling AGI Orchestration (MILL-AGI-ORCH) - 6 actions
  "mill_agi_analyze",
  "mill_agi_quick",
  "mill_agi_optimal",
  "mill_agi_validate",
  "mill_agi_awareness",
  "mill_agi_stats",
  // Post Processor Unified Deep Reasoning (PP-UNIFIED-AI) - 6 actions
  "pp_unified_reason",
  "pp_unified_mcts",
  "pp_unified_controller_info",
  "pp_unified_machine_profile",
  "pp_unified_validate_physics",
  "pp_unified_stats",
  // Post Processor Cognitive AGI (PP-COGNITIVE-AGI) - 5 actions
  "pp_cognitive_generate",
  "pp_cognitive_explain",
  "pp_cognitive_learn",
  "pp_cognitive_recall",
  "pp_cognitive_stats",
  // ===== LATHE-AI: Lathe Intelligence Giants (12 actions) — PP-AGI-S0/U-S0-02 =====
  "lathe_ai_what_can_i_do",      // LATHE-AI: Query lathe capabilities
  "lathe_ai_how_do_i",           // LATHE-AI: Get guidance for lathe task
  "lathe_ai_who_handles",        // LATHE-AI: Find engines by domain
  "lathe_ai_inventory",          // LATHE-AI: Get lathe engine inventory
  "lathe_ai_find_best_engine",   // LATHE-AI: Route task to best engine
  "lathe_ai_orchestrate",        // LATHE-AI: Multi-engine orchestration
  "lathe_ai_jm_die_learn",       // LATHE-AI: Learn from JM Die programs
  "lathe_ai_cross_domain",       // LATHE-AI: Cross-domain synthesis
  "lathe_ai_suggest_approach",   // LATHE-AI: Suggest optimal approach
  "lathe_ai_deep_logic",         // LATHE-AI: Deep logic reasoning
  "lathe_ai_thermodynamics",     // LATHE-AI: Thermodynamic analysis
  "lathe_ai_proactive",          // LATHE-AI: Proactive recommendations
  // ===== PP-AGI-S0/U-S0-07: 11 Reasoning Engine Giants (51 actions) =====
  // BeliefStateReasoningEngine (8 actions)
  "belief_set", "belief_get", "belief_update", "belief_top_k",
  "belief_entropy", "belief_probability", "belief_list", "belief_clear",
  // CausalReasoningEngine (5 actions)
  "causal_add_edge", "causal_trace_impact", "causal_root_causes", "causal_stats", "causal_clear",
  // CounterfactualReasoningEngine (5 actions)
  "counterfactual_create", "counterfactual_generate", "counterfactual_compare",
  "counterfactual_root_cause", "counterfactual_templates",
  // PRISMCreativeReasoningEngine (4 actions)
  "creative_explore", "creative_capabilities", "creative_history", "creative_summary",
  // ScientificReasoningEngine (4 actions)
  "sci_dimension_check", "sci_validate_formula", "sci_reason", "sci_reason_material",
  // TemporalReasoningEngine (6 actions)
  "temporal_record", "temporal_snapshots", "temporal_value_at",
  "temporal_project", "temporal_forecast", "temporal_list",
  // ReasoningExplainerEngine (3 actions)
  "explain_recommendation", "explain_formula", "explain_reading_level",
  // LatheAIReasoningEngine (4 actions)
  "lathe_reasoning", "lathe_reasoning_sequence", "lathe_reasoning_params", "lathe_reasoning_controller",
  // WEDMAnalogicalReasoningEngine (4 actions)
  "wedm_analogy_add", "wedm_analogy_retrieve", "wedm_analogy_all", "wedm_analogy_size",
  // WEDMReasoningBridgeEngine (4 actions)
  "wedm_bridge_enrich", "wedm_bridge_decision", "wedm_bridge_warning", "wedm_bridge_stats",
  // WEDMReasoningTraceLedgerEngine (4 actions)
  "wedm_trace_record", "wedm_trace_recent", "wedm_trace_query", "wedm_trace_validate",
  // MillingReasoningTraceLedgerEngine (5 actions) — MILL-AGI-P0.2
  "milling_trace_record", "milling_trace_recent", "milling_trace_query", "milling_trace_stats", "milling_trace_with_reasoning",
  // MillingReasoningDefaultEngine (2 actions) — MILL-AGI-P0.2-01
  "milling_reason_default", "milling_reason_chain",
  // UpstreamValidationHandshakeEngine (2 actions) — MILL-AGI-P1.3-01
  "milling_upstream_validate", "milling_handshake_all",
  // HSMDwellAtCornerEngine (3 actions) — MILL-AGI-P2/MS7-04
  "hsm_analyze_dwell", "hsm_optimize_corner", "hsm_corner_feed",
  // MicroMillingSizeEffectEngine (3 actions) — MILL-AGI-P2/MS7-05
  "micro_size_effect", "micro_chip_formation", "micro_recommend",
  // MillingInferenceOrchestratorEngine (2 actions) — MILL-AGI-P0.5
  "milling_inference_orchestrate", "milling_inference_status",
  // MillingDigitalTwinEngine (3 actions) — MILL-AGI-P0.5
  "milling_twin_sync", "milling_twin_state", "milling_twin_simulate",
  // MillingAIUltraIntelligenceEngine (6 actions) — MILL-AI-MS1
  "milling_ai_nl", "milling_ai_strategy", "milling_ai_predict",
  "milling_ai_score", "milling_ai_explain", "milling_ai_troubleshoot",
  // MillingAIIntegrationEngine (3 actions) — MILL-AI-MS2
  "milling_jmdie_search", "milling_jmdie_learn", "milling_jmdie_recommend",
  // MillingDeepAIHardeningEngine (3 actions) — MILL-AI-MS3
  "milling_deep_harden", "milling_deep_validate", "milling_deep_optimize",
  // MillingMachineIntelligenceEngine (4 actions) — MILL-AI-MS4
  "milling_machine_profile", "milling_machine_select", "milling_machine_compare", "milling_machine_capability",
  // ===== INTEL-OLLAMA-OBSIDIAN-MS0 / P5: Orphan reasoning engines wired (4 actions) =====
  "creative_solve",          // P5-U01 → PRISMCreativeReasoningEngine.explore
  "causal_analyze",          // P5-U02 → CausalReasoningEngine.traceImpact|rootCauses
  "counterfactual_predict",  // P5-U03 → CounterfactualReasoningEngine.generateCounterfactual
  "scientific_reason",       // P5-U04 → ScientificReasoningEngine.reason
  // ===== INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U03: Multi-model tiered routing =====
  "model_route",             // P20-U03 → ModelRouterEngine.routeForTask
  "model_route_thresholds",  // P20-U03 → ModelRouterEngine.{getThresholds,setThresholds,resetThresholds}
  // ===== INTEL-OLLAMA-OBSIDIAN-MS0 / P22-U01: Pre-Claude review orchestrator =====
  "pre_review",              // P22-U01 → PreReviewOrchestratorEngine.draftReview
  // ===== INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS: Multi-model agreement =====
  "consensus",               // → MultiModelConsensusEngine.ask (Claude+Codex+Grok+Gemini+Ollama)
  "codex_exec",              // → CodexClientEngine.exec (single-model gpt-5.5)
  "grok_exec",               // → GrokClientEngine.exec (single-model grok-4)
  "gemini_exec",             // → GeminiClientEngine.exec (single-model gemini-2.0-flash-exp)
  // ===== LAYER-3-FULL-INTEGRATION: cache + retrieval + neural feed + AI bridge =====
  "consensus_recall_cache",  // → ConsensusRecallCacheEngine.recall
  "wiki_retrieve",           // → WikiRetrievalContextEngine.retrieve
  "neural_feed_record",      // → ConsensusNeuralFeedbackEngine.record
  "neural_feed_recent",      // → ConsensusNeuralFeedbackEngine.recent
  "consensus_bridge_reason", // → ConsensusAIBridgeEngine.reason (cache-first AI orchestrator entry)
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

export function registerAIReasoningDispatcher(server: any): void {
  server.tool(
    "prism_ai",
    `AI-powered manufacturing intelligence (280 actions). Core reasoning + multi-agent + chain sharing + Opus + neural bridge + agent profiles + CoT + uncertainty + learning + decision + roadmap + proactive + customer profiles + lathe CAM + lathe deep reasoning + lathe predictive + lathe troubleshooting + lathe expert advisor + lathe machine intelligence + lathe deep learning + lathe advanced ops + lathe unified AI + swiss-type intelligence + multi-turret sync + multi-spindle automatic + complete machining (WFL-style) + live tooling intelligence + turret layout + milling head intelligence + advanced CNC config + DEEP AI INTELLIGENCE (Claude Opus-level reasoning/learning/logic/LLM CLI) + AI AUTO-REGISTRY (auto-ingest new AI features) + LATHE AI ULTRA (21 controllers, 8 families, 4 programming modes, deep reasoning chains, LLM CLI) + LATHE POST AI (post debugging, cycle recommendation, code translation, optimization, macro conversion) + AUTONOMOUS ORCHESTRATION (full automation of skills/hooks/scripts/engines/algorithms/formulas/knowledge) + SESSION INTEGRATION (real executor/knowledge integration) + PROACTIVE AI (anomaly detection, pattern recognition) + CROSS-DISCIPLINARY (15 scientific domains, 6582 lines of formulas/algorithms). Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_ai] ${action}`);

      try {
        const { prismIntelligence } = await import("../../engines/PRISMIntelligenceLayer.js");

        switch (action) {
          // === General Reasoning ===
          case "reason": {
            if (!params.domain || !params.intent) {
              return ok({ error: "Missing required params: domain, intent" });
            }
            const result = await prismIntelligence.reason({
              domain: params.domain,
              intent: params.intent,
              context: params.context || {},
              constraints: params.constraints,
              options: {
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                require_explanation: params.require_explanation ?? true,
                include_alternatives: params.include_alternatives ?? true,
                safety_check: params.safety_check ?? true,
              },
            });
            return ok(result);
          }

          // === Speed/Feed Optimization ===
          case "speed_feed": {
            if (!params.material || !params.tool_diameter || !params.tool_type || !params.operation) {
              return ok({ error: "Missing required params: material, tool_diameter, tool_type, operation" });
            }
            const result = await prismIntelligence.optimizeSpeedFeed({
              material: params.material,
              tool_diameter: params.tool_diameter,
              tool_type: params.tool_type,
              operation: params.operation,
              machine: params.machine,
              surface_finish: params.surface_finish,
            });
            return ok(result);
          }

          // === Tool Selection ===
          case "tool_select": {
            if (!params.operation || !params.material || !params.feature_type) {
              return ok({ error: "Missing required params: operation, material, feature_type" });
            }
            const result = await prismIntelligence.selectTool({
              operation: params.operation,
              material: params.material,
              feature_type: params.feature_type,
              dimensions: params.dimensions,
              surface_finish: params.surface_finish,
            });
            return ok(result);
          }

          // === Operation Sequencing ===
          case "sequence": {
            if (!params.features || !params.material || !params.machine_type) {
              return ok({ error: "Missing required params: features, material, machine_type" });
            }
            const result = await prismIntelligence.sequenceOperations({
              features: params.features,
              material: params.material,
              machine_type: params.machine_type,
              constraints: params.constraints,
            });
            return ok(result);
          }

          // === Toolpath Strategy ===
          case "strategy": {
            if (!params.feature || !params.material || !params.tool || !params.machine_type) {
              return ok({ error: "Missing required params: feature, material, tool, machine_type" });
            }
            const result = await prismIntelligence.selectToolpathStrategy({
              feature: params.feature,
              material: params.material,
              tool: params.tool,
              machine_type: params.machine_type,
              priorities: params.priorities || ["quality", "speed"],
            });
            return ok(result);
          }

          // === Quote Optimization ===
          case "quote": {
            if (!params.part_details || !params.current_quote) {
              return ok({ error: "Missing required params: part_details, current_quote" });
            }
            const result = await prismIntelligence.optimizeQuote({
              part_details: params.part_details,
              current_quote: params.current_quote,
              target_margin: params.target_margin || 0.25,
              competition: params.competition,
            });
            return ok(result);
          }

          // === Error Resolution ===
          case "resolve_error": {
            if (!params.error_type || !params.description) {
              return ok({ error: "Missing required params: error_type, description" });
            }
            const result = await prismIntelligence.resolveError({
              error_type: params.error_type,
              description: params.description,
              machine: params.machine,
              operation: params.operation,
              symptoms: params.symptoms,
            });
            return ok(result);
          }

          // === Safety Validation ===
          case "safety_check": {
            if (!params.operation || !params.parameters || !params.machine) {
              return ok({ error: "Missing required params: operation, parameters, machine" });
            }
            const result = await prismIntelligence.validateSafety({
              operation: params.operation,
              parameters: params.parameters,
              machine: params.machine,
              tool: params.tool || "unknown",
              workholding: params.workholding || "unknown",
            });
            return ok(result);
          }

          // === Feasibility Analysis ===
          case "feasibility": {
            if (!params.part_description || !params.material) {
              return ok({ error: "Missing required params: part_description, material" });
            }
            const result = await prismIntelligence.analyzeFeasibility({
              part_description: params.part_description,
              tolerances: params.tolerances || {},
              material: params.material,
              quantity: params.quantity || 1,
              deadline: params.deadline,
            });
            return ok(result);
          }

          // === Process Planning ===
          case "process_plan": {
            if (!params.part_name || !params.material || !params.features) {
              return ok({ error: "Missing required params: part_name, material, features" });
            }
            const result = await prismIntelligence.createProcessPlan({
              part_name: params.part_name,
              material: params.material,
              features: params.features,
              tolerances: params.tolerances || {},
              quantity: params.quantity || 1,
            });
            return ok(result);
          }

          // === G-code Optimization ===
          case "gcode": {
            if (!params.gcode_sample || !params.controller) {
              return ok({ error: "Missing required params: gcode_sample, controller" });
            }
            const result = await prismIntelligence.optimizeGcode({
              gcode_sample: params.gcode_sample,
              controller: params.controller,
              optimization_goals: params.optimization_goals || ["efficiency", "quality"],
            });
            return ok(result);
          }

          // === Stats ===
          case "stats": {
            return ok(prismIntelligence.getStats());
          }

          // =================================================================
          // MULTI-AGENT INTERFACE (AI-INTEG-MS0)
          // =================================================================

          case "register_session": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.agent_id || !params.family) {
              return ok({ error: "Missing required params: agent_id, family" });
            }
            const result = multiAgentAIInterfaceEngine.registerSession({
              agent_id: params.agent_id,
              family: params.family,
              lane: params.lane,
              machine: params.machine,
              token_budget: params.token_budget,
            });
            return ok(result);
          }

          case "update_session": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            const result = multiAgentAIInterfaceEngine.updateSession({
              session_id: params.session_id,
              state: params.state,
              current_task: params.current_task,
              lane: params.lane,
            });
            return ok(result ?? { error: "Session not found" });
          }

          case "end_session": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            const success = multiAgentAIInterfaceEngine.endSession(params.session_id);
            return ok({ success, session_id: params.session_id });
          }

          case "list_sessions": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            const sessions = multiAgentAIInterfaceEngine.listSessions({
              family: params.family,
              state: params.state,
              lane: params.lane,
            });
            return ok({ count: sessions.length, sessions });
          }

          case "execute_chain": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id || !params.intent) {
              return ok({ error: "Missing required params: session_id, intent" });
            }
            const result = await multiAgentAIInterfaceEngine.execute({
              session_id: params.session_id,
              intent: params.intent,
              context: params.context,
              check_cache: params.check_cache ?? true,
              share_result: params.share_result ?? true,
              max_tokens: params.max_tokens,
            });
            return ok(result);
          }

          case "claim_chain": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id || !params.intent) {
              return ok({ error: "Missing required params: session_id, intent" });
            }
            const result = multiAgentAIInterfaceEngine.claimChain({
              session_id: params.session_id,
              intent: params.intent,
              estimated_duration_ms: params.estimated_duration_ms,
            });
            return ok(result);
          }

          case "release_chain": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.chain_id) {
              return ok({ error: "Missing required param: chain_id" });
            }
            const success = multiAgentAIInterfaceEngine.releaseChain(params.chain_id);
            return ok({ success, chain_id: params.chain_id });
          }

          case "share_chain": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.chain_id) {
              return ok({ error: "Missing required param: chain_id" });
            }
            const result = multiAgentAIInterfaceEngine.shareChain({
              chain_id: params.chain_id,
              target_agents: params.target_agents,
              summary: params.summary,
            });
            return ok(result);
          }

          case "query_chains": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            const chains = multiAgentAIInterfaceEngine.queryChains({
              intent_pattern: params.intent_pattern,
              source: params.source,
              status: params.status,
              created_by: params.created_by,
              since: params.since,
              limit: params.limit ?? 20,
            });
            return ok({ count: chains.length, chains });
          }

          case "get_chain": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.chain_id) {
              return ok({ error: "Missing required param: chain_id" });
            }
            const result = multiAgentAIInterfaceEngine.getChain(params.chain_id);
            return ok(result ?? { error: "Chain not found" });
          }

          case "token_status": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            const status = multiAgentAIInterfaceEngine.getTokenStatus(params.session_id);
            return ok(status ?? { error: "Session not found" });
          }

          case "allocate_tokens": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            if (!params.session_id || !params.amount) {
              return ok({ error: "Missing required params: session_id, amount" });
            }
            const result = multiAgentAIInterfaceEngine.allocateTokens(
              params.session_id,
              params.amount,
              params.reason
            );
            return ok(result ?? { error: "Session not found" });
          }

          case "get_activity": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            const activity = multiAgentAIInterfaceEngine.getActivity();
            return ok(activity);
          }

          case "detect_conflicts": {
            const { multiAgentAIInterfaceEngine } = await import("../../engines/MultiAgentAIInterfaceEngine.js");
            const result = multiAgentAIInterfaceEngine.detectConflicts();
            return ok(result);
          }

          // =================================================================
          // CHAIN SHARING (AI-INTEG-MS1)
          // =================================================================

          case "register_reasoning_chain": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            if (!params.chain || !params.created_by) {
              return ok({ error: "Missing required params: chain, created_by" });
            }
            const result = reasoningChainSharingEngine.registerChain(
              params.chain,
              params.created_by,
              params.domain,
              params.tags
            );
            return ok(result);
          }

          case "share_reasoning_chain": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            if (!params.chain_id || !params.from_agent) {
              return ok({ error: "Missing required params: chain_id, from_agent" });
            }
            if (params.broadcast) {
              const result = reasoningChainSharingEngine.shareChainWithAll(
                params.chain_id,
                params.from_agent
              );
              return ok(result ?? { error: "Chain not found" });
            } else {
              if (!params.to_agents || !Array.isArray(params.to_agents)) {
                return ok({ error: "Missing required param: to_agents (array)" });
              }
              const result = reasoningChainSharingEngine.shareChain(
                params.chain_id,
                params.from_agent,
                params.to_agents,
                params.summary
              );
              return ok(result ?? { error: "Chain not found" });
            }
          }

          case "find_similar_chain": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            if (!params.problem) {
              return ok({ error: "Missing required param: problem" });
            }
            const result = reasoningChainSharingEngine.findSimilarChain(
              params.problem,
              params.min_confidence
            );
            return ok(result ? { found: true, chain: result } : { found: false });
          }

          case "validate_chain": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            if (!params.chain_id || !params.validator_agent) {
              return ok({ error: "Missing required params: chain_id, validator_agent" });
            }
            const success = reasoningChainSharingEngine.validateChain({
              chain_id: params.chain_id,
              validator_agent: params.validator_agent,
              timestamp: new Date().toISOString(),
              confidence_assessment: params.confidence_assessment ?? 0.8,
              agrees_with_conclusion: params.agrees_with_conclusion ?? true,
              additional_insights: params.additional_insights,
              corrections: params.corrections,
            });
            return ok({ success });
          }

          case "query_shared_chains": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            const chains = reasoningChainSharingEngine.queryChains({
              problem_pattern: params.problem_pattern,
              domain: params.domain,
              min_confidence: params.min_confidence,
              since: params.since,
              created_by: params.created_by,
              tags: params.tags,
              limit: params.limit ?? 20,
            });
            return ok({ count: chains.length, chains });
          }

          case "extract_tribal": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            if (!params.chain_id) {
              return ok({ error: "Missing required param: chain_id" });
            }
            const result = await reasoningChainSharingEngine.extractTribalKnowledge(params.chain_id);
            return ok(result);
          }

          case "chain_sharing_stats": {
            const { reasoningChainSharingEngine } = await import("../../engines/ReasoningChainSharingEngine.js");
            const stats = reasoningChainSharingEngine.getStats();
            return ok(stats);
          }

          // =================================================================
          // OPUS CAPABILITY (AI-INTEG-MS2)
          // =================================================================

          case "opus_execute": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            if (!params.category || !params.intent) {
              return ok({ error: "Missing required params: category, intent" });
            }
            const result = await opusCapabilityEngine.execute({
              request_id: params.request_id,
              category: params.category,
              intent: params.intent,
              context: params.context || {},
              constraints: params.constraints,
              force_tier: params.force_tier,
              skip_cache: params.skip_cache,
            });
            return ok(result);
          }

          case "opus_assess_complexity": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            if (!params.category || !params.intent) {
              return ok({ error: "Missing required params: category, intent" });
            }
            const assessment = opusCapabilityEngine.getComplexityAssessment({
              category: params.category,
              intent: params.intent,
              context: params.context || {},
            });
            return ok(assessment);
          }

          case "opus_validate_physics": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const result = await opusCapabilityEngine.execute({
              category: "physics_validation",
              intent: params.intent,
              context: params.context || {},
              force_tier: params.force_tier,
            });
            return ok(result);
          }

          case "opus_translate_nl": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            if (!params.text) {
              return ok({ error: "Missing required param: text" });
            }
            const result = await opusCapabilityEngine.execute({
              category: "nl_to_structured",
              intent: params.text,
              context: params.context || {},
            });
            return ok(result);
          }

          case "opus_generate_hypotheses": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            if (!params.observation) {
              return ok({ error: "Missing required param: observation" });
            }
            const result = await opusCapabilityEngine.execute({
              category: "hypothesis_generation",
              intent: params.observation,
              context: { observation: params.observation, ...params.context },
            });
            return ok(result);
          }

          case "opus_stats": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            const stats = opusCapabilityEngine.getStats();
            return ok(stats);
          }

          // =================================================================
          // NEURAL BRIDGE (AI-INTEG-MS3)
          // =================================================================

          case "neural_index_entity": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.id || !params.type || !params.text) {
              return ok({ error: "Missing required params: id, type, text" });
            }
            const entity = knowledgeGraphNeuralBridgeEngine.indexEntity(
              params.id,
              params.type,
              params.text,
              params.metadata || {}
            );
            return ok({
              indexed: true,
              id: entity.id,
              type: entity.type,
              embedding_dim: entity.embedding.length,
            });
          }

          case "neural_batch_index": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.entities || !Array.isArray(params.entities)) {
              return ok({ error: "Missing required param: entities (array)" });
            }
            const count = knowledgeGraphNeuralBridgeEngine.batchIndex(params.entities);
            return ok({ indexed: count });
          }

          case "neural_semantic_search": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const results = knowledgeGraphNeuralBridgeEngine.semanticSearch({
              query: params.query,
              types: params.types,
              limit: params.limit ?? 10,
              min_similarity: params.min_similarity ?? 0.5,
              include_graph_context: params.include_graph_context ?? false,
            });
            return ok({
              count: results.length,
              results: results.map(r => ({
                id: r.entity.id,
                type: r.entity.type,
                text: r.entity.text.slice(0, 200),
                similarity: r.similarity,
                graph_context: r.graph_context,
              })),
            });
          }

          case "neural_find_similar": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.entity_id) {
              return ok({ error: "Missing required param: entity_id" });
            }
            const results = knowledgeGraphNeuralBridgeEngine.findSimilar(
              params.entity_id,
              params.limit ?? 5
            );
            return ok({
              count: results.length,
              similar: results.map(r => ({
                id: r.entity.id,
                type: r.entity.type,
                text: r.entity.text.slice(0, 200),
                similarity: r.similarity,
              })),
            });
          }

          case "neural_graph_reasoning": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const steps = knowledgeGraphNeuralBridgeEngine.graphAugmentedReasoning(
              params.query,
              params.max_steps ?? 3
            );
            return ok({
              step_count: steps.length,
              steps: steps.map(s => ({
                step_id: s.step_id,
                query: s.query,
                match_count: s.semantic_matches.length,
                inferred_facts: s.inferred_facts,
                confidence: s.confidence,
              })),
            });
          }

          case "neural_detect_gaps": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const gaps = knowledgeGraphNeuralBridgeEngine.detectKnowledgeGaps(params.query);
            return ok({ gap_count: gaps.length, gaps });
          }

          case "neural_infer_relations": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            if (!params.entity_id) {
              return ok({ error: "Missing required param: entity_id" });
            }
            const relations = knowledgeGraphNeuralBridgeEngine.inferRelations(params.entity_id);
            return ok({ relation_count: relations.length, relations });
          }

          case "neural_stats": {
            const { knowledgeGraphNeuralBridgeEngine } = await import("../../engines/KnowledgeGraphNeuralBridgeEngine.js");
            const stats = knowledgeGraphNeuralBridgeEngine.getStats();
            return ok(stats);
          }

          // =================================================================
          // AGENT PROFILES (AI-INTEG-MS5)
          // =================================================================

          case "profile_register": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.name || !params.family || !params.preferred_tier) {
              return ok({ error: "Missing required params: name, family, preferred_tier" });
            }
            try {
              const profile = agentSpecializationProfileEngine.registerProfile({
                name: params.name,
                description: params.description || "",
                family: params.family,
                preferred_tier: params.preferred_tier,
                capabilities: params.capabilities || [],
                domains: params.domains || ["general"],
                coordination_pattern: params.coordination_pattern || "independent",
                tool_access: params.tool_access || [],
                max_concurrent_tasks: params.max_concurrent_tasks || 1,
                token_budget_default: params.token_budget_default || 10000,
                metadata: params.metadata || {},
              });
              return ok({ registered: true, profile_id: profile.profile_id, name: profile.name });
            } catch (err: any) {
              return ok({ error: err.message });
            }
          }

          case "profile_update": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.profile_id) {
              return ok({ error: "Missing required param: profile_id" });
            }
            const updated = agentSpecializationProfileEngine.updateProfile(params.profile_id, {
              description: params.description,
              preferred_tier: params.preferred_tier,
              capabilities: params.capabilities,
              domains: params.domains,
              coordination_pattern: params.coordination_pattern,
              tool_access: params.tool_access,
              max_concurrent_tasks: params.max_concurrent_tasks,
              token_budget_default: params.token_budget_default,
              metadata: params.metadata,
            });
            return ok(updated ? { updated: true, profile_id: params.profile_id } : { error: "Profile not found" });
          }

          case "profile_get": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.profile_id) {
              return ok({ error: "Missing required param: profile_id" });
            }
            const profile = agentSpecializationProfileEngine.getProfile(params.profile_id);
            return ok(profile ?? { error: "Profile not found" });
          }

          case "profile_list": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            const profiles = agentSpecializationProfileEngine.listProfiles({
              family: params.family,
              tier: params.tier,
              domain: params.domain,
              capability: params.capability,
              pattern: params.pattern,
            });
            return ok({
              count: profiles.length,
              profiles: profiles.map(p => ({
                profile_id: p.profile_id,
                name: p.name,
                family: p.family,
                tier: p.preferred_tier,
                pattern: p.coordination_pattern,
                capabilities: p.capabilities.length,
                domains: p.domains,
              })),
            });
          }

          case "profile_remove": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.profile_id) {
              return ok({ error: "Missing required param: profile_id" });
            }
            try {
              const removed = agentSpecializationProfileEngine.removeProfile(params.profile_id);
              return ok({ removed, profile_id: params.profile_id });
            } catch (err: any) {
              return ok({ error: err.message });
            }
          }

          case "profile_match": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.required_capabilities) {
              return ok({ error: "Missing required param: required_capabilities (array)" });
            }
            const matches = agentSpecializationProfileEngine.matchProfiles({
              description: params.description || "",
              required_capabilities: params.required_capabilities,
              preferred_domains: params.preferred_domains,
              complexity: params.complexity,
              urgency: params.urgency,
              requires_validation: params.requires_validation,
            }, params.limit ?? 5);
            return ok({
              count: matches.length,
              matches: matches.map(m => ({
                profile_id: m.profile.profile_id,
                name: m.profile.name,
                score: m.score,
                capability_coverage: m.capability_coverage,
                reasons: m.reasons,
              })),
            });
          }

          case "profile_best": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.required_capabilities) {
              return ok({ error: "Missing required param: required_capabilities (array)" });
            }
            const best = agentSpecializationProfileEngine.getBestProfile({
              description: params.description || "",
              required_capabilities: params.required_capabilities,
              preferred_domains: params.preferred_domains,
              complexity: params.complexity,
              urgency: params.urgency,
              requires_validation: params.requires_validation,
            });
            return ok(best ? {
              profile_id: best.profile.profile_id,
              name: best.profile.name,
              score: best.score,
              reasons: best.reasons,
            } : { found: false });
          }

          case "team_compose": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.task_description || !params.requirements) {
              return ok({ error: "Missing required params: task_description, requirements (array)" });
            }
            const team = agentSpecializationProfileEngine.composeTeam(
              params.task_description,
              params.requirements,
              params.max_members ?? 4
            );
            return ok({
              team_id: team.team_id,
              member_count: team.members.length,
              members: team.members.map(m => ({
                profile_id: m.profile_id,
                role: m.role,
                token_allocation: m.token_allocation,
              })),
              coordination_strategy: team.coordination_strategy,
              estimated_completion_ms: team.estimated_completion_ms,
            });
          }

          case "team_get": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            if (!params.team_id) {
              return ok({ error: "Missing required param: team_id" });
            }
            const team = agentSpecializationProfileEngine.getTeam(params.team_id);
            return ok(team ?? { error: "Team not found" });
          }

          case "profile_stats": {
            const { agentSpecializationProfileEngine } = await import("../../engines/AgentSpecializationProfileEngine.js");
            const stats = agentSpecializationProfileEngine.getStats();
            return ok(stats);
          }

          // =================================================================
          // CHAIN-OF-THOUGHT REASONING (LLM-INTEL)
          // =================================================================

          case "cot_reason": {
            const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
            if (!params.problem || !params.goal) {
              return ok({ error: "Missing required params: problem, goal" });
            }
            const result = ChainOfThoughtEngine.reason({
              problem: params.problem,
              goal: params.goal,
              known_facts: params.known_facts || [],
              constraints: params.constraints || [],
              context: params.context || {},
              max_steps: params.max_steps ?? 10,
              confidence_threshold: params.confidence_threshold ?? 0.7,
            });
            return ok({
              steps: result.steps.length,
              confidence: result.current_confidence,
              final_answer: result.final_answer,
              dead_ends: result.dead_ends.length,
            });
          }

          case "cot_adversarial": {
            const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
            if (!params.claim) {
              return ok({ error: "Missing required param: claim" });
            }
            const result = ChainOfThoughtEngine.adversarialChallenge(
              params.claim,
              params.context || {}
            );
            return ok(result);
          }

          case "cot_tree_search": {
            const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
            if (!params.problem || !params.goal) {
              return ok({ error: "Missing required params: problem, goal" });
            }
            const result = ChainOfThoughtEngine.treeOfThought({
              problem: params.problem,
              goal: params.goal,
              known_facts: params.known_facts || [],
              constraints: params.constraints || [],
              context: params.context || {},
              max_steps: params.max_steps ?? 10,
              confidence_threshold: params.confidence_threshold ?? 0.7,
            }, params.beam_width ?? 3, params.max_depth ?? 5);
            return ok({
              paths_explored: result.paths_explored,
              best_confidence: result.best_path.current_confidence,
              best_steps: result.best_path.steps.length,
              final_answer: result.best_path.final_answer,
            });
          }

          case "cot_stats": {
            const { ChainOfThoughtEngine } = await import("../../engines/ChainOfThoughtEngine.js");
            return ok({ engine: "ChainOfThoughtEngine", capabilities: [
              "step-by-step reasoning", "adversarial challenge", "tree-of-thought beam search",
              "manufacturing heuristics", "confidence tracking", "dead-end detection"
            ]});
          }

          // =================================================================
          // UNCERTAINTY PROPAGATION (LLM-INTEL)
          // =================================================================

          case "uncertainty_analytical": {
            const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
            if (!params.inputs || !params.formula) {
              return ok({ error: "Missing required params: inputs, formula" });
            }
            // Parse formula string to function
            const formulaFn = new Function("inp", `return ${params.formula}`);
            const result = UncertaintyPropagationEngine.propagateAnalytical(
              params.inputs,
              formulaFn as any
            );
            return ok(result);
          }

          case "uncertainty_monte_carlo": {
            const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
            if (!params.inputs || !params.formula) {
              return ok({ error: "Missing required params: inputs, formula" });
            }
            const formulaFn = new Function("inp", `return ${params.formula}`);
            const result = UncertaintyPropagationEngine.propagateMonteCarlo(
              params.inputs,
              formulaFn as any,
              params.samples ?? 10000
            );
            return ok({
              mean: result.mean,
              std_dev: result.standard_deviation,
              ci_95: result.confidence_interval_95,
              percentiles: result.percentiles,
            });
          }

          case "uncertainty_sobol": {
            const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
            if (!params.inputs || !params.formula) {
              return ok({ error: "Missing required params: inputs, formula" });
            }
            const formulaFn = new Function("inp", `return ${params.formula}`);
            const result = UncertaintyPropagationEngine.propagateMonteCarlo(
              params.inputs,
              formulaFn as any,
              params.samples ?? 10000,
              true  // compute_sobol
            );
            return ok({
              mean: result.mean,
              sobol_indices: result.sobol_indices,
            });
          }

          case "uncertainty_stats": {
            const { UncertaintyPropagationEngine } = await import("../../engines/UncertaintyPropagationEngine.js");
            return ok({ engine: "UncertaintyPropagationEngine", capabilities: [
              "GUM-compliant analytical propagation", "Monte Carlo simulation",
              "Sobol sensitivity indices", "correlation handling", "multiple distributions"
            ]});
          }

          // =================================================================
          // LEARNING ADAPTATION (LLM-INTEL)
          // =================================================================

          case "learning_record": {
            const { LearningAdaptationEngine } = await import("../../engines/LearningAdaptationEngine.js");
            if (!params.prediction || !params.outcome) {
              return ok({ error: "Missing required params: prediction, outcome" });
            }
            const result = LearningAdaptationEngine.learn(params.prediction, params.outcome);
            return ok(result);
          }

          case "learning_calibrate": {
            const { LearningAdaptationEngine } = await import("../../engines/LearningAdaptationEngine.js");
            if (!params.category) {
              return ok({ error: "Missing required param: category" });
            }
            const result = LearningAdaptationEngine.calibrateModel(params.category);
            return ok(result);
          }

          case "learning_patterns": {
            const { LearningAdaptationEngine } = await import("../../engines/LearningAdaptationEngine.js");
            if (!params.category) {
              return ok({ error: "Missing required param: category" });
            }
            const patterns = LearningAdaptationEngine.extractPatterns(params.category);
            return ok({ pattern_count: patterns.length, patterns });
          }

          case "learning_stats": {
            const { LearningAdaptationEngine } = await import("../../engines/LearningAdaptationEngine.js");
            const stats = LearningAdaptationEngine.getStats();
            return ok(stats);
          }

          // =================================================================
          // DECISION REASONING (LLM-INTEL)
          // =================================================================

          case "decision_analyze": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.problem) {
              return ok({ error: "Missing required param: problem (DecisionProblem)" });
            }
            const result = DecisionReasoningEngine.decide(params.problem);
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name, score: result.recommended.weighted_score },
              alternatives: result.alternatives.slice(0, 3).map(a => ({ id: a.id, name: a.name, score: a.weighted_score })),
              pareto_optimal_count: result.pareto_optimal.length,
              confidence: result.confidence,
              reasoning: result.reasoning.explanation,
            });
          }

          case "decision_pareto": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.problem) {
              return ok({ error: "Missing required param: problem (DecisionProblem)" });
            }
            const result = DecisionReasoningEngine.decide(params.problem);
            return ok({
              pareto_optimal: result.pareto_optimal.map(p => ({
                id: p.id, name: p.name, scores: p.scores, weighted_score: p.weighted_score
              })),
              tradeoffs: result.reasoning.tradeoffs_considered,
            });
          }

          case "decision_machine_select": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.operation || !params.material || !params.candidates) {
              return ok({ error: "Missing required params: operation, material, candidates" });
            }
            const result = DecisionReasoningEngine.selectMachine(
              params.operation,
              params.material,
              params.candidates,
              params.preferences
            );
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name },
              reasoning: result.reasoning.explanation,
              confidence: result.confidence,
            });
          }

          case "decision_tool_select": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.operation || !params.material || !params.candidates) {
              return ok({ error: "Missing required params: operation, material, candidates" });
            }
            const result = DecisionReasoningEngine.selectTool(
              params.operation,
              params.material,
              params.candidates,
              params.preferences
            );
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name },
              reasoning: result.reasoning.explanation,
              confidence: result.confidence,
            });
          }

          case "decision_holder_select": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.tool || !params.machine || !params.reach_required || !params.holders) {
              return ok({ error: "Missing required params: tool, machine, reach_required, holders" });
            }
            const result = DecisionReasoningEngine.selectHolder(
              params.tool,
              params.machine,
              params.reach_required,
              params.rigidity_priority ?? 0.7,
              params.holders
            );
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name },
              reasoning: result.reasoning.explanation,
              confidence: result.confidence,
            });
          }

          case "decision_fixture_select": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.part_geometry || !params.operations || !params.cutting_forces || !params.fixtures) {
              return ok({ error: "Missing required params: part_geometry, operations, cutting_forces, fixtures" });
            }
            const result = DecisionReasoningEngine.selectFixture(
              params.part_geometry,
              params.operations,
              params.cutting_forces,
              params.fixtures
            );
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name },
              reasoning: result.reasoning.explanation,
              confidence: result.confidence,
            });
          }

          case "decision_material_select": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            if (!params.application || !params.candidates) {
              return ok({ error: "Missing required params: application, candidates" });
            }
            const result = DecisionReasoningEngine.selectMaterial(
              params.application,
              params.candidates,
              params.preferences
            );
            return ok({
              recommended: { id: result.recommended.id, name: result.recommended.name },
              reasoning: result.reasoning.explanation,
              confidence: result.confidence,
            });
          }

          case "decision_stats": {
            const { DecisionReasoningEngine } = await import("../../engines/DecisionReasoningEngine.js");
            return ok({ engine: "DecisionReasoningEngine", capabilities: [
              "multi-criteria decision analysis", "Pareto optimization", "weighted scoring",
              "machine selection", "tool selection", "material selection", "sensitivity analysis"
            ]});
          }

          // =================================================================
          // ROADMAP INTELLIGENCE (LLM-INTEL)
          // =================================================================

          case "roadmap_assess_complexity": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestone) {
              return ok({ error: "Missing required param: milestone" });
            }
            const result = RoadmapIntelligenceEngine.assessComplexity(params.milestone);
            return ok({
              complexity: result.overall_complexity,
              score: result.complexity_score,
              confidence: result.confidence,
              effort: result.estimated_effort_hours,
              risks: result.risks.length,
              recommendations: result.recommendations,
            });
          }

          case "roadmap_optimize": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestones || !Array.isArray(params.milestones)) {
              return ok({ error: "Missing required param: milestones (array)" });
            }
            const result = RoadmapIntelligenceEngine.optimizeRoadmap(params.milestones);
            return ok({
              optimized_order: result.optimized_order.slice(0, 10).map(p => ({
                id: p.milestone_id, rank: p.rank, score: p.score
              })),
              critical_path: result.critical_path,
              parallel_groups: result.parallelizable_groups,
              total_effort: result.total_estimated_effort,
              bottlenecks: result.bottlenecks.length,
              recommendations: result.recommendations,
            });
          }

          case "roadmap_predict_effort": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestone) {
              return ok({ error: "Missing required param: milestone" });
            }
            const result = RoadmapIntelligenceEngine.predictEffort(
              params.milestone,
              params.historical_data
            );
            return ok({
              predicted_hours: result.predicted_hours,
              uncertainty: result.uncertainty_hours,
              ci_95: result.confidence_interval_95,
              basis: result.basis,
              adjustments: result.adjustment_factors,
            });
          }

          case "roadmap_record_outcome": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestone_id || params.predicted_hours === undefined || params.actual_hours === undefined) {
              return ok({ error: "Missing required params: milestone_id, predicted_hours, actual_hours" });
            }
            RoadmapIntelligenceEngine.recordOutcome(
              params.milestone_id,
              params.predicted_hours,
              params.actual_hours,
              params.predicted_complexity || "moderate",
              params.actual_complexity || "moderate",
              params.lessons_learned || []
            );
            return ok({ recorded: true, milestone_id: params.milestone_id });
          }

          case "roadmap_health": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestones || !Array.isArray(params.milestones)) {
              return ok({ error: "Missing required param: milestones (array)" });
            }
            const result = RoadmapIntelligenceEngine.assessRoadmapHealth(
              params.milestones,
              params.historical_data
            );
            return ok(result);
          }

          case "roadmap_build_vs_integrate": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.feature_name || !params.build_hours || !params.library_options) {
              return ok({ error: "Missing required params: feature_name, build_hours, library_options" });
            }
            const result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(
              params.feature_name,
              params.feature_description || "",
              params.build_hours,
              params.maintenance_hours || 0,
              params.library_options
            );
            return ok({
              recommendation: result.recommendation,
              confidence: result.confidence,
              reasoning: result.reasoning,
              build_hours: result.build_analysis.estimated_hours,
              library_count: result.integrate_analysis.library_options.length,
            });
          }

          // =================================================================
          // PROACTIVE INTELLIGENCE (LLM-INTEL)
          // =================================================================

          case "proactive_analyze": {
            const { proactiveIntelligenceEngine } = await import("../../engines/ProactiveIntelligenceEngine.js");
            const result = proactiveIntelligenceEngine.analyze({
              current_task: params.current_task,
              material: params.material,
              iso_group: params.iso_group,
              machine_id: params.machine_id,
              operation: params.operation,
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm,
              part_family: params.part_family,
              recent_actions: params.recent_actions,
              cutting_params: params.cutting_params,
              shop_id: params.shop_id,
              time_of_day: params.time_of_day,
              user_role: params.user_role,
            });
            return ok({
              suggestions: result.suggestions.slice(0, 5).map(s => ({
                type: s.type,
                priority: s.priority,
                title: s.title,
                description: s.description,
                confidence: s.confidence,
              })),
              anticipated_needs: result.anticipated_needs.slice(0, 3),
              risk_level: result.risk_level,
              recommended_actions: result.recommended_actions.slice(0, 3),
              context_summary: result.context_summary,
            });
          }

          case "proactive_anticipate": {
            const { proactiveIntelligenceEngine } = await import("../../engines/ProactiveIntelligenceEngine.js");
            const result = proactiveIntelligenceEngine.analyze({
              current_task: params.current_task,
              material: params.material,
              operation: params.operation,
              recent_actions: params.recent_actions,
            });
            return ok({
              anticipated_needs: result.anticipated_needs,
              timing_breakdown: {
                immediate: result.anticipated_needs.filter(n => n.timing === "immediate"),
                soon: result.anticipated_needs.filter(n => n.timing === "soon"),
                later: result.anticipated_needs.filter(n => n.timing === "later"),
              },
            });
          }

          case "proactive_patterns": {
            const { proactiveIntelligenceEngine } = await import("../../engines/ProactiveIntelligenceEngine.js");
            const result = proactiveIntelligenceEngine.analyze({
              current_task: params.current_task,
              material: params.material,
              operation: params.operation,
              recent_actions: params.recent_actions || [],
              shop_id: params.shop_id,
            });
            return ok({
              pattern_insights: result.pattern_insights,
              context_summary: result.context_summary,
            });
          }

          case "proactive_optimize": {
            const { proactiveIntelligenceEngine } = await import("../../engines/ProactiveIntelligenceEngine.js");
            const result = proactiveIntelligenceEngine.analyze({
              material: params.material,
              operation: params.operation,
              tool_type: params.tool_type,
              cutting_params: params.cutting_params,
              machine_id: params.machine_id,
            });
            return ok({
              optimizations: result.optimizations,
              optimization_count: result.optimizations.length,
              top_optimization: result.optimizations[0],
            });
          }

          // === Customer Knowledge Profiles (TK-MS11) ===
          case "customer_profile_create": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id || !params.name) {
              return ok({ error: "Missing required params: shop_id, name" });
            }
            const profile = customerKnowledgeEngine.createProfile(params.shop_id, {
              name: params.name,
              industry: params.industry,
              expertise_areas: params.expertise_areas || [],
              primary_machines: params.primary_machines || [],
              specializations: params.specializations || [],
              customer_base: params.customer_base || [],
            });
            return ok({
              success: true,
              profile: {
                shop_id: profile.shop_id,
                name: profile.name,
                industry: profile.industry,
                expertise_count: profile.expertise_areas.length,
                machines_count: profile.primary_machines.length,
              },
            });
          }

          case "customer_profile_get": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id) {
              return ok({ error: "Missing required param: shop_id" });
            }
            const profile = customerKnowledgeEngine.getProfile(params.shop_id);
            if (!profile) {
              return ok({ error: `Profile not found: ${params.shop_id}` });
            }
            return ok({ success: true, profile });
          }

          case "customer_profile_update": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id) {
              return ok({ error: "Missing required param: shop_id" });
            }
            customerKnowledgeEngine.updateProfile(params.shop_id, {
              name: params.name,
              industry: params.industry,
              expertise_areas: params.expertise_areas,
              primary_machines: params.primary_machines,
              specializations: params.specializations,
            });
            return ok({ success: true, updated: params.shop_id });
          }

          case "customer_modifier_learn": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id) {
              return ok({ error: "Missing required param: shop_id" });
            }
            const modifier = customerKnowledgeEngine.learnShopModifier(
              params.shop_id,
              {
                material: params.material,
                operation: params.operation,
                machine: params.machine,
                speed_used: params.speed_used,
                feed_used: params.feed_used,
              },
              {
                success: params.success ?? true,
                quality: params.quality,
                surface_finish: params.surface_finish,
                speed_factor: params.speed_factor,
                feed_factor: params.feed_factor,
              }
            );
            return ok({
              success: true,
              modifier: {
                id: modifier.id,
                type: modifier.modifier_type,
                value: modifier.value,
                confidence: modifier.confidence,
              },
            });
          }

          case "customer_modifier_apply": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id || !params.tips) {
              return ok({ error: "Missing required params: shop_id, tips" });
            }
            const modified = customerKnowledgeEngine.applyShopModifiers(params.tips, params.shop_id);
            return ok({
              success: true,
              tips: modified.map(t => ({
                id: t.id,
                original_confidence: t.original_confidence,
                boosted_confidence: t.boosted_confidence,
                shop_modified: t.shop_modified,
              })),
            });
          }

          case "customer_job_record": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id || !params.job_id || !params.tips_used) {
              return ok({ error: "Missing required params: shop_id, job_id, tips_used" });
            }
            customerKnowledgeEngine.recordJobOutcome(
              params.shop_id,
              params.job_id,
              params.tips_used,
              {
                success: params.success ?? true,
                material: params.material,
                operation: params.operation,
                machine: params.machine,
                cycle_time_reduction: params.cycle_time_reduction,
              }
            );
            return ok({ success: true, recorded: params.job_id });
          }

          case "customer_history_analyze": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id) {
              return ok({ error: "Missing required param: shop_id" });
            }
            const patterns = customerKnowledgeEngine.analyzeJobHistory(
              params.shop_id,
              params.days ?? 30
            );
            return ok({
              success: true,
              pattern_count: patterns.length,
              patterns: patterns.slice(0, 10).map(p => ({
                type: p.pattern_type,
                description: p.description,
                confidence: p.confidence,
                supporting_jobs: p.supporting_jobs,
              })),
            });
          }

          case "customer_search_profile": {
            const { customerKnowledgeEngine } = await import("../../engines/CustomerKnowledgeEngine.js");
            if (!params.shop_id || !params.query) {
              return ok({ error: "Missing required params: shop_id, query" });
            }
            const results = customerKnowledgeEngine.searchWithProfile(
              params.query,
              params.shop_id,
              { limit: params.limit ?? 10 }
            );
            return ok({
              success: true,
              result_count: results.length,
              results: results.map(r => ({
                tip_id: r.tip.id,
                title: r.tip.title,
                profile_relevance: r.profile_relevance,
                expertise_match: r.expertise_match,
              })),
            });
          }

          // === Lathe CAM Intelligence (LLM-INTEL-7) ===
          case "lathe_cam_template": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.part) {
              return ok({ error: "Missing required param: part (LathePartGeometry)" });
            }
            const result = latheCAMIntelligenceEngine.recommendParametricTemplate(params.part);
            return ok({
              success: true,
              use_template: result.use_template,
              template_type: result.template_type,
              variable_parameters: result.variable_parameters,
              template_structure: result.template_structure,
              reasoning: result.reasoning,
              time_savings: result.time_savings,
            });
          }

          case "lathe_cam_toolpath": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.feature || !params.part || !params.machine) {
              return ok({ error: "Missing required params: feature, part, machine" });
            }
            const result = latheCAMIntelligenceEngine.selectToolpath(
              params.feature,
              params.part,
              params.machine,
              params.options
            );
            return ok({
              success: true,
              strategy: result.strategy,
              reasoning: result.reasoning,
              confidence: result.confidence,
              alternatives: result.alternatives,
              parameters: result.parameters,
              warnings: result.warnings,
              interrupted_cut: result.interrupted_cut,
            });
          }

          case "lathe_cam_sequence": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.part || !params.machine || !params.toolpath_selections) {
              return ok({ error: "Missing required params: part, machine, toolpath_selections" });
            }
            // Convert array to Map if needed
            const toolpathMap = params.toolpath_selections instanceof Map
              ? params.toolpath_selections
              : new Map(Object.entries(params.toolpath_selections));
            const result = latheCAMIntelligenceEngine.sequenceOperations(
              params.part,
              params.machine,
              toolpathMap
            );
            return ok({
              success: true,
              operations: result.operations,
              tool_changes: result.tool_changes,
              total_cycle_time_sec: result.total_cycle_time_sec,
              reasoning: result.reasoning,
              optimizations: result.optimizations,
              suggestions: result.suggestions,
            });
          }

          case "lathe_cam_workholding": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = latheCAMIntelligenceEngine.recommendWorkholding(
              params.part,
              params.machine,
              params.max_cutting_force_n
            );
            return ok({
              success: true,
              primary: result.primary,
              secondary: result.secondary,
              safety: result.safety,
              reasoning: result.reasoning,
            });
          }

          case "lathe_cam_mrr_optimize": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = latheCAMIntelligenceEngine.optimizeMRRCost(
              params.part,
              params.machine,
              params.batch_size ?? 50,
              params.options
            );
            return ok({
              success: true,
              conservative: result.conservative,
              optimized: result.optimized,
              aggressive: result.aggressive,
              recommendation: result.recommendation,
              batch_breakpoints: result.batch_breakpoints,
            });
          }

          case "lathe_cam_analyze": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = latheCAMIntelligenceEngine.analyzeComplete(
              params.part,
              params.machine,
              params.options
            );
            return ok({
              success: true,
              template: result.template,
              toolpaths: result.toolpaths,
              sequence: result.sequence,
              workholding: result.workholding,
              mrr_cost: result.mrr_cost,
              summary: result.summary,
              prediction_id: result.prediction_id,
            });
          }

          // === Lathe Deep Reasoning (LLM-INTEL-8) ===
          case "lathe_deep_process_plan": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part (LathePartDefinition), machine (LatheMachineCapability)" });
            }
            const result = latheDeepReasoningEngine.generateProcessPlan(
              params.part,
              params.machine,
              params.options
            );
            return ok({
              success: true,
              plan_id: result.plan_id,
              setups: result.setups,
              total_cycle_time_sec: result.total_cycle_time_sec,
              risk_factors: result.risk_factors,
              quality_predictions: result.quality_predictions,
              recommendations: result.recommendations,
              reasoning_chain: {
                chain_id: result.reasoning_chain.chain_id,
                steps: result.reasoning_chain.steps.length,
                conclusion: result.reasoning_chain.conclusion,
                confidence: result.reasoning_chain.overall_confidence,
              },
            });
          }

          case "lathe_deep_optimize_setups": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = latheDeepReasoningEngine.optimizeSetups(
              params.part,
              params.machine,
              params.constraints
            );
            return ok({
              success: true,
              optimal_setup_count: result.optimal_setup_count,
              setups: result.setups,
              alternative_strategies: result.alternative_strategies,
              accuracy_vs_efficiency: result.accuracy_vs_efficiency,
              reasoning_chain: {
                conclusion: result.reasoning_chain.conclusion,
                confidence: result.reasoning_chain.overall_confidence,
              },
            });
          }

          case "lathe_deep_chatter": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            if (!params.part || !params.machine || !params.operation) {
              return ok({ error: "Missing required params: part, machine, operation" });
            }
            const result = latheDeepReasoningEngine.predictChatter(
              params.part,
              params.machine,
              params.operation
            );
            return ok({
              success: true,
              chatter_risk: result.chatter_risk,
              recommended_rpm: result.recommended_rpm,
              stable_rpm_ranges: result.stable_rpm_ranges,
              critical_rpm_ranges: result.critical_rpm_ranges,
              contributing_factors: result.contributing_factors,
              tool_recommendations: result.tool_recommendations,
              reasoning_chain: {
                conclusion: result.reasoning_chain.conclusion,
                confidence: result.reasoning_chain.overall_confidence,
              },
            });
          }

          case "lathe_deep_deflection": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            if (!params.part || !params.machine || params.cutting_force_n === undefined) {
              return ok({ error: "Missing required params: part, machine, cutting_force_n" });
            }
            const result = latheDeepReasoningEngine.predictDeflection(
              params.part,
              params.machine,
              params.cutting_force_n,
              params.support_config ?? { chuck_grip_length_mm: 25, tailstock_engaged: false }
            );
            return ok({
              success: true,
              max_deflection_mm: result.max_deflection_mm,
              deflection_acceptable: result.deflection_acceptable,
              deflection_by_location: result.deflection_by_location,
              contributing_factors: result.contributing_factors,
              mitigation_options: result.mitigation_options,
              reasoning_chain: {
                conclusion: result.reasoning_chain.conclusion,
                confidence: result.reasoning_chain.overall_confidence,
              },
            });
          }

          case "lathe_deep_fmea": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = latheDeepReasoningEngine.analyzeFailureModes(
              params.part,
              params.machine,
              params.process_context
            );
            return ok({
              success: true,
              overall_risk_level: result.overall_risk_level,
              top_risks: result.top_risks,
              failure_modes: result.failure_modes.slice(0, 5), // Top 5 by RPN
              recommended_inspections: result.recommended_inspections,
              reasoning_chain: {
                conclusion: result.reasoning_chain.conclusion,
                confidence: result.reasoning_chain.overall_confidence,
              },
            });
          }

          // ============================================================================
          // LATHE PREDICTIVE INTELLIGENCE (LLM-INTEL-9)
          // ============================================================================

          case "lathe_predict_tool_wear": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.conditions || !params.tool_state) {
              return ok({ error: "Missing required params: conditions, tool_state" });
            }
            const result = lathePredictiveIntelligenceEngine.predictToolWear(
              params.conditions,
              params.tool_state,
              params.cycle_time_sec || 60
            );
            return ok({
              success: true,
              flank_wear_vb_mm: result.flank_wear_vb.value,
              remaining_life_min: result.remaining_life_min.value,
              remaining_parts: result.remaining_parts.value,
              recommended_action: result.recommended_action,
              failure_risk: result.failure_risk,
              wear_rate_mm_per_min: result.wear_rate_mm_per_min,
              confidence: result.flank_wear_vb.confidence,
              factors_affecting: result.factors_affecting,
            });
          }

          case "lathe_predict_surface_finish": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.conditions) {
              return ok({ error: "Missing required param: conditions" });
            }
            const result = lathePredictiveIntelligenceEngine.predictSurfaceFinish(
              params.conditions,
              params.tool_wear_vb_mm
            );
            return ok({
              success: true,
              ra_um: result.ra_um.value,
              ra_confidence: result.ra_um.confidence,
              ra_range: { lower: result.ra_um.lower_bound, upper: result.ra_um.upper_bound },
              rz_um: result.rz_um.value,
              theoretical_ra: result.theoretical_ra,
              actual_multiplier: result.actual_multiplier,
              factors_affecting: result.factors_affecting,
              recommendations: result.recommendations,
            });
          }

          case "lathe_predict_thermal": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.conditions) {
              return ok({ error: "Missing required param: conditions" });
            }
            const result = lathePredictiveIntelligenceEngine.predictThermalGrowth(
              params.conditions,
              params.running_time_min || 0,
              params.spindle_speed_rpm || 3000,
              params.part_length_mm || 100
            );
            return ok({
              success: true,
              spindle_growth_mm: result.spindle_growth_mm.value,
              part_growth_mm: result.part_growth_mm.value,
              total_dimensional_shift_mm: result.total_dimensional_shift_mm,
              stabilization_time_min: result.stabilization_time_min,
              compensation_recommended: result.compensation_recommended,
              confidence: result.spindle_growth_mm.confidence,
              recommendations: result.recommendations,
            });
          }

          case "lathe_predict_cycle_time": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.operations) {
              return ok({ error: "Missing required param: operations" });
            }
            const result = lathePredictiveIntelligenceEngine.predictCycleTime(
              params.operations,
              params.machine_config || {}
            );
            return ok({
              success: true,
              total_cycle_time_sec: result.total_cycle_time_sec.value,
              cycle_time_range: {
                lower: result.total_cycle_time_sec.lower_bound,
                upper: result.total_cycle_time_sec.upper_bound,
              },
              cutting_time_sec: result.cutting_time_sec,
              rapid_time_sec: result.rapid_time_sec,
              tool_change_time_sec: result.tool_change_time_sec,
              load_unload_time_sec: result.load_unload_time_sec,
              breakdown: result.breakdown,
              bottleneck_operations: result.bottleneck_operations,
              optimization_potential_pct: result.optimization_potential_pct,
              confidence: result.total_cycle_time_sec.confidence,
            });
          }

          case "lathe_predict_quality": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.conditions || !params.tolerances) {
              return ok({ error: "Missing required params: conditions, tolerances" });
            }
            const result = lathePredictiveIntelligenceEngine.predictQualityOutcome(
              params.conditions,
              params.tolerances,
              params.machine_accuracy_mm || 0.005,
              params.tool_wear_vb_mm
            );
            return ok({
              success: true,
              pass_probability: result.pass_probability,
              scrap_probability: result.scrap_probability,
              rework_probability: result.rework_probability,
              cpk_estimate: result.cpk_estimate.value,
              diameter_error_mm: result.diameter_error_mm.value,
              roundness_error_mm: result.roundness_error_mm.value,
              surface_finish_ra: result.surface_finish_ra.value,
              critical_dimensions: result.critical_dimensions,
              confidence: result.cpk_estimate.confidence,
            });
          }

          case "lathe_detect_anomalies": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            if (!params.current_readings || !params.baseline) {
              return ok({ error: "Missing required params: current_readings, baseline" });
            }
            const result = lathePredictiveIntelligenceEngine.detectAnomalies(
              params.current_readings,
              params.baseline,
              params.sigma_threshold || 3
            );
            return ok({
              success: true,
              anomalies_detected: result.anomalies_detected,
              anomaly_count: result.anomaly_count,
              overall_health_score: result.overall_health_score,
              anomalies: result.anomalies.slice(0, 10), // Top 10
              recommended_actions: result.recommended_actions,
              trend_analysis: result.trend_analysis,
            });
          }

          // ============================================================================
          // LATHE TROUBLESHOOTING INTELLIGENCE (LLM-INTEL-10)
          // ============================================================================

          case "lathe_analyze_tool_overhang": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.tool_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: tool_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.analyzeToolOverhang(
              params.tool_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              ld_ratio: result.ld_ratio,
              risk_level: result.risk_level,
              max_safe_overhang_mm: result.max_safe_overhang_mm,
              deflection_estimate_mm: result.deflection_estimate_mm,
              recommendations: result.recommendations,
              parameter_adjustments: result.parameter_adjustments,
              warnings: result.warnings,
            });
          }

          case "lathe_analyze_workpiece_overhang": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.workpiece_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: workpiece_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.analyzeWorkpieceOverhang(
              params.workpiece_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              unsupported_length_mm: result.unsupported_length_mm,
              ld_ratio: result.ld_ratio,
              risk_level: result.risk_level,
              max_safe_unsupported_mm: result.max_safe_unsupported_mm,
              deflection_at_tip_mm: result.deflection_at_tip_mm,
              support_requirements: result.support_requirements,
              chuck_pressure_recommendation: result.chuck_pressure_recommendation,
              warnings: result.warnings,
            });
          }

          case "lathe_diagnose_chatter": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.symptoms || !params.tool_setup || !params.workpiece_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: symptoms, tool_setup, workpiece_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.diagnoseChatter(
              params.symptoms,
              params.tool_setup,
              params.workpiece_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              likely_type: result.likely_type,
              confidence: result.confidence,
              severity: result.severity,
              root_causes: result.root_causes.slice(0, 5),
              contributing_factors: result.contributing_factors,
              speed_recommendations: result.speed_recommendations,
              parameter_fixes: result.parameter_fixes,
              tooling_changes: result.tooling_changes,
              setup_changes: result.setup_changes,
            });
          }

          case "lathe_diagnose_error": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.error_type || !params.tool_setup || !params.workpiece_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: error_type, tool_setup, workpiece_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.diagnoseMachiningError(
              params.error_type,
              params.measurements || {},
              params.tool_setup,
              params.workpiece_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              error_type: result.error_type,
              likely_causes: result.likely_causes,
              measurement_suggestions: result.measurement_suggestions,
              corrective_actions: result.corrective_actions,
              prevention_measures: result.prevention_measures,
              related_errors: result.related_errors,
            });
          }

          case "lathe_assess_breakage_risk": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.tool_setup || !params.workpiece_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: tool_setup, workpiece_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.assessToolBreakageRisk(
              params.tool_setup,
              params.workpiece_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              overall_risk: result.overall_risk,
              risk_score: result.risk_score,
              risk_factors: result.risk_factors,
              warning_signs: result.warning_signs,
              preventive_actions: result.preventive_actions,
              parameter_limits: result.parameter_limits,
              monitoring_recommendations: result.monitoring_recommendations,
            });
          }

          case "lathe_validate_setup": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            if (!params.tool_setup || !params.workpiece_setup || !params.cutting_params) {
              return ok({ error: "Missing required params: tool_setup, workpiece_setup, cutting_params" });
            }
            const result = latheTroubleshootingIntelligenceEngine.validateSetup(
              params.tool_setup,
              params.workpiece_setup,
              params.cutting_params
            );
            return ok({
              success: true,
              valid: result.valid,
              score: result.score,
              risk_assessment: result.risk_assessment,
              issues_found: result.issues_found,
              checklist_items: result.checklist_items,
              recommendations: result.recommendations,
            });
          }

          // ============================================================================
          // LATHE EXPERT ADVISOR (LLM-INTEL-11)
          // ============================================================================

          case "lathe_material_strategy": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.material_category) {
              return ok({ error: "Missing required param: material_category" });
            }
            const result = latheExpertAdvisorEngine.getMaterialStrategy(params.material_category);
            return ok({
              success: true,
              material: result.material_category,
              iso_group: result.iso_group,
              cutting_speed_range: result.cutting_speed_range,
              feed_range: result.feed_range,
              doc_limit: result.doc_limit,
              recommended_inserts: result.recommended_inserts,
              coolant_strategy: result.coolant_strategy,
              key_challenges: result.key_challenges,
              expert_tips: result.expert_tips,
              common_mistakes: result.common_mistakes,
            });
          }

          case "lathe_geometry_advice": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.geometry_type) {
              return ok({ error: "Missing required param: geometry_type" });
            }
            const result = latheExpertAdvisorEngine.getGeometryAdvice(params.geometry_type);
            return ok({
              success: true,
              geometry: result.geometry_type,
              critical_factors: result.critical_factors,
              setup_requirements: result.setup_requirements,
              parameter_guidelines: result.parameter_guidelines,
              tooling_recommendations: result.tooling_recommendations,
              process_sequence: result.process_sequence,
              quality_risks: result.quality_risks,
              expert_tips: result.expert_tips,
            });
          }

          case "lathe_operation_expertise": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.operation) {
              return ok({ error: "Missing required param: operation" });
            }
            const result = latheExpertAdvisorEngine.getOperationExpertise(params.operation);
            return ok({
              success: true,
              operation: result.operation,
              critical_success_factors: result.critical_success_factors,
              setup_checklist: result.setup_checklist,
              parameter_sweet_spots: result.parameter_sweet_spots,
              common_pitfalls: result.common_pitfalls.slice(0, 5),
              troubleshooting_guide: result.troubleshooting_guide.slice(0, 5),
              pro_tips: result.pro_tips,
            });
          }

          case "lathe_select_tooling": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.operation || !params.material) {
              return ok({ error: "Missing required params: operation, material" });
            }
            const result = latheExpertAdvisorEngine.selectTooling(
              params.operation,
              params.material,
              params.requirements
            );
            return ok({
              success: true,
              operation: result.operation,
              material: result.material,
              recommended_tools: result.recommended_tools,
              holder_recommendations: result.holder_recommendations,
              insert_considerations: result.insert_considerations,
              alternatives: result.alternatives,
            });
          }

          case "lathe_identify_pitfalls": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.operation) {
              return ok({ error: "Missing required param: operation" });
            }
            const result = latheExpertAdvisorEngine.identifyPitfalls(
              params.operation,
              params.material
            );
            return ok({
              success: true,
              operation: params.operation,
              material: params.material,
              pitfalls: result.slice(0, 10),
            });
          }

          case "lathe_optimize_process": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.current_params) {
              return ok({ error: "Missing required param: current_params" });
            }
            const result = latheExpertAdvisorEngine.optimizeProcess(
              params.current_params,
              params.goals || {}
            );
            return ok({
              success: true,
              current_issues: result.current_issues,
              optimization_opportunities: result.optimization_opportunities,
              parameter_recommendations: result.parameter_recommendations,
              cycle_time_improvements: result.cycle_time_improvements,
              quality_improvements: result.quality_improvements,
              cost_reduction_ideas: result.cost_reduction_ideas,
            });
          }

          case "lathe_scenario_advice": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            if (!params.material || !params.operation) {
              return ok({ error: "Missing required params: material, operation" });
            }
            const result = latheExpertAdvisorEngine.getScenarioAdvice(
              params.material,
              params.operation,
              params.geometry,
              params.challenges
            );
            return ok({
              success: true,
              material: result.material_strategy.material_category,
              operation: result.operation_expertise.operation,
              geometry: result.geometry_advice?.geometry_type,
              combined_recommendations: result.combined_recommendations.slice(0, 15),
              priority_warnings: result.priority_warnings.slice(0, 10),
              iso_group: result.material_strategy.iso_group,
              coolant_strategy: result.material_strategy.coolant_strategy,
            });
          }

          // ===========================================================
          // LLM-INTEL-12: Lathe Machine Intelligence
          // ===========================================================
          case "lathe_machine_profile": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.machine_type) {
              return ok({ error: "Missing required param: machine_type" });
            }
            const result = latheMachineIntelligenceEngine.getMachineProfile(params.machine_type);
            return ok({
              success: true,
              machine_type: result.machine_type,
              description: result.description,
              axis_config: result.axis_config,
              max_diameter_mm: result.max_turning_diameter_mm,
              max_length_mm: result.max_turning_length_mm,
              max_bar_mm: result.max_bar_capacity_mm,
              spindle_power_kw: result.spindle_power_kw,
              max_rpm: result.max_rpm,
              precision_mm: result.positioning_accuracy_mm,
              capable_operations: result.capable_operations,
              best_for: result.best_suited_for.slice(0, 5),
              limitations: result.limitations.slice(0, 5),
              relative_cost: result.relative_cost,
              cycle_time_factor: result.typical_cycle_time_factor,
              setup_complexity: result.setup_complexity,
            });
          }

          case "lathe_machine_select": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.requirements) {
              return ok({ error: "Missing required param: requirements (PartRequirements object)" });
            }
            const result = latheMachineIntelligenceEngine.selectMachineForPart(params.requirements);
            return ok({
              success: true,
              top_machines: result.recommended_machines.slice(0, 5).map(m => ({
                type: m.machine_type,
                score: m.suitability_score,
                strengths: m.strengths.slice(0, 3),
                limitations: m.limitations_for_part.slice(0, 3),
                cost_effectiveness: m.cost_effectiveness,
                cycle_time_factor: m.estimated_cycle_time_factor,
              })),
              reasoning: result.selection_reasoning,
              warnings: result.warnings,
              capability_summary: result.capability_matrix.filter(c => !c.capable).slice(0, 10),
            });
          }

          case "lathe_workholding_strategy": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.machine_type || params.diameter == null || params.length == null) {
              return ok({ error: "Missing required params: machine_type, diameter, length" });
            }
            const result = latheMachineIntelligenceEngine.getWorkholdingStrategy(
              params.machine_type,
              params.diameter,
              params.length,
              params.is_bar_stock ?? false,
              params.wall_thickness
            );
            return ok({
              success: true,
              machine_type: result.machine_type,
              primary_method: result.primary_method,
              secondary_support: result.secondary_support,
              jaw_type: result.jaw_type,
              special_fixtures: result.special_fixtures,
              considerations: result.considerations,
              grip_length_mm: result.grip_length_recommendation_mm,
              max_rpm: result.maximum_rpm_with_workholding,
            });
          }

          case "lathe_tooling_config": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.machine_type || !params.operations) {
              return ok({ error: "Missing required params: machine_type, operations" });
            }
            const result = latheMachineIntelligenceEngine.getToolingConfiguration(
              params.machine_type,
              params.operations
            );
            return ok({
              success: true,
              machine_type: result.machine_type,
              turret_positions: result.turret_positions,
              live_positions: result.live_tool_positions,
              tool_layout: result.recommended_tool_layout,
              tool_change_strategy: result.tool_change_strategy,
              considerations: result.considerations,
            });
          }

          case "lathe_compare_machines": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.machine_types || !params.requirements) {
              return ok({ error: "Missing required params: machine_types, requirements" });
            }
            const result = latheMachineIntelligenceEngine.compareMachines(
              params.machine_types,
              params.requirements
            );
            return ok({
              success: true,
              machines_compared: result.machines,
              criteria: result.comparison_criteria.map(c => ({
                criterion: c.criterion,
                winner: c.winner,
                scores: c.scores,
              })),
              recommendation: result.recommendation,
              trade_offs: result.trade_offs,
            });
          }

          case "lathe_list_machine_types": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            const result = latheMachineIntelligenceEngine.listMachineTypes();
            return ok({
              success: true,
              machine_types: result,
              count: result.length,
            });
          }

          case "lathe_check_operation": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            if (!params.machine_type || !params.operation) {
              return ok({ error: "Missing required params: machine_type, operation" });
            }
            const result = latheMachineIntelligenceEngine.canMachineHandleOperation(
              params.machine_type,
              params.operation
            );
            return ok({
              success: true,
              machine_type: params.machine_type,
              operation: params.operation,
              capable: result.capable,
              notes: result.notes,
            });
          }

          // ===========================================================
          // LLM-INTEL-13: Lathe Deep Learning
          // ===========================================================
          case "lathe_find_similar_jobs": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.material || !params.operation) {
              return ok({ error: "Missing required params: material, operation" });
            }
            const result = latheDeepLearningEngine.findSimilarJobs(
              params.material,
              params.operation,
              params.machine_type,
              params.hardness,
              params.top_n ?? 5
            );
            return ok({
              success: true,
              similar_jobs: result.map(j => ({
                job_id: j.job_id,
                similarity: j.similarity_score,
                matching: j.matching_factors,
                outcome: j.outcome_summary,
                confidence: j.recommendation_confidence,
              })),
              count: result.length,
            });
          }

          case "lathe_process_feedback": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.feedback) {
              return ok({ error: "Missing required param: feedback (LearningFeedback object)" });
            }
            const result = latheDeepLearningEngine.processLearningFeedback(params.feedback);
            return ok({
              success: true,
              learned: result.learned,
              adaptations: result.adaptations,
              new_confidence: result.new_confidence,
            });
          }

          case "lathe_adapt_parameters": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.material || !params.operation || params.speed == null || params.feed == null || params.doc == null) {
              return ok({ error: "Missing required params: material, operation, speed, feed, doc" });
            }
            const result = latheDeepLearningEngine.adaptParameters(
              params.material,
              params.operation,
              params.speed,
              params.feed,
              params.doc
            );
            return ok({
              success: true,
              original: result.original,
              adapted: result.adapted,
              factors: result.adaptation_factors,
              confidence: result.confidence,
              data_points: result.data_points_used,
            });
          }

          case "lathe_synthesize_knowledge": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.topic || !params.subject) {
              return ok({ error: "Missing required params: topic, subject" });
            }
            const result = latheDeepLearningEngine.synthesizeKnowledge(
              params.topic,
              params.subject
            );
            return ok({
              success: true,
              topic: result.topic,
              insights: result.key_insights,
              stats: result.statistical_summary,
              best_practices: result.best_practices,
              common_issues: result.common_issues,
              confidence: result.confidence_level,
            });
          }

          case "lathe_detect_anomaly": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.metric || params.value == null || !params.material || !params.operation) {
              return ok({ error: "Missing required params: metric, value, material, operation" });
            }
            const result = latheDeepLearningEngine.detectAnomaly(
              params.metric,
              params.value,
              params.material,
              params.operation
            );
            return ok({
              success: true,
              is_anomaly: result.is_anomaly,
              type: result.anomaly_type,
              description: result.description,
              severity: result.severity,
              expected_range: result.expected_range,
              actual_value: result.actual_value,
              recommendation: result.recommendation,
            });
          }

          case "lathe_analyze_trend": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.metric || !params.data_points) {
              return ok({ error: "Missing required params: metric, data_points" });
            }
            const result = latheDeepLearningEngine.analyzeTrend(
              params.metric,
              params.data_points,
              params.period
            );
            return ok({
              success: true,
              metric: result.metric,
              period: result.period,
              trend: result.trend,
              change_percent: result.change_percent,
              data_points: result.data_points,
              significance: result.statistical_significance,
              factors: result.contributing_factors,
              forecast: result.forecast,
            });
          }

          case "lathe_confident_recommendation": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            if (!params.parameter || !params.material || !params.operation) {
              return ok({ error: "Missing required params: parameter, material, operation" });
            }
            const result = latheDeepLearningEngine.getConfidentRecommendation(
              params.parameter,
              params.material,
              params.operation,
              params.machine_type
            );
            return ok({
              success: true,
              parameter: result.parameter,
              value: result.recommended_value,
              unit: result.unit,
              confidence: result.confidence,
              confidence_factors: result.confidence_factors,
              success_rate: result.historical_success_rate,
              similar_jobs: result.similar_jobs_count,
              range: result.range,
            });
          }

          case "lathe_learning_stats": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            const result = latheDeepLearningEngine.getLearningStats();
            return ok({
              success: true,
              feedback_count: result.total_feedback,
              success_rate: result.success_rate,
              historical_jobs: result.total_historical_jobs,
              materials: result.materials_covered,
              operations: result.operations_covered,
            });
          }

          // ===========================================================
          // LLM-INTEL-14: Lathe Advanced Operations
          // ===========================================================
          case "lathe_live_tooling": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (!params.operation || params.live_tool_rpm == null || params.feature_depth == null) {
              return ok({ error: "Missing required params: operation, live_tool_rpm, feature_depth" });
            }
            const result = latheAdvancedOperationsEngine.getLiveToolingParams({
              operation: params.operation,
              live_tool_rpm: params.live_tool_rpm,
              feature_depth_mm: params.feature_depth,
              spindle_orientation_deg: params.spindle_orientation,
              feature_width_mm: params.feature_width,
              number_of_features: params.number_of_features,
              angular_spacing_deg: params.angular_spacing,
            });
            return ok({
              success: true,
              operation: result.operation,
              spindle_mode: result.spindle_mode,
              machine_requirements: result.machine_requirements,
              parameters: result.recommended_parameters,
              programming_notes: result.programming_notes.slice(0, 8),
              tooling: result.tooling_recommendations,
              cycle_considerations: result.cycle_considerations,
              collision_warnings: result.collision_warnings,
            });
          }

          case "lathe_polygon_turning": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (params.number_of_flats == null || params.flat_width == null || params.part_diameter == null || !params.material) {
              return ok({ error: "Missing required params: number_of_flats, flat_width, part_diameter, material" });
            }
            const result = latheAdvancedOperationsEngine.getPolygonTurningParams({
              number_of_flats: params.number_of_flats,
              flat_width_mm: params.flat_width,
              part_diameter_mm: params.part_diameter,
              material: params.material,
              corner_radius_mm: params.corner_radius,
            });
            return ok({
              success: true,
              feasible: result.feasible,
              method: result.method,
              speed_ratio: result.speed_ratio,
              spindle_rpm: result.spindle_rpm,
              live_tool_rpm: result.live_tool_rpm,
              feed_mm_rev: result.feed_mm_rev,
              passes: result.passes_required,
              programming: result.programming_approach,
              considerations: result.special_considerations,
              alternatives: result.alternative_methods,
            });
          }

          case "lathe_advanced_threading": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (!params.thread_form || params.pitch == null || params.diameter == null || params.length == null) {
              return ok({ error: "Missing required params: thread_form, pitch, diameter, length" });
            }
            const result = latheAdvancedOperationsEngine.getAdvancedThreadingParams({
              thread_form: params.thread_form,
              pitch_mm: params.pitch,
              diameter_mm: params.diameter,
              length_mm: params.length,
              starts: params.starts,
              lead_mm: params.lead,
              taper_deg: params.taper,
              depth_mm: params.depth,
              class_fit: params.class_fit,
            });
            return ok({
              success: true,
              thread_form: result.thread_form,
              infeed_method: result.infeed_method,
              total_passes: result.total_passes,
              doc_per_pass: result.doc_per_pass,
              spindle_rpm: result.spindle_rpm,
              thread_depth_mm: result.thread_depth_mm,
              tool_selection: result.tool_selection,
              programming_notes: result.programming_notes,
              inspection_notes: result.inspection_notes,
              common_issues: result.common_issues,
            });
          }

          case "lathe_grooving": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (!params.groove_type || params.width == null || params.depth == null || params.diameter == null || !params.material) {
              return ok({ error: "Missing required params: groove_type, width, depth, diameter, material" });
            }
            const result = latheAdvancedOperationsEngine.getGroovingParams({
              groove_type: params.groove_type,
              width_mm: params.width,
              depth_mm: params.depth,
              diameter_mm: params.diameter,
              material: params.material,
              quantity: params.quantity,
              spacing_mm: params.spacing,
            });
            return ok({
              success: true,
              groove_type: result.groove_type,
              plunge_method: result.plunge_method,
              tool_width_mm: result.tool_width_mm,
              number_of_plunges: result.number_of_plunges,
              plunge_feed: result.plunge_feed_mm_rev,
              pecking: result.pecking_recommended,
              peck_depth: result.peck_depth_mm,
              coolant: result.coolant_strategy,
              chip_control: result.chip_control_notes,
              finish_notes: result.finish_considerations,
              tools: result.tool_recommendations,
            });
          }

          case "lathe_eccentric": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (params.offset == null || params.diameter == null || params.length == null || !params.material) {
              return ok({ error: "Missing required params: offset, diameter, length, material" });
            }
            const result = latheAdvancedOperationsEngine.getEccentricParams({
              offset_mm: params.offset,
              diameter_mm: params.diameter,
              length_mm: params.length,
              material: params.material,
              finish_ra: params.finish_ra,
            });
            return ok({
              success: true,
              method: result.method,
              setup_procedure: result.setup_procedure,
              balancing_required: result.balancing_required,
              max_safe_rpm: result.max_safe_rpm,
              counterweight_notes: result.counterweight_notes,
              programming: result.programming_approach,
              tolerance_notes: result.tolerance_considerations,
            });
          }

          case "lathe_contour": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            if (!params.profile_type || params.roughing_allowance == null || params.finish_allowance == null || !params.material) {
              return ok({ error: "Missing required params: profile_type, roughing_allowance, finish_allowance, material" });
            }
            const result = latheAdvancedOperationsEngine.getContourParams({
              profile_type: params.profile_type,
              radius_mm: params.radius,
              roughing_allowance_mm: params.roughing_allowance,
              finish_allowance_mm: params.finish_allowance,
              material: params.material,
            });
            return ok({
              success: true,
              profile_type: result.profile_type,
              roughing_strategy: result.roughing_strategy,
              finishing_strategy: result.finishing_strategy,
              tool_nose_radius_mm: result.tool_nose_radius_mm,
              css: result.constant_surface_speed,
              rpm_range: { min: result.min_rpm, max: result.max_rpm },
              feed_mm_rev: result.feed_mm_rev,
              stepover_mm: result.stepover_mm,
              programming_notes: result.programming_notes,
              finish_tips: result.surface_finish_tips,
            });
          }

          case "lathe_list_advanced_ops": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            const result = latheAdvancedOperationsEngine.listAdvancedOperations();
            return ok({
              success: true,
              live_tooling: result.live_tooling,
              thread_forms: result.thread_forms,
              groove_types: result.groove_types,
              contour_types: result.contour_types,
              total_operations: result.live_tooling.length + result.thread_forms.length +
                               result.groove_types.length + result.contour_types.length,
            });
          }

          // ===========================================================
          // LLM-INTEL-15: Lathe Unified AI Orchestration
          // ===========================================================
          case "lathe_generate_process_plan": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.part) {
              return ok({ error: "Missing required param: part (LathePartDefinition object)" });
            }
            const result = await latheUnifiedAIEngine.generateProcessPlan(params.part);
            return ok({
              success: true,
              plan_id: result.plan_id,
              part_id: result.part_id,
              recommended_machine: result.recommended_machine,
              setups_count: result.setups.length,
              total_cycle_time_sec: result.total_cycle_time_sec,
              setup_time_min: result.setup_time_min,
              cost_per_part: result.estimated_cost.cost_per_part,
              quality_predictions: result.quality_predictions.slice(0, 5),
              risks: result.risks.slice(0, 5),
              reasoning_steps: result.reasoning_chain.length,
            });
          }

          case "lathe_generate_setup_sheet": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.plan || params.setup_number == null || !params.part_name || !params.program_number) {
              return ok({ error: "Missing required params: plan, setup_number, part_name, program_number" });
            }
            const result = latheUnifiedAIEngine.generateSetupSheet(
              params.plan,
              params.setup_number,
              params.part_name,
              params.program_number
            );
            return ok({
              success: true,
              part_id: result.part_id,
              machine: result.machine,
              workholding: result.workholding,
              tools: result.tools,
              operation_summary: result.operation_summary,
              quality_checks: result.quality_checks,
              safety_notes: result.safety_notes,
            });
          }

          case "lathe_adaptive_control": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.signal || !params.operation) {
              return ok({ error: "Missing required params: signal, operation" });
            }
            const result = latheUnifiedAIEngine.processRealTimeSignal(
              params.signal,
              params.operation,
              params.history || []
            );
            return ok({
              success: true,
              action: result.action_type,
              parameter: result.parameter,
              current_value: result.current_value,
              recommended_value: result.recommended_value,
              reason: result.reason,
              urgency: result.urgency,
              confidence: result.confidence,
            });
          }

          case "lathe_check_collisions": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.plan || !params.envelope) {
              return ok({ error: "Missing required params: plan, envelope" });
            }
            const result = latheUnifiedAIEngine.checkCollisions(params.plan, params.envelope);
            return ok({
              success: true,
              safe: result.safe,
              collision_risks: result.collision_risks,
              clearances: result.clearances,
              recommendations: result.recommendations,
            });
          }

          case "lathe_match_tools": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.plan || !params.inventory) {
              return ok({ error: "Missing required params: plan, inventory" });
            }
            const result = latheUnifiedAIEngine.matchToolInventory(params.plan, params.inventory);
            return ok({
              success: true,
              matched_tools: result.matched_tools,
              missing_tools: result.missing_tools,
              procurement_suggestions: result.procurement_suggestions,
            });
          }

          case "lathe_optimize_plan": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.plan) {
              return ok({ error: "Missing required param: plan" });
            }
            const result = latheUnifiedAIEngine.optimizePlan(params.plan);
            return ok({
              success: true,
              original_cycle_sec: result.original_cycle_time_sec,
              optimized_cycle_sec: result.optimized_cycle_time_sec,
              savings_percent: result.savings_percent,
              optimizations: result.optimizations,
            });
          }

          case "lathe_analyze_comprehensive": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            if (!params.part) {
              return ok({ error: "Missing required param: part" });
            }
            const result = latheUnifiedAIEngine.analyzePartComprehensive(params.part);
            return ok({
              success: true,
              classification: result.classification,
              machine_recommendation: result.machine_recommendation,
              material_strategy: result.material_strategy,
              critical_features: result.critical_features,
              risk_assessment: result.risk_assessment,
              learning_insights: result.learning_insights,
              confidence_summary: result.confidence_summary,
            });
          }

          // ============================================================
          // Swiss-Type Intelligence (LLM-INTEL-16)
          // ============================================================

          case "swiss_analyze_guide_bushing": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = swissTypeIntelligenceEngine.analyzeGuideBushing(params.part, params.machine);
            return ok(result);
          }

          case "swiss_optimize_gang_layout": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine || !params.availableTools) {
              return ok({ error: "Missing required params: part, machine, availableTools" });
            }
            const result = swissTypeIntelligenceEngine.optimizeGangToolLayout(params.part, params.machine, params.availableTools);
            return ok(result);
          }

          case "swiss_plan_spindle_sync": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = swissTypeIntelligenceEngine.planSpindleSync(params.part, params.machine);
            return ok(result);
          }

          case "swiss_plan_bar_feeding": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = swissTypeIntelligenceEngine.planBarFeeding(params.part, params.machine, params.barLength_mm);
            return ok(result);
          }

          case "swiss_plan_backworking": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = swissTypeIntelligenceEngine.planBackworking(params.part, params.machine);
            return ok(result);
          }

          case "swiss_generate_process_plan": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            if (!params.part || !params.machine || !params.availableTools) {
              return ok({ error: "Missing required params: part, machine, availableTools" });
            }
            const result = swissTypeIntelligenceEngine.generateProcessPlan(params.part, params.machine, params.availableTools);
            return ok(result);
          }

          // ============================================================
          // Multi-Turret Sync (LLM-INTEL-17)
          // ============================================================

          case "multiturret_plan_simultaneous": {
            const { multiTurretSyncEngine } = await import("../../engines/MultiTurretSyncEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiTurretSyncEngine.planSimultaneousCuts(params.part, params.machine);
            return ok(result);
          }

          case "multiturret_analyze_collisions": {
            const { multiTurretSyncEngine } = await import("../../engines/MultiTurretSyncEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiTurretSyncEngine.analyzeCollisions(params.part, params.machine);
            return ok(result);
          }

          case "multiturret_generate_sync_codes": {
            const { multiTurretSyncEngine } = await import("../../engines/MultiTurretSyncEngine.js");
            if (!params.cutPlan || !params.machine) {
              return ok({ error: "Missing required params: cutPlan, machine" });
            }
            const result = multiTurretSyncEngine.generateSyncCodes(params.cutPlan, params.machine);
            return ok(result);
          }

          case "multiturret_analyze_balanced_cuts": {
            const { multiTurretSyncEngine } = await import("../../engines/MultiTurretSyncEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiTurretSyncEngine.analyzeBalancedCuts(params.part, params.machine);
            return ok(result);
          }

          case "multiturret_optimize_cycle_time": {
            const { multiTurretSyncEngine } = await import("../../engines/MultiTurretSyncEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiTurretSyncEngine.optimizeCycleTime(params.part, params.machine);
            return ok(result);
          }

          // ============================================================
          // Multi-Spindle Automatic (LLM-INTEL-18)
          // ============================================================

          case "multispindle_assign_stations": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiSpindleAutomaticEngine.assignStations(params.part, params.machine);
            return ok(result);
          }

          case "multispindle_analyze_balance": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.assignment || !params.part) {
              return ok({ error: "Missing required params: assignment, part" });
            }
            const result = multiSpindleAutomaticEngine.analyzeCycleBalance(params.assignment, params.part);
            return ok(result);
          }

          case "multispindle_decide_tooling": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.assignment || !params.part || !params.machine) {
              return ok({ error: "Missing required params: assignment, part, machine" });
            }
            const result = multiSpindleAutomaticEngine.decideTooling(params.assignment, params.part, params.machine);
            return ok(result);
          }

          case "multispindle_optimize_index": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.machine || !params.assignment) {
              return ok({ error: "Missing required params: machine, assignment" });
            }
            const result = multiSpindleAutomaticEngine.optimizeIndex(params.machine, params.assignment);
            return ok(result);
          }

          case "multispindle_analyze_production": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.assignment || !params.part || !params.machine) {
              return ok({ error: "Missing required params: assignment, part, machine" });
            }
            const result = multiSpindleAutomaticEngine.analyzeProduction(params.assignment, params.part, params.machine, params.laborRate, params.machineRate);
            return ok(result);
          }

          case "multispindle_plan_backworking": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = multiSpindleAutomaticEngine.planBackworking(params.part, params.machine);
            return ok(result);
          }

          // ============================================================
          // Complete Machining / WFL-style (LLM-INTEL-19)
          // ============================================================

          case "complete_plan_single_setup": {
            const { completeMachiningEngine } = await import("../../engines/CompleteMachiningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = completeMachiningEngine.planSingleSetup(params.part, params.machine);
            return ok(result);
          }

          case "complete_plan_baxis": {
            const { completeMachiningEngine } = await import("../../engines/CompleteMachiningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = completeMachiningEngine.planBAxisInterpolation(params.part, params.machine);
            return ok(result);
          }

          case "complete_plan_deep_hole": {
            const { completeMachiningEngine } = await import("../../engines/CompleteMachiningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = completeMachiningEngine.planDeepHoleDrilling(params.part, params.machine);
            return ok(result);
          }

          case "complete_plan_gear_cutting": {
            const { completeMachiningEngine } = await import("../../engines/CompleteMachiningEngine.js");
            if (!params.part || !params.machine) {
              return ok({ error: "Missing required params: part, machine" });
            }
            const result = completeMachiningEngine.planGearCutting(params.part, params.machine);
            return ok(result);
          }

          // ═══════════════════════════════════════════════════════════════════
          // Live Tooling Intelligence (LLM-INTEL-20) - 9 actions
          // ═══════════════════════════════════════════════════════════════════
          case "live_analyze_capability": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operation || !params.config) {
              return ok({ error: "Missing required params: operation, config" });
            }
            const result = liveToolingIntelligenceEngine.analyzeDrivenToolCapability(params.operation, params.config);
            return ok(result);
          }
          case "live_plan_caxis": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operations || !params.config) {
              return ok({ error: "Missing required params: operations, config" });
            }
            const result = liveToolingIntelligenceEngine.planCAxisStrategy(params.operations, params.config);
            return ok(result);
          }
          case "live_plan_yaxis": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operations || !params.config) {
              return ok({ error: "Missing required params: operations, config" });
            }
            const result = liveToolingIntelligenceEngine.planYAxisMilling(params.operations, params.config);
            return ok(result);
          }
          case "live_select_strategy": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operation || !params.config) {
              return ok({ error: "Missing required params: operation, config" });
            }
            const result = liveToolingIntelligenceEngine.selectMillingStrategy(params.operation, params.config);
            return ok(result);
          }
          case "live_plan_polygon": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.sides || !params.inscribedDiameter_mm || !params.length_mm || !params.material || !params.config) {
              return ok({ error: "Missing required params: sides, inscribedDiameter_mm, length_mm, material, config" });
            }
            const result = liveToolingIntelligenceEngine.planPolygonTurning(
              params.sides, params.inscribedDiameter_mm, params.length_mm, params.material, params.config
            );
            return ok(result);
          }
          case "live_plan_thread_mill": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.threadDiameter_mm || !params.pitch_mm || !params.length_mm || !params.threadType || !params.material || !params.config) {
              return ok({ error: "Missing required params: threadDiameter_mm, pitch_mm, length_mm, threadType, material, config" });
            }
            const result = liveToolingIntelligenceEngine.planThreadMilling(
              params.threadDiameter_mm, params.pitch_mm, params.length_mm, params.threadType, params.material, params.config
            );
            return ok(result);
          }
          case "live_plan_helical": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.type || params.startDiameter_mm === undefined || params.endDiameter_mm === undefined || !params.depth_mm || !params.material || !params.config) {
              return ok({ error: "Missing required params: type, startDiameter_mm, endDiameter_mm, depth_mm, material, config" });
            }
            const result = liveToolingIntelligenceEngine.planHelicalInterpolation(
              params.type, params.startDiameter_mm, params.endDiameter_mm, params.depth_mm, params.material, params.config
            );
            return ok(result);
          }
          case "live_plan_offcenter": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operations || !params.partDiameter_mm || !params.config) {
              return ok({ error: "Missing required params: operations, partDiameter_mm, config" });
            }
            const result = liveToolingIntelligenceEngine.planOffCenterOperations(params.operations, params.partDiameter_mm, params.config);
            return ok(result);
          }
          case "live_generate_plan": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            if (!params.operations || !params.config) {
              return ok({ error: "Missing required params: operations, config" });
            }
            const result = liveToolingIntelligenceEngine.generateProcessPlan(params.operations, params.config);
            return ok(result);
          }

          // ═══════════════════════════════════════════════════════════════════
          // Turret Layout Intelligence (LLM-INTEL-21) - 6 actions
          // ═══════════════════════════════════════════════════════════════════
          case "turret_analyze_interface": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.interfaceType) {
              return ok({ error: "Missing required param: interfaceType" });
            }
            const result = turretLayoutEngine.analyzeInterface(params.interfaceType);
            return ok(result);
          }
          case "turret_compare_interfaces": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.interface1 || !params.interface2 || !params.application) {
              return ok({ error: "Missing required params: interface1, interface2, application" });
            }
            const result = turretLayoutEngine.compareInterfaces(params.interface1, params.interface2, params.application);
            return ok(result);
          }
          case "turret_analyze_capability": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.config) {
              return ok({ error: "Missing required param: config" });
            }
            const result = turretLayoutEngine.analyzeTurretCapability(params.config);
            return ok(result);
          }
          case "turret_optimize_layout": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.operations || !params.availableTools || !params.config || !params.priorities) {
              return ok({ error: "Missing required params: operations, availableTools, config, priorities" });
            }
            const result = turretLayoutEngine.optimizeToolLayout({
              operations: params.operations,
              availableTools: params.availableTools,
              config: params.config,
              priorities: params.priorities,
            });
            return ok(result);
          }
          case "turret_plan_gang": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.tools || !params.operations || !params.maxWidth_mm) {
              return ok({ error: "Missing required params: tools, operations, maxWidth_mm" });
            }
            const result = turretLayoutEngine.planGangToolLayout(params.tools, params.operations, params.maxWidth_mm);
            return ok(result);
          }
          case "turret_check_interference": {
            const { turretLayoutEngine } = await import("../../engines/TurretLayoutEngine.js");
            if (!params.assignments || !params.config) {
              return ok({ error: "Missing required params: assignments, config" });
            }
            const result = turretLayoutEngine.checkToolInterference(params.assignments, params.config);
            return ok(result);
          }

          // ═══════════════════════════════════════════════════════════════════
          // Milling Head Intelligence (LLM-INTEL-22) - 7 actions
          // ═══════════════════════════════════════════════════════════════════
          case "milling_head_plan_baxis": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.operations || !params.config) {
              return ok({ error: "Missing required params: operations, config" });
            }
            const result = millingHeadIntelligenceEngine.planBAxisOperations(params.operations, params.config);
            return ok(result);
          }
          case "milling_head_analyze_orthogonal": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.config || !params.partEnvelope) {
              return ok({ error: "Missing required params: config, partEnvelope" });
            }
            const result = millingHeadIntelligenceEngine.analyzeOrthogonalHead(params.config, params.partEnvelope);
            return ok(result);
          }
          case "milling_head_plan_universal": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.targetVector || !params.config) {
              return ok({ error: "Missing required params: targetVector, config" });
            }
            const result = millingHeadIntelligenceEngine.planUniversalHeadOrientation(params.targetVector, params.config);
            return ok(result);
          }
          case "milling_head_analyze_angular": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.headType || !params.operation) {
              return ok({ error: "Missing required params: headType, operation" });
            }
            const result = millingHeadIntelligenceEngine.analyzeAngularHead(params.headType, params.operation);
            return ok(result);
          }
          case "milling_head_recommend": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.operations || !params.constraints) {
              return ok({ error: "Missing required params: operations, constraints" });
            }
            const result = millingHeadIntelligenceEngine.recommendMillingHead(params.operations, params.constraints);
            return ok(result);
          }
          case "milling_head_check_collision": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.config || !params.partGeometry) {
              return ok({ error: "Missing required params: config, partGeometry" });
            }
            const result = millingHeadIntelligenceEngine.checkCollision(params.config, params.partGeometry);
            return ok(result);
          }
          case "milling_head_plan_interpolation": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            if (!params.startState || !params.endState || !params.config || !params.material) {
              return ok({ error: "Missing required params: startState, endState, config, material" });
            }
            const result = millingHeadIntelligenceEngine.planInterpolation(params.startState, params.endState, params.config, params.material);
            return ok(result);
          }

          // ═══════════════════════════════════════════════════════════════════
          // Advanced CNC Config (LLM-INTEL-23) - 8 actions
          // ═══════════════════════════════════════════════════════════════════
          case "cnc_analyze_millturn": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.config) {
              return ok({ error: "Missing required param: config" });
            }
            const result = advancedCNCConfigEngine.analyzeMillTurnCapability(params.config);
            return ok(result);
          }
          case "cnc_plan_channel_sync": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.operations || !params.config) {
              return ok({ error: "Missing required params: operations, config" });
            }
            const result = advancedCNCConfigEngine.planChannelSync(params.operations, params.config);
            return ok(result);
          }
          case "cnc_analyze_interpolation": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.config) {
              return ok({ error: "Missing required param: config" });
            }
            const result = advancedCNCConfigEngine.analyzeInterpolationCapabilities(params.config);
            return ok(result);
          }
          case "cnc_analyze_hsm": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.config) {
              return ok({ error: "Missing required param: config" });
            }
            const result = advancedCNCConfigEngine.analyzeHSMConfiguration(params.config);
            return ok(result);
          }
          case "cnc_configure_collision": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.config || !params.components) {
              return ok({ error: "Missing required params: config, components" });
            }
            const result = advancedCNCConfigEngine.configureCollisionAvoidance(params.config, params.components);
            return ok(result);
          }
          case "cnc_compare_controllers": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.controller1 || !params.controller2 || !params.requirements) {
              return ok({ error: "Missing required params: controller1, controller2, requirements" });
            }
            const result = advancedCNCConfigEngine.compareControllers(params.controller1, params.controller2, params.requirements);
            return ok(result);
          }
          case "cnc_setup_workplane": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (params.tiltA_deg === undefined || params.tiltB_deg === undefined || params.rotateC_deg === undefined || !params.origin || !params.config) {
              return ok({ error: "Missing required params: tiltA_deg, tiltB_deg, rotateC_deg, origin, config" });
            }
            const result = advancedCNCConfigEngine.setupTiltedWorkplane(
              params.tiltA_deg, params.tiltB_deg, params.rotateC_deg, params.origin, params.config
            );
            return ok(result);
          }
          case "cnc_plan_transfer": {
            const { advancedCNCConfigEngine } = await import("../../engines/AdvancedCNCConfigEngine.js");
            if (!params.fromSpindle || !params.toSpindle || !params.partDiameter_mm || !params.partLength_mm || !params.config) {
              return ok({ error: "Missing required params: fromSpindle, toSpindle, partDiameter_mm, partLength_mm, config" });
            }
            const result = advancedCNCConfigEngine.planPartTransfer(
              params.fromSpindle, params.toSpindle, params.partDiameter_mm, params.partLength_mm, params.config
            );
            return ok(result);
          }

          // === Deep AI Intelligence (DeepAIIntelligenceEngine) ===
          case "deep_reason": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query || !params.domain) {
              return ok({ error: "Missing required params: query, domain" });
            }
            const result = await deepAIIntelligenceEngine.deepReason(
              {
                query: params.query,
                domain: params.domain,
                constraints: params.constraints,
                examples: params.examples,
                priorKnowledge: params.priorKnowledge,
                targetOutcome: params.targetOutcome,
                confidenceThreshold: params.confidenceThreshold,
                maxReasoningDepth: params.maxReasoningDepth,
                allowBacktracking: params.allowBacktracking,
              },
              params.mode ?? "chain_of_thought"
            );
            return ok(result);
          }

          case "deep_reason_chain": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query || !params.domain) {
              return ok({ error: "Missing required params: query, domain" });
            }
            const result = await deepAIIntelligenceEngine.deepReason(
              { query: params.query, domain: params.domain, constraints: params.constraints },
              "chain_of_thought"
            );
            return ok(result);
          }

          case "deep_reason_tree": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query || !params.domain) {
              return ok({ error: "Missing required params: query, domain" });
            }
            const result = await deepAIIntelligenceEngine.deepReason(
              { query: params.query, domain: params.domain, constraints: params.constraints },
              "tree_of_thought"
            );
            return ok(result);
          }

          case "deep_reason_multi": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query || !params.domain) {
              return ok({ error: "Missing required params: query, domain" });
            }
            const result = await deepAIIntelligenceEngine.deepReason(
              { query: params.query, domain: params.domain, constraints: params.constraints },
              "multi_path"
            );
            return ok(result);
          }

          case "deep_learn": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.data) {
              return ok({ error: "Missing required param: data (array)" });
            }
            const result = await deepAIIntelligenceEngine.deepLearn(
              params.data,
              params.mode ?? "pattern_recognition"
            );
            return ok(result);
          }

          case "deep_logic": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.premises) {
              return ok({ error: "Missing required param: premises (array of strings)" });
            }
            const result = await deepAIIntelligenceEngine.deepLogic(
              params.premises,
              params.mode ?? "first_order"
            );
            return ok(result);
          }

          case "extended_thinking": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const result = await deepAIIntelligenceEngine.extendedThinking(params.query);
            return ok(result);
          }

          case "llm_cli": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.input) {
              return ok({ error: "Missing required param: input (natural language)" });
            }
            const result = await deepAIIntelligenceEngine.processNaturalLanguage(params.input);
            return ok(result);
          }

          case "enhance_skill": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.skillId) {
              return ok({ error: "Missing required param: skillId" });
            }
            const result = await deepAIIntelligenceEngine.enhanceSkill(
              params.skillId,
              params.context ?? {}
            );
            return ok(result);
          }

          case "enhance_hook": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.hookName || !params.phase) {
              return ok({ error: "Missing required params: hookName, phase (pre|post)" });
            }
            const result = await deepAIIntelligenceEngine.enhanceHook(
              params.hookName,
              params.phase,
              params.data ?? {}
            );
            return ok(result);
          }

          case "assist_command": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.command) {
              return ok({ error: "Missing required param: command" });
            }
            const result = await deepAIIntelligenceEngine.assistSlashCommand(
              params.command,
              params.args ?? []
            );
            return ok(result);
          }

          case "deep_analyze": {
            const { deepAIIntelligenceEngine } = await import("../../engines/DeepAIIntelligenceEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            // Comprehensive analysis: extended thinking + deep reasoning
            const thinking = await deepAIIntelligenceEngine.extendedThinking(params.query);
            const reasoning = await deepAIIntelligenceEngine.deepReason(
              {
                query: params.query,
                domain: params.domain ?? "general_manufacturing",
                constraints: params.constraints,
              },
              "multi_path"
            );
            return ok({
              query: params.query,
              thinking: thinking.thinkingProcess,
              analysis: thinking.analysis,
              recommendation: thinking.recommendation,
              reasoning: reasoning.reasoning,
              suggestions: reasoning.suggestions,
              confidence: (thinking.confidence + reasoning.confidence) / 2,
              alternatives: [...thinking.alternativeApproaches, ...reasoning.alternatives],
            });
          }

          // === AI Feature Auto-Registry ===
          case "ai_registry_ingest": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            if (!params.engineFile) {
              return ok({ error: "Missing required param: engineFile" });
            }
            const result = aiFeatureAutoRegistry.autoIngest(params.engineFile, {
              name: params.name,
              description: params.description,
              category: params.category,
              capabilities: params.capabilities,
              domains: params.domains,
              actions: params.actions,
              dispatcher: params.dispatcher,
              confidence: params.confidence,
            });
            return ok(result);
          }

          case "ai_registry_discover": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            const result = await aiFeatureAutoRegistry.discoverFeatures();
            return ok(result);
          }

          case "ai_registry_list": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            const features = aiFeatureAutoRegistry.getAllFeatures();
            return ok({
              count: features.length,
              features: features.map(f => ({
                id: f.id,
                name: f.name,
                category: f.category,
                engineFile: f.engineFile,
                capabilities: f.capabilities.length,
                actions: f.actions,
              })),
            });
          }

          case "ai_registry_route": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const routing = aiFeatureAutoRegistry.routeQuery(params.query);
            return ok({
              query: params.query,
              domain: routing.domain?.name,
              feature: routing.feature?.name,
              engine: routing.engine,
              dispatcher: routing.dispatcher,
              actions: routing.actions,
              confidence: routing.confidence,
            });
          }

          case "ai_registry_stats": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            return ok(aiFeatureAutoRegistry.getStats());
          }

          case "ai_registry_domains": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            const domains = aiFeatureAutoRegistry.getAllDomains();
            return ok({
              count: domains.length,
              domains: domains.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description,
                features: d.features.length,
                primaryEngine: d.primaryEngine,
                keywords: d.keywords,
              })),
            });
          }

          case "ai_registry_by_category": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            if (!params.category) {
              return ok({ error: "Missing required param: category" });
            }
            const features = aiFeatureAutoRegistry.getFeaturesByCategory(params.category);
            return ok({
              category: params.category,
              count: features.length,
              features: features.map(f => ({
                id: f.id,
                name: f.name,
                engineFile: f.engineFile,
                capabilities: f.capabilities,
              })),
            });
          }

          case "ai_registry_history": {
            const { aiFeatureAutoRegistry } = await import("../../engines/AIFeatureAutoRegistryEngine.js");
            const history = aiFeatureAutoRegistry.getIngestionHistory();
            return ok({
              count: history.length,
              events: history.slice(-20), // Last 20 events
            });
          }

          // === Lathe AI Ultra (LATHE-AI-ULTRA) — 10 actions ===
          case "lathe_ultra_get_controller": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.getControllerCapabilities(params.controller));
          }

          case "lathe_ultra_list_controllers": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.listControllers(params.family));
          }

          case "lathe_ultra_compare_controllers": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.compareControllers(
              params.controller1,
              params.controller2,
              params.requirements || {}
            ));
          }

          case "lathe_ultra_assist_hardcode": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.assistHardCode(params.controller, {
              operation: params.operation,
              material: params.material,
              toolDiameter_mm: params.toolDiameter_mm,
              partDiameter_mm: params.partDiameter_mm,
              cuttingDepth_mm: params.cuttingDepth_mm,
              existingCode: params.existingCode,
            }));
          }

          case "lathe_ultra_generate_macro": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.generateMacroTemplate(
              params.controller,
              params.macroType,
              params.parameters || {}
            ));
          }

          case "lathe_ultra_translate_nl": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.translateConversational(
              params.controller,
              params.command,
              params.context
            ));
          }

          case "lathe_ultra_recommend_cam": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.recommendCAMStrategy(params.controller, {
              type: params.type,
              material: params.material,
              partDiameter_mm: params.partDiameter_mm,
              stockAllowance_mm: params.stockAllowance_mm,
              targetRa_um: params.targetRa_um,
            }));
          }

          case "lathe_ultra_deep_reason": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.executeDeepReasoning(
              params.chainType,
              params.input || {},
              params.controller
            ));
          }

          case "lathe_ultra_llm_query": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            const result = await latheAIUltraEngine.processLLMQuery({
              query: params.query,
              controller: params.controller,
              programmingMode: params.programmingMode,
              partContext: params.partContext,
              operationContext: params.operationContext,
              historyContext: params.historyContext,
            });
            return ok(result);
          }

          case "lathe_ultra_get_post": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            return ok(latheAIUltraEngine.getPostProcessorProfile(params.controller));
          }

          // === Lathe Post Processor AI (LATHE-POST-AI) — 10 actions ===
          case "post_ai_get_profile": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.getPostProfile(params.controller));
          }

          case "post_ai_list_profiles": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.listPostProfiles(params.family));
          }

          case "post_ai_debug": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.debugPost(params.controller, params.code));
          }

          case "post_ai_recommend_cycle": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.recommendCycle(
              params.controller,
              params.cycleType,
              params.parameters || {}
            ));
          }

          case "post_ai_translate": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.translateCode(
              params.sourceController,
              params.targetController,
              params.code
            ));
          }

          case "post_ai_optimize": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.optimizePost(
              params.controller,
              params.code,
              params.optimizationType
            ));
          }

          case "post_ai_convert_macro": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.convertMacro(
              params.sourceDialect,
              params.targetDialect,
              params.macro
            ));
          }

          case "post_ai_deep_reason": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.executeDeepReasoning(
              params.chainType,
              params.input || {},
              params.controller
            ));
          }

          case "post_ai_llm_query": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            const result = await lathePostProcessorAIEngine.processLLMQuery({
              query: params.query,
              controller: params.controller,
              context: params.context,
            });
            return ok(result);
          }

          case "post_ai_learning_context": {
            const { lathePostProcessorAIEngine } = await import("../../engines/LathePostProcessorAIEngine.js");
            return ok(lathePostProcessorAIEngine.getLearningContext());
          }

          // === Autonomous AI Orchestration ===
          case "auto_execute": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const result = await autonomousAIOrchestration.executeAutonomously({
              intent: params.intent,
              context: params.context,
              constraints: params.constraints,
              mode: params.mode ?? "full_auto",
              knowledgeSources: params.knowledgeSources,
              maxSteps: params.maxSteps,
              timeout_ms: params.timeout_ms,
            });
            return ok(result);
          }

          case "auto_skill_chain": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const chain = await autonomousAIOrchestration.selectSkillChain(params.intent, params.reasoning ?? {});
            return ok({ intent: params.intent, skillChain: chain });
          }

          case "auto_hook_chain": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const chain = autonomousAIOrchestration.selectHookChain(params.intent, params.steps ?? []);
            return ok({ intent: params.intent, hookChain: chain });
          }

          case "auto_algorithm_select": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const algorithms = autonomousAIOrchestration.selectAlgorithms(params.intent);
            return ok({ intent: params.intent, algorithms });
          }

          case "auto_formula_select": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const formulas = autonomousAIOrchestration.selectFormulas(params.intent);
            return ok({ intent: params.intent, formulas });
          }

          case "auto_knowledge_plan": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const plan = autonomousAIOrchestration.planKnowledgeUtilization({
              intent: params.intent,
              knowledgeSources: params.knowledgeSources,
            });
            return ok({ intent: params.intent, plan });
          }

          case "auto_query_mit": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.topic) {
              return ok({ error: "Missing required param: topic" });
            }
            const courses = await autonomousAIOrchestration.queryMITCourses(params.topic);
            return ok({ topic: params.topic, courses });
          }

          case "auto_query_catalogs": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const results = await autonomousAIOrchestration.queryVendorCatalogs(params.query);
            return ok({ query: params.query, results });
          }

          case "auto_gsd_generate": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            if (!params.name || !params.description || !params.capabilities) {
              return ok({ error: "Missing required params: name, description, capabilities" });
            }
            const gsd = await autonomousAIOrchestration.generateGSD({
              type: params.type ?? "full",
              entityType: params.entityType ?? "engine",
              name: params.name,
              description: params.description,
              domain: params.domain ?? "general",
              capabilities: params.capabilities,
              inputs: params.inputs ?? [],
              outputs: params.outputs ?? [],
            });
            return ok(gsd);
          }

          case "auto_history": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            const history = autonomousAIOrchestration.getExecutionHistory();
            return ok({
              count: history.length,
              recent: history.slice(-10).map(h => ({
                taskId: h.taskId,
                intent: h.intent.substring(0, 50),
                success: h.success,
                steps: h.steps.length,
                duration_ms: h.totalDuration_ms,
              })),
            });
          }

          case "auto_learning_stats": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            return ok(autonomousAIOrchestration.getLearningStats());
          }

          case "auto_summary": {
            const { autonomousAIOrchestration } = await import("../../engines/AutonomousAIOrchestrationEngine.js");
            return ok({ summary: autonomousAIOrchestration.getSummary() });
          }

          // === Autonomous Session Integration (AutonomousSessionIntegrationEngine) ===
          case "session_process": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            if (!params.intent) {
              return ok({ error: "Missing required param: intent" });
            }
            const result = await autonomousSession.processIntent(
              params.intent,
              params.session_id,
              params.context
            );
            return ok(result);
          }

          case "session_health": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            const health = autonomousSession.getHealth();
            return ok(health);
          }

          case "session_history": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            const history = autonomousSession.getSessionHistory(params.session_id);
            return ok({ session_id: params.session_id, history });
          }

          case "session_clear": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            autonomousSession.clearSession(params.session_id);
            return ok({ cleared: true, session_id: params.session_id });
          }

          case "session_update": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            if (!params.session_id) {
              return ok({ error: "Missing required param: session_id" });
            }
            const updated = autonomousSession.updateSessionContext(
              params.session_id,
              params.updates || {}
            );
            return ok({ updated: true, session: updated });
          }

          case "session_summary": {
            const { autonomousSession } = await import("../../engines/AutonomousSessionIntegrationEngine.js");
            return ok({ summary: autonomousSession.getSummary() });
          }

          // === Proactive AI Intelligence (ProactiveAIIntelligenceEngine) ===
          case "proactive_ai_analyze": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            const result = await proactiveAI.analyze({
              intent: params.intent,
              parameters: params.parameters,
              sessionId: params.session_id,
              domain: params.domain,
            });
            return ok(result);
          }

          case "proactive_ai_quick": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            if (!params.scenario) {
              return ok({ error: "Missing required param: scenario" });
            }
            const suggestions = proactiveAI.getQuickSuggestions(params.scenario);
            return ok({ scenario: params.scenario, suggestions });
          }

          case "proactive_ai_anomaly": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            if (!params.parameters) {
              return ok({ error: "Missing required param: parameters" });
            }
            const anomalies = proactiveAI.detectAnomalies(params.parameters);
            return ok({ anomalies });
          }

          case "proactive_ai_patterns": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            const patterns = proactiveAI.getPatterns();
            return ok({ patterns });
          }

          case "proactive_ai_learn": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            if (!params.suggestion_id || params.correction === undefined) {
              return ok({ error: "Missing required params: suggestion_id, correction" });
            }
            proactiveAI.learnFromCorrection(
              params.suggestion_id,
              params.correction,
              params.applied ?? false
            );
            return ok({ learned: true, suggestion_id: params.suggestion_id });
          }

          case "proactive_ai_calibration": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            const calibration = proactiveAI.getCalibration();
            return ok(calibration);
          }

          case "proactive_ai_thresholds": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            if (params.add) {
              const { parameter, min, max } = params.add;
              if (!parameter || min === undefined || max === undefined) {
                return ok({ error: "Missing required params for add: parameter, min, max" });
              }
              proactiveAI.addThreshold(parameter, min, max);
              return ok({ added: true, parameter, range: [min, max] });
            }
            const thresholds = Array.from(proactiveAI.getThresholds().entries());
            return ok({ thresholds });
          }

          case "proactive_ai_summary": {
            const { proactiveAI } = await import("../../engines/ProactiveAIIntelligenceEngine.js");
            return ok({ summary: proactiveAI.getSummary() });
          }

          // === Cross-Disciplinary Deep Learning (CrossDisciplinaryDeepLearningEngine) ===
          case "cross_domain_reason": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const result = crossDisciplinaryEngine.deepReason(params.query);
            return ok(result);
          }

          case "cross_domain_formula": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            if (!params.id) {
              return ok({ error: "Missing required param: id" });
            }
            if (params.execute && params.params) {
              const result = crossDisciplinaryEngine.executeFormula(params.id, ...params.params);
              return ok({ id: params.id, result });
            }
            const formula = crossDisciplinaryEngine.getFormula(params.id);
            return ok(formula ?? { error: `Formula not found: ${params.id}` });
          }

          case "cross_domain_algorithm": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            if (!params.id) {
              return ok({ error: "Missing required param: id" });
            }
            if (params.execute && params.config) {
              const result = crossDisciplinaryEngine.executeAlgorithm(params.id, params.config);
              return ok({ id: params.id, result });
            }
            const algo = crossDisciplinaryEngine.getAlgorithm(params.id);
            return ok(algo ?? { error: `Algorithm not found: ${params.id}` });
          }

          case "cross_domain_search": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const results = crossDisciplinaryEngine.search(params.query);
            return ok(results);
          }

          case "cross_domain_list_formulas": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            const formulas = crossDisciplinaryEngine.listFormulas(params.domain);
            return ok({ count: formulas.length, formulas: formulas.map(f => ({ id: f.id, name: f.name, domain: f.domain, application: f.manufacturingApplication })) });
          }

          case "cross_domain_list_algorithms": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            const algos = crossDisciplinaryEngine.listAlgorithms(params.domain);
            return ok({ count: algos.length, algorithms: algos.map(a => ({ id: a.id, name: a.name, domain: a.domain, application: a.manufacturingApplication })) });
          }

          case "cross_domain_patterns": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            const patterns = crossDisciplinaryEngine.getLearningPatterns();
            return ok({ patterns });
          }

          case "cross_domain_stats": {
            const { crossDisciplinaryEngine } = await import("../../engines/CrossDisciplinaryDeepLearningEngine.js");
            const stats = crossDisciplinaryEngine.getStats();
            return ok(stats);
          }

          // === Milling Ultimate AI (MILL-ULTIMATE-AI) ===
          case "mill_ultimate_analyze": {
            const { millingUltimateAIEngine } = await import("../../engines/MillingUltimateAIEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = await millingUltimateAIEngine.analyze({
              part_name: params.part_name,
              customer: params.customer,
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              material_condition: params.material_condition,
              feature_type: params.feature_type,
              dimensions: params.dimensions || {},
              geometry_complexity: params.geometry_complexity || "moderate",
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              machine: params.machine,
              controller: params.controller,
              spindle_max_rpm: params.spindle_max_rpm,
              spindle_power_kw: params.spindle_power_kw,
              axes: params.axes,
              max_cycle_time_min: params.max_cycle_time_min,
              tool_budget_usd: params.tool_budget_usd,
              batch_size: params.batch_size,
              exploration_depth: params.exploration_depth || "deep",
              allow_unconventional: params.allow_unconventional ?? true,
              cross_domain_reasoning: params.cross_domain_reasoning ?? true,
              variability_target: params.variability_target || 0.8,
            });
            return ok(result);
          }

          case "mill_ultimate_quick": {
            const { millingUltimateAIEngine } = await import("../../engines/MillingUltimateAIEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = millingUltimateAIEngine.quickAnalyze({
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              feature_type: params.feature_type,
              dimensions: params.dimensions || {},
              geometry_complexity: params.geometry_complexity || "moderate",
            });
            return ok(result);
          }

          case "mill_ultimate_explore": {
            const { millingUltimateAIEngine } = await import("../../engines/MillingUltimateAIEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = millingUltimateAIEngine.exploreMaxVariability({
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              feature_type: params.feature_type,
              dimensions: params.dimensions || {},
              geometry_complexity: params.geometry_complexity || "complex",
            });
            return ok(result);
          }

          case "mill_deep_reason": {
            const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
            if (!params.query) {
              return ok({ error: "Missing required param: query" });
            }
            const result = millingDeepReasoningEngine.reason(
              params.query,
              {
                material: params.material,
                material_iso: params.material_iso,
                operation: params.operation,
                hardness_hrc: params.hardness_hrc,
                tool_type: params.tool_type,
                tool_diameter_mm: params.tool_diameter_mm,
                machine: params.machine,
                controller: params.controller,
                customer: params.customer,
                is_thin_wall: params.is_thin_wall,
                is_5_axis: params.is_5_axis,
              },
              params.mode || "analytical"
            );
            return ok(result);
          }

          case "mill_orchestrate": {
            const { millingKnowledgeOrchestratorEngine } = await import("../../engines/MillingKnowledgeOrchestratorEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = await millingKnowledgeOrchestratorEngine.orchestrate({
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || params.feature_type,
              customer: params.customer,
              machine: params.machine,
              controller: params.controller,
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm,
              depth_mm: params.dimensions?.depth_mm || params.depth_mm,
              width_mm: params.dimensions?.width_mm || params.width_mm,
              wall_thickness_mm: params.dimensions?.wall_thickness_mm,
              is_thin_wall: params.is_thin_wall,
              is_5_axis: params.is_5_axis,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
            });
            return ok(result);
          }

          case "mill_neural_predict": {
            const { millingUltimateAIEngine } = await import("../../engines/MillingUltimateAIEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = await millingUltimateAIEngine.analyze({
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              feature_type: params.feature_type,
              dimensions: params.dimensions || {},
              geometry_complexity: params.geometry_complexity || "moderate",
              exploration_depth: "shallow",
            });
            return ok({
              neural_prediction: result.neural_prediction,
              parameters: result.selected_solution?.parameters,
              confidence: result.overall_confidence,
            });
          }

          case "mill_pareto_optimize": {
            const { millingUltimateAIEngine } = await import("../../engines/MillingUltimateAIEngine.js");
            if (!params.material_iso || !params.feature_type) {
              return ok({ error: "Missing required params: material_iso, feature_type" });
            }
            const result = await millingUltimateAIEngine.analyze({
              material: params.material || "",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              feature_type: params.feature_type,
              dimensions: params.dimensions || {},
              geometry_complexity: params.geometry_complexity || "moderate",
              max_cycle_time_min: params.max_cycle_time_min,
              surface_finish_ra: params.surface_finish_ra,
            });
            return ok({
              pareto_frontier: result.pareto_frontier,
              selected_solution: result.selected_solution,
              optimization_iterations: result.optimization_iterations,
            });
          }

          case "mill_ultimate_stats": {
            return ok({
              engine: "MillingUltimateAIEngine",
              version: "1.0.0",
              intelligence_layers: 8,
              reasoning_modes: ["chain_of_thought", "tree_of_thought", "multi_path", "backtracking", "abductive", "deductive", "inductive", "analogical"],
              scientific_domains: 15,
              tribal_tips_available: 10,
              playbook_rules_available: 8,
              neural_layers: 6,
              pareto_optimization: true,
              hybrid_synthesis: true,
              cross_domain_reasoning: true,
              physics_validation: ["kienzle", "taylor", "deflection", "thermal", "stability"],
            });
          }

          // === Milling AI Unification (MILL-AI-UNIFICATION) ===
          case "mill_unified_recommend": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            const result = await millingAIUnificationEngine.recommend({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
              tool_diameter_mm: params.tool_diameter_mm,
              depth_mm: params.depth_mm,
              width_mm: params.width_mm,
              length_mm: params.length_mm,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              machine: params.machine,
              controller: params.controller,
              axes: params.axes,
              customer: params.customer,
              part_number: params.part_number,
              batch_size: params.batch_size,
              use_neural: params.use_neural,
              use_deep_reasoning: params.use_deep_reasoning,
              use_tribal: params.use_tribal,
              use_physics: params.use_physics,
              exploration_depth: params.exploration_depth,
            });
            return ok(result);
          }

          case "mill_unified_quick": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            const result = millingAIUnificationEngine.quickRecommend({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
              tool_diameter_mm: params.tool_diameter_mm,
            });
            return ok(result);
          }

          case "mill_unified_inventory": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            return ok(millingAIUnificationEngine.getSystemInventory());
          }

          case "mill_unified_utilization": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            const report = millingAIUnificationEngine.getUtilizationReport({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              operation: params.operation || "roughing",
              customer: params.customer,
              machine: params.machine,
              controller: params.controller,
            });
            return ok(report);
          }

          // === Milling Deep Integration (MILL-DEEP-INTEGRATION) ===
          case "mill_integrate_full": {
            const { millingDeepIntegrationEngine } = await import("../../engines/MillingDeepIntegrationEngine.js");
            const result = await millingDeepIntegrationEngine.integrate({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
              tool_diameter_mm: params.tool_diameter_mm,
              depth_mm: params.depth_mm,
              width_mm: params.width_mm,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              customer: params.customer,
            });
            return ok(result);
          }

          case "mill_integrate_quick": {
            const { millingDeepIntegrationEngine } = await import("../../engines/MillingDeepIntegrationEngine.js");
            const result = millingDeepIntegrationEngine.quickIntegrate({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
            });
            return ok(result);
          }

          case "mill_integrate_sources": {
            const { millingDeepIntegrationEngine } = await import("../../engines/MillingDeepIntegrationEngine.js");
            const sources = millingDeepIntegrationEngine.getRelevantSources({
              material: params.material || "steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
              customer: params.customer,
            });
            return ok({ sources });
          }

          // === Milling Critical Thinking (MILL-CRITICAL-THINKING) ===
          case "mill_critical_analyze": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            const result = await millingCriticalThinkingEngine.analyze({
              problem: params.problem || "Optimize milling parameters",
              domain: params.domain || "parameters",
              material: params.material,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              operation: params.operation,
              feature_type: params.feature_type,
              current_parameters: params.current_parameters,
              constraints: params.constraints,
              reasoning_modes: params.reasoning_modes,
              exploration_depth: params.exploration_depth,
              include_counterfactuals: params.include_counterfactuals,
              include_risk_analysis: params.include_risk_analysis,
            });
            return ok(result);
          }

          case "mill_critical_quick": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            const result = millingCriticalThinkingEngine.quickAnalyze({
              problem: params.problem || "Quick analysis",
              domain: params.domain || "parameters",
              material: params.material,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              operation: params.operation,
            });
            return ok(result);
          }

          case "mill_critical_rootcause": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            const result = millingCriticalThinkingEngine.rootCauseAnalysis(
              params.symptom || "Unknown issue",
              {
                material_iso: params.material_iso,
                operation: params.operation,
                current_params: params.current_params,
              }
            );
            return ok(result);
          }

          case "mill_critical_whatif": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            const result = millingCriticalThinkingEngine.whatIf(
              {
                rpm: params.current_rpm || 3000,
                feed: params.current_feed || 500,
                doc: params.current_doc || 5,
              },
              {
                parameter: params.change_parameter || "rpm",
                delta_percent: params.delta_percent || 10,
              },
              {
                material_iso: params.material_iso,
                operation: params.operation,
              }
            );
            return ok(result);
          }

          // === Milling Hybrid Strategy (MILL-HYBRID-SYNTHESIS) ===
          case "mill_hybrid_synthesize": {
            const { millingHybridStrategySynthesizer } = await import("../../engines/MillingHybridStrategySynthesizer.js");
            const result = millingHybridStrategySynthesizer.synthesize({
              feature_type: params.feature_type || "pocket",
              depth_mm: params.depth_mm,
              width_mm: params.width_mm,
              length_mm: params.length_mm,
              corner_radius_mm: params.corner_radius_mm,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              machine_axes: params.machine_axes,
              max_rpm: params.max_rpm,
              max_feedrate: params.max_feedrate,
              priority: params.priority,
              tool_diameter_mm: params.tool_diameter_mm,
              max_tool_overhang: params.max_tool_overhang,
            });
            return ok(result);
          }

          case "mill_hybrid_quick": {
            const { millingHybridStrategySynthesizer } = await import("../../engines/MillingHybridStrategySynthesizer.js");
            const result = millingHybridStrategySynthesizer.quickRecommend({
              feature_type: params.feature_type || "pocket",
              depth_mm: params.depth_mm,
              corner_radius_mm: params.corner_radius_mm,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
            });
            return ok(result);
          }

          case "mill_hybrid_strategies": {
            const { millingHybridStrategySynthesizer } = await import("../../engines/MillingHybridStrategySynthesizer.js");
            return ok({ strategies: millingHybridStrategySynthesizer.getStrategies() });
          }

          case "mill_hybrid_synergy": {
            const { millingHybridStrategySynthesizer } = await import("../../engines/MillingHybridStrategySynthesizer.js");
            const synergy = millingHybridStrategySynthesizer.getSynergy(
              params.primary || "trochoidal",
              params.secondary || "rest"
            );
            return ok({ synergy });
          }

          // === Milling Neural Cognitive (MILL-NEURAL-AGI) ===
          case "mill_cognitive_process": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            const result = await millingNeuralCognitiveEngine.process({
              query: params.query || "Analyze milling operation",
              intent: params.intent || "recommend",
              material: params.material,
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              operation: params.operation,
              feature_type: params.feature_type,
              current_params: params.current_params,
              constraints: params.constraints,
              machine: params.machine,
              reasoning_depth: params.reasoning_depth,
              require_explanation: params.require_explanation,
              confidence_threshold: params.confidence_threshold,
            });
            return ok(result);
          }

          case "mill_cognitive_quick": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            const result = millingNeuralCognitiveEngine.quickProcess({
              query: params.query || "Quick recommendation",
              intent: params.intent || "recommend",
              material_iso: params.material_iso,
              hardness_hrc: params.hardness_hrc,
              operation: params.operation,
            });
            return ok(result);
          }

          case "mill_cognitive_explain": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            const result = millingNeuralCognitiveEngine.explain(
              {
                query: params.query || "Explain decision",
                intent: "explain",
                material_iso: params.material_iso,
                operation: params.operation,
                hardness_hrc: params.hardness_hrc,
              },
              params.decision || "Selected strategy"
            );
            return ok(result);
          }

          case "mill_cognitive_learn": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            const result = millingNeuralCognitiveEngine.learnFromFeedback(
              {
                query: "Learn from feedback",
                intent: "recommend",
                material_iso: params.material_iso,
              },
              params.prediction || { rpm: 3000, feed: 500, doc: 5 },
              params.actual || { rpm: 3000, feed: 500, doc: 5 },
              params.outcome || { success: true }
            );
            return ok(result);
          }

          case "mill_cognitive_stats": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            return ok(millingNeuralCognitiveEngine.getStats());
          }

          // === JM Die Mill Program Harvester (MILL-HARVEST) ===
          case "mill_harvest_full": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            return ok(jmDieMillProgramHarvesterEngine.harvest());
          }

          case "mill_harvest_customer": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            const result = jmDieMillProgramHarvesterEngine.getCustomerRecommendations(
              params.customer || "FONTANA"
            );
            return ok(result);
          }

          case "mill_harvest_tool": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            const result = jmDieMillProgramHarvesterEngine.getToolRecommendation({
              operation: params.operation || "roughing",
              material: params.material,
              feature: params.feature,
            });
            return ok(result);
          }

          case "mill_harvest_sequence": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            const result = jmDieMillProgramHarvesterEngine.getOperationSequence(
              params.feature || "pocket"
            );
            return ok(result);
          }

          case "mill_harvest_speeds_feeds": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            const result = jmDieMillProgramHarvesterEngine.getSpeedsFeedsRecommendation(
              params.material || "D2"
            );
            return ok(result);
          }

          case "mill_harvest_stats": {
            const { jmDieMillProgramHarvesterEngine } = await import("../../engines/JMDieMillProgramHarvesterEngine.js");
            return ok(jmDieMillProgramHarvesterEngine.getStats());
          }

          // ========== Milling Deep Knowledge Synthesis (MILL-DEEP-SYNTHESIS) ==========
          case "mill_synthesis_full": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            const result = await millingDeepKnowledgeSynthesisEngine.synthesize({
              material: params.material || "4140",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
              tool_diameter_mm: params.tool_diameter_mm,
              tool_type: params.tool_type,
              tool_length_mm: params.tool_length_mm,
              tolerance_mm: params.tolerance_mm,
              surface_finish_ra: params.surface_finish_ra,
              machine: params.machine,
              controller: params.controller,
              customer: params.customer,
              min_confidence: params.min_confidence,
              prefer_conservative: params.prefer_conservative,
              require_physics_validation: params.require_physics_validation,
            });
            return ok(result);
          }

          case "mill_synthesis_quick": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            const result = millingDeepKnowledgeSynthesisEngine.quickSynthesize({
              material: params.material || "4140",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              operation: params.operation || "roughing",
              feature_type: params.feature_type,
            });
            return ok(result);
          }

          case "mill_synthesis_sources": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            return ok(millingDeepKnowledgeSynthesisEngine.getSourceStats());
          }

          case "mill_synthesis_search": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            return ok(millingDeepKnowledgeSynthesisEngine.searchKnowledge(params.query || ""));
          }

          case "mill_synthesis_stats": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            const sourceStats = millingDeepKnowledgeSynthesisEngine.getSourceStats();
            return ok({
              sources: sourceStats.sources.length,
              total_entries: sourceStats.total_entries,
              average_credibility: sourceStats.average_credibility,
              source_breakdown: sourceStats.sources.map(s => ({
                id: s.id,
                entries: s.entries,
                credibility: s.credibility,
              })),
            });
          }

          // ========== Milling Meta-Learning (MILL-META-LEARN) ==========
          case "mill_meta_learn": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            const result = millingMetaLearningEngine.learnFromExperience({
              id: params.id || `EXP-${Date.now()}`,
              timestamp: params.timestamp || new Date().toISOString(),
              operation: params.operation || "roughing",
              material: params.material || "4140",
              material_iso: params.material_iso || "P",
              feature_type: params.feature_type || "pocket",
              tool_type: params.tool_type || "flat_endmill",
              tool_diameter_mm: params.tool_diameter_mm || 12,
              rpm: params.rpm || 3000,
              feed_mm_min: params.feed_mm_min || 500,
              doc_mm: params.doc_mm || 4,
              woc_mm: params.woc_mm || 8,
              success: params.success ?? true,
              cycle_time_min: params.cycle_time_min,
              tool_life_achieved_min: params.tool_life_achieved_min,
              surface_finish_ra: params.surface_finish_ra,
              part_quality_score: params.part_quality_score,
              machine: params.machine,
              customer: params.customer,
              operator_notes: params.operator_notes,
            });
            return ok(result);
          }

          case "mill_meta_feedback": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            const result = millingMetaLearningEngine.processFeedback({
              experience_id: params.experience_id || "",
              outcome: params.outcome || "success",
              metric_scores: params.metric_scores || {},
              operator_feedback: params.operator_feedback,
              root_cause_if_failure: params.root_cause_if_failure,
            });
            return ok(result);
          }

          case "mill_meta_adapt": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            const result = millingMetaLearningEngine.getAdaptiveRecommendation({
              operation: params.operation || "roughing",
              material: params.material || "4140",
              material_iso: params.material_iso || "P",
              feature_type: params.feature_type || "pocket",
              tool_diameter_mm: params.tool_diameter_mm || 12,
              customer: params.customer,
              priority: params.priority,
            });
            return ok(result);
          }

          case "mill_meta_patterns": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            return ok(millingMetaLearningEngine.getPatterns(params.filter_type));
          }

          case "mill_meta_transfers": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            return ok(millingMetaLearningEngine.getTransferMappings(params.source_domain || ""));
          }

          case "mill_meta_assess": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            return ok(millingMetaLearningEngine.selfAssess());
          }

          case "mill_meta_stats": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            return ok(millingMetaLearningEngine.getStats());
          }

          // ========== Milling AGI Master (MILL-AGI-MASTER) ==========
          case "mill_agi_print_to_program": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            const result = await millingAGIMasterEngine.generateFromPrint({
              part_name: params.part_name || "Unnamed Part",
              material: params.material || "4140 Steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              features: params.features || [],
              dimensions: params.dimensions || { length_mm: 100, width_mm: 80, height_mm: 30 },
              tolerances: params.tolerances || [],
              surface_finish_requirements: params.surface_finish_requirements || [],
              machine: params.machine,
              controller: params.controller,
              available_tools: params.available_tools,
              customer: params.customer,
              quantity: params.quantity,
              delivery_date: params.delivery_date,
              inspection_level: params.inspection_level,
              documentation_required: params.documentation_required,
            });
            return ok(result);
          }

          case "mill_agi_quick_recommend": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            const result = millingAGIMasterEngine.quickRecommend({
              operation: params.operation || "roughing",
              material_iso: params.material_iso || "P",
              feature_type: params.feature_type || "pocket",
              tool_diameter_mm: params.tool_diameter_mm || 12,
              depth_mm: params.depth_mm,
            });
            return ok(result);
          }

          case "mill_agi_wisdom": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            return ok(millingAGIMasterEngine.getMasterWisdom(params.category || "general"));
          }

          case "mill_agi_validate": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            const result = millingAGIMasterEngine.validateApproach({
              material_iso: params.material_iso || "P",
              operation: params.operation || "roughing",
              rpm: params.rpm || 3000,
              feed: params.feed || 500,
              doc: params.doc || 4,
              tool_diameter: params.tool_diameter || 12,
            });
            return ok(result);
          }

          case "mill_agi_categories": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            return ok(millingAGIMasterEngine.getWisdomCategories());
          }

          case "mill_agi_stats": {
            const { millingAGIMasterEngine } = await import("../../engines/MillingAGIMasterEngine.js");
            return ok(millingAGIMasterEngine.getStats());
          }

          // ========== Milling End-to-End Orchestration (MILL-E2E) ==========
          case "mill_e2e_execute": {
            const { millingEndToEndOrchestrationEngine } = await import("../../engines/MillingEndToEndOrchestrationEngine.js");
            const result = await millingEndToEndOrchestrationEngine.executeWorkflow({
              job_id: params.job_id,
              part_number: params.part_number || "PART-001",
              revision: params.revision || "A",
              part_name: params.part_name || "Unnamed Part",
              material: params.material || "4140 Steel",
              material_iso: params.material_iso || "P",
              hardness_hrc: params.hardness_hrc,
              geometry_source: params.geometry_source || "print",
              cad_file_path: params.cad_file_path,
              print_file_path: params.print_file_path,
              features: params.features || [],
              dimensions: params.dimensions || { length_mm: 100, width_mm: 80, height_mm: 30, stock_length_mm: 102, stock_width_mm: 82, stock_height_mm: 32 },
              tolerances: params.tolerances || [],
              surface_requirements: params.surface_requirements || [],
              machine: params.machine || "Haas VF-2",
              controller: params.controller || "Haas NGC",
              workholding: params.workholding || "Vise",
              available_tools: params.available_tools || [],
              customer: params.customer || "Unknown",
              quantity: params.quantity || 1,
              priority: params.priority || "standard",
              delivery_date: params.delivery_date || "2026-12-31",
              inspection_level: params.inspection_level || "standard",
              certifications_required: params.certifications_required || [],
              documentation_level: params.documentation_level || "standard",
            });
            return ok(result);
          }

          case "mill_e2e_validate": {
            const { millingEndToEndOrchestrationEngine } = await import("../../engines/MillingEndToEndOrchestrationEngine.js");
            const result = millingEndToEndOrchestrationEngine.validateRequest({
              job_id: params.job_id,
              part_number: params.part_number || "",
              revision: params.revision || "A",
              part_name: params.part_name || "",
              material: params.material || "",
              material_iso: params.material_iso || "",
              geometry_source: params.geometry_source || "print",
              features: params.features || [],
              dimensions: params.dimensions || { length_mm: 0, width_mm: 0, height_mm: 0, stock_length_mm: 0, stock_width_mm: 0, stock_height_mm: 0 },
              tolerances: params.tolerances || [],
              surface_requirements: params.surface_requirements || [],
              machine: params.machine || "",
              controller: params.controller || "",
              workholding: params.workholding || "",
              available_tools: params.available_tools || [],
              customer: params.customer || "",
              quantity: params.quantity || 1,
              priority: params.priority || "standard",
              delivery_date: params.delivery_date || "",
              inspection_level: params.inspection_level || "standard",
              certifications_required: params.certifications_required || [],
              documentation_level: params.documentation_level || "standard",
            });
            return ok(result);
          }

          case "mill_e2e_template": {
            const { millingEndToEndOrchestrationEngine } = await import("../../engines/MillingEndToEndOrchestrationEngine.js");
            return ok(millingEndToEndOrchestrationEngine.getWorkflowTemplate());
          }

          case "mill_e2e_stats": {
            const { millingEndToEndOrchestrationEngine } = await import("../../engines/MillingEndToEndOrchestrationEngine.js");
            return ok(millingEndToEndOrchestrationEngine.getStats());
          }

          // ========== Milling Unified Science Orchestration (MILL-SCIENCE) ==========
          case "mill_science_analyze": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            const result = millingUnifiedScienceOrchestrationEngine.analyzeScientifically(
              params.material || "4140",
              {
                cutting_speed_m_min: params.cutting_speed_m_min || 200,
                feed_per_tooth_mm: params.feed_per_tooth_mm || 0.15,
                axial_depth_mm: params.axial_depth_mm || 4,
                radial_depth_mm: params.radial_depth_mm || 6,
                tool_diameter_mm: params.tool_diameter_mm || 12,
                tool_flutes: params.tool_flutes || 4,
                helix_angle_deg: params.helix_angle_deg || 30,
                rake_angle_deg: params.rake_angle_deg || 10,
                relief_angle_deg: params.relief_angle_deg || 8,
                nose_radius_mm: params.nose_radius_mm || 0.8,
                tool_material: params.tool_material || "carbide",
                coating: params.coating,
                coolant_type: params.coolant_type || "flood",
                coolant_pressure_bar: params.coolant_pressure_bar,
              }
            );
            return ok(result);
          }

          case "mill_science_quick": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            const result = millingUnifiedScienceOrchestrationEngine.quickAnalyze(
              params.material || "4140",
              params.cutting_speed_m_min || 200,
              params.feed_per_tooth_mm || 0.15,
              params.axial_depth_mm || 4,
              params.radial_depth_mm || 6,
              params.tool_diameter_mm || 12
            );
            return ok(result);
          }

          case "mill_science_material": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            if (params.material) {
              return ok(millingUnifiedScienceOrchestrationEngine.getMaterialProperties(params.material));
            }
            return ok(millingUnifiedScienceOrchestrationEngine.getAvailableMaterials());
          }

          case "mill_science_tips": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            if (params.domain) {
              return ok(millingUnifiedScienceOrchestrationEngine.getScientificTips(params.domain));
            }
            return ok(millingUnifiedScienceOrchestrationEngine.getScientificDomains());
          }

          case "mill_science_awareness": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            return ok(millingUnifiedScienceOrchestrationEngine.getSelfAwareness());
          }

          case "mill_science_stats": {
            const { millingUnifiedScienceOrchestrationEngine } = await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js");
            return ok(millingUnifiedScienceOrchestrationEngine.getStats());
          }

          // ========== Milling Production Knowledge Harvester (MILL-HARVEST) ==========
          case "mill_harvest_jmdie": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            const basePath = params.base_path || "H:/PRISM/JM DIE/CNC MILL HAAS";
            const result = await millingProductionKnowledgeHarvesterEngine.harvestJMDieMilling(basePath);
            return ok(result);
          }

          case "mill_harvest_analyze": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            if (!params.file_path) {
              return ok({ error: "file_path required" });
            }
            const result = await millingProductionKnowledgeHarvesterEngine.quickAnalyze(params.file_path);
            return ok(result);
          }

          case "mill_harvest_recommend": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            const result = millingProductionKnowledgeHarvesterEngine.getRecommendedParameters(
              params.material || "4140",
              params.tool_diameter_mm || 12,
              params.operation || "roughing"
            );
            return ok(result);
          }

          case "mill_harvest_validate": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            const result = millingProductionKnowledgeHarvesterEngine.validateParameters(
              params.spindle_rpm || 4000,
              params.feed_mm_min || 500,
              params.doc_mm || 3,
              params.tool_diameter_mm || 12,
              params.flutes || 4,
              params.material || "4140"
            );
            return ok(result);
          }

          case "mill_prod_harvest_tribal": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            const result = millingProductionKnowledgeHarvesterEngine.getTribalKnowledge(
              params.category,
              params.material
            );
            return ok(result);
          }

          case "mill_prod_harvest_stats": {
            const { millingProductionKnowledgeHarvesterEngine } = await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js");
            return ok(millingProductionKnowledgeHarvesterEngine.getStats());
          }

          // ========== Milling AGI Orchestration (MILL-AGI-ORCH) ==========
          case "mill_agi_orch_analyze": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const result = millingAGIOrchestrationEngine.analyzeWithAGI({
              material: params.material || "4140",
              tool_diameter_mm: params.tool_diameter_mm || 12,
              tool_flutes: params.tool_flutes || 4,
              cutting_speed_m_min: params.cutting_speed_m_min || 150,
              feed_per_tooth_mm: params.feed_per_tooth_mm || 0.1,
              axial_depth_mm: params.axial_depth_mm || 4,
              radial_depth_mm: params.radial_depth_mm || 6,
              operation: params.operation || "roughing",
              coolant_type: params.coolant_type,
              tool_coating: params.tool_coating,
              helix_angle_deg: params.helix_angle_deg,
              rake_angle_deg: params.rake_angle_deg,
              corner_radius_mm: params.corner_radius_mm,
            });
            return ok(result);
          }

          case "mill_agi_orch_quick": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const result = millingAGIOrchestrationEngine.quickAnalyze(
              params.material || "4140",
              params.tool_diameter_mm || 12,
              params.cutting_speed_m_min || 150,
              params.feed_per_tooth_mm || 0.1,
              params.axial_depth_mm || 4
            );
            return ok(result);
          }

          case "mill_agi_orch_optimal": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const result = millingAGIOrchestrationEngine.getOptimalParameters(
              params.material || "4140",
              params.operation || "roughing",
              params.tool_diameter_mm || 12,
              params.tool_flutes || 4
            );
            return ok(result);
          }

          case "mill_agi_orch_validate": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const result = millingAGIOrchestrationEngine.validateParameters(
              params.material || "4140",
              params.cutting_speed_m_min || 150,
              params.feed_per_tooth_mm || 0.1,
              params.axial_depth_mm || 4,
              params.tool_diameter_mm || 12
            );
            return ok(result);
          }

          case "mill_agi_orch_awareness": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            return ok(millingAGIOrchestrationEngine.getSelfAwareness());
          }

          case "mill_agi_orch_stats": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            return ok(millingAGIOrchestrationEngine.getStats());
          }

          // ========== Post Processor Unified Deep Reasoning (PP-UNIFIED-AI) ==========
          case "pp_unified_reason": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning({
              problem: params.problem || "Generate optimized post processor",
              controller: params.controller || "fanuc",
              camSource: params.cam_source,
              machineCapabilities: params.machine_capabilities,
              constraints: params.constraints,
              targetMetrics: params.target_metrics,
              maxReasoningDepth: params.max_depth || 10,
              explorationStrategy: params.strategy || "bfs",
              tribalKnowledgeWeight: params.tribal_weight,
              physicsWeight: params.physics_weight,
              enableCounterfactual: params.enable_counterfactual ?? true,
              enableMetaCognition: params.enable_meta_cognition ?? true
            });
            return ok(result);
          }

          case "pp_unified_mcts": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            const result = postProcessorUnifiedDeepReasoningEngine.performMCTSExploration({
              problem: params.problem || "Optimize post processor configuration",
              controller: params.controller || "fanuc"
            }, params.simulations || 500);
            return ok(result);
          }

          case "pp_unified_controller_info": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            const stats = postProcessorUnifiedDeepReasoningEngine.getStatistics();
            return ok({
              controllersSupported: stats.controllersSupported,
              availableControllers: [
                "fanuc", "fanuc_oi", "fanuc_31i",
                "siemens", "siemens_840d",
                "haas", "haas_ngc",
                "okuma", "okuma_osp", "okuma_osp_p300",
                "mazak", "mazak_mazatrol",
                "mitsubishi", "mitsubishi_m80",
                "heidenhain", "heidenhain_tnc",
                "hurco", "hurco_winmax",
                "brother", "brother_c00",
                "generic"
              ]
            });
          }

          case "pp_unified_machine_profile": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            const stats = postProcessorUnifiedDeepReasoningEngine.getStatistics();
            return ok({
              jmDieMachines: stats.jmDieMachines,
              machines: [
                { id: "okuma-lb15ii", name: "Okuma LB15II", controller: "okuma_osp", type: "lathe" },
                { id: "okuma-lb15ii-m", name: "Okuma LB15II-M", controller: "okuma_osp", type: "lathe" },
                { id: "okuma-captain", name: "Okuma Captain L370", controller: "okuma_osp", type: "lathe" },
                { id: "hurco-vmx42", name: "Hurco VMX42", controller: "hurco_winmax", type: "mill" },
                { id: "haas-vf2", name: "Haas VF-2", controller: "haas_ngc", type: "mill" },
                { id: "haas-vf3", name: "Haas VF-3", controller: "haas_ngc", type: "mill" },
                { id: "okuma-genos", name: "Okuma Genos M460V", controller: "okuma_osp_p300", type: "mill" },
                { id: "mitsubishi-sinker", name: "Mitsubishi EA8", controller: "mitsubishi_m80", type: "edm" },
                { id: "mitsubishi-wire", name: "Mitsubishi MV1200S", controller: "mitsubishi_m80", type: "edm" }
              ]
            });
          }

          case "pp_unified_validate_physics": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning({
              problem: params.problem || "Validate physics constraints",
              controller: params.controller || "generic",
              targetMetrics: { safety: params.safety_threshold || 0.8 },
              enableCounterfactual: false,
              enableMetaCognition: false
            });
            return ok({
              physicsValidation: result.physicsValidation,
              safety: result.metrics.safety,
              confidence: result.metrics.confidence
            });
          }

          case "pp_unified_stats": {
            const { postProcessorUnifiedDeepReasoningEngine } = await import("../../engines/PostProcessorUnifiedDeepReasoningEngine.js");
            return ok(postProcessorUnifiedDeepReasoningEngine.getStatistics());
          }

          // ========== Post Processor Cognitive AGI (PP-COGNITIVE-AGI) ==========
          case "pp_cognitive_generate": {
            const { postProcessorCognitiveEngine } = await import("../../engines/PostProcessorCognitiveEngine.js");
            const result = await postProcessorCognitiveEngine.generateCognitively({
              problem: params.problem || "Generate post processor output",
              controller: params.controller || "fanuc",
              camSystem: params.cam_system,
              machineProfile: params.machine_profile,
              toolpathIntent: params.toolpath_intent,
              constraints: params.constraints,
              qualityTarget: params.quality_target,
              safetyTarget: params.safety_target
            });
            return ok(result);
          }

          case "pp_cognitive_explain": {
            const { postProcessorCognitiveEngine } = await import("../../engines/PostProcessorCognitiveEngine.js");
            const result = await postProcessorCognitiveEngine.generateCognitively({
              problem: params.problem || "Explain post processor generation",
              controller: params.controller || "fanuc"
            });
            return ok({
              explanation: result.explanation,
              cognitiveTrace: result.cognitiveTrace,
              metacognition: result.metacognitiveAssessment
            });
          }

          case "pp_cognitive_learn": {
            const { postProcessorCognitiveEngine } = await import("../../engines/PostProcessorCognitiveEngine.js");
            postProcessorCognitiveEngine.storeEpisodicMemory({
              timestamp: Date.now(),
              context: {
                controller: params.controller || "generic",
                machineModel: params.machine_model || "unknown",
                camSystem: params.cam_system || "generic",
                operation: params.operation || "unknown"
              },
              event: {
                inputRequest: params.request || "",
                generatedCode: params.generated_code || [],
                outcome: params.outcome || "success",
                feedback: params.feedback
              },
              emotionalTag: params.importance || 0.5
            });
            return ok({ success: true, message: "Episodic memory stored" });
          }

          case "pp_cognitive_recall": {
            const { postProcessorCognitiveEngine } = await import("../../engines/PostProcessorCognitiveEngine.js");
            const stats = postProcessorCognitiveEngine.getStatistics();
            return ok({
              episodicMemoryCount: stats.episodicMemoryCount,
              controllersModeled: stats.controllersModeled,
              capabilities: stats.capabilities
            });
          }

          case "pp_cognitive_stats": {
            const { postProcessorCognitiveEngine } = await import("../../engines/PostProcessorCognitiveEngine.js");
            return ok(postProcessorCognitiveEngine.getStatistics());
          }

          // ===== LATHE-AI: Lathe Intelligence Giants (12 actions) =====
          case "lathe_ai_what_can_i_do": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const query = params.query as string || params.task as string || "general lathe operations";
            return ok(latheSelfAwarenessIntegrationEngine.whatCanIDo(query));
          }
          case "lathe_ai_how_do_i": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const task = params.task as string;
            return ok(latheSelfAwarenessIntegrationEngine.howDoI(task));
          }
          case "lathe_ai_who_handles": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const domain = params.domain as string;
            return ok(latheSelfAwarenessIntegrationEngine.whoHandles(domain));
          }
          case "lathe_ai_inventory": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            return ok(latheSelfAwarenessIntegrationEngine.getLatheInventory());
          }
          case "lathe_ai_find_best_engine": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const task = params.task as string;
            return ok(latheSelfAwarenessIntegrationEngine.findBestEngineForTask(task));
          }
          case "lathe_ai_orchestrate": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            return ok(latheSelfAwarenessIntegrationEngine.orchestrateMultiEngine(params as any));
          }
          case "lathe_ai_jm_die_learn": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const customer = params.customer as string;
            const material = params.material as string | undefined;
            const operation = params.operation as string | undefined;
            return ok(latheSelfAwarenessIntegrationEngine.learnFromJMDie(customer, material, operation));
          }
          case "lathe_ai_cross_domain": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            return ok(latheSelfAwarenessIntegrationEngine.synthesizeCrossDomain(params as any));
          }
          case "lathe_ai_suggest_approach": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const problem = params.problem as string || params.task as string;
            return ok(latheSelfAwarenessIntegrationEngine.suggestOptimalApproach(problem));
          }
          case "lathe_ai_deep_logic": {
            const { latheDeepLogicEngine } = await import("../../engines/LatheDeepLogicEngine.js");
            const query = params.query as string || params.problem as string;
            const depth = params.depth as string || "comprehensive";
            return ok(latheDeepLogicEngine.reason(query, depth as any));
          }
          case "lathe_ai_thermodynamics": {
            const { latheThermodynamicsEngine } = await import("../../engines/LatheThermodynamicsEngine.js");
            return ok(latheThermodynamicsEngine.analyze(params as any));
          }
          case "lathe_ai_proactive": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            return ok(latheSelfAwarenessIntegrationEngine.getProactiveRecommendations(params as any));
          }

          // ========== PP-AGI-S0/U-S0-07: 11 Reasoning Engine Giants ==========
          // BeliefStateReasoningEngine (8 actions)
          case "belief_set": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok(beliefStateReasoningEngine.set(params.id as string, params.distribution as any, params.description, params.at));
          }
          case "belief_get": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok(beliefStateReasoningEngine.get(params.id as string));
          }
          case "belief_update": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok(beliefStateReasoningEngine.update(params.id as string, params.likelihood as any, params.at));
          }
          case "belief_top_k": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok(beliefStateReasoningEngine.topK(params.id as string, params.k as number | undefined));
          }
          case "belief_entropy": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok({ entropy: beliefStateReasoningEngine.entropy(params.id as string) });
          }
          case "belief_probability": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok({ probability: beliefStateReasoningEngine.probabilityOf(params.id as string, params.state as string) });
          }
          case "belief_list": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            return ok(beliefStateReasoningEngine.list());
          }
          case "belief_clear": {
            const { beliefStateReasoningEngine } = await import("../../engines/BeliefStateReasoningEngine.js");
            beliefStateReasoningEngine.clear();
            return ok({ success: true });
          }

          // CausalReasoningEngine (5 actions)
          case "causal_add_edge": {
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            return ok(causalReasoningEngine.addEdge(params as any));
          }
          case "causal_trace_impact": {
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            return ok(causalReasoningEngine.traceImpact(params.source as string, params.maxHops as number | undefined));
          }
          case "causal_root_causes": {
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            return ok({ rootCauses: causalReasoningEngine.rootCauses(params.target as string, params.maxHops as number | undefined) });
          }
          case "causal_stats": {
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            return ok({ nodes: causalReasoningEngine.nodeCount(), edges: causalReasoningEngine.edgeCount() });
          }
          case "causal_clear": {
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            causalReasoningEngine.clear();
            return ok({ success: true });
          }

          // CounterfactualReasoningEngine (5 actions)
          case "counterfactual_create": {
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            return ok(counterfactualReasoningEngine.createCausalGraph(params as any));
          }
          case "counterfactual_generate": {
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            return ok(counterfactualReasoningEngine.generateCounterfactual(params as any));
          }
          case "counterfactual_compare": {
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            return ok(counterfactualReasoningEngine.compareScenarios(params.graphId as string));
          }
          case "counterfactual_root_cause": {
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            return ok(counterfactualReasoningEngine.analyzeRootCause(params as any));
          }
          case "counterfactual_templates": {
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            return ok(counterfactualReasoningEngine.getMachiningTemplates());
          }

          // PRISMCreativeReasoningEngine (4 actions)
          case "creative_explore": {
            const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
            return ok(prismCreativeReasoningEngine.explore(params.problem as any, params.mode as any));
          }
          case "creative_capabilities": {
            const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
            return ok(prismCreativeReasoningEngine.getCapabilitySummary());
          }
          case "creative_history": {
            const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
            return ok(prismCreativeReasoningEngine.getHistory());
          }
          case "creative_summary": {
            const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
            return ok({ summary: prismCreativeReasoningEngine.getSummary() });
          }

          // ScientificReasoningEngine (4 actions)
          case "sci_dimension_check": {
            const { scientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
            return ok(scientificReasoningEngine.checkDimensionalConsistency(params as any));
          }
          case "sci_validate_formula": {
            const { scientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
            return ok(scientificReasoningEngine.validateFormula(params as any));
          }
          case "sci_reason": {
            const { scientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
            return ok(scientificReasoningEngine.reason(params as any));
          }
          case "sci_reason_material": {
            const { scientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
            return ok(scientificReasoningEngine.reasonMaterial(params as any));
          }

          // TemporalReasoningEngine (6 actions)
          case "temporal_record": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok(temporalReasoningEngine.record(params.series as string, params.value as number, params.at, params.note));
          }
          case "temporal_snapshots": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok(temporalReasoningEngine.snapshots(params.series as string));
          }
          case "temporal_value_at": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok({ value: temporalReasoningEngine.valueAt(params.series as string, params.iso as string) });
          }
          case "temporal_project": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok(temporalReasoningEngine.project(params.series as string, params.windowSize as number | undefined));
          }
          case "temporal_forecast": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok(temporalReasoningEngine.forecast(params.series as string, params.target as number, params.windowSize, params.nowIso));
          }
          case "temporal_list": {
            const { temporalReasoningEngine } = await import("../../engines/TemporalReasoningEngine.js");
            return ok({ series: temporalReasoningEngine.listSeries() });
          }

          // ReasoningExplainerEngine (3 actions)
          case "explain_recommendation": {
            const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
            return ok({ explanation: reasoningExplainerEngine.explainWhy(params.recommendation as string, params.chain as any, params.audience) });
          }
          case "explain_formula": {
            const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
            return ok({ explanation: reasoningExplainerEngine.explainFormula(params.formula as string, params.audience) });
          }
          case "explain_reading_level": {
            const { reasoningExplainerEngine } = await import("../../engines/ReasoningExplainerEngine.js");
            return ok({ label: reasoningExplainerEngine.getReadingLevelLabel(params.grade as number) });
          }

          // LatheAIReasoningEngine (4 actions)
          case "lathe_reasoning": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            return ok(await latheAIReasoningEngine.reason(params as any));
          }
          case "lathe_reasoning_sequence": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            return ok(latheAIReasoningEngine.optimizeSequence(params.operations as any));
          }
          case "lathe_reasoning_params": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            return ok(latheAIReasoningEngine.optimizeParameters(params as any));
          }
          case "lathe_reasoning_controller": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            return ok(latheAIReasoningEngine.getControllerRecommendations(params.controller as string));
          }

          // WEDMAnalogicalReasoningEngine (4 actions)
          case "wedm_analogy_add": {
            const { wedmAnalogicalReasoningEngine } = await import("../../engines/WEDMAnalogicalReasoningEngine.js");
            wedmAnalogicalReasoningEngine.addCase(params as any);
            return ok({ success: true, size: wedmAnalogicalReasoningEngine.size() });
          }
          case "wedm_analogy_retrieve": {
            const { wedmAnalogicalReasoningEngine } = await import("../../engines/WEDMAnalogicalReasoningEngine.js");
            return ok(wedmAnalogicalReasoningEngine.retrieve(params as any));
          }
          case "wedm_analogy_all": {
            const { wedmAnalogicalReasoningEngine } = await import("../../engines/WEDMAnalogicalReasoningEngine.js");
            return ok(wedmAnalogicalReasoningEngine.allCases());
          }
          case "wedm_analogy_size": {
            const { wedmAnalogicalReasoningEngine } = await import("../../engines/WEDMAnalogicalReasoningEngine.js");
            return ok({ size: wedmAnalogicalReasoningEngine.size() });
          }

          // WEDMReasoningBridgeEngine (4 actions)
          case "wedm_bridge_enrich": {
            const { wedmReasoningBridgeEngine } = await import("../../engines/WEDMReasoningBridgeEngine.js");
            return ok(wedmReasoningBridgeEngine.enrichContext(params as any));
          }
          case "wedm_bridge_decision": {
            const { wedmReasoningBridgeEngine } = await import("../../engines/WEDMReasoningBridgeEngine.js");
            wedmReasoningBridgeEngine.postDecision(params as any);
            return ok({ success: true });
          }
          case "wedm_bridge_warning": {
            const { wedmReasoningBridgeEngine } = await import("../../engines/WEDMReasoningBridgeEngine.js");
            wedmReasoningBridgeEngine.postWarning(params as any);
            return ok({ success: true });
          }
          case "wedm_bridge_stats": {
            const { wedmReasoningBridgeEngine } = await import("../../engines/WEDMReasoningBridgeEngine.js");
            return ok(wedmReasoningBridgeEngine.getStats());
          }

          // WEDMReasoningTraceLedgerEngine (4 actions)
          case "wedm_trace_record": {
            const { wedmReasoningTraceLedgerEngine } = await import("../../engines/WEDMReasoningTraceLedgerEngine.js");
            return ok(await wedmReasoningTraceLedgerEngine.recordTrace(params as any));
          }
          case "wedm_trace_recent": {
            const { wedmReasoningTraceLedgerEngine } = await import("../../engines/WEDMReasoningTraceLedgerEngine.js");
            return ok(wedmReasoningTraceLedgerEngine.getRecent(params.limit as number | undefined));
          }
          case "wedm_trace_query": {
            const { wedmReasoningTraceLedgerEngine } = await import("../../engines/WEDMReasoningTraceLedgerEngine.js");
            return ok(wedmReasoningTraceLedgerEngine.queryByDispatcher(params.dispatcher as string, params.limit as number | undefined));
          }
          case "wedm_trace_validate": {
            const { wedmReasoningTraceLedgerEngine } = await import("../../engines/WEDMReasoningTraceLedgerEngine.js");
            return ok(wedmReasoningTraceLedgerEngine.validate(params.candidate as any));
          }

          // MillingReasoningTraceLedgerEngine (5 actions) — MILL-AGI-P0.2
          case "milling_trace_record": {
            const { millingReasoningTraceLedgerEngine } = await import("../../engines/MillingReasoningTraceLedgerEngine.js");
            return ok(await millingReasoningTraceLedgerEngine.recordTrace(params as any));
          }
          case "milling_trace_recent": {
            const { millingReasoningTraceLedgerEngine } = await import("../../engines/MillingReasoningTraceLedgerEngine.js");
            return ok(millingReasoningTraceLedgerEngine.getRecent(params.limit as number | undefined));
          }
          case "milling_trace_query": {
            const { millingReasoningTraceLedgerEngine } = await import("../../engines/MillingReasoningTraceLedgerEngine.js");
            return ok(millingReasoningTraceLedgerEngine.queryByAction(params.action as string, params.limit as number | undefined));
          }
          case "milling_trace_stats": {
            const { millingReasoningTraceLedgerEngine } = await import("../../engines/MillingReasoningTraceLedgerEngine.js");
            return ok(millingReasoningTraceLedgerEngine.getStats());
          }
          case "milling_trace_with_reasoning": {
            const { millingReasoningTraceLedgerEngine } = await import("../../engines/MillingReasoningTraceLedgerEngine.js");
            return ok(millingReasoningTraceLedgerEngine.queryWithReasoning(params.limit as number | undefined));
          }

          // MillingReasoningDefaultEngine (2 actions) — MILL-AGI-P0.2-01
          case "milling_reason_default": {
            const { millingReasoningDefaultEngine } = await import("../../engines/MillingReasoningDefaultEngine.js");
            return ok(await millingReasoningDefaultEngine.reason(params as any));
          }
          case "milling_reason_chain": {
            const { millingReasoningDefaultEngine } = await import("../../engines/MillingReasoningDefaultEngine.js");
            return ok(await millingReasoningDefaultEngine.reasonWithChain(params as any));
          }

          // UpstreamValidationHandshakeEngine (2 actions) — MILL-AGI-P1.3-01
          case "milling_upstream_validate": {
            const { upstreamValidationHandshakeEngine } = await import("../../engines/UpstreamValidationHandshakeEngine.js");
            return ok(await upstreamValidationHandshakeEngine.validateSingle(params.validator as any, params.context as any));
          }
          case "milling_handshake_all": {
            const { upstreamValidationHandshakeEngine } = await import("../../engines/UpstreamValidationHandshakeEngine.js");
            return ok(await upstreamValidationHandshakeEngine.validateAll(params as any));
          }

          // HSMDwellAtCornerEngine (3 actions) — MILL-AGI-P2/MS7-04
          case "hsm_analyze_dwell": {
            const { HSMDwellAtCornerEngine } = await import("../../engines/HSMDwellAtCornerEngine.js");
            return ok(HSMDwellAtCornerEngine.analyzeDwell(params.corner as any, params.servo as any, params.hsm_params as any));
          }
          case "hsm_optimize_corner": {
            const { HSMDwellAtCornerEngine } = await import("../../engines/HSMDwellAtCornerEngine.js");
            return ok(HSMDwellAtCornerEngine.optimizeCorner(params.corner as any, params.servo as any, params.hsm_params as any));
          }
          case "hsm_corner_feed": {
            const { HSMDwellAtCornerEngine } = await import("../../engines/HSMDwellAtCornerEngine.js");
            return ok(HSMDwellAtCornerEngine.calculateCornerFeed(params.angle_rad as number, params.base_feed as number, params.max_accel as number));
          }

          // MicroMillingSizeEffectEngine (3 actions) — MILL-AGI-P2/MS7-05
          case "micro_size_effect": {
            const { MicroMillingSizeEffectEngine } = await import("../../engines/MicroMillingSizeEffectEngine.js");
            return ok(MicroMillingSizeEffectEngine.calculateSizeEffect(params.tool as any, params.cut as any, params.material as any));
          }
          case "micro_chip_formation": {
            const { MicroMillingSizeEffectEngine } = await import("../../engines/MicroMillingSizeEffectEngine.js");
            return ok(MicroMillingSizeEffectEngine.analyzeChipFormation(params.tool as any, params.cut as any, params.material as any));
          }
          case "micro_recommend": {
            const { MicroMillingSizeEffectEngine } = await import("../../engines/MicroMillingSizeEffectEngine.js");
            return ok(MicroMillingSizeEffectEngine.recommend(params.tool as any, params.material as any));
          }

          // MillingInferenceOrchestratorEngine (2 actions) — MILL-AGI-P0.5
          case "milling_inference_orchestrate": {
            const { millingInferenceOrchestratorEngine } = await import("../../engines/MillingInferenceOrchestratorEngine.js");
            return ok(await millingInferenceOrchestratorEngine.orchestrate?.(params as any) ?? millingInferenceOrchestratorEngine.predict?.(params as any));
          }
          case "milling_inference_status": {
            const { millingInferenceOrchestratorEngine } = await import("../../engines/MillingInferenceOrchestratorEngine.js");
            return ok(millingInferenceOrchestratorEngine.getStatus?.() ?? { status: "available" });
          }

          // MillingDigitalTwinEngine (3 actions) — MILL-AGI-P0.5
          case "milling_twin_sync": {
            const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
            return ok(await millingDigitalTwinEngine.sync?.(params as any) ?? millingDigitalTwinEngine.updateState?.(params as any));
          }
          case "milling_twin_state": {
            const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
            return ok(millingDigitalTwinEngine.getState?.() ?? millingDigitalTwinEngine.getCurrentState?.());
          }
          case "milling_twin_simulate": {
            const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
            return ok(await millingDigitalTwinEngine.simulate?.(params as any));
          }

          // MillingAIUltraIntelligenceEngine (6 actions) — MILL-AI-MS1
          case "milling_ai_nl": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(await millingAIUltraIntelligenceEngine.processNL?.(params as any));
          }
          case "milling_ai_strategy": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(millingAIUltraIntelligenceEngine.recommendStrategy?.(params as any));
          }
          case "milling_ai_predict": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(millingAIUltraIntelligenceEngine.predictToolLife?.(params as any));
          }
          case "milling_ai_score": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(millingAIUltraIntelligenceEngine.scoreToolpath?.(params as any));
          }
          case "milling_ai_explain": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(millingAIUltraIntelligenceEngine.explain?.(params as any));
          }
          case "milling_ai_troubleshoot": {
            const { millingAIUltraIntelligenceEngine } = await import("../../engines/MillingAIUltraIntelligenceEngine.js");
            return ok(await millingAIUltraIntelligenceEngine.troubleshoot?.(params as any));
          }

          // MillingAIIntegrationEngine (3 actions) — MILL-AI-MS2
          case "milling_jmdie_search": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            return ok(await millingAIIntegrationEngine.searchPrograms?.(params as any) ?? millingAIIntegrationEngine.search?.(params as any));
          }
          case "milling_jmdie_learn": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            return ok(await millingAIIntegrationEngine.learnFromProgram?.(params as any));
          }
          case "milling_jmdie_recommend": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            return ok(millingAIIntegrationEngine.recommendFromHistory?.(params as any) ?? millingAIIntegrationEngine.recommend?.(params as any));
          }

          // MillingDeepAIHardeningEngine (3 actions) — MILL-AI-MS3
          case "milling_deep_harden": {
            const { millingDeepAIHardeningEngine } = await import("../../engines/MillingDeepAIHardeningEngine.js");
            return ok(await millingDeepAIHardeningEngine.harden?.(params as any));
          }
          case "milling_deep_validate": {
            const { millingDeepAIHardeningEngine } = await import("../../engines/MillingDeepAIHardeningEngine.js");
            return ok(millingDeepAIHardeningEngine.validate?.(params as any));
          }
          case "milling_deep_optimize": {
            const { millingDeepAIHardeningEngine } = await import("../../engines/MillingDeepAIHardeningEngine.js");
            return ok(await millingDeepAIHardeningEngine.optimize?.(params as any));
          }

          // MillingMachineIntelligenceEngine (4 actions) — MILL-AI-MS4
          case "milling_machine_profile": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            return ok(millingMachineIntelligenceEngine.getMachineProfile?.(params as any) ?? millingMachineIntelligenceEngine.getProfile?.(params as any));
          }
          case "milling_machine_select": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            return ok(millingMachineIntelligenceEngine.selectMachine?.(params as any));
          }
          case "milling_machine_compare": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            return ok(millingMachineIntelligenceEngine.compareMachines?.(params as any));
          }
          case "milling_machine_capability": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            return ok(millingMachineIntelligenceEngine.checkCapability?.(params as any) ?? millingMachineIntelligenceEngine.getCapabilities?.(params as any));
          }

          // ============================================================
          // INTEL-OLLAMA-OBSIDIAN-MS0 / P5-U01..U04: orphan reasoning engines
          // Each was previously built but had NO dispatcher wiring (5-agent
          // forge-audit finding). These four bring them online; P5-U05
          // (DiagnosticReasoningEngine) lives on intelligenceDispatcher
          // since the engine targets shop-floor diagnosis.
          // ============================================================

          // P5-U01 — PRISMCreativeReasoningEngine.explore
          // Required: domain, objective, desiredOutcome, flexibility
          // Optional: constraints[], currentApproach, mode (default: "exploratory")
          case "creative_solve": {
            const required = ["domain", "objective", "desiredOutcome", "flexibility"] as const;
            const missing = required.filter((k) => params[k] === undefined || params[k] === null);
            if (missing.length > 0) {
              return ok({ error: `creative_solve missing required params: ${missing.join(", ")}` });
            }
            const validFlex = ["strict", "moderate", "flexible", "maximum"];
            if (!validFlex.includes(String(params.flexibility))) {
              return ok({ error: `creative_solve flexibility must be one of ${validFlex.join("|")}` });
            }
            const { prismCreativeReasoningEngine } = await import("../../engines/PRISMCreativeReasoningEngine.js");
            const result = prismCreativeReasoningEngine.explore(
              {
                domain: params.domain,
                objective: String(params.objective),
                constraints: Array.isArray(params.constraints) ? params.constraints.map(String) : [],
                currentApproach: typeof params.currentApproach === "string" ? params.currentApproach : undefined,
                desiredOutcome: String(params.desiredOutcome),
                flexibility: params.flexibility,
              },
              typeof params.mode === "string" ? (params.mode as any) : "exploratory",
            );
            return ok(result);
          }

          // P5-U02 — CausalReasoningEngine
          // Mode 1: traceImpact — required: source, optional: maxHops (default 3)
          // Mode 2: rootCauses  — required: target, optional: maxHops (default 3)
          // Optional: edges[] to seed the graph before tracing.
          case "causal_analyze": {
            const hasSource = typeof params.source === "string" && params.source.length > 0;
            const hasTarget = typeof params.target === "string" && params.target.length > 0;
            if (!hasSource && !hasTarget) {
              return ok({ error: "causal_analyze requires either 'source' (traceImpact) or 'target' (rootCauses)" });
            }
            if (hasSource && hasTarget) {
              return ok({ error: "causal_analyze: pass either source OR target, not both" });
            }
            const maxHopsRaw = params.maxHops;
            const maxHops = Number.isFinite(maxHopsRaw) && Number(maxHopsRaw) > 0 ? Math.min(20, Math.floor(Number(maxHopsRaw))) : 3;
            const { causalReasoningEngine } = await import("../../engines/CausalReasoningEngine.js");
            // Seed edges only if explicitly requested. The caller takes
            // responsibility for not corrupting the shared singleton.
            // CausalEdge shape (per CausalReasoningEngine.ts): {from, to, confidence ∈ [0,1], polarity, reason?}.
            if (Array.isArray(params.edges)) {
              const validPolarities = ["positive", "negative", "unknown"];
              for (const e of params.edges as Array<{ from: string; to: string; confidence?: number; polarity?: string; reason?: string }>) {
                if (typeof e?.from !== "string" || typeof e?.to !== "string") continue;
                if (e.from === e.to) continue;
                const confidence = typeof e.confidence === "number" && Number.isFinite(e.confidence) ? Math.max(0, Math.min(1, e.confidence)) : 0.7;
                const polarity = validPolarities.includes(String(e.polarity)) ? (e.polarity as any) : "positive";
                causalReasoningEngine.addEdge({
                  from: e.from,
                  to: e.to,
                  confidence,
                  polarity,
                  reason: typeof e.reason === "string" ? e.reason : undefined,
                });
              }
            }
            if (hasSource) {
              return ok({ mode: "traceImpact", source: params.source, maxHops, report: causalReasoningEngine.traceImpact(params.source, maxHops) });
            }
            return ok({ mode: "rootCauses", target: params.target, maxHops, causes: causalReasoningEngine.rootCauses(params.target, maxHops) });
          }

          // P5-U03 — CounterfactualReasoningEngine
          // Required: variables[], variable, counterfactual_value
          // Optional: domain (default "machining")
          case "counterfactual_predict": {
            if (!Array.isArray(params.variables) || params.variables.length === 0) {
              return ok({ error: "counterfactual_predict requires 'variables[]' (CausalVariable[])" });
            }
            if (typeof params.variable !== "string" || params.variable.length === 0) {
              return ok({ error: "counterfactual_predict requires 'variable' (target name) string" });
            }
            if (params.counterfactual_value === undefined || params.counterfactual_value === null) {
              return ok({ error: "counterfactual_predict requires 'counterfactual_value' (number|string|boolean)" });
            }
            const validDomains = ["machining", "edm", "grinding", "custom"];
            const domain = validDomains.includes(String(params.domain)) ? params.domain : "machining";
            const { counterfactualReasoningEngine } = await import("../../engines/CounterfactualReasoningEngine.js");
            const graph = counterfactualReasoningEngine.createCausalGraph(params.variables as any, domain as any);
            const counterfactual = counterfactualReasoningEngine.generateCounterfactual(
              graph.id,
              params.variable,
              params.counterfactual_value as number | string | boolean,
            );
            if (counterfactual === null) {
              return ok({ error: `counterfactual_predict: variable '${params.variable}' not found in graph`, graphId: graph.id });
            }
            return ok({ graphId: graph.id, domain, counterfactual });
          }

          // P5-U04 — ScientificReasoningEngine.reason
          // Required: problem (string), inputs (Record<string, PhysicalQuantity>),
          //           calculationType (string)
          case "scientific_reason": {
            if (typeof params.problem !== "string" || params.problem.length === 0) {
              return ok({ error: "scientific_reason requires non-empty 'problem' string" });
            }
            if (!params.inputs || typeof params.inputs !== "object") {
              return ok({ error: "scientific_reason requires 'inputs' (Record<string, PhysicalQuantity>)" });
            }
            if (typeof params.calculationType !== "string" || params.calculationType.length === 0) {
              return ok({ error: "scientific_reason requires non-empty 'calculationType' string" });
            }
            const { scientificReasoningEngine } = await import("../../engines/ScientificReasoningEngine.js");
            const reasoning = scientificReasoningEngine.reason(
              params.problem,
              params.inputs as any,
              params.calculationType,
            );
            return ok(reasoning);
          }

          // P20-U03 — ModelRouterEngine.routeForTask
          // Required: kind (TaskKind enum)
          // Optional: complexity, promptTokens, hasImage, needsChainOfThought, domain, forceTier
          case "model_route": {
            if (typeof params.kind !== "string" || params.kind.length === 0) {
              return ok({ error: "model_route requires 'kind' string (embed|code|reason|vision|review|general)" });
            }
            const { modelRouterEngine } = await import("../../engines/ModelRouterEngine.js");
            try {
              const decision = modelRouterEngine.routeForTask({
                kind: params.kind,
                complexity: params.complexity,
                promptTokens: params.promptTokens,
                hasImage: params.hasImage,
                needsChainOfThought: params.needsChainOfThought,
                domain: params.domain,
                forceTier: params.forceTier,
                consensus: params.consensus,
              });
              return ok(decision);
            } catch (e) {
              return ok({ error: `model_route: ${(e as Error).message}` });
            }
          }

          // OCTOPUS-CONSENSUS — MultiModelConsensusEngine.ask
          // Required: prompt
          // Optional: context, includeClaude, ollamaModel, codexModel, codexEffort,
          //           timeoutMs, mode (compare|vote), voteOptions[]
          case "consensus": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "consensus requires non-empty 'prompt' string" });
            }
            const { multiModelConsensusEngine } = await import("../../engines/MultiModelConsensusEngine.js");
            try {
              const result = await multiModelConsensusEngine.ask({
                prompt: params.prompt,
                context: params.context,
                includeClaude: params.includeClaude !== false,
                ollamaModel: params.ollamaModel,
                codexModel: params.codexModel,
                codexEffort: params.codexEffort,
                timeoutMs: params.timeoutMs,
                mode: params.mode,
                voteOptions: params.voteOptions,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `consensus: ${(e as Error).message}` });
            }
          }

          // OCTOPUS-CONSENSUS — CodexClientEngine.exec (single-model gpt-5.5 entry)
          // Required: prompt
          // Optional: model (default gpt-5.5), reasoningEffort (default xhigh),
          //           sandbox (default read-only), timeoutMs (default 120s)
          case "codex_exec": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "codex_exec requires non-empty 'prompt' string" });
            }
            const { codexClientEngine } = await import("../../engines/CodexClientEngine.js");
            try {
              const result = await codexClientEngine.exec({
                prompt: params.prompt,
                model: params.model,
                reasoningEffort: params.reasoningEffort,
                sandbox: params.sandbox,
                timeoutMs: params.timeoutMs,
                workdir: params.workdir,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `codex_exec: ${(e as Error).message}` });
            }
          }

          // OCTOPUS-CONSENSUS — GrokClientEngine.exec (single-model grok-4 entry)
          // Required: prompt
          // Optional: model (default grok-4), reasoningEffort (low|medium|high, default medium),
          //           system, temperature, maxTokens, timeoutMs (default 60s).
          // XAI_API_KEY env var is required (or pass apiKey explicitly via params.apiKey).
          case "grok_exec": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "grok_exec requires non-empty 'prompt' string" });
            }
            const { grokClientEngine } = await import("../../engines/GrokClientEngine.js");
            try {
              const result = await grokClientEngine.exec({
                prompt: params.prompt,
                model: params.model,
                apiKey: params.apiKey,
                reasoningEffort: params.reasoningEffort,
                system: params.system,
                temperature: params.temperature,
                maxTokens: params.maxTokens,
                timeoutMs: params.timeoutMs,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `grok_exec: ${(e as Error).message}` });
            }
          }

          // LAYER-3-GEMINI — GeminiClientEngine.exec (single-model gemini-2.0-flash-exp entry)
          // Required: prompt
          // Optional: model, reasoningEffort (low|medium|high|xhigh), system, temperature, maxOutputTokens, timeoutMs.
          // GEMINI_API_KEY env var or apiKey param required (free tier at https://aistudio.google.com/app/apikey).
          case "gemini_exec": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "gemini_exec requires non-empty 'prompt' string" });
            }
            const { geminiClientEngine } = await import("../../engines/GeminiClientEngine.js");
            try {
              const result = await geminiClientEngine.exec({
                prompt: params.prompt,
                model: params.model,
                apiKey: params.apiKey,
                reasoningEffort: params.reasoningEffort,
                system: params.system,
                temperature: params.temperature,
                maxOutputTokens: params.maxOutputTokens,
                timeoutMs: params.timeoutMs,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `gemini_exec: ${(e as Error).message}` });
            }
          }

          // LAYER-3-RECALL-CACHE — ConsensusRecallCacheEngine.recall
          // Required: prompt
          // Optional: wiki_root, ttl_ms, enforce_ttl
          // Returns null on miss; CachedConsensus on hit.
          case "consensus_recall_cache": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "consensus_recall_cache requires non-empty 'prompt' string" });
            }
            const { consensusRecallCacheEngine } = await import("../../engines/ConsensusRecallCacheEngine.js");
            try {
              const result = consensusRecallCacheEngine.recall(params.prompt, {
                wikiRoot: params.wiki_root ?? params.wikiRoot,
                ttlMs: params.ttl_ms ?? params.ttlMs,
                enforceTtl: params.enforce_ttl ?? params.enforceTtl,
              });
              if (result === null) {
                return ok({ cached: false, hit: false });
              }
              return ok({ cached: true, hit: true, score: consensusRecallCacheEngine.scoreCached(result), ...result });
            } catch (e) {
              return ok({ error: `consensus_recall_cache: ${(e as Error).message}` });
            }
          }

          // LAYER-3-WIKI-RETRIEVAL — WikiRetrievalContextEngine.retrieve
          // Required: prompt
          // Optional: wiki_root, top_k, top_consensus, byte_budget, per_entry_bytes
          case "wiki_retrieve": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "wiki_retrieve requires non-empty 'prompt' string" });
            }
            const { wikiRetrievalContextEngine } = await import("../../engines/WikiRetrievalContextEngine.js");
            try {
              const result = wikiRetrievalContextEngine.retrieve(params.prompt, {
                wikiRoot: params.wiki_root ?? params.wikiRoot,
                topK: params.top_k ?? params.topK,
                topConsensus: params.top_consensus ?? params.topConsensus,
                byteBudget: params.byte_budget ?? params.byteBudget,
                perEntryBytes: params.per_entry_bytes ?? params.perEntryBytes,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `wiki_retrieve: ${(e as Error).message}` });
            }
          }

          // LAYER-3-NEURAL-FEED — ConsensusNeuralFeedbackEngine.record
          // Required: prompt, result
          // Optional: task_type, source_session, feed_path
          case "neural_feed_record": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "neural_feed_record requires non-empty 'prompt' string" });
            }
            if (!params.result || typeof params.result !== "object") {
              return ok({ error: "neural_feed_record requires 'result' object" });
            }
            const { consensusNeuralFeedbackEngine } = await import("../../engines/ConsensusNeuralFeedbackEngine.js");
            try {
              const result = consensusNeuralFeedbackEngine.record({
                prompt: params.prompt,
                taskType: params.task_type ?? params.taskType,
                sourceSession: params.source_session ?? params.sourceSession,
                result: params.result,
                feedPath: params.feed_path ?? params.feedPath,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `neural_feed_record: ${(e as Error).message}` });
            }
          }

          // LAYER-3-NEURAL-FEED — ConsensusNeuralFeedbackEngine.recent
          // Optional: limit (default 50), feed_path
          case "neural_feed_recent": {
            const { consensusNeuralFeedbackEngine } = await import("../../engines/ConsensusNeuralFeedbackEngine.js");
            try {
              const limit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 50;
              const entries = consensusNeuralFeedbackEngine.recent(limit, params.feed_path ?? params.feedPath);
              return ok({ count: entries.length, entries });
            } catch (e) {
              return ok({ error: `neural_feed_recent: ${(e as Error).message}` });
            }
          }

          // LAYER-3-AI-BRIDGE — ConsensusAIBridgeEngine.reason (cache-first orchestrator entry)
          // Required: prompt
          // Optional: task_type (plan|build|review|decide|explain|extract|validate),
          //           caller, force_live, vote_options, prism_context, include_claude, timeout_ms
          case "consensus_bridge_reason": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "consensus_bridge_reason requires non-empty 'prompt' string" });
            }
            const { consensusAIBridgeEngine } = await import("../../engines/ConsensusAIBridgeEngine.js");
            try {
              const step = await consensusAIBridgeEngine.reason({
                prompt: params.prompt,
                taskType: params.task_type ?? params.taskType,
                caller: params.caller,
                forceLive: params.force_live ?? params.forceLive,
                voteOptions: params.vote_options ?? params.voteOptions,
                prismContext: params.prism_context ?? params.prismContext,
                includeClaude: params.include_claude ?? params.includeClaude,
                timeoutMs: params.timeout_ms ?? params.timeoutMs,
              });
              return ok(step);
            } catch (e) {
              return ok({ error: `consensus_bridge_reason: ${(e as Error).message}` });
            }
          }

          // P22-U01 — PreReviewOrchestratorEngine.draftReview
          // Required: prompt (string)
          // Optional: context, domain, promptTokens, maxTokens, temperature
          case "pre_review": {
            if (typeof params.prompt !== "string" || params.prompt.length === 0) {
              return ok({ error: "pre_review requires non-empty 'prompt' string" });
            }
            const { preReviewOrchestratorEngine } = await import("../../engines/PreReviewOrchestratorEngine.js");
            try {
              const result = await preReviewOrchestratorEngine.draftReview({
                prompt: params.prompt,
                context: params.context,
                domain: params.domain,
                promptTokens: params.promptTokens,
                maxTokens: params.maxTokens,
                temperature: params.temperature,
              });
              return ok(result);
            } catch (e) {
              return ok({ error: `pre_review: ${(e as Error).message}` });
            }
          }

          // P20-U03 — ModelRouterEngine threshold control (read | write | reset)
          // op="get" → returns thresholds; op="set" → setThresholds(payload); op="reset" → resetThresholds
          case "model_route_thresholds": {
            const { modelRouterEngine } = await import("../../engines/ModelRouterEngine.js");
            const op = params.op ?? "get";
            if (op === "get") {
              return ok(modelRouterEngine.getThresholds());
            }
            if (op === "reset") {
              modelRouterEngine.resetThresholds();
              return ok(modelRouterEngine.getThresholds());
            }
            if (op === "set") {
              try {
                modelRouterEngine.setThresholds({
                  largeContextTokens: params.largeContextTokens,
                  complexContextTokens: params.complexContextTokens,
                });
                return ok(modelRouterEngine.getThresholds());
              } catch (e) {
                return ok({ error: `model_route_thresholds: ${(e as Error).message}` });
              }
            }
            return ok({ error: `model_route_thresholds: invalid op '${op}', expected get|set|reset` });
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        log.error(`[prism_ai] Error: ${err.message}`);
        return ok({ error: err.message, action });
      }
    }
  );
}
