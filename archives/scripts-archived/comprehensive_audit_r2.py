#!/usr/bin/env python3
"""
PRISM Comprehensive Audit - Session R2.1.1
Verify extraction completeness, identify gaps, cross-reference
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

def scan_monolith_comprehensive():
    """Deep scan of monolith for all PRISM_ subsystems with categorization"""
    print("Phase 1: Deep scanning monolith...")
    
    subsystems = defaultdict(lambda: {
        "count": 0, 
        "definition_found": False,
        "definition_type": None,
        "estimated_lines": 0,
        "categories": set(),
        "dependencies": set(),
        "consumers": set()
    })
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find all PRISM_ references
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*', content):
        name = match.group()
        subsystems[name]["count"] += 1
        
        # Check for definition patterns
        context_start = max(0, match.start() - 50)
        context = content[context_start:match.start()]
        
        if re.search(r'class\s+$', context):
            subsystems[name]["definition_found"] = True
            subsystems[name]["definition_type"] = "class"
        elif re.search(r'(?:const|let|var)\s+$', context):
            subsystems[name]["definition_found"] = True
            subsystems[name]["definition_type"] = "variable"
        elif re.search(r'function\s+$', context):
            subsystems[name]["definition_found"] = True
            subsystems[name]["definition_type"] = "function"
        
        # Categorize
        if any(x in name for x in ['AI', 'ML', 'NEURAL', 'LEARN', 'DEEP', 'TRANSFORMER']):
            subsystems[name]["categories"].add("AI/ML")
        if any(x in name for x in ['CAD', 'BREP', 'NURBS', 'GEOMETRY']):
            subsystems[name]["categories"].add("CAD")
        if any(x in name for x in ['CAM', 'TOOLPATH', 'MACHINING']):
            subsystems[name]["categories"].add("CAM")
        if 'MATERIAL' in name:
            subsystems[name]["categories"].add("MATERIALS")
        if any(x in name for x in ['MACHINE', 'SPINDLE', 'AXIS', 'KINEMATIC']):
            subsystems[name]["categories"].add("MACHINES")
        if 'TOOL' in name and 'TOOLPATH' not in name:
            subsystems[name]["categories"].add("TOOLS")
        if any(x in name for x in ['POST', 'GCODE', 'MCODE']):
            subsystems[name]["categories"].add("POST")
        if any(x in name for x in ['THERMAL', 'HEAT', 'TEMPERATURE']):
            subsystems[name]["categories"].add("THERMAL")
        if any(x in name for x in ['CHATTER', 'VIBRATION', 'STABILITY']):
            subsystems[name]["categories"].add("VIBRATION")
        if any(x in name for x in ['SURFACE', 'FINISH', 'ROUGHNESS']):
            subsystems[name]["categories"].add("SURFACE")
        if any(x in name for x in ['PHYSICS', 'FORCE', 'CUTTING', 'MECHANIC']):
            subsystems[name]["categories"].add("PHYSICS")
        if 'OPTIM' in name:
            subsystems[name]["categories"].add("OPTIMIZATION")
        if any(x in name for x in ['COST', 'QUOTE', 'SCHEDULE', 'BUSINESS']):
            subsystems[name]["categories"].add("BUSINESS")
        if any(x in name for x in ['KNOWLEDGE', 'KB']):
            subsystems[name]["categories"].add("KNOWLEDGE")
        if any(x in name for x in ['UI', 'DISPLAY', 'RENDER', 'VIEW']):
            subsystems[name]["categories"].add("UI")
        if any(x in name for x in ['VALIDATE', 'CHECK', 'VERIFY']):
            subsystems[name]["categories"].add("VALIDATION")
        if any(x in name for x in ['SIMULATION', 'COLLISION']):
            subsystems[name]["categories"].add("SIMULATION")
        if any(x in name for x in ['INTEGRATION', 'BRIDGE', 'CONNECTOR']):
            subsystems[name]["categories"].add("INTEGRATION")
        if any(x in name for x in ['ENGINE']):
            subsystems[name]["categories"].add("ENGINE")
        if any(x in name for x in ['DATABASE', 'DB']):
            subsystems[name]["categories"].add("DATABASE")
        if not subsystems[name]["categories"]:
            subsystems[name]["categories"].add("OTHER")
    
    # Convert sets to lists
    for name in subsystems:
        subsystems[name]["categories"] = list(subsystems[name]["categories"])
    
    print(f"  Found {len(subsystems)} unique PRISM_ subsystems")
    return dict(subsystems), content

def scan_extracted_files():
    """Scan all extracted files and their contents"""
    print("\nPhase 2: Scanning extracted files...")
    
    extracted = {}
    extracted_names = set()
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        if 'backup' in root.lower() or '_ARCHIVE' in root:
            continue
        
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                category = os.path.dirname(rel_path).replace('\\', '/').split('/')[0] or 'root'
                
                try:
                    size = os.path.getsize(filepath)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        lines = content.count('\n') + 1
                        
                        # Find all PRISM_ names in file
                        names_in_file = set(re.findall(r'PRISM_[A-Z][A-Z0-9_]*', content))
                        extracted_names.update(names_in_file)
                        
                        # Get primary name from filename
                        primary_name = file.replace('.js', '')
                        
                except Exception as e:
                    size = 0
                    lines = 0
                    names_in_file = set()
                    primary_name = file.replace('.js', '')
                
                extracted[file] = {
                    "path": rel_path,
                    "category": category,
                    "size": size,
                    "lines": lines,
                    "primary_name": primary_name,
                    "contains_names": list(names_in_file)[:20]  # Limit for report
                }
    
    print(f"  Found {len(extracted)} extracted files")
    print(f"  Found {len(extracted_names)} unique PRISM_ names in extracted files")
    return extracted, extracted_names

def identify_gaps(monolith_subsystems, extracted_names):
    """Identify gaps between monolith and extracted"""
    print("\nPhase 3: Identifying gaps...")
    
    gaps = {
        "critical": [],    # >100 refs, not extracted
        "high": [],        # 50-100 refs, not extracted
        "medium": [],      # 20-50 refs, not extracted
        "low": [],         # 10-20 refs, not extracted
        "minor": []        # <10 refs, not extracted
    }
    
    extracted_summary = {
        "total": 0,
        "by_category": defaultdict(int)
    }
    
    for name, info in monolith_subsystems.items():
        refs = info["count"]
        
        if name in extracted_names:
            extracted_summary["total"] += 1
            for cat in info["categories"]:
                extracted_summary["by_category"][cat] += 1
        else:
            gap_entry = {
                "name": name,
                "refs": refs,
                "categories": info["categories"],
                "definition_found": info["definition_found"],
                "definition_type": info["definition_type"]
            }
            
            if refs >= 100:
                gaps["critical"].append(gap_entry)
            elif refs >= 50:
                gaps["high"].append(gap_entry)
            elif refs >= 20:
                gaps["medium"].append(gap_entry)
            elif refs >= 10:
                gaps["low"].append(gap_entry)
            else:
                gaps["minor"].append(gap_entry)
    
    # Sort each priority level by refs
    for level in gaps:
        gaps[level] = sorted(gaps[level], key=lambda x: -x["refs"])
    
    print(f"  Critical gaps (>=100 refs): {len(gaps['critical'])}")
    print(f"  High gaps (50-99 refs): {len(gaps['high'])}")
    print(f"  Medium gaps (20-49 refs): {len(gaps['medium'])}")
    print(f"  Low gaps (10-19 refs): {len(gaps['low'])}")
    print(f"  Minor gaps (<10 refs): {len(gaps['minor'])}")
    
    return gaps, dict(extracted_summary)

def check_extraction_quality(extracted_files):
    """Check quality of extracted files"""
    print("\nPhase 4: Checking extraction quality...")
    
    quality_issues = {
        "empty_or_tiny": [],      # <10 lines
        "missing_header": [],     # No header comment
        "suspicious_content": [], # Possible incomplete extraction
        "large_files": []         # >5000 lines (might need splitting)
    }
    
    for filename, info in extracted_files.items():
        if info["lines"] < 10:
            quality_issues["empty_or_tiny"].append({
                "file": filename,
                "lines": info["lines"],
                "path": info["path"]
            })
        
        if info["lines"] > 5000:
            quality_issues["large_files"].append({
                "file": filename,
                "lines": info["lines"],
                "path": info["path"]
            })
    
    print(f"  Empty/tiny files (<10 lines): {len(quality_issues['empty_or_tiny'])}")
    print(f"  Large files (>5000 lines): {len(quality_issues['large_files'])}")
    
    return quality_issues

def generate_audit_report(monolith_subsystems, extracted_files, extracted_names, gaps, quality_issues, extracted_summary):
    """Generate comprehensive audit report"""
    print("\nPhase 5: Generating audit report...")
    
    total_monolith = len(monolith_subsystems)
    significant_monolith = len([k for k, v in monolith_subsystems.items() if v["count"] >= 10])
    total_extracted = len(extracted_names)
    
    report = {
        "session": "R2.1.1",
        "timestamp": "2026-01-31T19:20:00Z",
        "summary": {
            "monolith": {
                "total_subsystems": total_monolith,
                "significant_subsystems": significant_monolith,
                "total_references": sum(v["count"] for v in monolith_subsystems.values())
            },
            "extracted": {
                "total_files": len(extracted_files),
                "total_names_covered": total_extracted,
                "coverage_all": round(total_extracted / total_monolith * 100, 2) if total_monolith else 0,
                "coverage_significant": round(extracted_summary["total"] / significant_monolith * 100, 2) if significant_monolith else 0
            },
            "gaps": {
                "critical": len(gaps["critical"]),
                "high": len(gaps["high"]),
                "medium": len(gaps["medium"]),
                "low": len(gaps["low"]),
                "minor": len(gaps["minor"]),
                "total_actionable": len(gaps["critical"]) + len(gaps["high"]) + len(gaps["medium"])
            },
            "quality": {
                "empty_tiny_files": len(quality_issues["empty_or_tiny"]),
                "large_files": len(quality_issues["large_files"])
            }
        },
        "gaps_detail": {
            "critical": gaps["critical"][:20],
            "high": gaps["high"][:20],
            "medium": gaps["medium"][:30]
        },
        "quality_issues": quality_issues,
        "extracted_by_category": dict(extracted_summary["by_category"]),
        "recommendations": []
    }
    
    # Generate recommendations
    if gaps["critical"]:
        report["recommendations"].append({
            "priority": "CRITICAL",
            "action": f"Extract {len(gaps['critical'])} critical subsystems (>=100 refs each)",
            "items": [g["name"] for g in gaps["critical"][:10]]
        })
    
    if gaps["high"]:
        report["recommendations"].append({
            "priority": "HIGH",
            "action": f"Extract {len(gaps['high'])} high-priority subsystems (50-99 refs each)",
            "items": [g["name"] for g in gaps["high"][:10]]
        })
    
    if quality_issues["empty_or_tiny"]:
        report["recommendations"].append({
            "priority": "MEDIUM",
            "action": f"Review {len(quality_issues['empty_or_tiny'])} empty/tiny files for re-extraction",
            "items": [q["file"] for q in quality_issues["empty_or_tiny"][:10]]
        })
    
    return report

def main():
    os.makedirs(AUDIT_PATH, exist_ok=True)
    
    print("=" * 70)
    print("PRISM COMPREHENSIVE AUDIT - Session R2.1.1")
    print("=" * 70)
    
    # Phase 1: Scan monolith
    monolith_subsystems, monolith_content = scan_monolith_comprehensive()
    
    # Phase 2: Scan extracted
    extracted_files, extracted_names = scan_extracted_files()
    
    # Phase 3: Identify gaps
    gaps, extracted_summary = identify_gaps(monolith_subsystems, extracted_names)
    
    # Phase 4: Check quality
    quality_issues = check_extraction_quality(extracted_files)
    
    # Phase 5: Generate report
    report = generate_audit_report(
        monolith_subsystems, extracted_files, extracted_names, 
        gaps, quality_issues, extracted_summary
    )
    
    # Save report
    report_path = os.path.join(AUDIT_PATH, "comprehensive_audit_r2_1_1.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("\n" + "=" * 70)
    print("AUDIT RESULTS")
    print("=" * 70)
    
    print(f"\nMONOLITH:")
    print(f"  Total subsystems: {report['summary']['monolith']['total_subsystems']}")
    print(f"  Significant (>=10 refs): {report['summary']['monolith']['significant_subsystems']}")
    
    print(f"\nEXTRACTED:")
    print(f"  Total files: {report['summary']['extracted']['total_files']}")
    print(f"  Names covered: {report['summary']['extracted']['total_names_covered']}")
    print(f"  Coverage (all): {report['summary']['extracted']['coverage_all']}%")
    print(f"  Coverage (significant): {report['summary']['extracted']['coverage_significant']}%")
    
    print(f"\nGAPS:")
    print(f"  Critical (>=100 refs): {report['summary']['gaps']['critical']}")
    print(f"  High (50-99 refs): {report['summary']['gaps']['high']}")
    print(f"  Medium (20-49 refs): {report['summary']['gaps']['medium']}")
    print(f"  Total actionable: {report['summary']['gaps']['total_actionable']}")
    
    if gaps["critical"]:
        print(f"\n" + "-" * 70)
        print("CRITICAL GAPS (need immediate extraction):")
        print("-" * 70)
        for g in gaps["critical"][:15]:
            cats = ', '.join(g['categories'])
            print(f"  {g['name']}: {g['refs']} refs [{cats}]")
    
    print(f"\nReport saved to: {report_path}")
    
    return report

if __name__ == "__main__":
    main()
