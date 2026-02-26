"""
PRISM Materials Enhancement Engine v1.0
Uses multiple strategies to fill missing parameters:
1. Similar material interpolation (same ISO group + class)
2. Physics-based estimation (derived properties)
3. Literature defaults with uncertainty bounds
"""

import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import math

# =============================================================================
# PHYSICS-BASED ESTIMATION FORMULAS
# =============================================================================

# Kienzle kc1_1 estimation from hardness (empirical correlation)
def estimate_kc1_1(hardness_hb, material_class):
    """Estimate specific cutting force from Brinell hardness"""
    # Base correlation: kc1_1 = a * HB + b (varies by material class)
    coefficients = {
        "steel": (8.2, 600),          # kc1_1 = 8.2*HB + 600
        "stainless": (9.5, 700),      # Higher for stainless
        "cast_iron": (5.5, 400),      # Lower for cast iron
        "aluminum": (2.5, 150),       # Much lower for aluminum
        "titanium": (10.0, 900),      # High for titanium
        "superalloy": (12.0, 1000),   # Very high for superalloys
        "default": (8.0, 600)
    }
    a, b = coefficients.get(material_class, coefficients["default"])
    return a * hardness_hb + b

# mc exponent (relatively stable by material class)
MC_DEFAULTS = {
    "steel": 0.25,
    "stainless": 0.28,
    "cast_iron": 0.22,
    "aluminum": 0.18,
    "titanium": 0.30,
    "superalloy": 0.32,
    "default": 0.25
}

# Taylor constants estimation
def estimate_taylor_C(material_class, hardness_hb):
    """Estimate Taylor constant C from material class and hardness"""
    # Higher hardness = lower C (shorter tool life at same speed)
    base_C = {
        "steel": 400,
        "stainless": 280,
        "cast_iron": 350,
        "aluminum": 800,
        "titanium": 150,
        "superalloy": 100,
        "default": 350
    }
    C = base_C.get(material_class, base_C["default"])
    # Adjust for hardness (higher hardness reduces C)
    if hardness_hb:
        C = C * (200 / hardness_hb) ** 0.3
    return max(50, min(1000, C))

TAYLOR_N_DEFAULTS = {
    "steel": 0.25,
    "stainless": 0.20,
    "cast_iron": 0.28,
    "aluminum": 0.35,
    "titanium": 0.15,
    "superalloy": 0.12,
    "default": 0.25
}

# Johnson-Cook defaults by material class (from literature)
JC_DEFAULTS = {
    "steel": {"A": 350, "B": 600, "n": 0.30, "C": 0.03, "m": 1.0},
    "stainless": {"A": 280, "B": 750, "n": 0.45, "C": 0.04, "m": 0.9},
    "cast_iron": {"A": 250, "B": 300, "n": 0.20, "C": 0.02, "m": 1.1},
    "aluminum": {"A": 150, "B": 350, "n": 0.40, "C": 0.01, "m": 1.3},
    "titanium": {"A": 1000, "B": 800, "n": 0.35, "C": 0.02, "m": 0.8},
    "superalloy": {"A": 1200, "B": 900, "n": 0.40, "C": 0.025, "m": 0.7},
    "default": {"A": 350, "B": 550, "n": 0.30, "C": 0.03, "m": 1.0}
}

# Physical property defaults
PHYSICAL_DEFAULTS = {
    "steel": {"density": 7850, "thermal_conductivity": 50, "specific_heat": 480},
    "stainless": {"density": 7900, "thermal_conductivity": 16, "specific_heat": 500},
    "cast_iron": {"density": 7200, "thermal_conductivity": 45, "specific_heat": 460},
    "aluminum": {"density": 2700, "thermal_conductivity": 170, "specific_heat": 900},
    "titanium": {"density": 4500, "thermal_conductivity": 7, "specific_heat": 520},
    "superalloy": {"density": 8200, "thermal_conductivity": 10, "specific_heat": 450},
    "default": {"density": 7850, "thermal_conductivity": 40, "specific_heat": 480}
}

# =============================================================================
# MATERIAL CLASS MAPPING
# =============================================================================

def get_material_class(iso_group, material_class_str=None, name=None):
    """Map ISO group and name to material class for estimation"""
    iso_map = {
        "P": "steel",
        "M": "stainless", 
        "K": "cast_iron",
        "N": "aluminum",  # Default, check name for titanium
        "S": "superalloy",
        "H": "steel",  # Hardened steel
        "X": "default"
    }
    
    mat_class = iso_map.get(iso_group, "default")
    
    # Override based on name/class
    if name:
        name_lower = name.lower()
        if "titanium" in name_lower or "ti-" in name_lower:
            mat_class = "titanium"
        elif "inconel" in name_lower or "hastelloy" in name_lower:
            mat_class = "superalloy"
        elif "bronze" in name_lower or "copper" in name_lower:
            mat_class = "aluminum"  # Similar machining characteristics
            
    return mat_class

# =============================================================================
# ENHANCEMENT ENGINE
# =============================================================================

class MaterialEnhancer:
    def __init__(self, reference_materials=None):
        self.reference_materials = reference_materials or []
        self.enhancement_log = []
        
    def get_hardness(self, material):
        """Extract hardness from material (various formats)"""
        mech = material.get("mechanical", {})
        hardness = mech.get("hardness", {})
        
        if isinstance(hardness, dict):
            return hardness.get("brinell") or hardness.get("hb") or hardness.get("HB")
        return hardness if isinstance(hardness, (int, float)) else None
    
    def find_similar_reference(self, material, mat_class, iso_group):
        """Find similar reference material for interpolation"""
        target_hardness = self.get_hardness(material)
        
        best_match = None
        best_score = 0
        
        for ref in self.reference_materials:
            # Must be same ISO group
            if ref.get("iso_group") != iso_group:
                continue
                
            score = 1.0
            
            # Same material class is better
            ref_class = get_material_class(ref.get("iso_group"), 
                                          ref.get("material_class"),
                                          ref.get("name"))
            if ref_class == mat_class:
                score += 2.0
            
            # Similar hardness is better
            ref_hardness = self.get_hardness(ref)
            if target_hardness and ref_hardness:
                hardness_diff = abs(target_hardness - ref_hardness)
                if hardness_diff < 50:
                    score += (50 - hardness_diff) / 50
            
            if score > best_score:
                best_score = score
                best_match = ref
                
        return best_match
    
    def enhance_kienzle(self, material, mat_class):
        """Enhance Kienzle parameters"""
        kienzle = material.get("kienzle", {})
        enhanced = dict(kienzle)
        changes = []
        
        if not kienzle.get("kc1_1"):
            hardness = self.get_hardness(material)
            if hardness:
                enhanced["kc1_1"] = round(estimate_kc1_1(hardness, mat_class))
                enhanced["kc1_1_source"] = "estimated_from_hardness"
                changes.append(f"kc1_1 estimated from HB={hardness}")
            else:
                # Use class default
                defaults = {"steel": 1800, "stainless": 2100, "cast_iron": 1100,
                           "aluminum": 700, "titanium": 1400, "superalloy": 2500}
                enhanced["kc1_1"] = defaults.get(mat_class, 1600)
                enhanced["kc1_1_source"] = "class_default"
                changes.append(f"kc1_1 set to class default")
        
        if not kienzle.get("mc"):
            enhanced["mc"] = MC_DEFAULTS.get(mat_class, 0.25)
            enhanced["mc_source"] = "class_default"
            changes.append(f"mc set to class default {enhanced['mc']}")
            
        return enhanced, changes
    
    def enhance_taylor(self, material, mat_class):
        """Enhance Taylor parameters"""
        taylor = material.get("taylor", {})
        enhanced = dict(taylor)
        changes = []
        
        if not taylor.get("C"):
            hardness = self.get_hardness(material)
            enhanced["C"] = round(estimate_taylor_C(mat_class, hardness))
            enhanced["C_source"] = "estimated"
            changes.append(f"Taylor C estimated: {enhanced['C']}")
            
        if not taylor.get("n"):
            enhanced["n"] = TAYLOR_N_DEFAULTS.get(mat_class, 0.25)
            enhanced["n_source"] = "class_default"
            changes.append(f"Taylor n set to class default")
            
        return enhanced, changes
    
    def enhance_johnson_cook(self, material, mat_class):
        """Enhance Johnson-Cook parameters"""
        jc = material.get("johnson_cook", {})
        enhanced = dict(jc)
        changes = []
        
        defaults = JC_DEFAULTS.get(mat_class, JC_DEFAULTS["default"])
        
        for param in ["A", "B", "n", "C", "m"]:
            if not jc.get(param):
                enhanced[param] = defaults[param]
                enhanced[f"{param}_source"] = "class_default"
                changes.append(f"J-C {param} set to class default {defaults[param]}")
        
        # Estimate melting point if missing
        if not jc.get("T_melt"):
            melt_defaults = {"steel": 1520, "stainless": 1450, "cast_iron": 1200,
                           "aluminum": 660, "titanium": 1670, "superalloy": 1350}
            enhanced["T_melt"] = melt_defaults.get(mat_class, 1500)
            enhanced["T_melt_source"] = "class_default"
            changes.append(f"T_melt set to class default")
            
        if not jc.get("T_ref"):
            enhanced["T_ref"] = 20
            
        if not jc.get("epsilon_ref"):
            enhanced["epsilon_ref"] = 1.0
            
        return enhanced, changes
    
    def enhance_physical(self, material, mat_class):
        """Enhance physical properties"""
        physical = material.get("physical", {})
        enhanced = dict(physical)
        changes = []
        
        defaults = PHYSICAL_DEFAULTS.get(mat_class, PHYSICAL_DEFAULTS["default"])
        
        for prop in ["density", "thermal_conductivity", "specific_heat"]:
            if not physical.get(prop):
                enhanced[prop] = defaults[prop]
                enhanced[f"{prop}_source"] = "class_default"
                changes.append(f"{prop} set to class default")
                
        return enhanced, changes
    
    def enhance_mechanical(self, material, mat_class):
        """Enhance mechanical properties with estimation"""
        mechanical = material.get("mechanical", {})
        enhanced = dict(mechanical)
        changes = []
        
        # If we have tensile but not hardness, estimate hardness
        tensile = None
        ts = mechanical.get("tensile_strength", {})
        if isinstance(ts, dict):
            tensile = ts.get("typical") or ts.get("min")
        elif isinstance(ts, (int, float)):
            tensile = ts
            
        hardness = self.get_hardness(material)
        
        if tensile and not hardness:
            # HB ≈ tensile / 3.45 for steel
            est_hb = round(tensile / 3.45)
            enhanced["hardness"] = {"brinell": est_hb, "source": "estimated_from_tensile"}
            changes.append(f"Brinell hardness estimated from tensile: {est_hb}")
            
        return enhanced, changes
    
    def enhance_material(self, material):
        """Apply all enhancements to a material"""
        mat_id = material.get("id", "unknown")
        iso_group = material.get("iso_group", "P")
        mat_class = get_material_class(iso_group, 
                                       material.get("material_class"),
                                       material.get("name"))
        
        all_changes = []
        
        # Enhance each category
        material["kienzle"], changes = self.enhance_kienzle(material, mat_class)
        all_changes.extend(changes)
        
        material["taylor"], changes = self.enhance_taylor(material, mat_class)
        all_changes.extend(changes)
        
        material["johnson_cook"], changes = self.enhance_johnson_cook(material, mat_class)
        all_changes.extend(changes)
        
        material["physical"], changes = self.enhance_physical(material, mat_class)
        all_changes.extend(changes)
        
        material["mechanical"], changes = self.enhance_mechanical(material, mat_class)
        all_changes.extend(changes)
        
        # Mark as enhanced
        if all_changes:
            material["_enhancement"] = {
                "timestamp": datetime.now().isoformat(),
                "version": "1.0",
                "changes": all_changes,
                "confidence": "estimated"
            }
            
        return material, all_changes

# =============================================================================
# MAIN PROCESSING
# =============================================================================

def process_materials_directory(base_path, output_path, dry_run=True):
    """Process all materials and enhance them"""
    
    enhancer = MaterialEnhancer()
    
    stats = {
        "total_processed": 0,
        "total_enhanced": 0,
        "changes_by_category": defaultdict(int),
        "files_modified": 0
    }
    
    iso_dirs = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    for iso_dir in iso_dirs:
        dir_path = Path(base_path) / iso_dir
        out_dir = Path(output_path) / iso_dir
        
        if not dir_path.exists():
            continue
            
        out_dir.mkdir(parents=True, exist_ok=True)
        
        for json_file in dir_path.glob("*.json"):
            if json_file.name.startswith("_") or json_file.name == "index.json":
                continue
                
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                materials = data.get("materials", [])
                if not materials:
                    continue
                
                modified = False
                for material in materials:
                    stats["total_processed"] += 1
                    
                    enhanced_mat, changes = enhancer.enhance_material(material)
                    
                    if changes:
                        stats["total_enhanced"] += 1
                        modified = True
                        for c in changes:
                            cat = c.split()[0]  # First word is category
                            stats["changes_by_category"][cat] += 1
                
                if modified:
                    stats["files_modified"] += 1
                    data["_enhanced"] = {
                        "timestamp": datetime.now().isoformat(),
                        "version": "1.0"
                    }
                    
                    if not dry_run:
                        out_file = out_dir / json_file.name
                        with open(out_file, 'w', encoding='utf-8') as f:
                            json.dump(data, f, indent=2)
                        print(f"  Enhanced: {json_file.name}")
                    else:
                        print(f"  [DRY RUN] Would enhance: {json_file.name}")
                        
            except Exception as e:
                print(f"Error processing {json_file}: {e}")
    
    return stats

def main():
    BASE_PATH = r"C:\PRISM\data\materials"
    OUTPUT_PATH = r"C:\PRISM\data\materials_enhanced"
    
    print("=" * 80)
    print("       PRISM MATERIALS ENHANCEMENT ENGINE v1.0")
    print("=" * 80)
    
    # First do a dry run
    print("\n[DRY RUN MODE] Analyzing what would be enhanced...\n")
    stats = process_materials_directory(BASE_PATH, OUTPUT_PATH, dry_run=True)
    
    print("\n" + "-" * 40)
    print("ENHANCEMENT SUMMARY")
    print("-" * 40)
    print(f"Total materials processed: {stats['total_processed']}")
    print(f"Materials needing enhancement: {stats['total_enhanced']}")
    print(f"Files that would be modified: {stats['files_modified']}")
    
    print("\nChanges by category:")
    for cat, count in sorted(stats["changes_by_category"].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} changes")
    
    # Ask for confirmation
    print("\n" + "=" * 80)
    response = input("Proceed with enhancement? (yes/no): ")
    
    if response.lower() == "yes":
        print("\n[EXECUTING] Enhancing materials...\n")
        stats = process_materials_directory(BASE_PATH, OUTPUT_PATH, dry_run=False)
        print(f"\nEnhancement complete! Output: {OUTPUT_PATH}")
    else:
        print("Enhancement cancelled.")

if __name__ == "__main__":
    main()
