#!/usr/bin/env python3
"""
PRISM SCRIPT EXPANSION WAVE 4
==============================
ERROR, FUSION, LEARNING, UTILITY, DATABASE, REPORT, FORMULA, AGENT, ALLOY
"""

import json
import os
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import List

@dataclass
class ScriptDef:
    id: str
    name: str
    category: str
    subcategory: str
    description: str
    filename: str
    language: str = "python"
    version: str = "1.0.0"
    priority: int = 50
    hooks: List[str] = field(default_factory=list)
    estimated_lines: int = 200
    status: str = "DEFINED"
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# ERROR SCRIPTS (29)
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS = [
    "state_corruption", "file_access", "memory_overflow", "timeout", "network",
    "schema_violation", "range_violation", "type_mismatch", "missing_required", "constraint_violation",
    "divide_by_zero", "overflow", "underflow", "convergence", "singularity",
    "material_not_found", "machine_not_found", "tool_not_found", "invalid_operation", "safety_violation",
    "api_error", "format_error", "version_mismatch", "encoding_error",
    "retry", "fallback", "graceful_degrade", "checkpoint_restore", "manual_intervention"
]

def generate_error_scripts() -> List[ScriptDef]:
    scripts = []
    for err in ERRORS:
        scripts.append(ScriptDef(
            id=f"SCR-ERR-{err.upper()}", name=f"error_{err}",
            category="ERROR", subcategory="HANDLING",
            description=f"Error handler: {err}", filename=f"error_{err}.py",
            priority=10, hooks=[f"error:{err}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# FUSION SCRIPTS (37)
# ═══════════════════════════════════════════════════════════════════════════════

FUSIONS = [
    "material_tool_match", "coating_material_opt", "physics_ml_hybrid", "force_learn", "thermal_learn",
    "feature_to_toolpath", "tolerance_to_strategy", "machine_post_sync", "kinematic_post",
    "quality_feedback", "defect_learn", "machinability_physics", "chip_physics",
    "deflection_compensation", "wear_prediction", "cost_quality_balance", "time_quality_balance",
    "safety_productivity", "shop_floor_learn", "operator_knowledge", "historical_analysis",
    "erp_cam_sync", "cad_inspection", "simulation_actual", "generative_cam", "adaptive_feed",
    "predictive_maintenance", "digital_twin", "multi_setup_opt", "batch_optimization",
    "fixture_toolpath", "standard_practice", "theory_practice", "global_local",
    "report_viz", "doc_code", "setup_nc"
]

def generate_fusion_scripts() -> List[ScriptDef]:
    scripts = []
    for fus in FUSIONS:
        scripts.append(ScriptDef(
            id=f"SCR-FUSION-{fus.upper()}", name=f"fusion_{fus}",
            category="FUSION", subcategory="CROSS_DOMAIN",
            description=f"Cross-domain fusion: {fus}", filename=f"fusion_{fus}.py",
            priority=20, hooks=[f"fusion:{fus}:*"], estimated_lines=300
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# LEARNING SCRIPTS (25)
# ═══════════════════════════════════════════════════════════════════════════════

LEARNING = [
    "parameter_learning", "strategy_learning", "tool_selection_learn", "sequence_learning",
    "time_estimation_learn", "cost_estimation_learn", "quality_prediction_learn", "failure_mode_learn",
    "preference_learning", "shop_practice_learn", "material_behavior_learn", "machine_behavior_learn",
    "tool_life_learn", "surface_finish_learn", "tolerance_achieve_learn", "setup_time_learn",
    "program_pattern_learn", "error_pattern_learn", "optimization_learn", "schedule_learn",
    "capacity_learn", "supplier_learn", "customer_learn", "process_chain_learn", "root_cause_learn"
]

def generate_learning_scripts() -> List[ScriptDef]:
    scripts = []
    for learn in LEARNING:
        scripts.append(ScriptDef(
            id=f"SCR-LEARN-{learn.upper()}", name=f"learning_{learn}",
            category="LEARNING", subcategory="DOMAIN",
            description=f"Learning domain: {learn}", filename=f"learning_{learn}.py",
            priority=30, hooks=[f"learning:{learn}:*"], estimated_lines=250
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY SCRIPTS (40)
# ═══════════════════════════════════════════════════════════════════════════════

UTILITIES = [
    "registry_builder", "skill_selector", "agent_coordinator", "hook_dispatcher", "formula_executor",
    "cache_manager", "state_manager", "checkpoint_manager", "buffer_monitor", "metrics_collector",
    "report_generator", "audit_logger", "validation_engine", "conversion_engine", "search_engine",
    "index_builder", "sync_manager", "backup_manager", "migration_manager", "test_runner",
    "benchmark_runner", "config_manager", "secret_manager", "log_analyzer", "error_analyzer",
    "performance_monitor", "resource_optimizer", "dependency_resolver", "version_manager", "release_manager",
    "unit_converter", "format_converter", "schema_validator", "hash_generator", "uuid_generator",
    "timestamp_handler", "path_resolver", "template_engine", "diff_engine", "merge_engine"
]

def generate_utility_scripts() -> List[ScriptDef]:
    scripts = []
    for util in UTILITIES:
        scripts.append(ScriptDef(
            id=f"SCR-UTIL-{util.upper()}", name=f"util_{util}",
            category="UTILITY", subcategory="SYSTEM",
            description=f"Utility: {util}", filename=f"util_{util}.py",
            priority=40, hooks=[f"utility:{util}"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE SCRIPTS (25)
# ═══════════════════════════════════════════════════════════════════════════════

DB_OPERATIONS = [
    "create", "read", "update", "delete", "query", "search", "filter", "sort", "paginate",
    "join", "aggregate", "index", "backup", "restore", "migrate", "validate",
    "import", "export", "sync", "cache", "transaction", "rollback", "vacuum", "analyze", "optimize"
]

def generate_database_scripts() -> List[ScriptDef]:
    scripts = []
    for op in DB_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-DB-{op.upper()}", name=f"db_{op}",
            category="DATABASE", subcategory="OPERATION",
            description=f"Database {op}", filename=f"db_{op}.py",
            priority=30, hooks=[f"db:{op}"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# REPORT SCRIPTS (20)
# ═══════════════════════════════════════════════════════════════════════════════

REPORTS = [
    "session_summary", "quality_report", "validation_report", "audit_report", "coverage_report",
    "performance_report", "error_report", "usage_report", "cost_report", "time_report",
    "material_report", "machine_report", "tool_report", "operation_report", "feature_report",
    "quote_report", "schedule_report", "capacity_report", "inventory_report", "maintenance_report"
]

def generate_report_scripts() -> List[ScriptDef]:
    scripts = []
    for rpt in REPORTS:
        scripts.append(ScriptDef(
            id=f"SCR-RPT-{rpt.upper()}", name=f"report_{rpt}",
            category="REPORT", subcategory="GENERATION",
            description=f"Report: {rpt}", filename=f"report_{rpt}.py",
            priority=40, hooks=[f"report:{rpt}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# FORMULA SCRIPTS (22)
# ═══════════════════════════════════════════════════════════════════════════════

FORMULAS = [
    "f_cut_001_kienzle", "f_cut_002_merchant", "f_cut_003_oxley",
    "f_life_001_taylor", "f_life_002_extended", "f_life_003_usui",
    "f_therm_001_flash", "f_therm_002_bulk", "f_therm_003_interface",
    "f_vib_001_chatter", "f_vib_002_stability", "f_vib_003_frf",
    "f_surf_001_theoretical", "f_surf_002_actual",
    "f_defl_001_tool", "f_defl_002_workpiece",
    "f_pow_001_spindle", "f_pow_002_axis",
    "f_chip_001_formation", "f_chip_002_breaking",
    "f_opt_001_mrr", "f_opt_002_cost"
]

def generate_formula_scripts() -> List[ScriptDef]:
    scripts = []
    for formula in FORMULAS:
        scripts.append(ScriptDef(
            id=f"SCR-FORMULA-{formula.upper()}", name=f"formula_{formula}",
            category="FORMULA", subcategory="CALCULATION",
            description=f"Formula: {formula}", filename=f"formula_{formula}.py",
            priority=20, hooks=[f"formula:{formula}:*"], estimated_lines=250
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# AGENT SCRIPTS (64)
# ═══════════════════════════════════════════════════════════════════════════════

AGENTS_OPUS = [
    "strategic_planner", "architecture_designer", "complex_problem_solver", "research_analyst",
    "quality_auditor", "safety_validator", "risk_assessor", "innovation_engine",
    "knowledge_synthesizer", "decision_optimizer", "root_cause_analyzer", "failure_predictor",
    "cost_optimizer", "time_optimizer", "performance_optimizer", "resource_optimizer",
    "code_architect", "test_strategist"
]

AGENTS_SONNET = [
    "material_expert", "machine_expert", "tool_expert", "controller_expert",
    "physics_expert", "thermal_expert", "vibration_expert", "surface_expert",
    "cam_expert", "cad_expert", "post_expert", "simulation_expert",
    "quality_inspector", "process_optimizer", "feature_recognizer", "tolerance_analyzer",
    "cost_estimator", "time_estimator", "schedule_optimizer", "capacity_planner",
    "alarm_diagnostician", "maintenance_planner", "inventory_manager", "vendor_coordinator",
    "code_generator", "code_reviewer", "test_generator", "documentation_writer",
    "data_analyst", "report_generator", "api_integrator", "file_processor",
    "session_manager", "state_controller", "checkpoint_manager", "recovery_specialist",
    "validation_expert"
]

AGENTS_HAIKU = [
    "lookup_agent", "search_agent", "filter_agent", "sort_agent",
    "format_agent", "convert_agent", "validate_agent", "cache_agent", "log_agent"
]

def generate_agent_scripts() -> List[ScriptDef]:
    scripts = []
    for agent in AGENTS_OPUS:
        scripts.append(ScriptDef(
            id=f"SCR-AGENT-OPUS-{agent.upper()}", name=f"agent_opus_{agent}",
            category="AGENT", subcategory="OPUS",
            description=f"OPUS agent: {agent}", filename=f"agent_opus_{agent}.py",
            priority=10, hooks=[f"agent:opus:{agent}:*"], estimated_lines=400
        ))
    for agent in AGENTS_SONNET:
        scripts.append(ScriptDef(
            id=f"SCR-AGENT-SONNET-{agent.upper()}", name=f"agent_sonnet_{agent}",
            category="AGENT", subcategory="SONNET",
            description=f"SONNET agent: {agent}", filename=f"agent_sonnet_{agent}.py",
            priority=20, hooks=[f"agent:sonnet:{agent}:*"], estimated_lines=300
        ))
    for agent in AGENTS_HAIKU:
        scripts.append(ScriptDef(
            id=f"SCR-AGENT-HAIKU-{agent.upper()}", name=f"agent_haiku_{agent}",
            category="AGENT", subcategory="HAIKU",
            description=f"HAIKU agent: {agent}", filename=f"agent_haiku_{agent}.py",
            priority=30, hooks=[f"agent:haiku:{agent}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# ALLOY SCRIPTS (30 specific alloys)
# ═══════════════════════════════════════════════════════════════════════════════

SPECIFIC_ALLOYS = [
    "al_6061_t6", "al_7075_t6", "al_2024_t3", "al_5052_h32",
    "ss_304", "ss_316l", "ss_17_4ph", "ss_2205",
    "steel_4140", "steel_4340", "steel_1045", "steel_8620",
    "ti_6al4v", "ti_6al4v_eli", "ti_cp_gr2",
    "inconel_718", "inconel_625", "hastelloy_c276",
    "tool_d2", "tool_h13", "tool_a2", "tool_m2",
    "brass_c360", "bronze_c932", "copper_c110",
    "delrin_150", "peek_450g", "nylon_6", "ultem_1000", "ptfe"
]

def generate_alloy_scripts() -> List[ScriptDef]:
    scripts = []
    for alloy in SPECIFIC_ALLOYS:
        scripts.append(ScriptDef(
            id=f"SCR-ALLOY-{alloy.upper()}", name=f"alloy_{alloy}",
            category="ALLOY", subcategory="SPECIFIC",
            description=f"Specific alloy: {alloy}", filename=f"alloy_{alloy}.py",
            priority=30, hooks=[f"alloy:{alloy}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# TOLERANCE CLASS SCRIPTS (21)
# ═══════════════════════════════════════════════════════════════════════════════

TOLERANCE_CLASSES = [
    "h6", "h7", "h8", "h9", "h10",
    "H6", "H7", "H8", "H9", "H10",
    "g6", "f7", "e8", "d9",
    "js6", "k6", "m6", "n6", "p6", "r6", "s6"
]

def generate_tolerance_scripts() -> List[ScriptDef]:
    scripts = []
    for tol in TOLERANCE_CLASSES:
        scripts.append(ScriptDef(
            id=f"SCR-TOL-{tol.upper()}", name=f"tolerance_{tol.lower()}",
            category="TOLERANCE", subcategory="CLASS",
            description=f"Tolerance class: {tol}", filename=f"tolerance_{tol.lower()}.py",
            priority=40, hooks=[f"tolerance:{tol.lower()}:*"], estimated_lines=120
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM SCRIPT EXPANSION WAVE 4 - FINAL")
    print("=" * 80)
    
    registry_path = r"C:\PRISM\registries\SCRIPT_REGISTRY.json"
    with open(registry_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    existing = data.get("scripts", [])
    print(f"\nLoaded {len(existing)} existing scripts")
    
    print("\nGenerating Wave 4 scripts...")
    generators = [
        ("ERROR", generate_error_scripts),
        ("FUSION", generate_fusion_scripts),
        ("LEARNING", generate_learning_scripts),
        ("UTILITY", generate_utility_scripts),
        ("DATABASE", generate_database_scripts),
        ("REPORT", generate_report_scripts),
        ("FORMULA", generate_formula_scripts),
        ("AGENT", generate_agent_scripts),
        ("ALLOY", generate_alloy_scripts),
        ("TOLERANCE", generate_tolerance_scripts)
    ]
    
    wave4 = []
    for name, func in generators:
        scripts = func()
        wave4.extend([s.to_dict() for s in scripts])
        print(f"  {name}: {len(scripts)}")
    
    print(f"\nWave 4 scripts: {len(wave4)}")
    
    all_scripts = existing + wave4
    seen = set()
    unique = []
    for s in all_scripts:
        if s["id"] not in seen:
            seen.add(s["id"])
            unique.append(s)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE SCRIPTS: {len(unique)}")
    print(f"{'=' * 80}")
    
    cats = {}
    for s in unique:
        c = s.get("category", "?")
        cats[c] = cats.get(c, 0) + 1
    print("\nBy Category:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    
    total_lines = sum(s.get("estimated_lines", 0) for s in unique)
    print(f"\nEstimated total lines: {total_lines:,}")
    
    registry = {
        "version": "5.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_script_expansion_wave4.py",
        "totalScripts": len(unique),
        "estimatedLines": total_lines,
        "categories": len(cats),
        "summary": {"byCategory": cats},
        "scripts": unique
    }
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    audit = {"session": "R2.7-SCRIPT-WAVE4", "timestamp": datetime.now().isoformat(),
             "wave1": 270, "wave2": 324, "wave3": 355, "wave4": len(wave4), "total": len(unique), "categories": len(cats)}
    audit_path = r"C:\PRISM\mcp-server\audits\script_expansion_wave4.json"
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")

if __name__ == "__main__":
    main()
