#!/usr/bin/env python3
"""
PRISM Material Database Audit Script
=====================================
Purpose: Analyze all material files, count materials, assess parameter coverage
Version: 1.0
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

MATERIALS_ROOT = Path(r"C:\PRISM\data\materials")
OUTPUT_FILE = Path(r"C:\PRISM\state\material_audit_report.json")

# The 127 parameters grouped by category
PARAMETER_CATEGORIES = {
    "identification": 12,
    "classification": 8,
    "mechanical": 18,
    "thermal": 12,
    "physical": 6,
    "machinability": 15,
    "kienzle": 12,
    "johnson_cook": 8,
    "taylor": 10,
    "surface": 8,
    "coolant": 8,
    "metadata": 10
}

TOTAL_PARAMS = sum(PARAMETER_CATEGORIES.values())  # Should be 127

def analyze_js_file(filepath):
    """Analyze a JS material file and extract material info."""
    results = {
        "file": filepath.name,
        "path": str(filepath),
        "material_count": 0,
        "material_ids": [],
        "categories_found": set(),
        "has_kienzle": False,
        "has_johnson_cook": False,
        "has_taylor": False,
        "has_surface": False,
        "has_coolant": False,
        "line_count": 0
    }
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
            results["line_count"] = content.count('\n')
            
            # Count materials by looking for ID patterns
            # Pattern: 'P-CS-001' or "P-CS-001" or id: 'something'
            id_patterns = [
                r"'([A-Z]-[A-Z]+-\d+)'",  # 'P-CS-001'
                r'"([A-Z]-[A-Z]+-\d+)"',  # "P-CS-001"
                r"id:\s*'([^']+)'",        # id: 'AISI_1005'
                r'id:\s*"([^"]+)"',        # id: "AISI_1005"
            ]
            
            material_ids = set()
            for pattern in id_patterns:
                matches = re.findall(pattern, content)
                material_ids.update(matches)
            
            results["material_ids"] = list(material_ids)
            results["material_count"] = len(material_ids)
            
            # Check for key parameter categories
            results["has_kienzle"] = "kienzle" in content.lower() or "kc11" in content.lower()
            results["has_johnson_cook"] = "johnsoncook" in content.lower() or "johnson_cook" in content.lower()
            results["has_taylor"] = "taylor" in content.lower()
            results["has_surface"] = "surface" in content.lower()
            results["has_coolant"] = "coolant" in content.lower()
            
            # Check for category sections
            for cat in PARAMETER_CATEGORIES.keys():
                if cat.lower() in content.lower():
                    results["categories_found"].add(cat)
    
    except Exception as e:
        results["error"] = str(e)
    
    results["categories_found"] = list(results["categories_found"])
    return results

def audit_materials():
    """Run full audit of materials database."""
    report = {
        "audit_date": __import__('datetime').datetime.now().isoformat(),
        "materials_root": str(MATERIALS_ROOT),
        "total_parameters_per_material": TOTAL_PARAMS,
        "iso_groups": {},
        "summary": {
            "total_files": 0,
            "total_materials": 0,
            "total_lines": 0,
            "kienzle_coverage": 0,
            "johnson_cook_coverage": 0,
            "taylor_coverage": 0
        },
        "gaps": {
            "missing_kienzle": [],
            "missing_johnson_cook": [],
            "missing_taylor": [],
            "empty_directories": []
        }
    }
    
    # Process each ISO group directory
    for iso_dir in MATERIALS_ROOT.iterdir():
        if iso_dir.is_dir():
            group_name = iso_dir.name
            group_data = {
                "path": str(iso_dir),
                "files": [],
                "material_count": 0,
                "line_count": 0,
                "kienzle_files": 0,
                "jc_files": 0,
                "taylor_files": 0
            }
            
            # Process each JS file
            js_files = list(iso_dir.glob("*.js"))
            if not js_files:
                report["gaps"]["empty_directories"].append(group_name)
            
            for js_file in js_files:
                file_analysis = analyze_js_file(js_file)
                group_data["files"].append(file_analysis)
                group_data["material_count"] += file_analysis["material_count"]
                group_data["line_count"] += file_analysis["line_count"]
                
                if file_analysis["has_kienzle"]:
                    group_data["kienzle_files"] += 1
                else:
                    report["gaps"]["missing_kienzle"].append(file_analysis["file"])
                    
                if file_analysis["has_johnson_cook"]:
                    group_data["jc_files"] += 1
                else:
                    report["gaps"]["missing_johnson_cook"].append(file_analysis["file"])
                    
                if file_analysis["has_taylor"]:
                    group_data["taylor_files"] += 1
                else:
                    report["gaps"]["missing_taylor"].append(file_analysis["file"])
                
                report["summary"]["total_files"] += 1
                report["summary"]["total_materials"] += file_analysis["material_count"]
                report["summary"]["total_lines"] += file_analysis["line_count"]
            
            report["iso_groups"][group_name] = group_data
    
    # Calculate coverage percentages
    total_files = report["summary"]["total_files"]
    if total_files > 0:
        kienzle_count = sum(g["kienzle_files"] for g in report["iso_groups"].values())
        jc_count = sum(g["jc_files"] for g in report["iso_groups"].values())
        taylor_count = sum(g["taylor_files"] for g in report["iso_groups"].values())
        
        report["summary"]["kienzle_coverage"] = round(kienzle_count / total_files * 100, 1)
        report["summary"]["johnson_cook_coverage"] = round(jc_count / total_files * 100, 1)
        report["summary"]["taylor_coverage"] = round(taylor_count / total_files * 100, 1)
    
    return report

if __name__ == "__main__":
    print("=" * 60)
    print("PRISM Material Database Audit")
    print("=" * 60)
    
    report = audit_materials()
    
    # Save report
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print(f"\nAudit Complete!")
    print(f"Report saved to: {OUTPUT_FILE}")
    print("\n" + "-" * 60)
    print("SUMMARY")
    print("-" * 60)
    print(f"Total Files: {report['summary']['total_files']}")
    print(f"Total Materials: {report['summary']['total_materials']}")
    print(f"Total Lines: {report['summary']['total_lines']:,}")
    print(f"Kienzle Coverage: {report['summary']['kienzle_coverage']}%")
    print(f"Johnson-Cook Coverage: {report['summary']['johnson_cook_coverage']}%")
    print(f"Taylor Coverage: {report['summary']['taylor_coverage']}%")
    print("\n" + "-" * 60)
    print("BY ISO GROUP")
    print("-" * 60)
    for group, data in report["iso_groups"].items():
        print(f"{group}: {data['material_count']} materials in {len(data['files'])} files ({data['line_count']:,} lines)")
    
    if report["gaps"]["empty_directories"]:
        print("\n" + "-" * 60)
        print("EMPTY DIRECTORIES (Need Population)")
        print("-" * 60)
        for d in report["gaps"]["empty_directories"]:
            print(f"  - {d}")
    
    print("\n" + "=" * 60)
    print("AUDIT COMPLETE")
    print("=" * 60)
