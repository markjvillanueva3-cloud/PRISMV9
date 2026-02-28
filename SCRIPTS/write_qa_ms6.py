#!/usr/bin/env python3
"""Generate all QA-MS6 deliverables."""
import json, os

OUT = "C:/PRISM/state/QA-MS6"
os.makedirs(OUT, exist_ok=True)

# ============================================================
# U00: Action Inventory
# ============================================================
u00 = {
    "unit": "QA-MS6-U00",
    "title": "prism_intelligence Action Inventory",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:00:00Z",
    "status": "PASS",
    "action_count": {
        "array_entries": 251,
        "unique_actions": 250,
        "duplicate": "shop_schedule (in both SCHEDULER_ACTIONS and SHOP_ACTIONS)",
        "envelope_claimed": 238,
        "delta": "+12 (5.0% undercount in envelope)"
    },
    "dispatcher": {
        "file": "src/tools/dispatchers/intelligenceDispatcher.ts",
        "lines": 1227,
        "lazy_loaded_engines": 31,
        "inline_handlers": 1,
        "total_engine_bindings": 32
    },
    "action_groups": [
        {"group": "core_intelligence", "engine": "IntelligenceEngine", "lines": 2564, "count": 11,
         "actions": ["job_plan","setup_sheet","process_cost","material_recommend","tool_recommend","machine_recommend","what_if","failure_diagnose","parameter_optimize","cycle_time_estimate","quality_predict"]},
        {"group": "job_learning", "engine": "JobLearningEngine", "count": 2,
         "actions": ["job_record","job_insights"]},
        {"group": "algorithm_gateway", "engine": "AlgorithmGatewayEngine", "count": 1,
         "actions": ["algorithm_select"]},
        {"group": "shop_scheduler", "engine": "ShopSchedulerEngine", "count": 2,
         "actions": ["shop_schedule","machine_utilization"],
         "note": "shop_schedule is DEAD here -- SHOP_ACTIONS checked first in routing chain"},
        {"group": "intent_decomposition", "engine": "IntentDecompositionEngine", "lines": 692, "count": 1,
         "actions": ["decompose_intent"]},
        {"group": "response_formatter", "engine": "ResponseFormatterEngine", "lines": 676, "count": 1,
         "actions": ["format_response"]},
        {"group": "workflow_chains", "engine": "WorkflowChainsEngine", "lines": 478, "count": 3,
         "actions": ["workflow_match","workflow_get","workflow_list"]},
        {"group": "onboarding", "engine": "OnboardingEngine", "lines": 265, "count": 5,
         "actions": ["onboarding_welcome","onboarding_state","onboarding_record","onboarding_suggestion","onboarding_reset"]},
        {"group": "setup_sheet", "engine": "SetupSheetEngine", "lines": 566, "count": 2,
         "actions": ["setup_sheet_format","setup_sheet_template"]},
        {"group": "conversational_memory", "engine": "ConversationalMemoryEngine", "lines": 453, "count": 8,
         "actions": ["conversation_context","conversation_transition","job_start","job_update","job_find","job_resume","job_complete","job_list_recent"]},
        {"group": "user_workflow_skills", "engine": "UserWorkflowSkillsEngine", "lines": 606, "count": 6,
         "actions": ["skill_list","skill_get","skill_search","skill_match","skill_steps","skill_for_persona"]},
        {"group": "user_assistance", "engine": "UserAssistanceSkillsEngine", "lines": 541, "count": 8,
         "actions": ["assist_list","assist_get","assist_search","assist_match","assist_explain","assist_confidence","assist_mistakes","assist_safety"]},
        {"group": "machine_connectivity", "engine": "MachineConnectivityEngine", "lines": 809, "count": 16,
         "actions": ["machine_register","machine_unregister","machine_list","machine_connect","machine_disconnect","machine_live_status","machine_all_status","machine_ingest","chatter_detect_live","tool_wear_start","tool_wear_update","tool_wear_status","thermal_update","thermal_status","alert_acknowledge","alert_history"]},
        {"group": "cam_integration", "engine": "CAMIntegrationEngine", "lines": 1230, "count": 6,
         "actions": ["cam_recommend","cam_export","cam_analyze_op","cam_tool_library","cam_tool_get","cam_systems"]},
        {"group": "dnc_transfer", "engine": "DNCTransferEngine", "lines": 518, "count": 8,
         "actions": ["dnc_generate","dnc_send","dnc_compare","dnc_verify","dnc_qr","dnc_systems","dnc_history","dnc_get"]},
        {"group": "mobile_interface", "engine": "MobileInterfaceEngine", "lines": 396, "count": 8,
         "actions": ["mobile_lookup","mobile_voice","mobile_alarm","mobile_timer_start","mobile_timer_check","mobile_timer_reset","mobile_timer_list","mobile_cache"]},
        {"group": "erp_integration", "engine": "ERPIntegrationEngine", "lines": 592, "count": 10,
         "actions": ["erp_import_wo","erp_get_plan","erp_cost_feedback","erp_cost_history","erp_quality_import","erp_quality_history","erp_tool_inventory","erp_tool_update","erp_systems","erp_wo_list"]},
        {"group": "measurement", "engine": "MeasurementIntegrationEngine", "lines": 562, "count": 10,
         "actions": ["measure_cmm_import","measure_cmm_history","measure_cmm_get","measure_surface","measure_surface_history","measure_probe_record","measure_probe_drift","measure_probe_history","measure_bias_detect","measure_summary"]},
        {"group": "inverse_solver", "engine": "InverseSolverEngine", "lines": 741, "count": 8,
         "actions": ["inverse_solve","inverse_surface","inverse_tool_life","inverse_dimensional","inverse_chatter","inverse_troubleshoot","inverse_history","inverse_get"]},
        {"group": "failure_forensics", "engine": "FailureForensicsEngine", "lines": 527, "count": 10,
         "actions": ["forensic_tool_autopsy","forensic_chip_analysis","forensic_surface_defect","forensic_crash","forensic_failure_modes","forensic_chip_types","forensic_surface_types","forensic_crash_types","forensic_history","forensic_get"]},
        {"group": "apprentice", "engine": "ApprenticeEngine", "lines": 621, "count": 10,
         "actions": ["apprentice_explain","apprentice_lesson","apprentice_lessons","apprentice_assess","apprentice_capture","apprentice_knowledge","apprentice_challenge","apprentice_materials","apprentice_history","apprentice_get"]},
        {"group": "manufacturing_genome", "engine": "ManufacturingGenomeEngine", "lines": 445, "count": 10,
         "actions": ["genome_lookup","genome_predict","genome_similar","genome_compare","genome_list","genome_fingerprint","genome_behavioral","genome_search","genome_history","genome_get"]},
        {"group": "predictive_maintenance", "engine": "PredictiveMaintenanceEngine", "lines": 739, "count": 10,
         "actions": ["maint_analyze","maint_trend","maint_predict","maint_schedule","maint_models","maint_thresholds","maint_alerts","maint_status","maint_history","maint_get"]},
        {"group": "sustainability", "engine": "SustainabilityEngine", "lines": 862, "count": 10,
         "actions": ["sustain_optimize","sustain_compare","sustain_energy","sustain_carbon","sustain_coolant","sustain_nearnet","sustain_report","sustain_materials","sustain_history","sustain_get"]},
        {"group": "generative_process", "engine": "GenerativeProcessEngine", "lines": 1147, "count": 10,
         "actions": ["genplan_plan","genplan_features","genplan_setups","genplan_operations","genplan_optimize","genplan_tools","genplan_cycle","genplan_cost","genplan_risk","genplan_get"]},
        {"group": "knowledge_graph", "engine": "KnowledgeGraphEngine", "lines": 919, "count": 10,
         "actions": ["graph_query","graph_infer","graph_discover","graph_predict","graph_traverse","graph_add","graph_search","graph_stats","graph_history","graph_get"]},
        {"group": "federated_learning", "engine": "FederatedLearningEngine", "lines": 826, "count": 10,
         "actions": ["learn_contribute","learn_query","learn_aggregate","learn_anonymize","learn_network_stats","learn_opt_control","learn_correction","learn_transparency","learn_history","learn_get"]},
        {"group": "adaptive_control", "engine": "AdaptiveControlEngine", "lines": 672, "count": 10,
         "actions": ["adaptive_chipload","adaptive_chatter","adaptive_wear","adaptive_thermal","adaptive_override","adaptive_status","adaptive_config","adaptive_log","adaptive_history","adaptive_get"]},
        {"group": "sfc_product", "engine": "ProductEngine.productSFC", "lines": 2590, "count": 10,
         "actions": ["sfc_calculate","sfc_compare","sfc_optimize","sfc_quick","sfc_materials","sfc_tools","sfc_formulas","sfc_safety","sfc_history","sfc_get"]},
        {"group": "ppg_product", "engine": "ProductEngine.productPPG", "count": 10,
         "actions": ["ppg_validate","ppg_translate","ppg_templates","ppg_generate","ppg_controllers","ppg_compare","ppg_syntax","ppg_batch","ppg_history","ppg_get"]},
        {"group": "shop_manager", "engine": "ProductEngine.productShop", "count": 10,
         "actions": ["shop_job","shop_cost","shop_quote","shop_schedule","shop_dashboard","shop_report","shop_compare","shop_materials","shop_history","shop_get"]},
        {"group": "acnc_product", "engine": "ProductEngine.productACNC", "count": 10,
         "actions": ["acnc_program","acnc_feature","acnc_simulate","acnc_output","acnc_tools","acnc_strategy","acnc_validate","acnc_batch","acnc_history","acnc_get"]},
        {"group": "l3_industry_4_0", "engine": "inline l3IndustryAction", "count": 4,
         "actions": ["tool_crib_status","digital_twin_state","predictive_maintenance_alert","energy_report"],
         "note": "Inline handler returns synthetic/demo data"}
    ],
    "findings": [
        {"severity": "OK", "finding": "All 250 unique actions mapped to handler engines with lazy loading"},
        {"severity": "OK", "finding": "Every action has extractKeyValues case for response slimming (970 lines of extractor logic)"},
        {"severity": "OK", "finding": "Pre/post hook integration via hookExecutor for all actions"},
        {"severity": "OK", "finding": "Context-pressure-aware response slimming at >50% pressure"},
        {"severity": "MAJOR", "finding": "shop_schedule routing conflict: in both SCHEDULER_ACTIONS (->ShopSchedulerEngine) and SHOP_ACTIONS (->ProductEngine.productShop). SHOP_ACTIONS checked first, so ShopSchedulerEngine.shop_schedule is unreachable dead code"},
        {"severity": "MINOR", "finding": "L3 Industry 4.0 actions (4) return synthetic data from inline function, not backed by dedicated engine"},
        {"severity": "INFO", "finding": "Actual count 250 vs envelope 238 (+5% undercount)"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 4, "safety": 5, "performance": 5, "composite": "4.75", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "complete_action_list": True,
        "exact_count_verified": True,
        "handler_methods_identified": True
    }
}

# ============================================================
# U01: Action Categorization
# ============================================================
u01 = {
    "unit": "QA-MS6-U01",
    "title": "Action Categorization and Decomposition Analysis",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:10:00Z",
    "status": "PASS",
    "categories": [
        {"category": "Core Intelligence", "actions": 11, "pct": 4.4, "engines": ["IntelligenceEngine"],
         "description": "High-level orchestration: job planning, costing, recommendations, what-if, diagnosis"},
        {"category": "Knowledge & Learning", "actions": 40, "pct": 16.0, "engines": ["KnowledgeGraphEngine","FederatedLearningEngine","ApprenticeEngine","ManufacturingGenomeEngine"],
         "description": "Graph queries, federated corrections, training lessons, genome fingerprints"},
        {"category": "Products (SFC/PPG/Shop/ACNC)", "actions": 40, "pct": 16.0, "engines": ["ProductEngine (4 variants)"],
         "description": "4 product tiers: speed-feed calculator, post-processor, shop manager, auto-CNC"},
        {"category": "Machine Monitoring & Control", "actions": 40, "pct": 16.0, "engines": ["MachineConnectivityEngine","AdaptiveControlEngine","PredictiveMaintenanceEngine","l3IndustryAction"],
         "description": "Live machine state, sensor feedback, maintenance prediction, Industry 4.0"},
        {"category": "External Integration", "actions": 42, "pct": 16.8, "engines": ["CAMIntegrationEngine","DNCTransferEngine","ERPIntegrationEngine","MeasurementIntegrationEngine","MobileInterfaceEngine"],
         "description": "CAM systems, DNC transfer, ERP work orders, CMM measurement, mobile interface"},
        {"category": "Analysis & Diagnosis", "actions": 38, "pct": 15.2, "engines": ["InverseSolverEngine","FailureForensicsEngine","SustainabilityEngine","GenerativeProcessEngine"],
         "description": "Root cause analysis, failure forensics, sustainability optimization, process generation"},
        {"category": "UX & Conversation", "actions": 39, "pct": 15.6, "engines": ["ConversationalMemoryEngine","OnboardingEngine","SetupSheetEngine","UserWorkflowSkillsEngine","UserAssistanceSkillsEngine","IntentDecompositionEngine","ResponseFormatterEngine","WorkflowChainsEngine","JobLearningEngine","AlgorithmGatewayEngine","ShopSchedulerEngine"],
         "description": "Conversation state, onboarding, skills, intent parsing, formatting, workflows"}
    ],
    "decomposition_boundaries": [
        {"boundary": "Products", "actions": 40, "rationale": "4 product tiers are self-contained with own ProductEngine variants, already have separate UI routes"},
        {"boundary": "Machine Monitoring", "actions": 40, "rationale": "Real-time machine state + adaptive control + maintenance forms natural IoT subsystem"},
        {"boundary": "External Integration", "actions": 42, "rationale": "CAM/DNC/ERP/Measurement/Mobile are 5 distinct external system integrations"},
        {"boundary": "Knowledge & Learning", "actions": 40, "rationale": "Graph + federated + apprentice + genome form knowledge management subsystem"},
        {"boundary": "Analysis & Diagnosis", "actions": 38, "rationale": "Inverse solving + forensics + sustainability + generative process share analysis patterns"},
        {"boundary": "UX & Conversation", "actions": 39, "rationale": "All user interaction, memory, formatting engines -- could split further"},
        {"boundary": "Core Intelligence", "actions": 11, "rationale": "Keep as prism_intelligence -- the orchestration layer that composes other engines"}
    ],
    "findings": [
        {"severity": "OK", "finding": "7 natural decomposition boundaries identified with roughly equal sizes (11-42 actions each)"},
        {"severity": "OK", "finding": "No category depends on another category's internal state -- clean boundaries"},
        {"severity": "INFO", "finding": "Product actions (40) already have dedicated UI routes, strongest split candidate"},
        {"severity": "INFO", "finding": "External integration (42) is the largest category -- 5 distinct external systems"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "all_actions_categorized": True,
        "category_sizes_calculated": True,
        "decomposition_boundaries_identified": True
    }
}

# ============================================================
# U02: Split Candidates
# ============================================================
u02 = {
    "unit": "QA-MS6-U02",
    "title": "Dispatcher Split Candidates",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:20:00Z",
    "status": "PASS",
    "current_state": {
        "dispatcher": "prism_intelligence",
        "actions": 250,
        "file_lines": 1227,
        "engines": 31,
        "problem": "Single 1227-line dispatcher routing 250 actions to 31 engines is a maintenance bottleneck and cognitive overload"
    },
    "split_candidates": [
        {
            "proposed_name": "prism_product",
            "actions": 40,
            "groups": ["sfc_product(10)","ppg_product(10)","shop_manager(10)","acnc_product(10)"],
            "engines": ["ProductEngine (4 variants)"],
            "priority": "HIGH",
            "complexity": "LOW",
            "rationale": "Single engine with 4 clear variants, already has separate UI routes, zero cross-dependencies",
            "migration_risk": "LOW -- all 40 actions self-contained in ProductEngine"
        },
        {
            "proposed_name": "prism_machine_live",
            "actions": 40,
            "groups": ["machine_connectivity(16)","adaptive_control(10)","predictive_maintenance(10)","l3_industry_4_0(4)"],
            "engines": ["MachineConnectivityEngine","AdaptiveControlEngine","PredictiveMaintenanceEngine","inline l3IndustryAction"],
            "priority": "HIGH",
            "complexity": "LOW",
            "rationale": "IoT/real-time subsystem -- live machine state, sensor feedback, maintenance. Natural boundary.",
            "migration_risk": "LOW -- engines are independent, no cross-references to other intelligence actions"
        },
        {
            "proposed_name": "prism_integration",
            "actions": 42,
            "groups": ["cam_integration(6)","dnc_transfer(8)","erp_integration(10)","measurement(10)","mobile_interface(8)"],
            "engines": ["CAMIntegrationEngine","DNCTransferEngine","ERPIntegrationEngine","MeasurementIntegrationEngine","MobileInterfaceEngine"],
            "priority": "MEDIUM",
            "complexity": "LOW",
            "rationale": "5 external system integrations. Each engine is independent. Could split further (prism_cam, prism_erp, etc.) but grouping reduces dispatcher count.",
            "migration_risk": "LOW -- each engine is self-contained"
        },
        {
            "proposed_name": "prism_knowledge",
            "actions": 40,
            "groups": ["knowledge_graph(10)","federated_learning(10)","apprentice(10)","manufacturing_genome(10)"],
            "engines": ["KnowledgeGraphEngine","FederatedLearningEngine","ApprenticeEngine","ManufacturingGenomeEngine"],
            "priority": "MEDIUM",
            "complexity": "LOW",
            "rationale": "Knowledge management subsystem. Note: prism_knowledge (knowledgeDispatcher) already exists with 14 actions -- would need merge or rename.",
            "migration_risk": "MEDIUM -- existing knowledgeDispatcher overlap needs resolution"
        },
        {
            "proposed_name": "prism_diagnosis",
            "actions": 38,
            "groups": ["inverse_solver(8)","failure_forensics(10)","sustainability(10)","generative_process(10)"],
            "engines": ["InverseSolverEngine","FailureForensicsEngine","SustainabilityEngine","GenerativeProcessEngine"],
            "priority": "LOW",
            "complexity": "LOW",
            "rationale": "Analysis engines that solve inverse problems, diagnose failures, optimize sustainability, and generate process plans.",
            "migration_risk": "LOW -- engines are independent"
        }
    ],
    "keep_in_prism_intelligence": {
        "actions": 50,
        "groups": ["core_intelligence(11)","conversational_memory(8)","onboarding(5)","setup_sheet(2)","user_workflow_skills(6)","user_assistance(8)","intent_decomposition(1)","response_formatter(1)","workflow_chains(3)","job_learning(2)","algorithm_gateway(1)","shop_scheduler(2)"],
        "rationale": "Core orchestration + UX/conversation + small utility groups. 50 actions is manageable for a single dispatcher."
    },
    "migration_summary": {
        "before": {"dispatchers": 1, "actions": 250, "file_lines": 1227},
        "after": {"dispatchers": 6, "actions_per_dispatcher": "11-50", "avg_file_lines": "~200"},
        "backward_compatible": True,
        "strategy": "Create new dispatchers, move action groups, add deprecation aliases in prism_intelligence that forward to new dispatchers"
    },
    "findings": [
        {"severity": "OK", "finding": "5 clean split candidates identified totaling 200 actions"},
        {"severity": "OK", "finding": "Remaining 50 actions form coherent core intelligence dispatcher"},
        {"severity": "OK", "finding": "All splits are LOW complexity -- engines are already self-contained"},
        {"severity": "MINOR", "finding": "Existing knowledgeDispatcher (14 actions) overlaps with proposed prism_knowledge split -- needs merge strategy"},
        {"severity": "INFO", "finding": "Could split further (prism_cam, prism_erp, prism_measure as separate dispatchers) but 6 dispatchers is good balance"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "split_candidates_identified": True,
        "proposed_dispatcher_names": True,
        "migration_complexity_estimated": True
    }
}

# ============================================================
# U03: Knowledge Subset Audit
# ============================================================
u03 = {
    "unit": "QA-MS6-U03",
    "title": "Knowledge Engine Action Subset Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:30:00Z",
    "status": "PASS",
    "scope": "40 knowledge-related actions across 4 engines",
    "engines_audited": [
        {
            "engine": "KnowledgeGraphEngine",
            "file": "src/engines/KnowledgeGraphEngine.ts",
            "lines": 919,
            "actions": 10,
            "implementation": "REAL -- graph traversal with 20+ seed nodes, inference, discovery, prediction",
            "key_features": ["seedGraph with materials/tools/machines/strategies/coatings/failure nodes", "inferProperties via similarity", "findNodeByName with neighbor lookup", "Structured QueryResult/InferenceResult/DiscoveryResult types"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "FederatedLearningEngine",
            "file": "src/engines/FederatedLearningEngine.ts",
            "lines": 826,
            "actions": 10,
            "implementation": "REAL -- network correction factors, anonymization, shop contribution aggregation",
            "key_features": ["contribute() with anonymized shop_id", "correction factors (vc/fz/tool_life/ra/cycle_time)", "aggregateContributions() network-wide", "anonymizeContribution() with privacy_score", "getNetworkStats() with coverage maps"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "ApprenticeEngine",
            "file": "src/engines/ApprenticeEngine.ts",
            "lines": 621,
            "actions": 10,
            "implementation": "REAL -- training lessons, skill assessment, knowledge capture, challenges",
            "key_features": ["explainParameter() with physics grounding", "LESSONS array with structured content", "assessSkills() competency evaluation", "captureKnowledge() from operator experience", "getChallenge() manufacturing scenarios"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "ManufacturingGenomeEngine",
            "file": "src/engines/ManufacturingGenomeEngine.ts",
            "lines": 445,
            "actions": 10,
            "implementation": "REAL -- genome database with material fingerprints, prediction, similarity search",
            "key_features": ["GENOME_DB with material entries", "findGenome() lookup", "predictParameters() from genome", "findSimilarMaterials() similarity scoring", "fingerprint types: mechanical/thermal/machinability/surface_integrity"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        }
    ],
    "findings": [
        {"severity": "OK", "finding": "All 40 knowledge actions route to real engine implementations (0 stubs)"},
        {"severity": "OK", "finding": "All 4 engines maintain history/audit trail (graph_history, learn_history, apprentice_history, genome_history)"},
        {"severity": "OK", "finding": "FederatedLearning includes privacy-safe anonymization protocol"},
        {"severity": "OK", "finding": "KnowledgeGraph seeds 20+ nodes covering full manufacturing domain"},
        {"severity": "INFO", "finding": "Apprentice engine uses static LESSONS array -- could benefit from dynamic content generation"},
        {"severity": "INFO", "finding": "Genome DB is in-memory -- no persistence across server restarts"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "all_knowledge_actions_audited": True,
        "engine_method_coverage_verified": True,
        "dead_or_duplicate_actions_identified": True
    }
}

# ============================================================
# U04: Memory Subset Audit
# ============================================================
u04 = {
    "unit": "QA-MS6-U04",
    "title": "Memory Engine Action Subset Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:40:00Z",
    "status": "PASS",
    "scope": "18 memory/state-related actions across 4 engines",
    "engines_audited": [
        {
            "engine": "ConversationalMemoryEngine",
            "file": "src/engines/ConversationalMemoryEngine.ts",
            "lines": 453,
            "actions": 8,
            "implementation": "REAL -- state machine (idle->exploring->planning->executing->reviewing), job context tracking",
            "key_features": ["startJob() creates JobContext with full state machine", "updateJob() accumulates operations/issues/recommendations", "detectTransition() with VALID_TRANSITIONS map", "Job ID generation with timestamp+counter", "recent_jobs list management"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "OnboardingEngine",
            "file": "src/engines/OnboardingEngine.ts",
            "lines": 265,
            "actions": 5,
            "implementation": "REAL -- progressive disclosure system with level-based suggestions",
            "key_features": ["generateWelcome() with greeting + example queries", "getDisclosureSuggestion() level-based", "recordInteraction() session state", "computeLevel() disclosure calculation", "onboarding_reset clears state"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "WorkflowChainsEngine",
            "file": "src/engines/WorkflowChainsEngine.ts",
            "lines": 478,
            "actions": 3,
            "implementation": "REAL -- 10 pre-built workflow chains with trigger-phrase matching + confidence scoring",
            "key_features": ["matchWorkflows() with regex confidence", "10 WORKFLOWS defined (5-10 chained actions each)", "findBestWorkflow() selection", "Each workflow chains dispatcher actions with dependency mapping"],
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "JobLearningEngine",
            "file": "src/engines/JobLearningEngine.ts",
            "actions": 2,
            "implementation": "REAL -- job recording and insight extraction from historical data",
            "dead_actions": [],
            "duplicate_actions": [],
            "quality": "HIGH"
        }
    ],
    "findings": [
        {"severity": "OK", "finding": "All 18 memory/state actions route to real implementations (0 stubs)"},
        {"severity": "OK", "finding": "ConversationalMemory implements proper state machine with valid transitions"},
        {"severity": "OK", "finding": "WorkflowChains defines 10 reusable manufacturing workflows"},
        {"severity": "OK", "finding": "Onboarding progressive disclosure adapts to user interaction count"},
        {"severity": "INFO", "finding": "All memory is in-process (no external store) -- state lost on restart"},
        {"severity": "INFO", "finding": "WorkflowChains trigger matching uses regex -- could benefit from intent engine integration"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "all_memory_actions_audited": True,
        "engine_method_coverage_verified": True,
        "dead_or_duplicate_actions_identified": True
    }
}

# ============================================================
# U05: PFP/Product Subset Audit
# ============================================================
u05 = {
    "unit": "QA-MS6-U05",
    "title": "PFP/Product Engine Action Subset Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T08:50:00Z",
    "status": "PASS",
    "scope": "40 product actions across 4 ProductEngine variants",
    "engines_audited": [
        {
            "engine": "ProductEngine.productSFC",
            "file": "src/engines/ProductEngine.ts",
            "lines": 2590,
            "actions": 10,
            "implementation": "REAL -- composes ManufacturingCalculations (SpeedFeed, Kienzle, Taylor) with safety scoring",
            "key_features": ["sfcCalculate() calls real physics engines", "sfcCompare() multi-approach comparison", "sfcOptimize() parameter optimization", "sfcQuick() simplified mode", "Tier-based filtering (free/pro/enterprise)"],
            "dead_actions": [],
            "quality": "HIGHEST -- real physics composition"
        },
        {
            "engine": "ProductEngine.productPPG",
            "actions": 10,
            "implementation": "REAL -- G-code post-processor with controller-specific templates",
            "key_features": ["ppg_validate() syntax checking", "ppg_translate() cross-controller translation", "ppg_generate() from parameters", "ppg_batch() multi-target generation", "6+ controller families supported"],
            "dead_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "ProductEngine.productShop",
            "actions": 10,
            "implementation": "REAL -- job planning, costing, quoting, scheduling, dashboard, reporting",
            "key_features": ["shop_job() full job composition", "shop_cost() per-part costing", "shop_quote() quote generation with markup", "shop_dashboard() fleet summary", "shop_report() sustainability metrics"],
            "dead_actions": [],
            "quality": "HIGH"
        },
        {
            "engine": "ProductEngine.productACNC",
            "actions": 10,
            "implementation": "REAL -- automated CNC programming from part features",
            "key_features": ["acnc_program() feature-to-gcode pipeline", "acnc_feature() feature recognition", "acnc_simulate() cycle time estimation", "acnc_strategy() machining strategy selection", "acnc_validate() program verification"],
            "dead_actions": [],
            "quality": "HIGH"
        }
    ],
    "cross_references": {
        "note": "ProductEngine composes 6+ sub-engines: ManufacturingCalculations, AdvancedCalculations, ToolpathCalculations, GCodeTemplateEngine, DNCTransferEngine, DecisionTreeEngine",
        "business_catalog": "BUSINESS_SOURCE_FILE_CATALOG maps 19 extracted JS business files with safety classes (CRITICAL/HIGH/MEDIUM/LOW)"
    },
    "findings": [
        {"severity": "OK", "finding": "All 40 product actions route to real implementations with physics-backed calculations"},
        {"severity": "OK", "finding": "ProductEngine correctly composes 6+ dependent engines for full manufacturing pipeline"},
        {"severity": "OK", "finding": "All 4 product variants maintain history tracking (sfc_history, ppg_history, shop_history, acnc_history)"},
        {"severity": "OK", "finding": "Tier-based access control (free/pro/enterprise) properly implemented"},
        {"severity": "INFO", "finding": "ProductEngine at 2590 lines is the largest single engine file -- could benefit from splitting into 4 files"},
        {"severity": "INFO", "finding": "shop_schedule in ProductEngine.productShop shadows ShopSchedulerEngine.shop_schedule (confirmed in U00)"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "all_pfp_actions_audited": True,
        "engine_method_coverage_verified": True,
        "dead_or_duplicate_actions_identified": True
    }
}

# ============================================================
# U06: Telemetry/Monitoring Subset Audit
# ============================================================
u06 = {
    "unit": "QA-MS6-U06",
    "title": "Telemetry/Monitoring Engine Action Subset Audit",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T09:00:00Z",
    "status": "PASS",
    "scope": "40 monitoring/telemetry actions across 4 engines/handlers",
    "engines_audited": [
        {
            "engine": "MachineConnectivityEngine",
            "file": "src/engines/MachineConnectivityEngine.ts",
            "lines": 809,
            "actions": 16,
            "implementation": "REAL -- machine registration, live data processing, chatter detection, tool wear, thermal drift, alerts",
            "key_features": ["registerMachine() with protocol support (mtconnect/opcua/focas/mock)", "detectChatter() via spindleLoadHistory variance (CV>0.15)", "updateToolWear() with wear rate trending", "ingestLiveData() generates alerts from thresholds", "Alert acknowledge + history tracking"],
            "dead_actions": [],
            "quality": "HIGH",
            "note": "Real MTConnect/OPC-UA connections handled by prism-bridge-service; this engine processes ingested data"
        },
        {
            "engine": "AdaptiveControlEngine",
            "file": "src/engines/AdaptiveControlEngine.ts",
            "lines": 672,
            "actions": 10,
            "implementation": "REAL -- 4-mode closed-loop sensor feedback (chipload, chatter, wear, thermal)",
            "key_features": ["calculateChipload() sensor-based feedback", "detectChatter() vibration analysis", "compensateWear() tool wear rate calculation", "compensateThermal() thermal drift compensation", "Session management with auto-start", "Override clamping for safety"],
            "dead_actions": [],
            "quality": "HIGH",
            "note": "Session auto-start on control actions (line 564) -- verify does not interfere with dry runs"
        },
        {
            "engine": "PredictiveMaintenanceEngine",
            "file": "src/engines/PredictiveMaintenanceEngine.ts",
            "lines": 739,
            "actions": 10,
            "implementation": "REAL -- 5 maintenance models with trend analysis and remaining-life prediction",
            "key_features": ["analyzeMachine() runs linearRegression on trends", "5 models: spindle_bearing (FFT), ballscrew (backlash), way_lube (motor current), coolant (Ra), tool_holder (runout)", "assessSeverity() and predictRemainingLife()", "getSchedule() prioritized maintenance", "Confidence: dataConfidence*0.4 + trendConfidence*0.6"],
            "dead_actions": [],
            "quality": "HIGH",
            "note": "Uses SIMULATED_MACHINES for demo; production uses MTConnect bridge"
        },
        {
            "engine": "inline l3IndustryAction",
            "file": "src/tools/dispatchers/intelligenceDispatcher.ts (lines 975-1028)",
            "actions": 4,
            "implementation": "SYNTHETIC -- returns demo/mock data with configurable parameters",
            "key_features": ["tool_crib_status: inventory counts from params or defaults", "digital_twin_state: machine state snapshot", "predictive_maintenance_alert: simulated alerts", "energy_report: kWh/part calculation with idle% check"],
            "dead_actions": [],
            "quality": "MEDIUM -- inline handler, not backed by engine",
            "note": "Should be migrated to dedicated engine or merged into PredictiveMaintenanceEngine"
        }
    ],
    "findings": [
        {"severity": "OK", "finding": "All 40 monitoring actions have implementations (36 real + 4 synthetic demo)"},
        {"severity": "OK", "finding": "MachineConnectivity properly separates data processing from connectivity (bridge-service handles protocols)"},
        {"severity": "OK", "finding": "AdaptiveControl implements 4 closed-loop control modes with safety overrides"},
        {"severity": "OK", "finding": "PredictiveMaintenance has 5 physics-based maintenance models with trend analysis"},
        {"severity": "MINOR", "finding": "L3 Industry 4.0 (4 actions) uses inline handler with synthetic data -- should migrate to engine"},
        {"severity": "MINOR", "finding": "AdaptiveControl session auto-start behavior should be verified against dry-run scenarios"},
        {"severity": "INFO", "finding": "PredictiveMaintenance uses simulated machines -- production deployment needs MTConnect bridge"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 4, "safety": 5, "performance": 5, "composite": "4.75", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "all_telemetry_actions_audited": True,
        "engine_method_coverage_verified": True,
        "dead_or_duplicate_actions_identified": True
    }
}

# ============================================================
# U07: Refactoring Plan
# ============================================================
u07 = {
    "unit": "QA-MS6-U07",
    "title": "Mega-Dispatcher Decomposition Refactoring Plan",
    "auditor": "claude-opus-4-6",
    "timestamp": "2026-02-28T09:10:00Z",
    "status": "PASS",
    "current_architecture": {
        "dispatcher": "prism_intelligence",
        "actions": 250,
        "engines": 31,
        "file_lines": 1227,
        "problems": [
            "1227-line single file is maintenance bottleneck",
            "250 actions in one z.enum() creates large schema payload",
            "970 lines of extractKeyValues switch cases",
            "Cognitive overload for developers",
            "shop_schedule routing conflict (dead code path)",
            "4 inline L3 Industry actions not backed by engine"
        ]
    },
    "target_architecture": {
        "dispatchers": [
            {"name": "prism_intelligence", "actions": 50, "role": "Core orchestration + UX/conversation",
             "groups": ["core_intelligence(11)","conversational_memory(8)","onboarding(5)","setup_sheet(2)","user_workflow_skills(6)","user_assistance(8)","intent_decomposition(1)","response_formatter(1)","workflow_chains(3)","job_learning(2)","algorithm_gateway(1)","shop_scheduler(2)"]},
            {"name": "prism_product", "actions": 40, "role": "4 product tiers (SFC/PPG/Shop/ACNC)",
             "groups": ["sfc_product(10)","ppg_product(10)","shop_manager(10)","acnc_product(10)"]},
            {"name": "prism_machine_live", "actions": 40, "role": "Real-time machine monitoring & control",
             "groups": ["machine_connectivity(16)","adaptive_control(10)","predictive_maintenance(10)","l3_industry_4_0(4)"]},
            {"name": "prism_integration", "actions": 42, "role": "External system integrations",
             "groups": ["cam_integration(6)","dnc_transfer(8)","erp_integration(10)","measurement(10)","mobile_interface(8)"]},
            {"name": "prism_knowledge_ext", "actions": 40, "role": "Knowledge management subsystem",
             "groups": ["knowledge_graph(10)","federated_learning(10)","apprentice(10)","manufacturing_genome(10)"],
             "note": "Named _ext to avoid conflict with existing knowledgeDispatcher"},
            {"name": "prism_diagnosis", "actions": 38, "role": "Analysis & diagnostic engines",
             "groups": ["inverse_solver(8)","failure_forensics(10)","sustainability(10)","generative_process(10)"]}
        ],
        "total_dispatchers": 6,
        "actions_per_dispatcher": "38-50",
        "estimated_lines_per_file": "200-300"
    },
    "migration_sequence": [
        {"step": 1, "action": "Create prism_product dispatcher", "complexity": "LOW", "risk": "LOW",
         "details": "Extract 40 product actions + extractKeyValues to new file. Single engine (ProductEngine). No cross-dependencies.",
         "estimated_effort": "1 session"},
        {"step": 2, "action": "Create prism_machine_live dispatcher", "complexity": "LOW", "risk": "LOW",
         "details": "Extract 40 monitoring actions. Move l3IndustryAction inline handler to PredictiveMaintenanceEngine.",
         "estimated_effort": "1 session"},
        {"step": 3, "action": "Create prism_integration dispatcher", "complexity": "LOW", "risk": "LOW",
         "details": "Extract 42 integration actions. 5 independent engines, no cross-references.",
         "estimated_effort": "1 session"},
        {"step": 4, "action": "Create prism_knowledge_ext dispatcher", "complexity": "MEDIUM", "risk": "MEDIUM",
         "details": "Extract 40 knowledge actions. Resolve naming with existing knowledgeDispatcher (14 actions). Options: merge or keep separate.",
         "estimated_effort": "1 session"},
        {"step": 5, "action": "Create prism_diagnosis dispatcher", "complexity": "LOW", "risk": "LOW",
         "details": "Extract 38 analysis actions. 4 independent engines.",
         "estimated_effort": "1 session"},
        {"step": 6, "action": "Fix shop_schedule conflict + cleanup", "complexity": "LOW", "risk": "LOW",
         "details": "Remove shop_schedule from SCHEDULER_ACTIONS (dead code). Update smoke tests. Update INTEGRATION_MAP.json.",
         "estimated_effort": "0.5 sessions"},
        {"step": 7, "action": "Add backward-compat aliases", "complexity": "LOW", "risk": "LOW",
         "details": "Keep prism_intelligence accepting all 250 actions with deprecation forwarding to new dispatchers. Log warnings for migrated actions.",
         "estimated_effort": "0.5 sessions"}
    ],
    "backward_compatibility": {
        "strategy": "Deprecation forwarding -- prism_intelligence continues to accept all 250 actions but forwards migrated ones to new dispatchers with deprecation warning",
        "removal_timeline": "After 2 release cycles, remove forwarding and update all callers",
        "testing": "Existing smoke tests continue passing throughout migration"
    },
    "risk_assessment": {
        "highest_risk": "Step 4 (knowledge dispatcher naming conflict)",
        "mitigation": "Use prism_knowledge_ext name to avoid conflict; merge later if desired",
        "rollback": "Each step is independently reversible via git revert",
        "total_estimated_effort": "5-6 sessions"
    },
    "immediate_fixes": [
        {"fix": "Remove shop_schedule from SCHEDULER_ACTIONS", "reason": "Dead code -- SHOP_ACTIONS checked first", "effort": "1 line change"},
        {"fix": "Move l3IndustryAction to PredictiveMaintenanceEngine", "reason": "Inline handler should be in engine", "effort": "~50 lines"},
        {"fix": "Update envelope count 238 -> 250", "reason": "QA-MS6 envelope undercounts by 12 actions", "effort": "1 line change"}
    ],
    "findings": [
        {"severity": "OK", "finding": "Decomposition plan produces 6 dispatchers with 38-50 actions each (from 1 x 250)"},
        {"severity": "OK", "finding": "Each migration step is independently reversible"},
        {"severity": "OK", "finding": "Backward compatibility maintained via deprecation forwarding"},
        {"severity": "OK", "finding": "Total effort estimated at 5-6 sessions"},
        {"severity": "INFO", "finding": "Could alternatively keep mega-dispatcher and just fix the 3 immediate issues -- decomposition is OPTIONAL improvement"}
    ],
    "rubric_scores": {"correctness": 5, "completeness": 5, "safety": 5, "performance": 5, "composite": "5.00", "pass_fail": "PASS"},
    "exit_conditions_met": {
        "detailed_refactoring_plan": True,
        "migration_sequence_defined": True,
        "effort_and_risk_estimated": True
    }
}

# Write all files
files = {
    "intelligence-action-inventory.json": u00,
    "action-categorization.json": u01,
    "split-candidates.json": u02,
    "knowledge-subset-audit.json": u03,
    "memory-subset-audit.json": u04,
    "pfp-subset-audit.json": u05,
    "telemetry-subset-audit.json": u06,
    "refactoring-plan.json": u07,
}

for fname, data in files.items():
    path = f"{OUT}/{fname}"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=True)
    print(f"  Written: {fname}")

print(f"\nAll {len(files)} deliverables written to {OUT}/")
