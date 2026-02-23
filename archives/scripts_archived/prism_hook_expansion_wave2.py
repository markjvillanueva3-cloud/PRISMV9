#!/usr/bin/env python3
"""
PRISM HOOK EXPANSION WAVE 2 - SKILL SYNCHRONIZATION
====================================================
Adds hooks for all new skill categories from Wave 1-4 skill expansion.

NEW HOOK DOMAINS:
- OPERATION (53 skills × 8 hooks = 424)
- FEATURE (40 skills × 6 hooks = 240)
- FUSION (37 skills × 5 hooks = 185)
- ERROR (29 skills × 6 hooks = 174)
- METROLOGY (25 skills × 6 hooks = 150)
- LEARNING (25 skills × 8 hooks = 200)
- GDT (20 skills × 6 hooks = 120)
- WORKHOLDING (25 skills × 5 hooks = 125)
- THREAD (30 skills × 6 hooks = 180)
- STANDARD (38 skills × 4 hooks = 152)
- TOLERANCE (21 skills × 5 hooks = 105)
- COOLANT (15 skills × 5 hooks = 75)
- ALLOY (83 skills × 6 hooks = 498)
- INSERT (39 skills × 5 hooks = 195)
- COATING (20 skills × 5 hooks = 100)
- VENDOR (30 skills × 4 hooks = 120)
- TREATMENT (20 skills × 5 hooks = 100)

TARGET: +3,143 hooks → ~6,652 total
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any

# ═══════════════════════════════════════════════════════════════════════════════
# OPERATION HOOKS (53 operations × 8 hooks = 424)
# ═══════════════════════════════════════════════════════════════════════════════

MILLING_OPS = [
    "face-milling", "peripheral-milling", "slot-milling", "pocket-milling", "contour-milling",
    "plunge-milling", "ramp-milling", "trochoidal-milling", "hsm-roughing", "hsm-finishing",
    "3d-roughing", "3d-semi-finish", "3d-finishing", "rest-milling", "pencil-milling",
    "scallop-milling", "parallel-milling", "radial-milling", "spiral-milling", "waterline-milling",
    "swarf-milling", "multiaxis-milling", "thread-milling", "chamfer-milling", "deburr-milling"
]

TURNING_OPS = [
    "od-roughing", "od-finishing", "id-roughing", "id-finishing", "facing",
    "grooving", "parting", "threading-od", "threading-id", "boring",
    "profiling-turn", "taper-turning", "contour-turning", "knurling", "burnishing"
]

HOLE_OPS = [
    "center-drilling", "spot-drilling", "twist-drilling", "peck-drilling", "gun-drilling",
    "reaming", "boring-fine", "back-boring", "counterboring", "countersinking",
    "tapping", "thread-forming", "helical-interpolation"
]

OPERATION_HOOK_TYPES = [
    ("select", "Select operation for feature"),
    ("configure", "Configure operation parameters"),
    ("calculate", "Calculate cutting parameters"),
    ("generate", "Generate toolpath"),
    ("optimize", "Optimize operation"),
    ("validate", "Validate operation feasibility"),
    ("simulate", "Simulate operation"),
    ("document", "Document operation details")
]

def generate_operation_hooks() -> List[Dict]:
    hooks = []
    all_ops = [("mill", op) for op in MILLING_OPS] + \
              [("turn", op) for op in TURNING_OPS] + \
              [("hole", op) for op in HOLE_OPS]
    
    for op_type, op_id in all_ops:
        for hook_type, hook_desc in OPERATION_HOOK_TYPES:
            hooks.append({
                "id": f"operation:{op_type}:{op_id}:{hook_type}",
                "domain": "OPERATION",
                "subdomain": op_type.upper(),
                "trigger": f"operation.{op_type}.{op_id}.{hook_type}",
                "description": f"{hook_desc} for {op_id}",
                "priority": 30,
                "async": hook_type in ["simulate", "optimize"]
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE HOOKS (40 features × 6 hooks = 240)
# ═══════════════════════════════════════════════════════════════════════════════

FEATURES = [
    "simple-hole", "counterbore-hole", "countersink-hole", "threaded-hole", "reamed-hole", "pattern-holes",
    "rectangular-pocket", "circular-pocket", "obround-pocket", "freeform-pocket", "deep-pocket", "thin-wall-pocket",
    "open-profile", "closed-profile", "chamfer-edge", "fillet-edge",
    "circular-boss", "rectangular-boss", "custom-boss",
    "through-slot", "blind-slot", "t-slot", "dovetail-slot", "keyway",
    "flat-face", "3d-surface", "blend-surface",
    "od-surface", "id-surface", "face-surface", "groove-od", "groove-id", "groove-face",
    "thread-feature", "taper-feature", "rib", "web", "undercut", "draft", "core-cavity"
]

FEATURE_HOOK_TYPES = [
    ("recognize", "Recognize feature from geometry"),
    ("analyze", "Analyze feature requirements"),
    ("plan", "Plan machining approach"),
    ("sequence", "Sequence operations"),
    ("validate", "Validate manufacturability"),
    ("cost", "Estimate machining cost")
]

def generate_feature_hooks() -> List[Dict]:
    hooks = []
    for feat_id in FEATURES:
        for hook_type, hook_desc in FEATURE_HOOK_TYPES:
            hooks.append({
                "id": f"feature:{feat_id}:{hook_type}",
                "domain": "FEATURE",
                "subdomain": feat_id.split("-")[0].upper() if "-" in feat_id else "GENERAL",
                "trigger": f"feature.{feat_id}.{hook_type}",
                "description": f"{hook_desc} for {feat_id}",
                "priority": 30,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# FUSION HOOKS (37 fusions × 5 hooks = 185)
# ═══════════════════════════════════════════════════════════════════════════════

FUSIONS = [
    "material-tool-match", "coating-material-opt", "physics-ml-hybrid", "force-learn", "thermal-learn",
    "feature-to-toolpath", "tolerance-to-strategy", "machine-post-sync", "kinematic-post",
    "quality-feedback", "defect-learn", "machinability-physics", "chip-physics",
    "deflection-compensation", "wear-prediction", "cost-quality-balance", "time-quality-balance",
    "safety-productivity", "shop-floor-learn", "operator-knowledge", "historical-analysis",
    "erp-cam-sync", "cad-inspection", "simulation-actual", "generative-cam", "adaptive-feed",
    "predictive-maintenance", "digital-twin", "multi-setup-opt", "batch-optimization",
    "fixture-toolpath", "standard-practice", "theory-practice", "global-local",
    "report-viz", "doc-code", "setup-nc"
]

FUSION_HOOK_TYPES = [
    ("activate", "Activate fusion"),
    ("execute", "Execute cross-domain fusion"),
    ("validate", "Validate fusion results"),
    ("optimize", "Optimize fusion parameters"),
    ("learn", "Learn from fusion outcomes")
]

def generate_fusion_hooks() -> List[Dict]:
    hooks = []
    for fus_id in FUSIONS:
        for hook_type, hook_desc in FUSION_HOOK_TYPES:
            hooks.append({
                "id": f"fusion:{fus_id}:{hook_type}",
                "domain": "FUSION",
                "subdomain": "CROSS_DOMAIN",
                "trigger": f"fusion.{fus_id}.{hook_type}",
                "description": f"{hook_desc} - {fus_id}",
                "priority": 20,
                "async": hook_type in ["execute", "optimize"]
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# ERROR HOOKS (29 errors × 6 hooks = 174)
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS = [
    "state-corruption", "file-access", "memory-overflow", "timeout", "network",
    "schema-violation", "range-violation", "type-mismatch", "missing-required", "constraint-violation",
    "divide-by-zero", "overflow", "underflow", "convergence", "singularity",
    "material-not-found", "machine-not-found", "tool-not-found", "invalid-operation", "safety-violation",
    "api-error", "format-error", "version-mismatch", "encoding-error",
    "retry", "fallback", "graceful-degrade", "checkpoint-restore", "manual-intervention"
]

ERROR_HOOK_TYPES = [
    ("detect", "Detect error condition"),
    ("classify", "Classify error severity"),
    ("handle", "Handle error"),
    ("recover", "Attempt recovery"),
    ("log", "Log error details"),
    ("notify", "Notify relevant parties")
]

def generate_error_hooks() -> List[Dict]:
    hooks = []
    for err_id in ERRORS:
        for hook_type, hook_desc in ERROR_HOOK_TYPES:
            hooks.append({
                "id": f"error:{err_id}:{hook_type}",
                "domain": "ERROR",
                "subdomain": "HANDLING",
                "trigger": f"error.{err_id}.{hook_type}",
                "description": f"{hook_desc} - {err_id}",
                "priority": 10,
                "async": hook_type == "notify"
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# METROLOGY HOOKS (25 methods × 6 hooks = 150)
# ═══════════════════════════════════════════════════════════════════════════════

METROLOGY = [
    "caliper", "micrometer", "height-gage", "depth-gage", "bore-gage", "pin-gage", "ring-gage", "thread-gage",
    "cmm-touch", "cmm-scanning", "cmm-optical", "cmm-laser",
    "profilometer", "roundness-tester", "contour-tracer",
    "optical-comparator", "vision-system", "microscope", "laser-scan",
    "hardness-tester", "ultrasonic", "eddy-current", "dye-penetrant", "xray", "ct-scan"
]

METROLOGY_HOOK_TYPES = [
    ("select", "Select measurement method"),
    ("setup", "Setup measurement equipment"),
    ("measure", "Execute measurement"),
    ("analyze", "Analyze measurement data"),
    ("report", "Generate measurement report"),
    ("calibrate", "Calibrate equipment")
]

def generate_metrology_hooks() -> List[Dict]:
    hooks = []
    for met_id in METROLOGY:
        for hook_type, hook_desc in METROLOGY_HOOK_TYPES:
            hooks.append({
                "id": f"metrology:{met_id}:{hook_type}",
                "domain": "METROLOGY",
                "subdomain": "INSPECTION",
                "trigger": f"metrology.{met_id}.{hook_type}",
                "description": f"{hook_desc} - {met_id}",
                "priority": 40,
                "async": hook_type == "measure"
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# LEARNING HOOKS (25 domains × 8 hooks = 200)
# ═══════════════════════════════════════════════════════════════════════════════

LEARNING_DOMAINS = [
    "parameter-learning", "strategy-learning", "tool-selection-learn", "sequence-learning",
    "time-estimation-learn", "cost-estimation-learn", "quality-prediction-learn", "failure-mode-learn",
    "preference-learning", "shop-practice-learn", "material-behavior-learn", "machine-behavior-learn",
    "tool-life-learn", "surface-finish-learn", "tolerance-achieve-learn", "setup-time-learn",
    "program-pattern-learn", "error-pattern-learn", "optimization-learn", "schedule-learn",
    "capacity-learn", "supplier-learn", "customer-learn", "process-chain-learn", "root-cause-learn"
]

LEARNING_HOOK_TYPES = [
    ("collect", "Collect training data"),
    ("preprocess", "Preprocess data"),
    ("train", "Train model"),
    ("validate", "Validate model"),
    ("deploy", "Deploy model"),
    ("infer", "Make inference"),
    ("update", "Update model incrementally"),
    ("evaluate", "Evaluate model performance")
]

def generate_learning_hooks() -> List[Dict]:
    hooks = []
    for learn_id in LEARNING_DOMAINS:
        for hook_type, hook_desc in LEARNING_HOOK_TYPES:
            hooks.append({
                "id": f"learning:{learn_id}:{hook_type}",
                "domain": "LEARNING",
                "subdomain": "ML_PIPELINE",
                "trigger": f"learning.{learn_id}.{hook_type}",
                "description": f"{hook_desc} - {learn_id}",
                "priority": 40,
                "async": hook_type in ["train", "validate"]
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# GDT HOOKS (20 tolerances × 6 hooks = 120)
# ═══════════════════════════════════════════════════════════════════════════════

GDT_TYPES = [
    "flatness", "straightness", "circularity", "cylindricity",
    "perpendicularity", "parallelism", "angularity",
    "position", "concentricity", "symmetry",
    "circular-runout", "total-runout",
    "profile-line", "profile-surface",
    "mmc", "lmc", "rfs", "datum", "basic", "bonus-tolerance"
]

GDT_HOOK_TYPES = [
    ("interpret", "Interpret GD&T callout"),
    ("calculate", "Calculate tolerance zone"),
    ("verify", "Verify compliance"),
    ("measure", "Plan measurement"),
    ("report", "Report results"),
    ("stackup", "Perform tolerance stackup")
]

def generate_gdt_hooks() -> List[Dict]:
    hooks = []
    for gdt_id in GDT_TYPES:
        for hook_type, hook_desc in GDT_HOOK_TYPES:
            hooks.append({
                "id": f"gdt:{gdt_id}:{hook_type}",
                "domain": "GDT",
                "subdomain": "TOLERANCE",
                "trigger": f"gdt.{gdt_id}.{hook_type}",
                "description": f"{hook_desc} - {gdt_id}",
                "priority": 30,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# WORKHOLDING HOOKS (25 methods × 5 hooks = 125)
# ═══════════════════════════════════════════════════════════════════════════════

WORKHOLDING = [
    "3jaw-chuck", "4jaw-chuck", "6jaw-chuck", "collet-chuck", "face-driver",
    "mandrel", "expanding-mandrel", "vise", "angle-plate", "v-block",
    "fixture-plate", "t-slot-clamp", "toe-clamp", "strap-clamp",
    "magnetic-chuck", "vacuum-chuck", "soft-jaws", "hard-jaws", "pie-jaws",
    "live-center", "dead-center", "steady-rest", "follow-rest", "tombstone", "pallet"
]

WORKHOLDING_HOOK_TYPES = [
    ("select", "Select workholding method"),
    ("configure", "Configure workholding setup"),
    ("calculate", "Calculate clamping force"),
    ("validate", "Validate workholding adequacy"),
    ("document", "Document setup")
]

def generate_workholding_hooks() -> List[Dict]:
    hooks = []
    for wh_id in WORKHOLDING:
        for hook_type, hook_desc in WORKHOLDING_HOOK_TYPES:
            hooks.append({
                "id": f"workholding:{wh_id}:{hook_type}",
                "domain": "WORKHOLDING",
                "subdomain": "FIXTURE",
                "trigger": f"workholding.{wh_id}.{hook_type}",
                "description": f"{hook_desc} - {wh_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# THREAD HOOKS (30 types × 6 hooks = 180)
# ═══════════════════════════════════════════════════════════════════════════════

THREAD_TYPES = [
    "metric-coarse", "metric-fine", "unc", "unf", "unef", "uns",
    "bsp", "bspt", "npt", "nptf", "nps", "acme", "stub-acme",
    "trapezoidal", "buttress", "whitworth", "ba", "pg",
    "un", "unjc", "unjf", "mj", "unr", "m-thread",
    "g-thread", "rc-thread", "rp-thread", "pt", "pf", "tr"
]

THREAD_HOOK_TYPES = [
    ("lookup", "Look up thread specifications"),
    ("calculate", "Calculate thread dimensions"),
    ("generate", "Generate thread G-code"),
    ("validate", "Validate thread parameters"),
    ("measure", "Plan thread measurement"),
    ("select-tool", "Select threading tool")
]

def generate_thread_hooks() -> List[Dict]:
    hooks = []
    for thread_id in THREAD_TYPES:
        for hook_type, hook_desc in THREAD_HOOK_TYPES:
            hooks.append({
                "id": f"thread:{thread_id}:{hook_type}",
                "domain": "THREAD",
                "subdomain": "SPECIFICATION",
                "trigger": f"thread.{thread_id}.{hook_type}",
                "description": f"{hook_desc} - {thread_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# STANDARD HOOKS (38 standards × 4 hooks = 152)
# ═══════════════════════════════════════════════════════════════════════════════

STANDARDS = [
    "iso-1", "iso-286", "iso-513", "iso-1302", "iso-1832", "iso-2768", "iso-4287",
    "iso-5608", "iso-6983", "iso-10816", "iso-13399", "iso-14649",
    "asme-y14-5", "asme-b4-1", "asme-b46-1", "asme-b94-19",
    "din-1", "din-6580", "din-6581", "din-69871",
    "ansi-b94-11m", "ansi-b94-19", "ansi-b212-15",
    "iso-68", "iso-261", "iso-724", "ansi-b1-1", "ansi-b1-13m",
    "astm-a36", "astm-a572", "sae-j403", "sae-j404", "ams-2759", "uns",
    "iso-9001", "as9100", "iso-13485", "iatf-16949"
]

STANDARD_HOOK_TYPES = [
    ("lookup", "Look up standard requirements"),
    ("validate", "Validate compliance"),
    ("apply", "Apply standard"),
    ("document", "Document compliance")
]

def generate_standard_hooks() -> List[Dict]:
    hooks = []
    for std_id in STANDARDS:
        for hook_type, hook_desc in STANDARD_HOOK_TYPES:
            hooks.append({
                "id": f"standard:{std_id}:{hook_type}",
                "domain": "STANDARD",
                "subdomain": "COMPLIANCE",
                "trigger": f"standard.{std_id}.{hook_type}",
                "description": f"{hook_desc} - {std_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# TOLERANCE CLASS HOOKS (21 classes × 5 hooks = 105)
# ═══════════════════════════════════════════════════════════════════════════════

TOLERANCE_CLASSES = [
    "h6", "h7", "h8", "h9", "H6", "H7", "H8", "H9",
    "g6", "f7", "e8", "js6", "k6", "m6", "n6", "p6", "r6", "s6",
    "iso2768-f", "iso2768-m", "iso2768-c"
]

TOLERANCE_HOOK_TYPES = [
    ("lookup", "Look up tolerance limits"),
    ("calculate", "Calculate deviation"),
    ("verify", "Verify capability"),
    ("select", "Select appropriate class"),
    ("convert", "Convert between systems")
]

def generate_tolerance_hooks() -> List[Dict]:
    hooks = []
    for tol_id in TOLERANCE_CLASSES:
        for hook_type, hook_desc in TOLERANCE_HOOK_TYPES:
            hooks.append({
                "id": f"tolerance:{tol_id.lower()}:{hook_type}",
                "domain": "TOLERANCE",
                "subdomain": "CLASS",
                "trigger": f"tolerance.{tol_id.lower()}.{hook_type}",
                "description": f"{hook_desc} - {tol_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# COOLANT HOOKS (15 types × 5 hooks = 75)
# ═══════════════════════════════════════════════════════════════════════════════

COOLANTS = [
    "soluble-oil", "semi-synthetic", "full-synthetic", "straight-oil", "vegetable-oil",
    "mql", "air-blast", "cryogenic", "high-pressure", "flood",
    "mist", "dry", "water", "co2-snow", "paste"
]

COOLANT_HOOK_TYPES = [
    ("select", "Select coolant type"),
    ("configure", "Configure delivery"),
    ("validate", "Validate material compatibility"),
    ("optimize", "Optimize flow rate"),
    ("document", "Document coolant specs")
]

def generate_coolant_hooks() -> List[Dict]:
    hooks = []
    for cool_id in COOLANTS:
        for hook_type, hook_desc in COOLANT_HOOK_TYPES:
            hooks.append({
                "id": f"coolant:{cool_id}:{hook_type}",
                "domain": "COOLANT",
                "subdomain": "DELIVERY",
                "trigger": f"coolant.{cool_id}.{hook_type}",
                "description": f"{hook_desc} - {cool_id}",
                "priority": 50,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# ALLOY HOOKS (83 alloys × 6 hooks = 498)
# ═══════════════════════════════════════════════════════════════════════════════

ALLOYS = [
    # Carbon Steels
    "1010", "1018", "1020", "1040", "1045", "1050", "1060", "1095",
    # Alloy Steels
    "4130", "4140", "4340", "8620", "52100",
    # Tool Steels
    "a2", "d2", "h13", "m2", "o1", "s7",
    # Stainless
    "303", "304", "304l", "316", "316l", "410", "420", "430", "440c", "17-4ph", "15-5ph", "2205",
    # Aluminum
    "1100", "2011", "2024", "3003", "5052", "6061", "6063", "7050", "7075", "mic6",
    # Copper
    "c110", "c145", "c260", "c360", "c464", "c510", "c630", "c932",
    # Nickel
    "inconel-600", "inconel-625", "inconel-718", "hastelloy-c276", "monel-400", "waspaloy", "rene-41",
    # Titanium
    "ti-cp2", "ti-6al4v", "ti-6al4v-eli", "ti-6246",
    # Cobalt
    "stellite-6", "stellite-21", "mp35n",
    # Cast Iron
    "gray-iron", "ductile-iron", "malleable-iron", "cgi",
    # Specialty
    "kovar", "invar", "tungsten", "molybdenum", "niobium", "tantalum",
    # Plastics
    "delrin", "nylon", "peek", "ultem", "hdpe", "ptfe", "polycarbonate", "acrylic", "abs", "pvc"
]

ALLOY_HOOK_TYPES = [
    ("lookup", "Look up alloy properties"),
    ("parameters", "Get cutting parameters"),
    ("recommend-tool", "Recommend tooling"),
    ("recommend-coolant", "Recommend coolant"),
    ("validate", "Validate machining feasibility"),
    ("compare", "Compare with alternatives")
]

def generate_alloy_hooks() -> List[Dict]:
    hooks = []
    for alloy_id in ALLOYS:
        for hook_type, hook_desc in ALLOY_HOOK_TYPES:
            hooks.append({
                "id": f"alloy:{alloy_id}:{hook_type}",
                "domain": "ALLOY",
                "subdomain": "MATERIAL",
                "trigger": f"alloy.{alloy_id}.{hook_type}",
                "description": f"{hook_desc} - {alloy_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# INSERT HOOKS (39 geometries × 5 hooks = 195)
# ═══════════════════════════════════════════════════════════════════════════════

INSERTS = [
    "cnmg", "dnmg", "vnmg", "wnmg", "tnmg", "snmg",
    "ccmt", "dcmt", "vcmt", "tcmt", "scmt", "rcmt",
    "cpgt", "dpgt", "tpgt",
    "apkt", "apmt", "rpmt", "sdmt", "snmt", "odmt", "xnex", "loex",
    "n123", "gip", "lcmf",
    "16er", "16ir", "22er",
    "wcmx", "spgx", "somx",
    "semt", "ofer", "sekn",
    "wiper", "chipbreaker", "pressed", "ground"
]

INSERT_HOOK_TYPES = [
    ("select", "Select insert geometry"),
    ("recommend", "Recommend for operation"),
    ("parameters", "Get cutting parameters"),
    ("validate", "Validate application"),
    ("compare", "Compare geometries")
]

def generate_insert_hooks() -> List[Dict]:
    hooks = []
    for ins_id in INSERTS:
        for hook_type, hook_desc in INSERT_HOOK_TYPES:
            hooks.append({
                "id": f"insert:{ins_id}:{hook_type}",
                "domain": "INSERT",
                "subdomain": "GEOMETRY",
                "trigger": f"insert.{ins_id}.{hook_type}",
                "description": f"{hook_desc} - {ins_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# COATING HOOKS (20 coatings × 5 hooks = 100)
# ═══════════════════════════════════════════════════════════════════════════════

COATINGS = [
    "tin", "ticn", "tialn", "altin", "tisin", "alcrn", "crn", "zrn",
    "dlc", "diamond", "pcd", "cbn", "ceramic", "uncoated",
    "multilayer", "nanocomposite", "tibn", "ticraln", "altisin", "tac"
]

COATING_HOOK_TYPES = [
    ("select", "Select coating"),
    ("recommend", "Recommend for material"),
    ("properties", "Get coating properties"),
    ("validate", "Validate application"),
    ("compare", "Compare coatings")
]

def generate_coating_hooks() -> List[Dict]:
    hooks = []
    for coat_id in COATINGS:
        for hook_type, hook_desc in COATING_HOOK_TYPES:
            hooks.append({
                "id": f"coating:{coat_id}:{hook_type}",
                "domain": "COATING",
                "subdomain": "TOOL",
                "trigger": f"coating.{coat_id}.{hook_type}",
                "description": f"{hook_desc} - {coat_id}",
                "priority": 40,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# VENDOR HOOKS (30 vendors × 4 hooks = 120)
# ═══════════════════════════════════════════════════════════════════════════════

VENDORS = [
    "sandvik", "kennametal", "iscar", "seco", "walter",
    "mitsubishi-mat", "sumitomo", "kyocera", "tungaloy", "korloy",
    "taegutec", "widia", "dormer", "osg", "nachi",
    "guhring", "emuge", "mapal", "horn", "ingersoll",
    "stellram", "vardex", "vargus", "carmex", "yg1",
    "zcc-ct", "ceratizit", "fraisa", "hanita", "niagara"
]

VENDOR_HOOK_TYPES = [
    ("catalog", "Access vendor catalog"),
    ("recommend", "Recommend vendor tools"),
    ("crossref", "Cross-reference to vendor"),
    ("price", "Get pricing info")
]

def generate_vendor_hooks() -> List[Dict]:
    hooks = []
    for vendor_id in VENDORS:
        for hook_type, hook_desc in VENDOR_HOOK_TYPES:
            hooks.append({
                "id": f"vendor:{vendor_id}:{hook_type}",
                "domain": "VENDOR",
                "subdomain": "TOOLING",
                "trigger": f"vendor.{vendor_id}.{hook_type}",
                "description": f"{hook_desc} - {vendor_id}",
                "priority": 50,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# TREATMENT HOOKS (20 treatments × 5 hooks = 100)
# ═══════════════════════════════════════════════════════════════════════════════

TREATMENTS = [
    "anodize", "hard-anodize", "chromate", "passivate", "phosphate",
    "black-oxide", "zinc-plate", "nickel-plate", "chrome-plate", "electroless-nickel",
    "cadmium-plate", "tin-plate", "silver-plate", "gold-plate",
    "powder-coat", "paint", "nitride", "carburize", "induction-harden", "shot-peen"
]

TREATMENT_HOOK_TYPES = [
    ("specify", "Specify treatment"),
    ("validate", "Validate material compatibility"),
    ("process", "Get process parameters"),
    ("inspect", "Plan inspection"),
    ("document", "Document treatment")
]

def generate_treatment_hooks() -> List[Dict]:
    hooks = []
    for treat_id in TREATMENTS:
        for hook_type, hook_desc in TREATMENT_HOOK_TYPES:
            hooks.append({
                "id": f"treatment:{treat_id}:{hook_type}",
                "domain": "TREATMENT",
                "subdomain": "SURFACE",
                "trigger": f"treatment.{treat_id}.{hook_type}",
                "description": f"{hook_desc} - {treat_id}",
                "priority": 50,
                "async": False
            })
    return hooks

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM HOOK EXPANSION WAVE 2 - SKILL SYNCHRONIZATION")
    print("=" * 80)
    
    # Load existing hooks
    registry_path = r"C:\PRISM\registries\HOOK_REGISTRY.json"
    existing_hooks = []
    if os.path.exists(registry_path):
        with open(registry_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        existing_hooks = data.get("hooks", [])
        print(f"\nLoaded {len(existing_hooks)} existing hooks")
    
    # Generate Wave 2 hooks
    print("\nGenerating Wave 2 hooks...")
    
    generators = [
        ("OPERATION", generate_operation_hooks),
        ("FEATURE", generate_feature_hooks),
        ("FUSION", generate_fusion_hooks),
        ("ERROR", generate_error_hooks),
        ("METROLOGY", generate_metrology_hooks),
        ("LEARNING", generate_learning_hooks),
        ("GDT", generate_gdt_hooks),
        ("WORKHOLDING", generate_workholding_hooks),
        ("THREAD", generate_thread_hooks),
        ("STANDARD", generate_standard_hooks),
        ("TOLERANCE", generate_tolerance_hooks),
        ("COOLANT", generate_coolant_hooks),
        ("ALLOY", generate_alloy_hooks),
        ("INSERT", generate_insert_hooks),
        ("COATING", generate_coating_hooks),
        ("VENDOR", generate_vendor_hooks),
        ("TREATMENT", generate_treatment_hooks)
    ]
    
    wave2_hooks = []
    for domain_name, generator_func in generators:
        domain_hooks = generator_func()
        wave2_hooks.extend(domain_hooks)
        print(f"  {domain_name}: {len(domain_hooks)}")
    
    print(f"\nWave 2 hooks generated: {len(wave2_hooks)}")
    
    # Combine with existing
    all_hooks = existing_hooks + wave2_hooks
    
    # Deduplicate
    seen = set()
    unique_hooks = []
    for h in all_hooks:
        hid = h.get("id", "")
        if hid and hid not in seen:
            seen.add(hid)
            unique_hooks.append(h)
    
    print(f"\n{'=' * 80}")
    print(f"TOTAL UNIQUE HOOKS: {len(unique_hooks)}")
    print(f"{'=' * 80}")
    
    # Count by domain
    domains = {}
    for h in unique_hooks:
        d = h.get("domain", "UNKNOWN")
        domains[d] = domains.get(d, 0) + 1
    
    print("\nBy Domain:")
    for d, n in sorted(domains.items(), key=lambda x: -x[1]):
        print(f"  {d}: {n}")
    
    # Save
    registry = {
        "version": "3.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_hook_expansion_wave2.py",
        "totalHooks": len(unique_hooks),
        "wave1Hooks": len(existing_hooks),
        "wave2Hooks": len(wave2_hooks),
        "summary": {"byDomain": domains},
        "hooks": unique_hooks
    }
    
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    # Audit
    audit = {
        "session": "R2.7-HOOK-WAVE2",
        "timestamp": datetime.now().isoformat(),
        "wave1": len(existing_hooks),
        "wave2": len(wave2_hooks),
        "total": len(unique_hooks),
        "domains": len(domains)
    }
    audit_path = r"C:\PRISM\mcp-server\audits\hook_expansion_wave2.json"
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")
    
    return unique_hooks

if __name__ == "__main__":
    main()
