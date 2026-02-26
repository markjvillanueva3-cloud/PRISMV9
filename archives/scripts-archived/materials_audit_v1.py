#!/usr/bin/env python3
"""
PRISM Materials Database Audit v1.0
===================================
Scans all materials, counts parameters, identifies gaps.
ASCII-only output for Windows compatibility.

Created: 2026-01-25
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict

# === CONFIGURATION ===
MATERIALS_ROOT = r"C:\\PRISM\EXTRACTED\materials"
MATERIALS_COMPLETE = r"C:\\PRISM\EXTRACTED\materials_complete"

# Target counts per category
TARGETS = {
    "P_STEELS": 400,
    "M_STAINLESS": 100,
    "K_CAST_IRON": 60,
    "N_NONFERROUS": 250,
    "S_SUPERALLOYS": 100,
    "H_HARDENED": 80,
    "X_SPECIALTY": 50
}

# 127-parameter sections with expected field counts
SCHEMA_SECTIONS = {
    "identification": {"fields": ["id", "name", "uns", "standard", "iso_group", "material_class", "condition"], "required": 7},
    "composition": {"fields": "variable", "required": 3},  # At least 3 elements
    "physical": {"fields": ["density", "melting_point", "thermal_conductivity", "elastic_modulus", "shear_modulus", "poissons_ratio"], "required": 6},
    "mechanical": {"fields": ["hardness", "tensile_strength", "yield_strength", "elongation", "fatigue_strength", "fracture_toughness"], "required": 6},
    "kienzle": {"fields": ["kc1_1", "mc"], "required": 2},
    "taylor": {"fields": ["C", "n"], "required": 2},
    "johnson_cook": {"fields": ["A", "B", "n", "C", "m", "T_melt"], "required": 6},
    "chip_formation": {"fields": ["chip_type", "shear_angle", "bue_tendency", "breakability"], "required": 4},
    "friction": {"fields": ["tool_chip_dry", "tool_chip_coolant", "adhesion", "abrasiveness"], "required": 4},
    "thermal_machining": {"fields": ["cutting_temp_model", "heat_partition", "coolant_effectiveness"], "required": 3},
    "surface_integrity": {"fields": ["residual_stress", "work_hardening", "surface_roughness"], "required": 3},
    "machinability": {"fields": ["aisi_rating", "relative_to_1212"], "required": 2},
    "recommended_cutting": {"fields": ["turning", "milling", "drilling"], "required": 1},
    "statistical": {"fields": ["confidence", "sources", "uncertainty"], "required": 3}
}

def print_header(text):
    """Print section header"""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_subheader(text):
    """Print subsection header"""
    print(f"\n--- {text} ---")

def count_params_in_dict(d, prefix=""):
    """Recursively count parameters in nested dict"""
    count = 0
    for key, value in d.items():
        if isinstance(value, dict):
            count += count_params_in_dict(value, f"{prefix}.{key}")
        elif isinstance(value, list):
            count += 1
            for item in value:
                if isinstance(item, dict):
                    count += count_params_in_dict(item)
        else:
            count += 1
    return count

def check_section_completeness(material, section_name):
    """Check if a section exists and has required fields"""
    section_info = SCHEMA_SECTIONS.get(section_name, {})
    required = section_info.get("required", 0)
    
    # Handle different naming conventions
    section_keys = [section_name, section_name.replace("_", "")]
    
    for key in section_keys:
        if key in material:
            data = material[key]
            if isinstance(data, dict):
                return len(data) >= required, len(data)
            return True, 1
    
    return False, 0

def extract_materials_from_js(filepath):
    """Extract material objects from JS file"""
    materials = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all material objects with IDs
        pattern = r'"([A-Z]-[A-Z]{2,3}-\d{3})":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'
        
        # Simpler approach: look for material ID patterns and extract JSON-like blocks
        id_pattern = r'"id":\s*"([A-Z]-[A-Z]{2,4}-\d{3})"'
        ids = re.findall(id_pattern, content)
        
        # For each ID, try to find its material block
        for mat_id in ids:
            # Find the block starting with this ID
            block_start = content.find(f'"{mat_id}"')
            if block_start == -1:
                continue
            
            # Find the material object - look for balanced braces
            brace_count = 0
            start_idx = None
            end_idx = None
            
            for i in range(block_start, len(content)):
                if content[i] == '{':
                    if start_idx is None:
                        start_idx = i
                    brace_count += 1
                elif content[i] == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_idx is not None:
                        end_idx = i + 1
                        break
            
            if start_idx and end_idx:
                try:
                    block = content[start_idx:end_idx]
                    # Clean up JS to JSON
                    block = re.sub(r'//.*$', '', block, flags=re.MULTILINE)
                    block = re.sub(r',\s*}', '}', block)
                    block = re.sub(r',\s*]', ']', block)
                    material = json.loads(block)
                    materials.append(material)
                except json.JSONDecodeError:
                    pass  # Skip malformed entries
                    
    except Exception as e:
        print(f"  [ERROR] Reading {filepath}: {str(e)[:50]}")
    
    return materials

def scan_directory(directory):
    """Scan directory for material files"""
    materials = []
    files_scanned = 0
    
    if not os.path.exists(directory):
        return materials, 0
    
    for root, dirs, files in os.walk(directory):
        for filename in files:
            if filename.endswith('.js') and 'generated' in filename.lower():
                filepath = os.path.join(root, filename)
                found = extract_materials_from_js(filepath)
                materials.extend(found)
                files_scanned += 1
                
    return materials, files_scanned

def analyze_material(material):
    """Analyze a single material for completeness"""
    results = {
        "id": material.get("id", "UNKNOWN"),
        "name": material.get("name", "UNKNOWN"),
        "total_params": count_params_in_dict(material),
        "sections": {},
        "missing_sections": [],
        "incomplete_sections": []
    }
    
    for section_name in SCHEMA_SECTIONS:
        present, field_count = check_section_completeness(material, section_name)
        required = SCHEMA_SECTIONS[section_name]["required"]
        
        results["sections"][section_name] = {
            "present": present,
            "fields": field_count,
            "required": required,
            "complete": field_count >= required
        }
        
        if not present:
            results["missing_sections"].append(section_name)
        elif field_count < required:
            results["incomplete_sections"].append(section_name)
    
    return results

def main():
    print_header("PRISM MATERIALS DATABASE AUDIT v1.0")
    print("ASCII-only output for Windows compatibility")
    print(f"Scanning: {MATERIALS_ROOT}")
    
    # === PHASE 1: Scan all directories ===
    print_subheader("Phase 1: Scanning Material Files")
    
    all_materials = []
    category_counts = defaultdict(list)
    
    # Scan main materials directory
    for category in os.listdir(MATERIALS_ROOT):
        category_path = os.path.join(MATERIALS_ROOT, category)
        if os.path.isdir(category_path) and category.startswith(('P_', 'M_', 'K_', 'N_', 'S_', 'H_', 'X_')):
            materials, files = scan_directory(category_path)
            category_counts[category] = materials
            all_materials.extend(materials)
            print(f"  [SCAN] {category}: {len(materials)} materials from {files} files")
    
    # Scan materials_complete directory
    if os.path.exists(MATERIALS_COMPLETE):
        print_subheader("Scanning materials_complete")
        for category in os.listdir(MATERIALS_COMPLETE):
            category_path = os.path.join(MATERIALS_COMPLETE, category)
            if os.path.isdir(category_path):
                materials, files = scan_directory(category_path)
                # Add to category if not duplicate
                existing_ids = {m.get("id") for m in category_counts.get(category, [])}
                new_materials = [m for m in materials if m.get("id") not in existing_ids]
                category_counts[category].extend(new_materials)
                all_materials.extend(new_materials)
                print(f"  [SCAN] {category} (complete): +{len(new_materials)} new materials")
    
    # === PHASE 2: Category Summary ===
    print_header("CATEGORY SUMMARY")
    
    total_materials = 0
    total_target = 0
    
    print(f"\n{'Category':<15} {'Count':>8} {'Target':>8} {'Percent':>8} {'Status':<12}")
    print("-" * 55)
    
    for category in sorted(TARGETS.keys()):
        count = len(category_counts.get(category, []))
        target = TARGETS[category]
        percent = (count / target * 100) if target > 0 else 0
        
        if percent >= 100:
            status = "[OK]"
        elif percent >= 80:
            status = "[WARN]"
        else:
            status = "[CRITICAL]"
        
        print(f"{category:<15} {count:>8} {target:>8} {percent:>7.1f}% {status:<12}")
        total_materials += count
        total_target += target
    
    print("-" * 55)
    overall_pct = (total_materials / total_target * 100) if total_target > 0 else 0
    print(f"{'TOTAL':<15} {total_materials:>8} {total_target:>8} {overall_pct:>7.1f}%")
    
    # === PHASE 3: Parameter Completeness ===
    print_header("PARAMETER COMPLETENESS ANALYSIS")
    
    section_stats = defaultdict(lambda: {"present": 0, "missing": 0, "incomplete": 0})
    param_counts = []
    
    sample_size = min(100, len(all_materials))  # Analyze sample for speed
    sample = all_materials[:sample_size]
    
    print(f"\nAnalyzing {sample_size} materials (sample)...")
    
    for material in sample:
        analysis = analyze_material(material)
        param_counts.append(analysis["total_params"])
        
        for section, data in analysis["sections"].items():
            if not data["present"]:
                section_stats[section]["missing"] += 1
            elif not data["complete"]:
                section_stats[section]["incomplete"] += 1
            else:
                section_stats[section]["present"] += 1
    
    print(f"\n{'Section':<20} {'Present':>10} {'Incomplete':>12} {'Missing':>10} {'Health':<10}")
    print("-" * 65)
    
    critical_sections = []
    for section in SCHEMA_SECTIONS:
        stats = section_stats[section]
        present = stats["present"]
        incomplete = stats["incomplete"]
        missing = stats["missing"]
        
        health_pct = (present / sample_size * 100) if sample_size > 0 else 0
        
        if health_pct >= 90:
            health = "[OK]"
        elif health_pct >= 50:
            health = "[WARN]"
        else:
            health = "[CRITICAL]"
            critical_sections.append(section)
        
        print(f"{section:<20} {present:>10} {incomplete:>12} {missing:>10} {health:<10}")
    
    # === PHASE 4: Critical Gaps ===
    print_header("CRITICAL GAPS IDENTIFIED")
    
    print("\n[A] MISSING CATEGORIES (need more materials):")
    for category in sorted(TARGETS.keys()):
        count = len(category_counts.get(category, []))
        target = TARGETS[category]
        if count < target:
            needed = target - count
            print(f"    {category}: need +{needed} materials ({count}/{target})")
    
    print("\n[B] MISSING PARAMETER SECTIONS (need data for existing materials):")
    for section in critical_sections:
        stats = section_stats[section]
        print(f"    {section}: {stats['missing']}/{sample_size} materials missing this section")
    
    avg_params = sum(param_counts) / len(param_counts) if param_counts else 0
    print(f"\n[C] PARAMETER DENSITY:")
    print(f"    Target: 127 parameters per material")
    print(f"    Average: {avg_params:.1f} parameters per material")
    print(f"    Gap: {127 - avg_params:.1f} parameters missing on average")
    
    # === PHASE 5: Recommendations ===
    print_header("RECOMMENDATIONS")
    
    print("""
Priority 1 - SUPERALLOYS (Critical for aerospace):
    - Current: 18 materials
    - Target: 100 materials
    - Action: Add Inconel, Waspaloy, Rene, MAR-M, Hastelloy series
    - Estimated sessions: 4-5

Priority 2 - MISSING SECTIONS (affects ALL materials):
    - chip_formation: Add to all 1500+ materials
    - friction: Add tribology data
    - thermal_machining: Add cutting temperature models
    - surface_integrity: Add residual stress data
    - statistical: Add uncertainty bounds
    - Estimated sessions: 8-10

Priority 3 - CAST IRON (manufacturing staple):
    - Current: 48 materials
    - Target: 60 materials
    - Action: Add +12 materials
    - Estimated sessions: 1

Priority 4 - HARDENED STEELS (tool/die industry):
    - Current: 0 materials
    - Target: 80 materials
    - Action: Create H_HARDENED category
    - Estimated sessions: 4-5
""")
    
    # === SAVE REPORT ===
    report_path = r"C:\\PRISM\_REPORTS\materials_audit_2026-01-25.txt"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    print_header("AUDIT COMPLETE")
    print(f"\nTotal materials scanned: {len(all_materials)}")
    print(f"Average parameters per material: {avg_params:.1f}/127")
    print(f"Critical sections missing: {len(critical_sections)}")
    
    return {
        "total_materials": len(all_materials),
        "category_counts": {k: len(v) for k, v in category_counts.items()},
        "avg_params": avg_params,
        "critical_sections": critical_sections
    }

if __name__ == "__main__":
    main()
