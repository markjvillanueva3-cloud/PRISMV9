#!/usr/bin/env python3
"""
PRISM SCRIPT EXPANSION WAVE 2
==============================
AI_ML, CAD_CAM, QUALITY, SESSION, PRODUCT, INTEGRATION
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
# AI_ML SCRIPTS (80+)
# ═══════════════════════════════════════════════════════════════════════════════

ML_ALGORITHMS = [
    "pso", "genetic", "differential_evolution", "simulated_annealing", "tabu_search",
    "bayesian_optimization", "gradient_descent", "adam", "sgd", "lbfgs",
    "random_forest", "xgboost", "lightgbm", "catboost", "gradient_boosting",
    "neural_network", "cnn", "rnn", "lstm", "gru", "transformer", "attention",
    "svm", "knn", "naive_bayes", "decision_tree", "logistic_regression",
    "kmeans", "dbscan", "hierarchical", "gaussian_mixture",
    "pca", "tsne", "umap", "autoencoder", "vae",
    "dqn", "ppo", "a3c", "sac", "td3"
]

ML_TASKS = [
    ("preprocess", "Data preprocessing"), ("feature_eng", "Feature engineering"),
    ("train", "Model training"), ("validate", "Model validation"),
    ("test", "Model testing"), ("predict", "Inference/prediction"),
    ("evaluate", "Model evaluation"), ("hyperparameter", "Hyperparameter tuning"),
    ("deploy", "Model deployment"), ("monitor", "Model monitoring"),
    ("retrain", "Model retraining"), ("ensemble", "Ensemble methods")
]

ML_DOMAINS = [
    "parameter_prediction", "tool_life_prediction", "quality_prediction",
    "anomaly_detection", "process_optimization", "defect_classification",
    "surface_prediction", "wear_prediction", "chatter_prediction",
    "cost_estimation", "time_estimation", "failure_prediction"
]

def generate_aiml_scripts() -> List[ScriptDef]:
    scripts = []
    for algo in ML_ALGORITHMS:
        scripts.append(ScriptDef(
            id=f"SCR-ML-ALGO-{algo.upper()}", name=f"ml_algo_{algo}",
            category="AI_ML", subcategory="ALGORITHM",
            description=f"{algo} algorithm implementation",
            filename=f"ml_algo_{algo}.py", priority=30,
            hooks=[f"ml:algo:{algo}:*"], estimated_lines=300
        ))
    for task, desc in ML_TASKS:
        scripts.append(ScriptDef(
            id=f"SCR-ML-TASK-{task.upper()}", name=f"ml_task_{task}",
            category="AI_ML", subcategory="TASK",
            description=desc, filename=f"ml_task_{task}.py", priority=30,
            hooks=[f"ml:task:{task}"], estimated_lines=200
        ))
    for domain in ML_DOMAINS:
        scripts.append(ScriptDef(
            id=f"SCR-ML-DOMAIN-{domain.upper()}", name=f"ml_domain_{domain}",
            category="AI_ML", subcategory="DOMAIN",
            description=f"ML for {domain}", filename=f"ml_domain_{domain}.py",
            priority=30, hooks=[f"ml:domain:{domain}:*"], estimated_lines=350
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# CAD_CAM SCRIPTS (70+)
# ═══════════════════════════════════════════════════════════════════════════════

CAD_OPERATIONS = [
    "import_step", "import_iges", "import_stl", "import_parasolid",
    "export_step", "export_iges", "export_stl",
    "tessellate", "repair", "heal", "simplify",
    "measure", "analyze", "validate", "compare",
    "feature_recognize", "face_analyze", "edge_analyze", "volume_analyze"
]

CAM_STRATEGIES = [
    "facing", "pocket_2d", "pocket_3d", "profile_2d", "profile_3d",
    "slot", "chamfer", "deburr", "engrave",
    "rough_3d", "semifinish_3d", "finish_3d", "rest_rough", "rest_finish",
    "pencil", "scallop", "waterline", "parallel", "radial", "spiral",
    "swarf", "multiaxis_contour", "multiaxis_drilling",
    "od_rough", "od_finish", "id_rough", "id_finish",
    "face_turn", "groove", "part", "thread_turn", "bore",
    "drill", "peck", "ream", "tap", "bore_fine", "helical"
]

TOOLPATH_OPERATIONS = [
    "generate", "optimize", "verify", "simulate", "edit",
    "link", "order", "combine", "split", "mirror", "pattern"
]

POST_OPERATIONS = [
    "generate", "customize", "validate", "simulate", "compare", "debug"
]

def generate_cadcam_scripts() -> List[ScriptDef]:
    scripts = []
    for op in CAD_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-CAD-{op.upper()}", name=f"cad_{op}",
            category="CAD", subcategory="OPERATION",
            description=f"CAD {op} operation", filename=f"cad_{op}.py",
            priority=30, hooks=[f"cad:{op}"], estimated_lines=200
        ))
    for strat in CAM_STRATEGIES:
        scripts.append(ScriptDef(
            id=f"SCR-CAM-STRAT-{strat.upper()}", name=f"cam_strategy_{strat}",
            category="CAM", subcategory="STRATEGY",
            description=f"CAM {strat} strategy", filename=f"cam_strategy_{strat}.py",
            priority=30, hooks=[f"cam:strategy:{strat}:*"], estimated_lines=350
        ))
    for op in TOOLPATH_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-CAM-TP-{op.upper()}", name=f"toolpath_{op}",
            category="CAM", subcategory="TOOLPATH",
            description=f"Toolpath {op}", filename=f"toolpath_{op}.py",
            priority=30, hooks=[f"toolpath:{op}"], estimated_lines=200
        ))
    for op in POST_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-POST-{op.upper()}", name=f"post_{op}",
            category="CAM", subcategory="POST",
            description=f"Post processor {op}", filename=f"post_{op}.py",
            priority=30, hooks=[f"post:{op}"], estimated_lines=250
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# QUALITY SCRIPTS (50+)
# ═══════════════════════════════════════════════════════════════════════════════

QUALITY_COMPONENTS = ["reasoning", "code", "process", "safety", "learning"]
QUALITY_GATES = ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9"]
QUALITY_METRICS = [
    "completeness", "accuracy", "consistency", "traceability", "coverage",
    "complexity", "maintainability", "testability", "reliability", "performance"
]
QUALITY_OPERATIONS = [
    "validate", "score", "audit", "certify", "report", "improve", "monitor", "alert"
]
EVIDENCE_LEVELS = ["l1_claim", "l2_listing", "l3_sample", "l4_reproducible", "l5_verified"]

def generate_quality_scripts() -> List[ScriptDef]:
    scripts = []
    for comp in QUALITY_COMPONENTS:
        scripts.append(ScriptDef(
            id=f"SCR-QUAL-COMP-{comp.upper()}", name=f"quality_component_{comp}",
            category="QUALITY", subcategory="COMPONENT",
            description=f"Quality {comp} component (Ω)", filename=f"quality_component_{comp}.py",
            priority=20, hooks=[f"quality:component:{comp}:*"], estimated_lines=300
        ))
    for gate in QUALITY_GATES:
        scripts.append(ScriptDef(
            id=f"SCR-QUAL-GATE-{gate.upper()}", name=f"quality_gate_{gate}",
            category="QUALITY", subcategory="GATE",
            description=f"Quality gate {gate.upper()}", filename=f"quality_gate_{gate}.py",
            priority=20, hooks=[f"quality:gate:{gate}:*"], estimated_lines=150
        ))
    for metric in QUALITY_METRICS:
        scripts.append(ScriptDef(
            id=f"SCR-QUAL-METRIC-{metric.upper()}", name=f"quality_metric_{metric}",
            category="QUALITY", subcategory="METRIC",
            description=f"Quality metric: {metric}", filename=f"quality_metric_{metric}.py",
            priority=30, hooks=[f"quality:metric:{metric}"], estimated_lines=150
        ))
    for op in QUALITY_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-QUAL-OP-{op.upper()}", name=f"quality_{op}",
            category="QUALITY", subcategory="OPERATION",
            description=f"Quality {op}", filename=f"quality_{op}.py",
            priority=30, hooks=[f"quality:op:{op}"], estimated_lines=200
        ))
    for level in EVIDENCE_LEVELS:
        scripts.append(ScriptDef(
            id=f"SCR-QUAL-EVID-{level.upper()}", name=f"evidence_{level}",
            category="QUALITY", subcategory="EVIDENCE",
            description=f"Evidence level {level}", filename=f"evidence_{level}.py",
            priority=30, hooks=[f"evidence:{level}"], estimated_lines=120
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# SESSION SCRIPTS (50+)
# ═══════════════════════════════════════════════════════════════════════════════

SESSION_PHASES = ["init", "load", "execute", "checkpoint", "save", "recover", "handoff", "terminate"]
WORKFLOW_PHASES = ["brainstorm", "plan", "execute", "debug", "review_quality", "review_spec", "verify", "handoff"]
STATE_OPERATIONS = ["read", "write", "update", "merge", "validate", "backup", "restore", "migrate"]
BUFFER_ZONES = ["green", "yellow", "red", "black"]
MINDSETS = ["safety", "completeness", "anti_regression", "predictive"]

def generate_session_scripts() -> List[ScriptDef]:
    scripts = []
    for phase in SESSION_PHASES:
        scripts.append(ScriptDef(
            id=f"SCR-SESSION-{phase.upper()}", name=f"session_{phase}",
            category="SESSION", subcategory="LIFECYCLE",
            description=f"Session {phase} phase", filename=f"session_{phase}.py",
            priority=20, hooks=[f"session:phase:{phase}:*"], estimated_lines=200
        ))
    for phase in WORKFLOW_PHASES:
        scripts.append(ScriptDef(
            id=f"SCR-WORKFLOW-{phase.upper()}", name=f"sp_{phase}",
            category="SESSION", subcategory="WORKFLOW",
            description=f"SP-{phase} workflow", filename=f"sp_{phase}.py",
            priority=20, hooks=[f"workflow:{phase}:*"], estimated_lines=300
        ))
    for op in STATE_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-STATE-{op.upper()}", name=f"state_{op}",
            category="SESSION", subcategory="STATE",
            description=f"State {op}", filename=f"state_{op}.py",
            priority=30, hooks=[f"state:{op}"], estimated_lines=150
        ))
    for zone in BUFFER_ZONES:
        scripts.append(ScriptDef(
            id=f"SCR-BUFFER-{zone.upper()}", name=f"buffer_{zone}",
            category="SESSION", subcategory="BUFFER",
            description=f"Buffer zone {zone} handling", filename=f"buffer_{zone}.py",
            priority=20, hooks=[f"buffer:{zone}"], estimated_lines=100
        ))
    for mindset in MINDSETS:
        scripts.append(ScriptDef(
            id=f"SCR-MINDSET-{mindset.upper()}", name=f"mindset_{mindset}",
            category="SESSION", subcategory="MINDSET",
            description=f"{mindset} mindset enforcement", filename=f"mindset_{mindset}.py",
            priority=10, hooks=[f"mindset:{mindset}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCT SCRIPTS (80+)
# ═══════════════════════════════════════════════════════════════════════════════

SFC_MODULES = [
    "material_select", "tool_select", "machine_select", "operation_select",
    "speed_calculate", "feed_calculate", "depth_calculate", "width_calculate",
    "power_calculate", "force_calculate", "torque_calculate",
    "optimize_mrr", "optimize_life", "optimize_finish", "optimize_cost",
    "validate_params", "recommend_params", "compare_params", "export_params"
]

PPG_MODULES = [
    "machine_config", "controller_config", "axis_config", "spindle_config",
    "cycle_map", "gcode_gen", "mcode_gen", "macro_gen",
    "format_output", "line_number", "comment_style", "block_structure",
    "simulate", "verify", "compare", "debug", "export"
]

SHOP_MODULES = [
    "part_analyze", "feature_extract", "complexity_score",
    "material_cost", "tooling_cost", "labor_cost", "machine_cost", "overhead_cost",
    "setup_time", "cycle_time", "lead_time",
    "quote_generate", "quote_compare", "quote_optimize",
    "schedule_job", "capacity_plan", "resource_allocate"
]

ACNC_MODULES = [
    "geometry_import", "geometry_analyze", "feature_recognize", "feature_classify",
    "operation_plan", "operation_sequence", "tool_assign", "machine_assign",
    "toolpath_generate", "toolpath_optimize", "toolpath_verify",
    "collision_detect", "collision_avoid", "stock_simulate",
    "nc_output", "nc_verify", "nc_optimize"
]

def generate_product_scripts() -> List[ScriptDef]:
    scripts = []
    for mod in SFC_MODULES:
        scripts.append(ScriptDef(
            id=f"SCR-SFC-{mod.upper()}", name=f"sfc_{mod}",
            category="PRODUCT", subcategory="SFC",
            description=f"Speed & Feed Calculator: {mod}", filename=f"sfc_{mod}.py",
            priority=20, hooks=[f"sfc:{mod}:*"], estimated_lines=250
        ))
    for mod in PPG_MODULES:
        scripts.append(ScriptDef(
            id=f"SCR-PPG-{mod.upper()}", name=f"ppg_{mod}",
            category="PRODUCT", subcategory="PPG",
            description=f"Post Processor Generator: {mod}", filename=f"ppg_{mod}.py",
            priority=20, hooks=[f"ppg:{mod}:*"], estimated_lines=300
        ))
    for mod in SHOP_MODULES:
        scripts.append(ScriptDef(
            id=f"SCR-SHOP-{mod.upper()}", name=f"shop_{mod}",
            category="PRODUCT", subcategory="SHOP",
            description=f"Shop Manager: {mod}", filename=f"shop_{mod}.py",
            priority=20, hooks=[f"shop:{mod}:*"], estimated_lines=250
        ))
    for mod in ACNC_MODULES:
        scripts.append(ScriptDef(
            id=f"SCR-ACNC-{mod.upper()}", name=f"acnc_{mod}",
            category="PRODUCT", subcategory="ACNC",
            description=f"Auto CNC Programmer: {mod}", filename=f"acnc_{mod}.py",
            priority=20, hooks=[f"acnc:{mod}:*"], estimated_lines=350
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION SCRIPTS (60+)
# ═══════════════════════════════════════════════════════════════════════════════

API_TYPES = ["claude", "openai", "rest", "graphql", "websocket", "grpc", "soap"]
FILE_FORMATS = [
    "json", "xml", "yaml", "csv", "excel", "pdf",
    "step", "iges", "stl", "obj", "parasolid", "acis",
    "gcode", "apt", "cldata", "dxf", "dwg"
]
EXTERNAL_SYSTEMS = [
    "erp", "mes", "plm", "scada", "cmm", "mtconnect", "opcua",
    "cad_solidworks", "cad_nx", "cad_catia", "cad_inventor", "cad_fusion",
    "cam_mastercam", "cam_esprit", "cam_powermill", "cam_hypermill"
]
DATA_OPERATIONS = ["import", "export", "sync", "validate", "transform", "migrate"]

def generate_integration_scripts() -> List[ScriptDef]:
    scripts = []
    for api in API_TYPES:
        scripts.append(ScriptDef(
            id=f"SCR-API-{api.upper()}", name=f"api_{api}",
            category="INTEGRATION", subcategory="API",
            description=f"{api.upper()} API client", filename=f"api_{api}.py",
            priority=30, hooks=[f"api:{api}:*"], estimated_lines=300
        ))
    for fmt in FILE_FORMATS:
        scripts.append(ScriptDef(
            id=f"SCR-FILE-{fmt.upper()}", name=f"file_{fmt}",
            category="INTEGRATION", subcategory="FILE",
            description=f"{fmt.upper()} file handler", filename=f"file_{fmt}.py",
            priority=30, hooks=[f"file:{fmt}:*"], estimated_lines=200
        ))
    for sys in EXTERNAL_SYSTEMS:
        scripts.append(ScriptDef(
            id=f"SCR-EXT-{sys.upper()}", name=f"ext_{sys}",
            category="INTEGRATION", subcategory="EXTERNAL",
            description=f"{sys} integration", filename=f"ext_{sys}.py",
            priority=40, hooks=[f"external:{sys}:*"], estimated_lines=350
        ))
    for op in DATA_OPERATIONS:
        scripts.append(ScriptDef(
            id=f"SCR-DATA-{op.upper()}", name=f"data_{op}",
            category="INTEGRATION", subcategory="DATA",
            description=f"Data {op}", filename=f"data_{op}.py",
            priority=30, hooks=[f"data:{op}"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM SCRIPT EXPANSION WAVE 2")
    print("=" * 80)
    
    # Load Wave 1
    registry_path = r"C:\PRISM\registries\SCRIPT_REGISTRY.json"
    with open(registry_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    existing = data.get("scripts", [])
    print(f"\nLoaded {len(existing)} Wave 1 scripts")
    
    # Generate Wave 2
    print("\nGenerating Wave 2 scripts...")
    generators = [
        ("AI_ML", generate_aiml_scripts),
        ("CAD_CAM", generate_cadcam_scripts),
        ("QUALITY", generate_quality_scripts),
        ("SESSION", generate_session_scripts),
        ("PRODUCT", generate_product_scripts),
        ("INTEGRATION", generate_integration_scripts)
    ]
    
    wave2 = []
    for name, func in generators:
        scripts = func()
        wave2.extend([s.to_dict() for s in scripts])
        print(f"  {name}: {len(scripts)}")
    
    print(f"\nWave 2 scripts: {len(wave2)}")
    
    # Combine
    all_scripts = existing + wave2
    seen = set()
    unique = []
    for s in all_scripts:
        if s["id"] not in seen:
            seen.add(s["id"])
            unique.append(s)
    
    print(f"Total unique scripts: {len(unique)}")
    
    # Categories
    cats = {}
    for s in unique:
        c = s.get("category", "?")
        cats[c] = cats.get(c, 0) + 1
    print("\nBy Category:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    
    # Save
    total_lines = sum(s.get("estimated_lines", 0) for s in unique)
    registry = {
        "version": "3.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_script_expansion_wave2.py",
        "totalScripts": len(unique),
        "estimatedLines": total_lines,
        "summary": {"byCategory": cats},
        "scripts": unique
    }
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    audit = {"session": "R2.7-SCRIPT-WAVE2", "timestamp": datetime.now().isoformat(),
             "wave1": len(existing), "wave2": len(wave2), "total": len(unique)}
    audit_path = r"C:\PRISM\mcp-server\audits\script_expansion_wave2.json"
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")

if __name__ == "__main__":
    main()
