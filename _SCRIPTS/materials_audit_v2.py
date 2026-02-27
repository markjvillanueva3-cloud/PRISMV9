#!/usr/bin/env python3
"""
PRISM Materials Database Audit v2.0
===================================
Fixed: Scans ALL .js files, not just *_generated.js
ASCII-only output for Windows compatibility.

Created: 2026-01-25
"""

import os
import json
import re
from pathlib import Path
from collections import defaultdict

# === CONFIGURATION ===
MATERIALS_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials"
MATERIALS_COMPLETE = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials_complete"
MATERIALS_ENHANCED = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\materials_enhanced"

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

# Key sections to check
KEY_SECTIONS = [
    "identification", "composition", "physicalProperties", "physical",
    "mechanicalProperties", "mechanical", "kienzle", "taylor", "taylorToolLife",
    "johnsonCook", "johnson_cook", "chipFormation", "chip_formation",
    "friction", "thermalMachining", "thermal_machining", 
    "surfaceIntegrity", "surface_integrity", "machinability",
    "recommendedParameters", "recommended_cutting", "statisticalData", "statistical"
]

def print_header(text):
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70)

def print_subheader(text):
    print(f"\n--- {text} ---")

def count_material_ids_in_file(filepath):
    """Count material IDs in a JS file using multiple patterns"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Multiple ID patterns used in different files
        patterns = [
            r'"id":\s*"([A-Z]-[A-Z]{2,4}-\d{3})"',  # "id": "P-CS-001"
            r"'id':\s*'([A-Z]-[A-Z]{2,4}-\d{3})'",  # 'id': 'P-CS-001'
            r'"([A-Z]-[A-Z]{2,4}-\d{3})":\s*\{',    # "P-CS-001": {
            r"'([A-Z]-[A-Z]{2,4}-\d{3})':\s*\{",    # 'P-CS-001': {
        ]
        
        all_ids = set()
        for pattern in patterns:
            ids = re.findall(pattern, content)
            all_ids.update(ids)
        
        return list(all_ids), content
        
    except Exception as e:
        return [], ""

def check_sections_in_content(content):
    """Check which sections exist in the file content"""
    found_sections = {}
    
    section_patterns = {
        "identification": [r'identification\s*:', r'identification\s*='],
        "composition": [r'composition\s*:', r'composition\s*='],
        "physical": [r'physicalProperties\s*:', r'physical\s*:'],
        "mechanical": [r'mechanicalProperties\s*:', r'mechanical\s*:'],
        "kienzle": [r'kienzle\s*:', r'Kienzle\s*:'],
        "taylor": [r'taylor\w*\s*:', r'Taylor\s*:'],
        "johnson_cook": [r'johnsonCook\s*:', r'johnson_cook\s*:'],
        "chip_formation": [r'chipFormation\s*:', r'chip_formation\s*:'],
        "friction": [r'friction\s*:'],
        "thermal_machining": [r'thermalMachining\s*:', r'thermal_machining\s*:'],
        "surface_integrity": [r'surfaceIntegrity\s*:', r'surface_integrity\s*:'],
        "machinability": [r'machinability\s*:'],
        "recommended_cutting": [r'recommendedParameters\s*:', r'recommended_cutting\s*:'],
        "statistical": [r'statisticalData\s*:', r'statistical\s*:']
    }
    
    for section, patterns in section_patterns.items():
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                found_sections[section] = True
                break
        if section not in found_sections:
            found_sections[section] = False
    
    return found_sections

def scan_directory(directory, category_name):
    """Scan a category directory for material files"""
    results = {
        "material_ids": [],
        "files_scanned": 0,
        "sections_found": defaultdict(int),
        "sections_missing": defaultdict(int)
    }
    
    if not os.path.exists(directory):
        return results
    
    for filename in os.listdir(directory):
        if filename.endswith('.js') and not filename.startswith('_'):
            filepath = os.path.join(directory, filename)
            ids, content = count_material_ids_in_file(filepath)
            
            if ids:
                results["material_ids"].extend(ids)
                results["files_scanned"] += 1
                
                # Check sections
                sections = check_sections_in_content(content)
                for section, present in sections.items():
                    if present:
                        results["sections_found"][section] += len(ids)
                    else:
                        results["sections_missing"][section] += len(ids)
    
    return results

def main():
    print_header("PRISM MATERIALS DATABASE AUDIT v2.0")
    print("Fixed scanner - checks ALL .js files")
    print(f"Root: {MATERIALS_ROOT}")
    
    # === PHASE 1: Scan all directories ===
    print_subheader("Phase 1: Scanning All Material Files")
    
    all_results = {}
    total_materials = 0
    total_sections = defaultdict(lambda: {"found": 0, "missing": 0})
    
    # Categories to scan
    categories = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", 
                  "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"]
    
    # Scan each category in main materials folder
    for category in categories:
        cat_path = os.path.join(MATERIALS_ROOT, category)
        results = scan_directory(cat_path, category)
        
        # Also check materials_complete and materials_enhanced
        for extra_dir in [MATERIALS_COMPLETE, MATERIALS_ENHANCED]:
            extra_path = os.path.join(extra_dir, category)
            if os.path.exists(extra_path):
                extra_results = scan_directory(extra_path, category)
                # Add unique IDs
                existing_ids = set(results["material_ids"])
                new_ids = [id for id in extra_results["material_ids"] if id not in existing_ids]
                results["material_ids"].extend(new_ids)
                results["files_scanned"] += extra_results["files_scanned"]
        
        all_results[category] = results
        count = len(results["material_ids"])
        total_materials += count
        
        # Aggregate section stats
        for section in results["sections_found"]:
            total_sections[section]["found"] += results["sections_found"][section]
        for section in results["sections_missing"]:
            total_sections[section]["missing"] += results["sections_missing"][section]
        
        status = "[OK]" if count >= TARGETS.get(category, 0) else "[GAP]"
        print(f"  {status} {category}: {count} materials from {results['files_scanned']} files")
    
    # === PHASE 2: Summary Table ===
    print_header("CATEGORY SUMMARY")
    
    print(f"\n{'Category':<15} {'Found':>8} {'Target':>8} {'Percent':>8} {'Gap':>8} {'Status':<12}")
    print("-" * 65)
    
    total_target = 0
    total_gap = 0
    
    for category in categories:
        count = len(all_results.get(category, {}).get("material_ids", []))
        target = TARGETS.get(category, 0)
        percent = (count / target * 100) if target > 0 else 0
        gap = max(0, target - count)
        
        total_target += target
        total_gap += gap
        
        if percent >= 100:
            status = "[OK]"
        elif percent >= 80:
            status = "[CLOSE]"
        elif percent >= 50:
            status = "[WARN]"
        else:
            status = "[CRITICAL]"
        
        print(f"{category:<15} {count:>8} {target:>8} {percent:>7.1f}% {gap:>8} {status:<12}")
    
    print("-" * 65)
    overall_pct = (total_materials / total_target * 100) if total_target > 0 else 0
    print(f"{'TOTAL':<15} {total_materials:>8} {total_target:>8} {overall_pct:>7.1f}% {total_gap:>8}")
    
    # === PHASE 3: Section Completeness ===
    print_header("PARAMETER SECTION COMPLETENESS")
    
    print(f"\n{'Section':<22} {'Present':>10} {'Missing':>10} {'Coverage':>10} {'Status':<10}")
    print("-" * 65)
    
    critical_sections = []
    for section in ["identification", "composition", "physical", "mechanical", 
                    "kienzle", "taylor", "johnson_cook", "chip_formation",
                    "friction", "thermal_machining", "surface_integrity",
                    "machinability", "recommended_cutting", "statistical"]:
        
        found = total_sections[section]["found"]
        missing = total_sections[section]["missing"]
        total = found + missing
        coverage = (found / total * 100) if total > 0 else 0
        
        if coverage >= 90:
            status = "[OK]"
        elif coverage >= 50:
            status = "[PARTIAL]"
        else:
            status = "[MISSING]"
            critical_sections.append(section)
        
        print(f"{section:<22} {found:>10} {missing:>10} {coverage:>9.1f}% {status:<10}")
    
    # === PHASE 4: Gaps Analysis ===
    print_header("GAPS ANALYSIS")
    
    print("\n[A] CATEGORIES NEEDING MORE MATERIALS:")
    for category in categories:
        count = len(all_results.get(category, {}).get("material_ids", []))
        target = TARGETS.get(category, 0)
        if count < target:
            gap = target - count
            pct = (count / target * 100) if target > 0 else 0
            print(f"    {category}: +{gap} needed ({count}/{target} = {pct:.0f}%)")
    
    print("\n[B] PARAMETER SECTIONS NEEDING COMPLETION:")
    for section in critical_sections:
        found = total_sections[section]["found"]
        missing = total_sections[section]["missing"]
        print(f"    {section}: {missing} materials missing this data")
    
    # === PHASE 5: Action Plan ===
    print_header("RECOMMENDED ACTION PLAN")
    
    # Calculate priorities
    print("""
PHASE A: Complete Missing Parameter Sections (ALL existing materials)
-----------------------------------------------------------------------""")
    
    for section in critical_sections:
        missing = total_sections[section]["missing"]
        if missing > 0:
            print(f"  - {section}: Add to {missing} materials")
    
    print("""
PHASE B: Add Missing Materials by Category
-----------------------------------------------------------------------""")
    
    priority_order = []
    for category in categories:
        count = len(all_results.get(category, {}).get("material_ids", []))
        target = TARGETS.get(category, 0)
        gap = target - count
        if gap > 0:
            priority_order.append((category, count, target, gap))
    
    # Sort by gap size (largest first)
    priority_order.sort(key=lambda x: x[3], reverse=True)
    
    for i, (cat, count, target, gap) in enumerate(priority_order, 1):
        print(f"  {i}. {cat}: Add +{gap} materials ({count} -> {target})")
    
    print_header("AUDIT COMPLETE")
    print(f"\nTotal materials found: {total_materials}")
    print(f"Total target: {total_target}")
    print(f"Overall completion: {overall_pct:.1f}%")
    print(f"Critical section gaps: {len(critical_sections)}")
    
    # Save summary to file
    summary = {
        "audit_date": "2026-01-25",
        "total_materials": total_materials,
        "total_target": total_target,
        "overall_percent": round(overall_pct, 1),
        "category_counts": {cat: len(all_results.get(cat, {}).get("material_ids", [])) for cat in categories},
        "critical_sections": critical_sections,
        "material_ids_by_category": {cat: all_results.get(cat, {}).get("material_ids", []) for cat in categories}
    }
    
    summary_path = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_REPORTS\materials_audit_summary.json"
    os.makedirs(os.path.dirname(summary_path), exist_ok=True)
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"\nSummary saved to: {summary_path}")

if __name__ == "__main__":
    main()
