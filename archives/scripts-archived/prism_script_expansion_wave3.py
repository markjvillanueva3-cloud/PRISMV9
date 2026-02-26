#!/usr/bin/env python3
"""
PRISM SCRIPT EXPANSION WAVE 3
==============================
OPERATION, FEATURE, GDT, METROLOGY, THREAD, WORKHOLDING, COOLANT, TREATMENT, STANDARD, INSERT, COATING, VENDOR
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
# OPERATION SCRIPTS (53)
# ═══════════════════════════════════════════════════════════════════════════════

MILLING_OPS = [
    "face_mill", "peripheral_mill", "slot_mill", "pocket_mill", "contour_mill",
    "plunge_mill", "ramp_mill", "trochoidal_mill", "hsm_rough", "hsm_finish",
    "rough_3d", "semifinish_3d", "finish_3d", "rest_mill", "pencil_mill",
    "scallop_mill", "parallel_mill", "radial_mill", "spiral_mill", "waterline_mill",
    "swarf_mill", "multiaxis_mill", "thread_mill", "chamfer_mill", "deburr_mill"
]

TURNING_OPS = [
    "od_rough", "od_finish", "id_rough", "id_finish", "face_turn",
    "groove_od", "groove_id", "groove_face", "part_off", "thread_od",
    "thread_id", "bore_rough", "bore_finish", "profile_turn", "taper_turn"
]

HOLE_OPS = [
    "center_drill", "spot_drill", "twist_drill", "peck_drill", "gun_drill",
    "ream", "bore_fine", "back_bore", "counterbore", "countersink",
    "tap", "thread_form", "helical_interpolate"
]

def generate_operation_scripts() -> List[ScriptDef]:
    scripts = []
    for op in MILLING_OPS:
        scripts.append(ScriptDef(
            id=f"SCR-OP-MILL-{op.upper()}", name=f"op_mill_{op}",
            category="OPERATION", subcategory="MILLING",
            description=f"Milling operation: {op}", filename=f"op_mill_{op}.py",
            priority=30, hooks=[f"operation:mill:{op}:*"], estimated_lines=300
        ))
    for op in TURNING_OPS:
        scripts.append(ScriptDef(
            id=f"SCR-OP-TURN-{op.upper()}", name=f"op_turn_{op}",
            category="OPERATION", subcategory="TURNING",
            description=f"Turning operation: {op}", filename=f"op_turn_{op}.py",
            priority=30, hooks=[f"operation:turn:{op}:*"], estimated_lines=300
        ))
    for op in HOLE_OPS:
        scripts.append(ScriptDef(
            id=f"SCR-OP-HOLE-{op.upper()}", name=f"op_hole_{op}",
            category="OPERATION", subcategory="HOLEMAKING",
            description=f"Holemaking operation: {op}", filename=f"op_hole_{op}.py",
            priority=30, hooks=[f"operation:hole:{op}:*"], estimated_lines=250
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE SCRIPTS (40)
# ═══════════════════════════════════════════════════════════════════════════════

FEATURES = [
    "simple_hole", "counterbore_hole", "countersink_hole", "threaded_hole", "reamed_hole", "hole_pattern",
    "rect_pocket", "circular_pocket", "obround_pocket", "freeform_pocket", "deep_pocket", "thin_wall_pocket",
    "open_profile", "closed_profile", "chamfer_edge", "fillet_edge",
    "circular_boss", "rect_boss", "custom_boss",
    "through_slot", "blind_slot", "t_slot", "dovetail_slot", "keyway",
    "flat_face", "surface_3d", "blend_surface",
    "od_surface", "id_surface", "face_surface", "groove_od_feat", "groove_id_feat", "groove_face_feat",
    "thread_feat", "taper_feat", "rib", "web", "undercut", "draft", "core_cavity"
]

def generate_feature_scripts() -> List[ScriptDef]:
    scripts = []
    for feat in FEATURES:
        scripts.append(ScriptDef(
            id=f"SCR-FEAT-{feat.upper()}", name=f"feature_{feat}",
            category="FEATURE", subcategory="RECOGNITION",
            description=f"Feature: {feat}", filename=f"feature_{feat}.py",
            priority=30, hooks=[f"feature:{feat}:*"], estimated_lines=250
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# GDT SCRIPTS (20)
# ═══════════════════════════════════════════════════════════════════════════════

GDT_TYPES = [
    "flatness", "straightness", "circularity", "cylindricity",
    "perpendicularity", "parallelism", "angularity",
    "position", "concentricity", "symmetry",
    "circular_runout", "total_runout",
    "profile_line", "profile_surface",
    "mmc", "lmc", "rfs", "datum", "basic_dim", "bonus_tolerance"
]

def generate_gdt_scripts() -> List[ScriptDef]:
    scripts = []
    for gdt in GDT_TYPES:
        scripts.append(ScriptDef(
            id=f"SCR-GDT-{gdt.upper()}", name=f"gdt_{gdt}",
            category="GDT", subcategory="TOLERANCE",
            description=f"GD&T: {gdt}", filename=f"gdt_{gdt}.py",
            priority=30, hooks=[f"gdt:{gdt}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# METROLOGY SCRIPTS (25)
# ═══════════════════════════════════════════════════════════════════════════════

METROLOGY = [
    "caliper", "micrometer", "height_gage", "depth_gage", "bore_gage", "pin_gage", "ring_gage", "thread_gage",
    "cmm_touch", "cmm_scanning", "cmm_optical", "cmm_laser",
    "profilometer", "roundness_tester", "contour_tracer",
    "optical_comparator", "vision_system", "microscope", "laser_scan",
    "hardness_tester", "ultrasonic", "eddy_current", "dye_penetrant", "xray", "ct_scan"
]

def generate_metrology_scripts() -> List[ScriptDef]:
    scripts = []
    for met in METROLOGY:
        scripts.append(ScriptDef(
            id=f"SCR-MET-{met.upper()}", name=f"metrology_{met}",
            category="METROLOGY", subcategory="METHOD",
            description=f"Metrology: {met}", filename=f"metrology_{met}.py",
            priority=40, hooks=[f"metrology:{met}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# THREAD SCRIPTS (30)
# ═══════════════════════════════════════════════════════════════════════════════

THREADS = [
    "metric_coarse", "metric_fine", "unc", "unf", "unef", "uns",
    "bsp", "bspt", "npt", "nptf", "nps", "acme", "stub_acme",
    "trapezoidal", "buttress", "whitworth", "ba", "pg",
    "un", "unjc", "unjf", "mj", "unr", "m_thread",
    "g_thread", "rc_thread", "rp_thread", "pt", "pf", "tr"
]

def generate_thread_scripts() -> List[ScriptDef]:
    scripts = []
    for thread in THREADS:
        scripts.append(ScriptDef(
            id=f"SCR-THREAD-{thread.upper()}", name=f"thread_{thread}",
            category="THREAD", subcategory="TYPE",
            description=f"Thread type: {thread}", filename=f"thread_{thread}.py",
            priority=40, hooks=[f"thread:{thread}:*"], estimated_lines=180
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# WORKHOLDING SCRIPTS (25)
# ═══════════════════════════════════════════════════════════════════════════════

WORKHOLDING = [
    "chuck_3jaw", "chuck_4jaw", "chuck_6jaw", "collet_chuck", "face_driver",
    "mandrel", "expanding_mandrel", "vise", "angle_plate", "v_block",
    "fixture_plate", "t_slot_clamp", "toe_clamp", "strap_clamp",
    "magnetic_chuck", "vacuum_chuck", "soft_jaws", "hard_jaws", "pie_jaws",
    "live_center", "dead_center", "steady_rest", "follow_rest", "tombstone", "pallet"
]

def generate_workholding_scripts() -> List[ScriptDef]:
    scripts = []
    for wh in WORKHOLDING:
        scripts.append(ScriptDef(
            id=f"SCR-WH-{wh.upper()}", name=f"workholding_{wh}",
            category="WORKHOLDING", subcategory="METHOD",
            description=f"Workholding: {wh}", filename=f"workholding_{wh}.py",
            priority=40, hooks=[f"workholding:{wh}:*"], estimated_lines=180
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# COOLANT SCRIPTS (15)
# ═══════════════════════════════════════════════════════════════════════════════

COOLANTS = [
    "soluble_oil", "semi_synthetic", "full_synthetic", "straight_oil", "vegetable_oil",
    "mql", "air_blast", "cryogenic", "high_pressure", "flood",
    "mist", "dry", "water", "co2_snow", "paste"
]

def generate_coolant_scripts() -> List[ScriptDef]:
    scripts = []
    for cool in COOLANTS:
        scripts.append(ScriptDef(
            id=f"SCR-COOL-{cool.upper()}", name=f"coolant_{cool}",
            category="COOLANT", subcategory="TYPE",
            description=f"Coolant: {cool}", filename=f"coolant_{cool}.py",
            priority=40, hooks=[f"coolant:{cool}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# TREATMENT SCRIPTS (20)
# ═══════════════════════════════════════════════════════════════════════════════

TREATMENTS = [
    "anodize", "hard_anodize", "chromate", "passivate", "phosphate",
    "black_oxide", "zinc_plate", "nickel_plate", "chrome_plate", "electroless_nickel",
    "cadmium_plate", "tin_plate", "silver_plate", "gold_plate",
    "powder_coat", "paint", "nitride", "carburize", "induction_harden", "shot_peen"
]

def generate_treatment_scripts() -> List[ScriptDef]:
    scripts = []
    for treat in TREATMENTS:
        scripts.append(ScriptDef(
            id=f"SCR-TREAT-{treat.upper()}", name=f"treatment_{treat}",
            category="TREATMENT", subcategory="TYPE",
            description=f"Surface treatment: {treat}", filename=f"treatment_{treat}.py",
            priority=40, hooks=[f"treatment:{treat}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# STANDARD SCRIPTS (38)
# ═══════════════════════════════════════════════════════════════════════════════

STANDARDS = [
    "iso_1", "iso_286", "iso_513", "iso_1302", "iso_1832", "iso_2768", "iso_4287",
    "iso_5608", "iso_6983", "iso_10816", "iso_13399", "iso_14649",
    "asme_y14_5", "asme_b4_1", "asme_b46_1", "asme_b94_19",
    "din_1", "din_6580", "din_6581", "din_69871",
    "ansi_b94_11m", "ansi_b94_19", "ansi_b212_15",
    "iso_68", "iso_261", "iso_724", "ansi_b1_1", "ansi_b1_13m",
    "astm_a36", "astm_a572", "sae_j403", "sae_j404", "ams_2759", "uns",
    "iso_9001", "as9100", "iso_13485", "iatf_16949"
]

def generate_standard_scripts() -> List[ScriptDef]:
    scripts = []
    for std in STANDARDS:
        scripts.append(ScriptDef(
            id=f"SCR-STD-{std.upper()}", name=f"standard_{std}",
            category="STANDARD", subcategory="COMPLIANCE",
            description=f"Standard: {std}", filename=f"standard_{std}.py",
            priority=40, hooks=[f"standard:{std}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# INSERT SCRIPTS (39)
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

def generate_insert_scripts() -> List[ScriptDef]:
    scripts = []
    for ins in INSERTS:
        scripts.append(ScriptDef(
            id=f"SCR-INSERT-{ins.upper()}", name=f"insert_{ins}",
            category="INSERT", subcategory="GEOMETRY",
            description=f"Insert geometry: {ins}", filename=f"insert_{ins}.py",
            priority=40, hooks=[f"insert:{ins}:*"], estimated_lines=180
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# COATING SCRIPTS (20)
# ═══════════════════════════════════════════════════════════════════════════════

COATINGS = [
    "tin", "ticn", "tialn", "altin", "tisin", "alcrn", "crn", "zrn",
    "dlc", "diamond", "pcd", "cbn", "ceramic", "uncoated",
    "multilayer", "nanocomposite", "tibn", "ticraln", "altisin", "tac"
]

def generate_coating_scripts() -> List[ScriptDef]:
    scripts = []
    for coat in COATINGS:
        scripts.append(ScriptDef(
            id=f"SCR-COAT-{coat.upper()}", name=f"coating_{coat}",
            category="COATING", subcategory="TYPE",
            description=f"Tool coating: {coat}", filename=f"coating_{coat}.py",
            priority=40, hooks=[f"coating:{coat}:*"], estimated_lines=150
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# VENDOR SCRIPTS (30)
# ═══════════════════════════════════════════════════════════════════════════════

VENDORS = [
    "sandvik", "kennametal", "iscar", "seco", "walter",
    "mitsubishi_mat", "sumitomo", "kyocera", "tungaloy", "korloy",
    "taegutec", "widia", "dormer", "osg", "nachi",
    "guhring", "emuge", "mapal", "horn", "ingersoll",
    "stellram", "vardex", "vargus", "carmex", "yg1",
    "zcc_ct", "ceratizit", "fraisa", "hanita", "niagara"
]

def generate_vendor_scripts() -> List[ScriptDef]:
    scripts = []
    for vendor in VENDORS:
        scripts.append(ScriptDef(
            id=f"SCR-VENDOR-{vendor.upper()}", name=f"vendor_{vendor}",
            category="VENDOR", subcategory="TOOLING",
            description=f"Tooling vendor: {vendor}", filename=f"vendor_{vendor}.py",
            priority=40, hooks=[f"vendor:{vendor}:*"], estimated_lines=200
        ))
    return scripts

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM SCRIPT EXPANSION WAVE 3")
    print("=" * 80)
    
    registry_path = r"C:\PRISM\registries\SCRIPT_REGISTRY.json"
    with open(registry_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    existing = data.get("scripts", [])
    print(f"\nLoaded {len(existing)} existing scripts")
    
    print("\nGenerating Wave 3 scripts...")
    generators = [
        ("OPERATION", generate_operation_scripts),
        ("FEATURE", generate_feature_scripts),
        ("GDT", generate_gdt_scripts),
        ("METROLOGY", generate_metrology_scripts),
        ("THREAD", generate_thread_scripts),
        ("WORKHOLDING", generate_workholding_scripts),
        ("COOLANT", generate_coolant_scripts),
        ("TREATMENT", generate_treatment_scripts),
        ("STANDARD", generate_standard_scripts),
        ("INSERT", generate_insert_scripts),
        ("COATING", generate_coating_scripts),
        ("VENDOR", generate_vendor_scripts)
    ]
    
    wave3 = []
    for name, func in generators:
        scripts = func()
        wave3.extend([s.to_dict() for s in scripts])
        print(f"  {name}: {len(scripts)}")
    
    print(f"\nWave 3 scripts: {len(wave3)}")
    
    all_scripts = existing + wave3
    seen = set()
    unique = []
    for s in all_scripts:
        if s["id"] not in seen:
            seen.add(s["id"])
            unique.append(s)
    
    print(f"Total unique scripts: {len(unique)}")
    
    cats = {}
    for s in unique:
        c = s.get("category", "?")
        cats[c] = cats.get(c, 0) + 1
    print("\nBy Category:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")
    
    total_lines = sum(s.get("estimated_lines", 0) for s in unique)
    registry = {
        "version": "4.0.0",
        "generatedAt": datetime.now().isoformat(),
        "generator": "prism_script_expansion_wave3.py",
        "totalScripts": len(unique),
        "estimatedLines": total_lines,
        "summary": {"byCategory": cats},
        "scripts": unique
    }
    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {registry_path}")
    
    audit = {"session": "R2.7-SCRIPT-WAVE3", "timestamp": datetime.now().isoformat(),
             "previous": len(existing), "wave3": len(wave3), "total": len(unique)}
    audit_path = r"C:\PRISM\mcp-server\audits\script_expansion_wave3.json"
    with open(audit_path, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit: {audit_path}")

if __name__ == "__main__":
    main()
