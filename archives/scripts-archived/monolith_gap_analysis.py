#!/usr/bin/env python3
"""
PRISM Monolith Gap Analysis
Session R2.0.1 - Identify unextracted subsystems
"""

import re
import os
import json
from pathlib import Path
from collections import defaultdict

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"
OUTPUT_PATH = r"C:\PRISM\mcp-server\audits"

def scan_monolith_subsystems():
    """Scan monolith for all PRISM_ subsystems"""
    print("Scanning monolith for subsystems...")
    
    subsystems = defaultdict(lambda: {"count": 0, "lines": [], "categories": set()})
    
    # Patterns to find subsystems
    patterns = [
        r'class\s+(PRISM_\w+)',
        r'const\s+(PRISM_\w+)\s*=',
        r'let\s+(PRISM_\w+)\s*=',
        r'var\s+(PRISM_\w+)\s*=',
        r'function\s+(PRISM_\w+)',
        r'(PRISM_\w+)\.prototype',
        r'window\.(PRISM_\w+)\s*=',
        r'this\.(PRISM_\w+)\s*=',
    ]
    
    combined_pattern = '|'.join(f'({p})' for p in patterns)
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        for line_num, line in enumerate(f, 1):
            for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*', line):
                name = match.group()
                subsystems[name]["count"] += 1
                if len(subsystems[name]["lines"]) < 5:
                    subsystems[name]["lines"].append(line_num)
                
                # Categorize
                if 'AI' in name or 'ML' in name or 'NEURAL' in name or 'LEARN' in name:
                    subsystems[name]["categories"].add("AI/ML")
                elif 'CAD' in name or 'BREP' in name or 'NURBS' in name:
                    subsystems[name]["categories"].add("CAD")
                elif 'CAM' in name or 'TOOLPATH' in name or 'MACHINING' in name:
                    subsystems[name]["categories"].add("CAM")
                elif 'MATERIAL' in name:
                    subsystems[name]["categories"].add("MATERIALS")
                elif 'MACHINE' in name or 'SPINDLE' in name or 'AXIS' in name:
                    subsystems[name]["categories"].add("MACHINES")
                elif 'TOOL' in name and 'TOOLPATH' not in name:
                    subsystems[name]["categories"].add("TOOLS")
                elif 'POST' in name or 'GCODE' in name or 'MCODE' in name:
                    subsystems[name]["categories"].add("POST")
                elif 'THERMAL' in name or 'HEAT' in name:
                    subsystems[name]["categories"].add("THERMAL")
                elif 'CHATTER' in name or 'VIBRATION' in name or 'STABILITY' in name:
                    subsystems[name]["categories"].add("VIBRATION")
                elif 'SURFACE' in name or 'FINISH' in name:
                    subsystems[name]["categories"].add("SURFACE")
                elif 'PHYSICS' in name or 'FORCE' in name or 'CUTTING' in name:
                    subsystems[name]["categories"].add("PHYSICS")
                elif 'OPTIM' in name:
                    subsystems[name]["categories"].add("OPTIMIZATION")
                elif 'COST' in name or 'QUOTE' in name or 'SCHEDULE' in name:
                    subsystems[name]["categories"].add("BUSINESS")
                elif 'KNOWLEDGE' in name or 'KB' in name:
                    subsystems[name]["categories"].add("KNOWLEDGE")
                elif 'UI' in name or 'DISPLAY' in name or 'RENDER' in name:
                    subsystems[name]["categories"].add("UI")
                elif 'VALIDATE' in name or 'CHECK' in name or 'VERIFY' in name:
                    subsystems[name]["categories"].add("VALIDATION")
                elif 'SIMULATION' in name or 'COLLISION' in name:
                    subsystems[name]["categories"].add("SIMULATION")
                else:
                    subsystems[name]["categories"].add("OTHER")
    
    # Convert sets to lists for JSON
    for name in subsystems:
        subsystems[name]["categories"] = list(subsystems[name]["categories"])
    
    return dict(subsystems)

def scan_extracted_files():
    """Scan extracted directory for all files"""
    print("Scanning extracted files...")
    
    extracted = {}
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        # Skip backup directories
        if 'backup' in root.lower() or '_ARCHIVE' in root:
            continue
            
        for file in files:
            if file.endswith(('.js', '.json', '.ts')):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                
                # Extract PRISM_ names from filename
                prism_names = re.findall(r'PRISM_[A-Z][A-Z0-9_]*', file)
                
                try:
                    size = os.path.getsize(filepath)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len(f.readlines())
                except:
                    size = 0
                    lines = 0
                
                extracted[file] = {
                    "path": rel_path,
                    "prism_names": prism_names,
                    "size": size,
                    "lines": lines
                }
    
    return extracted

def identify_gaps(monolith_subsystems, extracted_files):
    """Identify subsystems in monolith but not extracted"""
    print("Identifying gaps...")
    
    # Get all PRISM names from extracted files
    extracted_names = set()
    for file_info in extracted_files.values():
        for name in file_info.get("prism_names", []):
            extracted_names.add(name)
    
    # Also check file content (scan extracted files for PRISM_ references)
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        if 'backup' in root.lower() or '_ARCHIVE' in root:
            continue
        for file in files:
            if file.endswith(('.js', '.json', '.ts')):
                try:
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*', content):
                            extracted_names.add(match.group())
                except:
                    pass
    
    # Find gaps - subsystems with high reference count but not extracted
    gaps = {}
    for name, info in monolith_subsystems.items():
        if info["count"] >= 10:  # Only significant subsystems
            if name not in extracted_names:
                gaps[name] = {
                    "references": info["count"],
                    "categories": info["categories"],
                    "sample_lines": info["lines"][:3],
                    "status": "NOT_EXTRACTED"
                }
            else:
                # Extracted but check if significant
                gaps[name] = {
                    "references": info["count"],
                    "categories": info["categories"],
                    "status": "EXTRACTED"
                }
    
    return gaps, extracted_names

def generate_report(monolith_subsystems, extracted_files, gaps):
    """Generate comprehensive gap report"""
    
    # Separate extracted vs not extracted
    not_extracted = {k: v for k, v in gaps.items() if v["status"] == "NOT_EXTRACTED"}
    extracted = {k: v for k, v in gaps.items() if v["status"] == "EXTRACTED"}
    
    # Sort by reference count
    not_extracted_sorted = sorted(not_extracted.items(), key=lambda x: -x[1]["references"])
    
    # Category summary
    category_gaps = defaultdict(list)
    for name, info in not_extracted.items():
        for cat in info["categories"]:
            category_gaps[cat].append((name, info["references"]))
    
    report = {
        "summary": {
            "total_monolith_subsystems": len([k for k, v in monolith_subsystems.items() if v["count"] >= 10]),
            "extracted_count": len(extracted),
            "not_extracted_count": len(not_extracted),
            "extracted_files": len(extracted_files),
            "coverage_percentage": round(len(extracted) / max(len(gaps), 1) * 100, 2)
        },
        "category_gaps": {cat: sorted(items, key=lambda x: -x[1]) for cat, items in category_gaps.items()},
        "top_gaps": not_extracted_sorted[:50],
        "all_gaps": not_extracted,
        "extracted": extracted
    }
    
    return report

def main():
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    
    print("=" * 60)
    print("PRISM MONOLITH GAP ANALYSIS - Session R2.0.1")
    print("=" * 60)
    
    # Scan monolith
    monolith_subsystems = scan_monolith_subsystems()
    print(f"Found {len(monolith_subsystems)} unique PRISM_ references")
    
    # Scan extracted
    extracted_files = scan_extracted_files()
    print(f"Found {len(extracted_files)} extracted files")
    
    # Identify gaps
    gaps, extracted_names = identify_gaps(monolith_subsystems, extracted_files)
    
    # Generate report
    report = generate_report(monolith_subsystems, extracted_files, gaps)
    
    # Save results
    output_file = os.path.join(OUTPUT_PATH, "monolith_gap_analysis.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print("\n" + "=" * 60)
    print("ANALYSIS RESULTS")
    print("=" * 60)
    print(f"Total significant subsystems: {report['summary']['total_monolith_subsystems']}")
    print(f"Extracted: {report['summary']['extracted_count']}")
    print(f"NOT Extracted: {report['summary']['not_extracted_count']}")
    print(f"Coverage: {report['summary']['coverage_percentage']}%")
    
    print("\n" + "-" * 60)
    print("TOP 20 UNEXTRACTED SUBSYSTEMS (by reference count):")
    print("-" * 60)
    for i, (name, info) in enumerate(report['top_gaps'][:20], 1):
        cats = ', '.join(info['categories'])
        print(f"{i:2}. {name}: {info['references']} refs [{cats}]")
    
    print("\n" + "-" * 60)
    print("GAPS BY CATEGORY:")
    print("-" * 60)
    for cat, items in sorted(report['category_gaps'].items()):
        total_refs = sum(refs for _, refs in items)
        print(f"{cat}: {len(items)} items, {total_refs} total refs")
    
    print(f"\nReport saved to: {output_file}")
    return report

if __name__ == "__main__":
    main()
