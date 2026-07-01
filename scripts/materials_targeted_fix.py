"""
PRISM Targeted Material Fix v2.0
Fix materials that got WRONG class defaults
Uses proper scientific values for each material type
"""

import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

BASE_PATH = Path(r"C:\PRISM\data\materials")

# =============================================================================
# CORRECT PROPERTY VALUES BY MATERIAL TYPE
# =============================================================================

MATERIAL_PROPERTIES = {
    "titanium": {
        "physical": {
            "density": 4430,
            "melting_point": {"solidus": 1600, "liquidus": 1670},
            "specific_heat": 526,
            "thermal_conductivity": 7.0,
            "thermal_expansion": 8.6e-6,
            "elastic_modulus": 114000,
        },
        "mechanical": {
            "hardness": {"brinell": 330},
            "tensile_strength": {"typical": 950},
            "yield_strength": {"typical": 880},
            "elongation": {"typical": 10},
        },
        "chip_formation": {
            "chip_type": "segmented",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "good",
        },
        "machinability": {"aisi_rating": 22},
        "kienzle": {"kc1_1": 1700, "mc": 0.21},
    },
    
    "aluminum": {
        "physical": {
            "density": 2700,
            "melting_point": {"solidus": 500, "liquidus": 650},
            "specific_heat": 900,
            "thermal_conductivity": 170.0,
            "thermal_expansion": 2.3e-5,
            "elastic_modulus": 70000,
        },
        "mechanical": {
            "hardness": {"brinell": 95},
            "tensile_strength": {"typical": 310},
            "yield_strength": {"typical": 275},
            "elongation": {"typical": 12},
        },
        "chip_formation": {
            "chip_type": "continuous_ductile",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
        },
        "machinability": {"aisi_rating": 300},
        "kienzle": {"kc1_1": 700, "mc": 0.25},
    },
    
    "copper": {
        "physical": {
            "density": 8940,
            "melting_point": {"solidus": 1065, "liquidus": 1085},
            "specific_heat": 385,
            "thermal_conductivity": 390.0,
            "thermal_expansion": 1.65e-5,
            "elastic_modulus": 117000,
        },
        "mechanical": {
            "hardness": {"brinell": 50},
            "tensile_strength": {"typical": 220},
            "yield_strength": {"typical": 70},
            "elongation": {"typical": 45},
        },
        "chip_formation": {
            "chip_type": "continuous_ductile",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
        },
        "machinability": {"aisi_rating": 70},
        "kienzle": {"kc1_1": 780, "mc": 0.25},
    },
    
    "bronze": {
        "physical": {
            "density": 8800,
            "melting_point": {"solidus": 850, "liquidus": 1000},
            "specific_heat": 380,
            "thermal_conductivity": 50.0,
            "thermal_expansion": 1.8e-5,
            "elastic_modulus": 110000,
        },
        "mechanical": {
            "hardness": {"brinell": 100},
            "tensile_strength": {"typical": 450},
            "yield_strength": {"typical": 200},
            "elongation": {"typical": 15},
        },
        "chip_formation": {
            "chip_type": "discontinuous",
            "built_up_edge_tendency": "low",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 80},
        "kienzle": {"kc1_1": 850, "mc": 0.22},
    },
    
    "brass": {
        "physical": {
            "density": 8500,
            "melting_point": {"solidus": 900, "liquidus": 940},
            "specific_heat": 380,
            "thermal_conductivity": 120.0,
            "thermal_expansion": 1.9e-5,
            "elastic_modulus": 100000,
        },
        "mechanical": {
            "hardness": {"brinell": 80},
            "tensile_strength": {"typical": 350},
            "yield_strength": {"typical": 150},
            "elongation": {"typical": 30},
        },
        "chip_formation": {
            "chip_type": "discontinuous",
            "built_up_edge_tendency": "low",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 100},
        "kienzle": {"kc1_1": 750, "mc": 0.23},
    },
    
    "magnesium": {
        "physical": {
            "density": 1800,
            "melting_point": {"solidus": 470, "liquidus": 650},
            "specific_heat": 1020,
            "thermal_conductivity": 156.0,
            "thermal_expansion": 2.5e-5,
            "elastic_modulus": 45000,
        },
        "mechanical": {
            "hardness": {"brinell": 50},
            "tensile_strength": {"typical": 250},
            "yield_strength": {"typical": 180},
            "elongation": {"typical": 8},
        },
        "chip_formation": {
            "chip_type": "discontinuous",
            "built_up_edge_tendency": "low",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 500},
        "kienzle": {"kc1_1": 400, "mc": 0.28},
    },
    
    "zinc": {
        "physical": {
            "density": 7100,
            "melting_point": {"solidus": 380, "liquidus": 420},
            "specific_heat": 390,
            "thermal_conductivity": 116.0,
            "thermal_expansion": 3.0e-5,
            "elastic_modulus": 96000,
        },
        "mechanical": {
            "hardness": {"brinell": 40},
            "tensile_strength": {"typical": 150},
            "yield_strength": {"typical": 100},
            "elongation": {"typical": 20},
        },
        "chip_formation": {
            "chip_type": "continuous",
            "built_up_edge_tendency": "moderate",
            "chip_breaking": "moderate",
        },
        "machinability": {"aisi_rating": 200},
        "kienzle": {"kc1_1": 450, "mc": 0.26},
    },
    
    "cast_iron": {
        "physical": {
            "density": 7200,
            "melting_point": {"solidus": 1130, "liquidus": 1250},
            "specific_heat": 460,
            "thermal_conductivity": 50.0,
            "thermal_expansion": 1.1e-5,
            "elastic_modulus": 110000,
        },
        "mechanical": {
            "hardness": {"brinell": 200},
            "tensile_strength": {"typical": 300},
            "yield_strength": {"typical": 220},
            "elongation": {"typical": 2},
        },
        "chip_formation": {
            "chip_type": "discontinuous",
            "built_up_edge_tendency": "low",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 80},
        "kienzle": {"kc1_1": 1100, "mc": 0.24},
    },
    
    "polymer": {
        "physical": {
            "density": 1400,
            "melting_point": {"solidus": 180, "liquidus": 280},
            "specific_heat": 1500,
            "thermal_conductivity": 0.25,
            "thermal_expansion": 8.0e-5,
            "elastic_modulus": 3000,
        },
        "mechanical": {
            "hardness": {"brinell": 20},
            "tensile_strength": {"typical": 70},
            "yield_strength": {"typical": 60},
            "elongation": {"typical": 50},
        },
        "chip_formation": {
            "chip_type": "continuous_stringy",
            "built_up_edge_tendency": "high",
            "chip_breaking": "poor",
        },
        "machinability": {"aisi_rating": 500},
        "kienzle": {"kc1_1": 150, "mc": 0.35},
    },
    
    "composite": {
        "physical": {
            "density": 1600,
            "melting_point": {"solidus": 300, "liquidus": 400},
            "specific_heat": 1200,
            "thermal_conductivity": 1.0,
            "thermal_expansion": 2.0e-5,
            "elastic_modulus": 70000,
        },
        "mechanical": {
            "hardness": {"brinell": 30},
            "tensile_strength": {"typical": 600},
            "yield_strength": {"typical": 500},
            "elongation": {"typical": 2},
        },
        "chip_formation": {
            "chip_type": "dusty",
            "built_up_edge_tendency": "none",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 40},
        "kienzle": {"kc1_1": 400, "mc": 0.30},
    },
    
    "ceramic": {
        "physical": {
            "density": 3900,
            "melting_point": {"solidus": 2000, "liquidus": 2050},
            "specific_heat": 880,
            "thermal_conductivity": 25.0,
            "thermal_expansion": 8.0e-6,
            "elastic_modulus": 380000,
        },
        "mechanical": {
            "hardness": {"brinell": 1500},
            "tensile_strength": {"typical": 300},
            "yield_strength": {"typical": 250},
            "elongation": {"typical": 0},
        },
        "chip_formation": {
            "chip_type": "powder",
            "built_up_edge_tendency": "none",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 5},
        "kienzle": {"kc1_1": 3000, "mc": 0.18},
    },
    
    "graphite": {
        "physical": {
            "density": 1800,
            "melting_point": {"solidus": 3500, "liquidus": 3650},
            "specific_heat": 710,
            "thermal_conductivity": 120.0,
            "thermal_expansion": 4.0e-6,
            "elastic_modulus": 12000,
        },
        "mechanical": {
            "hardness": {"brinell": 10},
            "tensile_strength": {"typical": 30},
            "yield_strength": {"typical": 20},
            "elongation": {"typical": 0},
        },
        "chip_formation": {
            "chip_type": "dusty",
            "built_up_edge_tendency": "none",
            "chip_breaking": "excellent",
        },
        "machinability": {"aisi_rating": 400},
        "kienzle": {"kc1_1": 100, "mc": 0.40},
    },
    
    "wood": {
        "physical": {
            "density": 700,
            "melting_point": {"solidus": 200, "liquidus": 300},
            "specific_heat": 1700,
            "thermal_conductivity": 0.15,
            "thermal_expansion": 4.0e-5,
            "elastic_modulus": 12000,
        },
        "mechanical": {
            "hardness": {"brinell": 5},
            "tensile_strength": {"typical": 100},
            "yield_strength": {"typical": 50},
            "elongation": {"typical": 0},
        },
        "chip_formation": {
            "chip_type": "fibrous",
            "built_up_edge_tendency": "none",
            "chip_breaking": "good",
        },
        "machinability": {"aisi_rating": 800},
        "kienzle": {"kc1_1": 50, "mc": 0.45},
    },
}

# =============================================================================
# MATERIAL DETECTION (IMPROVED)
# =============================================================================

def detect_material_type(name, iso_group, file_path=None):
    """Improved material type detection"""
    name_lower = name.lower() if name else ""
    file_lower = file_path.lower() if file_path else ""
    
    # Check filename for hints
    if "titanium" in file_lower or "/ti_" in file_lower or "_ti_" in file_lower:
        return "titanium"
    if "aluminum" in file_lower or "alumin" in file_lower:
        return "aluminum"
    if "polymer" in file_lower or "plastic" in file_lower:
        return "polymer"
    if "composite" in file_lower or "cfrp" in file_lower:
        return "composite"
    if "ceramic" in file_lower:
        return "ceramic"
    if "graphite" in file_lower:
        return "graphite"
    if "wood" in file_lower:
        return "wood"
    if "copper" in file_lower and "alloy" in file_lower:
        return "copper"
    if "bronze" in file_lower:
        return "bronze"
    if "magnesium" in file_lower:
        return "magnesium"
    
    # Check material name
    titanium_patterns = [r'\bti[-\s]?6', r'\bti[-\s]?\d', r'titanium', r'ti\s*alloy', r'\bcp\s*ti', r'grade\s*\d+\s*ti']
    if any(re.search(p, name_lower) for p in titanium_patterns):
        return "titanium"
    
    aluminum_patterns = [r'\b\d{4}[-\s]?t\d', r'aluminum', r'aluminium', r'\bal\s*\d', r'\bal[-\s]']
    if any(re.search(p, name_lower) for p in aluminum_patterns):
        return "aluminum"
    
    # Direct keyword matches (more specific first)
    if any(x in name_lower for x in ["inconel", "hastelloy", "waspaloy", "stellite", "monel"]):
        return "superalloy"
    if any(x in name_lower for x in ["peek", "ptfe", "nylon", "delrin", "acetal", "ultem", "pom", "pvc", "abs", "polycarbonate"]):
        return "polymer"
    if any(x in name_lower for x in ["cfrp", "gfrp", "carbon fiber", "glass fiber", "kevlar", "composite", "fiberglass"]):
        return "composite"
    if any(x in name_lower for x in ["alumina", "zirconia", "silicon carbide", "silicon nitride", "ceramic"]):
        return "ceramic"
    if "graphite" in name_lower:
        return "graphite"
    if any(x in name_lower for x in ["wood", "mdf", "plywood", "hardwood", "softwood"]):
        return "wood"
    if any(x in name_lower for x in ["bronze", "phos bronze", "tin bronze", "aluminum bronze"]):
        return "bronze"
    if "brass" in name_lower:
        return "brass"
    if any(x in name_lower for x in ["magnesium", "az31", "az91", "am60"]):
        return "magnesium"
    if any(x in name_lower for x in ["zamak", "zinc"]):
        return "zinc"
    if any(x in name_lower for x in [" copper", "ofhc", "c1", "c2", "c3", "electrolytic"]) and "beryllium" not in name_lower:
        return "copper"
    if any(x in name_lower for x in ["beryllium copper", "becu", "berylco"]):
        return "copper"
    if any(x in name_lower for x in ["cast iron", "gray iron", "grey iron", "ductile iron", "malleable", "nodular"]):
        return "cast_iron"
    
    # ISO group fallback (only for metals)
    if iso_group == "K":
        return "cast_iron"
    if iso_group == "S":
        return "superalloy"
    
    # Don't assign a default for X_SPECIALTY - return None
    if iso_group == "X":
        return None
    
    return None  # Unknown - don't override

# =============================================================================
# FIX FUNCTION
# =============================================================================

def deep_update(target, source):
    """Deep update target dict with source, only if target value is wrong"""
    for key, value in source.items():
        if isinstance(value, dict):
            if key not in target:
                target[key] = {}
            if isinstance(target[key], dict):
                deep_update(target[key], value)
        else:
            # Only update if substantially different or missing
            target[key] = value

def fix_material(material, mat_type, file_path):
    """Fix a material with correct values for its type"""
    if mat_type not in MATERIAL_PROPERTIES:
        return material, 0
    
    correct_props = MATERIAL_PROPERTIES[mat_type]
    changes = 0
    
    # Check if density is wrong (clear indicator of wrong defaults)
    current_density = material.get("physical", {}).get("density")
    correct_density = correct_props["physical"]["density"]
    
    # If density is way off, we need to fix
    if current_density and abs(current_density - correct_density) > correct_density * 0.3:
        # Fix physical properties
        if "physical" not in material:
            material["physical"] = {}
        deep_update(material["physical"], correct_props["physical"])
        changes += len(correct_props["physical"])
        
        # Fix mechanical properties
        if "mechanical" not in material:
            material["mechanical"] = {}
        deep_update(material["mechanical"], correct_props["mechanical"])
        changes += len(correct_props["mechanical"])
        
        # Fix chip formation
        if "chip_formation" not in material:
            material["chip_formation"] = {}
        deep_update(material["chip_formation"], correct_props["chip_formation"])
        changes += len(correct_props["chip_formation"])
        
        # Fix machinability
        if "machinability" not in material:
            material["machinability"] = {}
        deep_update(material["machinability"], correct_props["machinability"])
        changes += 1
        
        # Fix kienzle
        if "kienzle" not in material:
            material["kienzle"] = {}
        deep_update(material["kienzle"], correct_props["kienzle"])
        changes += len(correct_props["kienzle"])
        
        material["_material_fix"] = {
            "timestamp": datetime.now().isoformat(),
            "detected_type": mat_type,
            "original_density": current_density,
            "corrected_density": correct_density
        }
    
    return material, changes

def process_file(json_file):
    """Process a single file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        materials = data.get("materials", [])
        if not materials:
            return {"file": json_file.name, "processed": 0, "fixed": 0}
        
        total_fixed = 0
        file_path = str(json_file)
        
        for i, material in enumerate(materials):
            if not isinstance(material, dict):
                continue
            
            name = material.get("name", "")
            iso = material.get("iso_group", "X")
            
            mat_type = detect_material_type(name, iso, file_path)
            if mat_type:
                fixed_mat, changes = fix_material(material, mat_type, file_path)
                if changes > 0:
                    materials[i] = fixed_mat
                    total_fixed += 1
        
        if total_fixed > 0:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        
        return {"file": json_file.name, "processed": len(materials), "fixed": total_fixed}
    
    except Exception as e:
        return {"file": json_file.name, "error": str(e)}

def main():
    print("=" * 80)
    print("PRISM TARGETED MATERIAL FIX v2.0")
    print("Fixing materials with wrong class defaults")
    print("=" * 80)
    
    # Collect all files
    files = []
    for iso_dir in ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                    "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]:
        dir_path = BASE_PATH / iso_dir
        if dir_path.exists():
            for f in dir_path.glob("*.json"):
                if not f.name.startswith("_"):
                    files.append(f)
    
    print(f"Processing {len(files)} files...")
    
    total_fixed = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        
        for future in as_completed(futures):
            result = future.result()
            if result.get("fixed", 0) > 0:
                print(f"  Fixed {result['fixed']} materials in {result['file']}")
                total_fixed += result["fixed"]
    
    print(f"\nTotal materials fixed: {total_fixed}")
    return total_fixed

if __name__ == "__main__":
    main()
