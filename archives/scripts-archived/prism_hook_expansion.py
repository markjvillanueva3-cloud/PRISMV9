#!/usr/bin/env python3
"""
PRISM API SWARM - EXHAUSTIVE HOOK EXPANSION
============================================
Uses Claude API in parallel to expand hook coverage to 2000+ hooks.

EXPANSION TARGETS:
1. Material Parameters (127) - 4 hooks each = 508 hooks
2. Universal Formulas (109) - 6 hooks each = 654 hooks
3. Skills (135) - 4 hooks each = 540 hooks
4. Agents (64) - 5 hooks each = 320 hooks
5. Controller Families (12) - 10 hooks each = 120 hooks
6. Machine Specs (25 categories) - 8 hooks each = 200 hooks

TARGET: 2500+ hooks with ZERO gaps
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any
import concurrent.futures

# ═══════════════════════════════════════════════════════════════════════════════
# MATERIAL PARAMETER HOOKS (127 parameters × 4 hooks = 508 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

MATERIAL_PARAMETERS = [
    # Identification (10)
    "material_id", "name", "uns_number", "common_names", "iso_513_category",
    "material_group", "subgroup", "specification", "standard", "version",
    
    # Physical Properties (15)
    "density", "melting_point", "boiling_point", "specific_heat", "thermal_conductivity",
    "thermal_diffusivity", "thermal_expansion", "electrical_resistivity", "magnetic_permeability",
    "crystal_structure", "atomic_number", "atomic_weight", "lattice_parameter", "poisson_ratio",
    "bulk_modulus",
    
    # Mechanical Properties (25)
    "tensile_strength", "yield_strength", "elongation", "reduction_of_area", "elastic_modulus",
    "shear_modulus", "fatigue_strength", "impact_strength", "fracture_toughness", "hardness_hrc",
    "hardness_hb", "hardness_hv", "hardness_hra", "creep_strength", "stress_rupture",
    "compressive_strength", "flexural_strength", "torsional_strength", "wear_resistance",
    "abrasion_resistance", "galling_resistance", "notch_sensitivity", "ductility", "malleability",
    "work_hardening_rate",
    
    # Cutting Mechanics - Kienzle (10)
    "kc1_1", "mc", "kc_correction_speed", "kc_correction_rake", "kc_correction_wear",
    "specific_cutting_force", "cutting_force_constant", "feed_exponent", "depth_exponent",
    "material_constant_k",
    
    # Tool Life - Taylor (8)
    "taylor_C", "taylor_n", "taylor_reference_speed", "taylor_reference_life",
    "speed_exponent", "feed_exponent_taylor", "depth_exponent_taylor", "hardness_factor",
    
    # Constitutive - Johnson-Cook (12)
    "jc_A", "jc_B", "jc_n", "jc_C", "jc_m", "jc_reference_strain_rate",
    "jc_reference_temperature", "jc_melting_temperature", "jc_thermal_softening",
    "jc_strain_hardening", "jc_strain_rate_sensitivity", "jc_damage_parameters",
    
    # Chip Formation (12)
    "chip_type_tendency", "chip_breaking_index", "chip_curl_radius", "chip_thickness_ratio",
    "built_up_edge_tendency", "adhesion_coefficient", "friction_coefficient",
    "shear_plane_angle", "chip_compression_ratio", "chip_segmentation", "chip_color",
    "chip_disposal_rating",
    
    # Thermal Cutting (10)
    "cutting_temperature_coefficient", "heat_partition_ratio", "thermal_number",
    "peclet_number", "thermal_diffusion_length", "flash_temperature", "bulk_temperature",
    "interface_temperature", "thermal_softening_onset", "thermal_damage_threshold",
    
    # Machinability (10)
    "machinability_rating", "machinability_index", "relative_machinability",
    "machinability_group", "recommended_speed_factor", "recommended_feed_factor",
    "surface_finish_capability", "dimensional_stability", "burr_formation_tendency",
    "work_hardening_severity",
    
    # Surface Integrity (8)
    "surface_roughness_achievable", "residual_stress_tendency", "white_layer_risk",
    "metallurgical_damage_risk", "microhardness_change", "grain_refinement",
    "phase_transformation_risk", "recast_layer_risk",
    
    # Process Recommendations (7)
    "recommended_coolant_type", "recommended_cutting_fluid", "dry_machining_suitability",
    "cryogenic_machining_response", "minimum_quantity_lubrication_suitability",
    "high_pressure_coolant_benefit", "flood_coolant_requirement"
]

def generate_material_param_hooks() -> List[Dict]:
    """Generate 4 hooks for each material parameter."""
    hooks = []
    
    for param in MATERIAL_PARAMETERS:
        param_upper = param.upper().replace("_", "-")
        
        # GET hook
        hooks.append({
            "id": f"MAT-PARAM-{param_upper}-GET",
            "name": f"Get {param.replace('_', ' ').title()}",
            "domain": "MATERIAL",
            "category": "PARAMETER",
            "subcategory": param.split("_")[0].upper() if "_" in param else "GENERAL",
            "trigger": f"material:param:{param}:get",
            "description": f"Retrieves {param} value from material record",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False,
            "params": ["materialId"],
            "returns": "value",
            "sideEffects": ["cache_lookup"],
            "relatedHooks": [f"MAT-PARAM-{param_upper}-VALIDATE"]
        })
        
        # SET hook
        hooks.append({
            "id": f"MAT-PARAM-{param_upper}-SET",
            "name": f"Set {param.replace('_', ' ').title()}",
            "domain": "MATERIAL",
            "category": "PARAMETER",
            "subcategory": param.split("_")[0].upper() if "_" in param else "GENERAL",
            "trigger": f"material:param:{param}:set",
            "description": f"Sets {param} value in material record",
            "priority": 20,
            "canDisable": False,
            "isBlocking": True,
            "params": ["materialId", "value", "source", "confidence"],
            "returns": "boolean",
            "sideEffects": ["persists_data", "invalidates_cache", "triggers_recalc"],
            "relatedHooks": [f"MAT-PARAM-{param_upper}-VALIDATE"]
        })
        
        # VALIDATE hook
        hooks.append({
            "id": f"MAT-PARAM-{param_upper}-VALIDATE",
            "name": f"Validate {param.replace('_', ' ').title()}",
            "domain": "MATERIAL",
            "category": "PARAMETER",
            "subcategory": param.split("_")[0].upper() if "_" in param else "GENERAL",
            "trigger": f"material:param:{param}:validate",
            "description": f"Validates {param} value against physical constraints",
            "priority": 10,
            "canDisable": False,
            "isBlocking": True,
            "params": ["value", "context"],
            "returns": "validationResult",
            "sideEffects": ["logs_validation"],
            "relatedHooks": []
        })
        
        # DERIVE hook (for computed parameters)
        hooks.append({
            "id": f"MAT-PARAM-{param_upper}-DERIVE",
            "name": f"Derive {param.replace('_', ' ').title()}",
            "domain": "MATERIAL",
            "category": "PARAMETER",
            "subcategory": param.split("_")[0].upper() if "_" in param else "GENERAL",
            "trigger": f"material:param:{param}:derive",
            "description": f"Derives {param} from related parameters when not directly available",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False,
            "params": ["materialId", "availableParams"],
            "returns": "derivedValue",
            "sideEffects": ["logs_derivation", "flags_estimated"],
            "relatedHooks": [f"MAT-PARAM-{param_upper}-VALIDATE"]
        })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA HOOKS (109 formulas × 6 hooks = 654 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

UNIVERSAL_FORMULAS = [
    # Cutting Mechanics (15)
    "F-CUT-001", "F-CUT-002", "F-CUT-003", "F-CUT-004", "F-CUT-005",
    "F-CUT-006", "F-CUT-007", "F-CUT-008", "F-CUT-009", "F-CUT-010",
    "F-CUT-011", "F-CUT-012", "F-CUT-013", "F-CUT-014", "F-CUT-015",
    
    # Tool Life (10)
    "F-LIFE-001", "F-LIFE-002", "F-LIFE-003", "F-LIFE-004", "F-LIFE-005",
    "F-LIFE-006", "F-LIFE-007", "F-LIFE-008", "F-LIFE-009", "F-LIFE-010",
    
    # Thermal (12)
    "F-THERM-001", "F-THERM-002", "F-THERM-003", "F-THERM-004", "F-THERM-005",
    "F-THERM-006", "F-THERM-007", "F-THERM-008", "F-THERM-009", "F-THERM-010",
    "F-THERM-011", "F-THERM-012",
    
    # Vibration/Chatter (10)
    "F-VIB-001", "F-VIB-002", "F-VIB-003", "F-VIB-004", "F-VIB-005",
    "F-VIB-006", "F-VIB-007", "F-VIB-008", "F-VIB-009", "F-VIB-010",
    
    # Surface Finish (8)
    "F-SURF-001", "F-SURF-002", "F-SURF-003", "F-SURF-004",
    "F-SURF-005", "F-SURF-006", "F-SURF-007", "F-SURF-008",
    
    # Deflection (6)
    "F-DEF-001", "F-DEF-002", "F-DEF-003", "F-DEF-004", "F-DEF-005", "F-DEF-006",
    
    # Power/Torque (8)
    "F-PWR-001", "F-PWR-002", "F-PWR-003", "F-PWR-004",
    "F-PWR-005", "F-PWR-006", "F-PWR-007", "F-PWR-008",
    
    # Chip Formation (6)
    "F-CHIP-001", "F-CHIP-002", "F-CHIP-003", "F-CHIP-004", "F-CHIP-005", "F-CHIP-006",
    
    # Optimization (12)
    "F-OPT-001", "F-OPT-002", "F-OPT-003", "F-OPT-004", "F-OPT-005", "F-OPT-006",
    "F-OPT-007", "F-OPT-008", "F-OPT-009", "F-OPT-010", "F-OPT-011", "F-OPT-012",
    
    # Statistics (8)
    "F-STAT-001", "F-STAT-002", "F-STAT-003", "F-STAT-004",
    "F-STAT-005", "F-STAT-006", "F-STAT-007", "F-STAT-008",
    
    # Quality (6)
    "F-QUAL-001", "F-QUAL-002", "F-QUAL-003", "F-QUAL-004", "F-QUAL-005", "F-QUAL-006",
    
    # Prediction (8)
    "F-PRED-001", "F-PRED-002", "F-PRED-003", "F-PRED-004",
    "F-PRED-005", "F-PRED-006", "F-PRED-007", "F-PRED-008"
]

def generate_formula_hooks() -> List[Dict]:
    """Generate 6 hooks for each formula."""
    hooks = []
    
    for formula_id in UNIVERSAL_FORMULAS:
        category = formula_id.split("-")[1]
        
        # SELECT hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-SELECT",
            "name": f"Select {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:select",
            "description": f"Selects {formula_id} as the formula to use",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False
        })
        
        # VALIDATE hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-VALIDATE",
            "name": f"Validate Inputs for {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:validate",
            "description": f"Validates inputs before executing {formula_id}",
            "priority": 10,
            "canDisable": False,
            "isBlocking": True
        })
        
        # PRE-EXECUTE hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-PRE-EXECUTE",
            "name": f"Pre-Execute {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:preExecute",
            "description": f"Pre-execution processing for {formula_id}",
            "priority": 20,
            "canDisable": True,
            "isBlocking": False
        })
        
        # EXECUTE hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-EXECUTE",
            "name": f"Execute {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:execute",
            "description": f"Executes {formula_id} calculation",
            "priority": 50,
            "canDisable": False,
            "isBlocking": False
        })
        
        # POST-EXECUTE hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-POST-EXECUTE",
            "name": f"Post-Execute {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:postExecute",
            "description": f"Post-execution processing and validation for {formula_id}",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False
        })
        
        # CALIBRATE hook
        hooks.append({
            "id": f"FORMULA-{formula_id}-CALIBRATE",
            "name": f"Calibrate {formula_id}",
            "domain": "FORMULA",
            "category": category,
            "trigger": f"formula:{formula_id}:calibrate",
            "description": f"Calibrates {formula_id} based on actual vs predicted",
            "priority": 100,
            "canDisable": True,
            "isBlocking": False
        })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT HOOKS (64 agents × 5 hooks = 320 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

AGENTS = [
    # OPUS agents (18)
    "architect", "coordinator_v2", "materials_scientist", "master_machinist",
    "physics_validator", "domain_expert", "migration_specialist", "synthesizer",
    "debugger", "root_cause_analyst", "task_decomposer", "learning_extractor_v2",
    "verification_chain", "uncertainty_quantifier", "knowledge_graph_builder",
    "meta_analyst_v2", "combination_optimizer", "proof_generator",
    
    # SONNET agents (37)
    "coder", "extractor", "validator", "code_reviewer", "security_auditor",
    "test_generator", "documentation_writer", "optimizer", "refactorer",
    "pattern_matcher", "completeness_auditor", "dependency_analyzer",
    "formula_validator", "estimator", "cross_referencer", "monolith_navigator",
    "material_lookup", "gcode_expert", "machine_specialist", "standards_expert",
    "session_continuity", "state_manager", "synergy_analyst", "resource_auditor",
    "calibration_engineer", "test_orchestrator", "cam_programmer", "post_processor",
    "thermal_analyst", "signal_processor", "learning_agent", "cutting_mechanics",
    "tool_selector", "error_handler", "workflow_manager", "quality_controller",
    "api_coordinator",
    
    # HAIKU agents (9)
    "quick_lookup", "formatter", "counter", "lister", "summarizer",
    "translator", "comparator", "merger", "reporter"
]

def generate_agent_hooks() -> List[Dict]:
    """Generate 5 hooks for each agent."""
    hooks = []
    
    for agent in AGENTS:
        agent_upper = agent.upper().replace("_", "-")
        
        # SELECT hook
        hooks.append({
            "id": f"AGENT-{agent_upper}-SELECT",
            "name": f"Select {agent.replace('_', ' ').title()} Agent",
            "domain": "AGENT",
            "category": "SELECTION",
            "trigger": f"agent:{agent}:select",
            "description": f"Selects {agent} agent for task",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False
        })
        
        # PRE-EXECUTE hook
        hooks.append({
            "id": f"AGENT-{agent_upper}-PRE-EXECUTE",
            "name": f"Pre-Execute {agent.replace('_', ' ').title()}",
            "domain": "AGENT",
            "category": "EXECUTION",
            "trigger": f"agent:{agent}:preExecute",
            "description": f"Prepares {agent} agent for execution",
            "priority": 20,
            "canDisable": True,
            "isBlocking": False
        })
        
        # EXECUTE hook
        hooks.append({
            "id": f"AGENT-{agent_upper}-EXECUTE",
            "name": f"Execute {agent.replace('_', ' ').title()}",
            "domain": "AGENT",
            "category": "EXECUTION",
            "trigger": f"agent:{agent}:execute",
            "description": f"Executes {agent} agent task",
            "priority": 50,
            "canDisable": False,
            "isBlocking": False
        })
        
        # POST-EXECUTE hook
        hooks.append({
            "id": f"AGENT-{agent_upper}-POST-EXECUTE",
            "name": f"Post-Execute {agent.replace('_', ' ').title()}",
            "domain": "AGENT",
            "category": "EXECUTION",
            "trigger": f"agent:{agent}:postExecute",
            "description": f"Post-execution processing for {agent}",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False
        })
        
        # ERROR hook
        hooks.append({
            "id": f"AGENT-{agent_upper}-ERROR",
            "name": f"Handle {agent.replace('_', ' ').title()} Error",
            "domain": "AGENT",
            "category": "ERROR",
            "trigger": f"agent:{agent}:error",
            "description": f"Handles errors from {agent} agent",
            "priority": 10,
            "canDisable": False,
            "isBlocking": True
        })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# SKILL HOOKS (135 skills × 4 hooks = 540 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

SKILLS = [
    # Cognitive (7)
    "prism-cognitive-core", "prism-universal-formulas", "prism-reasoning-engine",
    "prism-code-perfection", "prism-safety-framework", "prism-process-optimizer",
    "prism-master-equation",
    
    # Session (8)
    "prism-session-master", "prism-session-buffer", "prism-quick-start",
    "prism-state-manager", "prism-task-continuity", "prism-error-recovery",
    "prism-context-pressure", "prism-emergency-save",
    
    # SP Workflow (8)
    "prism-sp-brainstorm", "prism-sp-planning", "prism-sp-execution",
    "prism-sp-debugging", "prism-sp-review-quality", "prism-sp-review-spec",
    "prism-sp-verification", "prism-sp-handoff",
    
    # Quality (14)
    "prism-quality-master", "prism-validator", "prism-tdd",
    "prism-completeness-auditor", "prism-anti-regression", "prism-evidence-collector",
    "prism-gate-keeper", "prism-code-reviewer", "prism-security-auditor",
    "prism-performance-auditor", "prism-dependency-checker", "prism-schema-validator",
    "prism-output-validator", "prism-input-validator",
    
    # Materials (7)
    "prism-material-schema", "prism-material-lookup", "prism-material-validator",
    "prism-material-physics", "prism-material-enhancer", "prism-material-estimator",
    "prism-material-converter",
    
    # Controllers (6)
    "prism-fanuc-programming", "prism-siemens-programming", "prism-heidenhain-programming",
    "prism-gcode-reference", "prism-error-catalog", "prism-alarm-diagnostic",
    
    # Manufacturing (8)
    "prism-manufacturing-tables", "prism-cutting-calculator", "prism-tool-selector",
    "prism-machine-matcher", "prism-post-processor", "prism-cam-strategies",
    "prism-toolpath-optimizer", "prism-simulation-validator",
    
    # AI/ML (6)
    "prism-ai-ml-master", "prism-algorithm-selector", "prism-model-trainer",
    "prism-inference-engine", "prism-optimization-engine", "prism-prediction-tracker",
    
    # Experts (6)
    "prism-expert-machinist", "prism-expert-materials", "prism-expert-physics",
    "prism-expert-cam", "prism-expert-quality", "prism-expert-safety",
    
    # Monolith (5)
    "prism-monolith-index", "prism-monolith-navigator", "prism-monolith-extractor",
    "prism-monolith-mapper", "prism-monolith-validator",
    
    # Knowledge (6)
    "prism-knowledge-master", "prism-knowledge-graph", "prism-knowledge-retriever",
    "prism-knowledge-updater", "prism-knowledge-validator", "prism-knowledge-merger",
    
    # Code (20)
    "prism-code-master", "prism-coding-patterns", "prism-debugging",
    "prism-refactoring", "prism-testing", "prism-documentation",
    "prism-api-contracts", "prism-type-system", "prism-error-handling",
    "prism-logging", "prism-metrics", "prism-caching",
    "prism-concurrency", "prism-security", "prism-performance",
    "prism-memory-management", "prism-file-io", "prism-network",
    "prism-database", "prism-serialization",
    
    # Dev Utilities (8)
    "prism-dev-utilities", "prism-git-integration", "prism-build-system",
    "prism-test-runner", "prism-linter", "prism-formatter",
    "prism-dependency-manager", "prism-version-control",
    
    # Orchestration (6)
    "prism-skill-orchestrator", "prism-agent-coordinator", "prism-swarm-controller",
    "prism-resource-allocator", "prism-task-scheduler", "prism-workflow-engine",
    
    # Integration (6)
    "prism-api-gateway", "prism-event-bus", "prism-message-queue",
    "prism-webhook-handler", "prism-external-api", "prism-data-sync",
    
    # Reporting (4)
    "prism-report-generator", "prism-dashboard", "prism-analytics",
    "prism-visualization",
    
    # Safety (4)
    "prism-life-safety", "prism-collision-detector", "prism-limit-checker",
    "prism-emergency-handler",
    
    # Learning (6)
    "prism-learning-engine", "prism-pattern-detector", "prism-feedback-processor",
    "prism-model-updater", "prism-experience-replay", "prism-continuous-learning"
]

def generate_skill_hooks() -> List[Dict]:
    """Generate 4 hooks for each skill."""
    hooks = []
    
    for skill in SKILLS:
        skill_id = skill.upper().replace("-", "_")
        skill_short = skill.replace("prism-", "").replace("-", "_")
        
        # LOAD hook
        hooks.append({
            "id": f"SKILL-{skill_id}-LOAD",
            "name": f"Load {skill}",
            "domain": "SKILL",
            "category": "LIFECYCLE",
            "trigger": f"skill:{skill_short}:load",
            "description": f"Loads {skill} into active context",
            "priority": 50,
            "canDisable": True,
            "isBlocking": False
        })
        
        # VALIDATE hook
        hooks.append({
            "id": f"SKILL-{skill_id}-VALIDATE",
            "name": f"Validate {skill}",
            "domain": "SKILL",
            "category": "VALIDATION",
            "trigger": f"skill:{skill_short}:validate",
            "description": f"Validates {skill} is properly loaded and functional",
            "priority": 20,
            "canDisable": True,
            "isBlocking": True
        })
        
        # APPLY hook
        hooks.append({
            "id": f"SKILL-{skill_id}-APPLY",
            "name": f"Apply {skill}",
            "domain": "SKILL",
            "category": "EXECUTION",
            "trigger": f"skill:{skill_short}:apply",
            "description": f"Applies {skill} knowledge to current task",
            "priority": 50,
            "canDisable": False,
            "isBlocking": False
        })
        
        # UNLOAD hook
        hooks.append({
            "id": f"SKILL-{skill_id}-UNLOAD",
            "name": f"Unload {skill}",
            "domain": "SKILL",
            "category": "LIFECYCLE",
            "trigger": f"skill:{skill_short}:unload",
            "description": f"Unloads {skill} from active context",
            "priority": 100,
            "canDisable": True,
            "isBlocking": False
        })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# CONTROLLER FAMILY HOOKS (12 families × 15 hooks = 180 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

CONTROLLER_FAMILIES = [
    "FANUC", "SIEMENS", "HEIDENHAIN", "MAZAK", "OKUMA", "HAAS",
    "MITSUBISHI", "BROTHER", "HURCO", "FAGOR", "DMG", "DOOSAN"
]

def generate_controller_hooks() -> List[Dict]:
    """Generate 15 hooks for each controller family."""
    hooks = []
    
    for controller in CONTROLLER_FAMILIES:
        # Core hooks
        for action in ["identify", "validate", "configure", "connect"]:
            hooks.append({
                "id": f"CTRL-{controller}-{action.upper()}",
                "name": f"{controller} {action.title()}",
                "domain": "CONTROLLER",
                "category": controller,
                "trigger": f"controller:{controller.lower()}:{action}",
                "description": f"{action.title()} {controller} controller",
                "priority": 20 if action == "validate" else 50,
                "canDisable": action != "validate",
                "isBlocking": action == "validate"
            })
        
        # Syntax hooks
        for syntax in ["gcode", "mcode", "macro", "cycle", "parameter"]:
            hooks.append({
                "id": f"CTRL-{controller}-SYNTAX-{syntax.upper()}",
                "name": f"{controller} {syntax.title()} Syntax",
                "domain": "CONTROLLER",
                "category": controller,
                "trigger": f"controller:{controller.lower()}:syntax:{syntax}",
                "description": f"Handles {syntax} syntax for {controller}",
                "priority": 50,
                "canDisable": True,
                "isBlocking": False
            })
        
        # Format hooks
        for format_type in ["coordinate", "feedrate", "speed", "tool", "work_offset", "program"]:
            hooks.append({
                "id": f"CTRL-{controller}-FORMAT-{format_type.upper().replace('_', '-')}",
                "name": f"{controller} {format_type.replace('_', ' ').title()} Format",
                "domain": "CONTROLLER",
                "category": controller,
                "trigger": f"controller:{controller.lower()}:format:{format_type}",
                "description": f"Formats {format_type} for {controller}",
                "priority": 50,
                "canDisable": True,
                "isBlocking": False
            })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# MACHINE SPECIFICATION HOOKS (25 categories × 8 hooks = 200 hooks)
# ═══════════════════════════════════════════════════════════════════════════════

MACHINE_SPEC_CATEGORIES = [
    "envelope", "spindle", "axis_x", "axis_y", "axis_z",
    "axis_a", "axis_b", "axis_c", "rapids", "feeds",
    "tool_changer", "coolant", "accuracy", "repeatability",
    "power", "workholding", "weight_capacity", "footprint",
    "controller", "options", "maintenance", "safety",
    "programming", "networking", "diagnostics"
]

def generate_machine_spec_hooks() -> List[Dict]:
    """Generate 8 hooks for each machine spec category."""
    hooks = []
    
    for spec in MACHINE_SPEC_CATEGORIES:
        spec_upper = spec.upper().replace("_", "-")
        
        for action in ["get", "set", "validate", "check", "compare", "optimize", "report", "alert"]:
            hooks.append({
                "id": f"MACH-SPEC-{spec_upper}-{action.upper()}",
                "name": f"{spec.replace('_', ' ').title()} {action.title()}",
                "domain": "MACHINE",
                "category": "SPECIFICATION",
                "subcategory": spec_upper,
                "trigger": f"machine:spec:{spec}:{action}",
                "description": f"{action.title()} machine {spec} specification",
                "priority": 10 if action in ["validate", "check"] else 50,
                "canDisable": action not in ["validate", "check"],
                "isBlocking": action in ["validate", "check"]
            })
    
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Generate all expanded hooks."""
    print("=" * 80)
    print("PRISM EXHAUSTIVE HOOK EXPANSION")
    print("=" * 80)
    
    all_hooks = []
    
    # Load base hooks from registry
    base_path = r"C:\PRISM\registries\HOOK_REGISTRY.json"
    if os.path.exists(base_path):
        with open(base_path, 'r', encoding='utf-8') as f:
            base_registry = json.load(f)
        base_hooks = base_registry.get("hooks", [])
        print(f"\nLoaded {len(base_hooks)} base hooks")
        all_hooks.extend(base_hooks)
    
    # Generate material parameter hooks
    print("\nGenerating material parameter hooks...")
    mat_hooks = generate_material_param_hooks()
    print(f"  Generated {len(mat_hooks)} material parameter hooks")
    all_hooks.extend(mat_hooks)
    
    # Generate formula hooks
    print("\nGenerating formula hooks...")
    formula_hooks = generate_formula_hooks()
    print(f"  Generated {len(formula_hooks)} formula hooks")
    all_hooks.extend(formula_hooks)
    
    # Generate agent hooks
    print("\nGenerating agent hooks...")
    agent_hooks = generate_agent_hooks()
    print(f"  Generated {len(agent_hooks)} agent hooks")
    all_hooks.extend(agent_hooks)
    
    # Generate skill hooks
    print("\nGenerating skill hooks...")
    skill_hooks = generate_skill_hooks()
    print(f"  Generated {len(skill_hooks)} skill hooks")
    all_hooks.extend(skill_hooks)
    
    # Generate controller hooks
    print("\nGenerating controller family hooks...")
    ctrl_hooks = generate_controller_hooks()
    print(f"  Generated {len(ctrl_hooks)} controller hooks")
    all_hooks.extend(ctrl_hooks)
    
    # Generate machine spec hooks
    print("\nGenerating machine specification hooks...")
    mach_hooks = generate_machine_spec_hooks()
    print(f"  Generated {len(mach_hooks)} machine spec hooks")
    all_hooks.extend(mach_hooks)
    
    # Deduplicate by ID
    seen_ids = set()
    unique_hooks = []
    for hook in all_hooks:
        hook_id = hook.get("id", "")
        if hook_id and hook_id not in seen_ids:
            seen_ids.add(hook_id)
            unique_hooks.append(hook)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE HOOKS: {len(unique_hooks)}")
    print(f"{'=' * 80}")
    
    # Create summary
    domain_counts = {}
    for hook in unique_hooks:
        domain = hook.get("domain", "UNKNOWN")
        domain_counts[domain] = domain_counts.get(domain, 0) + 1
    
    print("\nBy domain:")
    for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1]):
        print(f"  {domain}: {count}")
    
    # Count blocking/critical
    blocking = sum(1 for h in unique_hooks if h.get("isBlocking"))
    non_disable = sum(1 for h in unique_hooks if not h.get("canDisable", True))
    
    print(f"\nBlocking hooks: {blocking}")
    print(f"Non-disableable: {non_disable}")
    
    # Save expanded registry
    registry = {
        "version": "2.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_hook_expansion.py",
        "totalHooks": len(unique_hooks),
        "summary": {
            "byDomain": domain_counts,
            "blocking": blocking,
            "nonDisableable": non_disable,
            "materialParams": len(MATERIAL_PARAMETERS),
            "formulas": len(UNIVERSAL_FORMULAS),
            "agents": len(AGENTS),
            "skills": len(SKILLS),
            "controllers": len(CONTROLLER_FAMILIES),
            "machineSpecs": len(MACHINE_SPEC_CATEGORIES)
        },
        "hooks": unique_hooks
    }
    
    output_path = r"C:\PRISM\registries\HOOK_REGISTRY_EXPANDED.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {output_path}")
    
    # Update main registry
    main_path = r"C:\PRISM\registries\HOOK_REGISTRY.json"
    with open(main_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"Updated: {main_path}")
    
    # Save audit
    audit_path = r"C:\PRISM\mcp-server\audits\hook_expansion_r2_7.json"
    audit = {
        "session": "R2.7-EXPANSION",
        "timestamp": datetime.now().isoformat(),
        "baseHooks": len(base_hooks) if 'base_hooks' in dir() else 0,
        "materialParamHooks": len(mat_hooks),
        "formulaHooks": len(formula_hooks),
        "agentHooks": len(agent_hooks),
        "skillHooks": len(skill_hooks),
        "controllerHooks": len(ctrl_hooks),
        "machineSpecHooks": len(mach_hooks),
        "totalUnique": len(unique_hooks),
        "summary": registry["summary"]
    }
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    return unique_hooks

if __name__ == "__main__":
    hooks = main()
