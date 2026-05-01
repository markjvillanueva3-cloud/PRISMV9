#!/usr/bin/env python3
"""
PRISM Direct Monolith Extraction - Session R2.0.2
Extract subsystems directly using regex patterns
Then enhance with API if needed
"""

import re
import os
import json
from pathlib import Path
from collections import defaultdict

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

# Priority subsystems to extract
PRIORITY_SUBSYSTEMS = [
    # THERMAL (923 refs total) - CRITICAL
    {"name": "PRISM_CUTTING_THERMAL_ENGINE", "category": "engines", "refs": 305},
    {"name": "PRISM_HEAT_TRANSFER_ENGINE", "category": "engines", "refs": 305},
    {"name": "PRISM_THERMAL_EXPANSION_ENGINE", "category": "engines", "refs": 303},
    
    # SURFACE (317 refs)
    {"name": "PRISM_SURFACE_FINISH_ENGINE", "category": "engines", "refs": 317},
    
    # KINEMATICS/DYNAMICS (624 refs total)
    {"name": "PRISM_ADVANCED_KINEMATICS_ENGINE", "category": "engines", "refs": 313},
    {"name": "PRISM_RIGID_BODY_DYNAMICS_ENGINE", "category": "engines", "refs": 311},
    
    # VIBRATION (306 refs)
    {"name": "PRISM_VIBRATION_ANALYSIS_ENGINE", "category": "engines", "refs": 306},
    
    # CORE (724 refs total)
    {"name": "PRISM_MASTER", "category": "core", "refs": 366},
    {"name": "PRISM_MASTER_DB", "category": "core", "refs": 258},
    {"name": "PRISM_ENHANCEMENTS", "category": "core", "refs": 100},
    
    # AI/ML (341 refs)
    {"name": "PRISM_AI_AUTO_CAM", "category": "engines/ai_ml", "refs": 160},
    {"name": "PRISM_PHASE3_DEEP_LEARNING", "category": "engines/ai_ml", "refs": 60},
    {"name": "PRISM_LEAN_SIX_SIGMA_KAIZEN", "category": "engines/ai_ml", "refs": 52},
    {"name": "PRISM_PHASE6_DEEPLEARNING", "category": "engines/ai_ml", "refs": 39},
    {"name": "PRISM_TRUE_AI_SYSTEM", "category": "engines/ai_ml", "refs": 21},
    
    # CAD (157 refs)
    {"name": "PRISM_BREP_CAD_GENERATOR_V2", "category": "engines/cad_cam", "refs": 86},
    {"name": "PRISM_NURBS_LIBRARY", "category": "engines/cad_cam", "refs": 36},
    {"name": "PRISM_BREP_TESSELLATOR", "category": "engines/cad_cam", "refs": 35},
    
    # CAM (58 refs)
    {"name": "PRISM_MULTIAXIS_TOOLPATH_ENGINE", "category": "engines/cad_cam", "refs": 58},
    
    # OPTIMIZATION (39 refs)
    {"name": "PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER", "category": "engines/optimization", "refs": 21},
    {"name": "PRISM_UNCONSTRAINED_OPTIMIZATION", "category": "engines/optimization", "refs": 18},
    
    # OTHER HIGH VALUE
    {"name": "PRISM_UNIT_SYSTEM", "category": "units", "refs": 99},
    {"name": "PRISM_PARAM_ENGINE", "category": "core", "refs": 45},
    {"name": "PRISM_CAPABILITY_REGISTRY", "category": "core", "refs": 44},
    {"name": "PRISM_MACHINE_3D_MODELS", "category": "machines", "refs": 44},
]

def find_class_definition(content: str, class_name: str) -> tuple:
    """Find a class definition and extract its complete code"""
    
    # Pattern 1: ES6 class
    pattern1 = rf'(class\s+{class_name}\s*(?:extends\s+\w+)?\s*\{{)'
    
    # Pattern 2: Constructor function
    pattern2 = rf'(function\s+{class_name}\s*\([^)]*\)\s*\{{)'
    
    # Pattern 3: Object literal assignment
    pattern3 = rf'((?:const|let|var)\s+{class_name}\s*=\s*\{{)'
    
    # Pattern 4: Window assignment
    pattern4 = rf'(window\.{class_name}\s*=\s*(?:class|function|\{{))'
    
    # Pattern 5: IIFE pattern
    pattern5 = rf'((?:const|let|var)\s+{class_name}\s*=\s*\(function)'
    
    for pattern in [pattern1, pattern2, pattern3, pattern4, pattern5]:
        match = re.search(pattern, content)
        if match:
            start_pos = match.start()
            # Find the matching closing brace
            brace_count = 0
            in_string = False
            string_char = None
            end_pos = start_pos
            
            for i, char in enumerate(content[start_pos:], start_pos):
                if char in '"\'`' and (i == start_pos or content[i-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_pos = i + 1
                            break
                
                # Safety limit
                if i - start_pos > 500000:
                    break
            
            if end_pos > start_pos:
                return (start_pos, end_pos, content[start_pos:end_pos])
    
    return (None, None, None)

def find_prototype_methods(content: str, class_name: str) -> list:
    """Find all prototype method definitions"""
    pattern = rf'{class_name}\.prototype\.(\w+)\s*=\s*function'
    methods = []
    
    for match in re.finditer(pattern, content):
        method_name = match.group(1)
        start_pos = match.start()
        
        # Find the function body
        func_start = content.find('function', start_pos)
        if func_start == -1:
            continue
            
        brace_start = content.find('{', func_start)
        if brace_start == -1:
            continue
        
        brace_count = 1
        end_pos = brace_start + 1
        
        for i, char in enumerate(content[brace_start+1:], brace_start+1):
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i + 1
                    break
            if i - brace_start > 100000:
                break
        
        methods.append({
            "name": method_name,
            "code": content[start_pos:end_pos]
        })
    
    return methods

def extract_subsystem(content: str, subsystem: dict) -> dict:
    """Extract a complete subsystem from monolith"""
    name = subsystem["name"]
    result = {
        "name": name,
        "category": subsystem["category"],
        "refs": subsystem["refs"],
        "status": "NOT_FOUND",
        "code": "",
        "methods": [],
        "lines": 0
    }
    
    # Find main class/object definition
    start, end, code = find_class_definition(content, name)
    
    if code:
        result["code"] = code
        result["status"] = "FOUND"
        result["lines"] = code.count('\n') + 1
        
        # Find prototype methods
        methods = find_prototype_methods(content, name)
        result["methods"] = methods
        
        # Append prototype methods to code
        for method in methods:
            result["code"] += "\n\n" + method["code"]
            result["lines"] += method["code"].count('\n') + 1
    
    return result

def save_extraction(result: dict) -> str:
    """Save extracted code to file"""
    if result["status"] != "FOUND" or not result["code"]:
        return None
    
    category = result["category"]
    output_dir = os.path.join(OUTPUT_PATH, category)
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"{result['name']}.js"
    filepath = os.path.join(output_dir, filename)
    
    header = f"""/**
 * {result['name']}
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: {result['refs']}
 * Lines extracted: {result['lines']}
 * Prototype methods: {len(result['methods'])}
 * Session: R2.0.2
 */

"""
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(header + result["code"])
    
    return filepath

def main():
    print("=" * 70)
    print("PRISM DIRECT MONOLITH EXTRACTION - Session R2.0.2")
    print("=" * 70)
    print(f"\nSubsystems to extract: {len(PRIORITY_SUBSYSTEMS)}")
    print(f"Monolith: {MONOLITH_PATH}")
    
    # Load monolith
    print("\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters ({len(content)/1024/1024:.1f} MB)")
    
    # Extract each subsystem
    results = []
    success_count = 0
    failed_count = 0
    total_lines = 0
    
    print("\n" + "-" * 70)
    print("EXTRACTING SUBSYSTEMS:")
    print("-" * 70)
    
    for i, subsystem in enumerate(PRIORITY_SUBSYSTEMS, 1):
        print(f"\n[{i:2}/{len(PRIORITY_SUBSYSTEMS)}] {subsystem['name']}...", end=" ")
        
        result = extract_subsystem(content, subsystem)
        results.append(result)
        
        if result["status"] == "FOUND":
            filepath = save_extraction(result)
            if filepath:
                print(f"OK - {result['lines']} lines, {len(result['methods'])} methods")
                success_count += 1
                total_lines += result["lines"]
            else:
                print("FAILED - Save error")
                failed_count += 1
        else:
            print("NOT FOUND")
            failed_count += 1
    
    # Generate report
    report = {
        "session": "R2.0.2",
        "ralphIteration": 1,
        "timestamp": "2026-01-31T19:50:00Z",
        "summary": {
            "attempted": len(PRIORITY_SUBSYSTEMS),
            "successful": success_count,
            "failed": failed_count,
            "total_lines": total_lines
        },
        "results": results
    }
    
    report_path = os.path.join(AUDIT_PATH, "extraction_report_r2_0_2.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE - RALPH ITERATION 1")
    print("=" * 70)
    print(f"\n[SUCCESS] Extracted: {success_count}")
    print(f"[FAILED]  Not found: {failed_count}")
    print(f"Total lines:  {total_lines:,}")
    print(f"\nReport: {report_path}")
    
    # List failed extractions
    if failed_count > 0:
        print("\n" + "-" * 70)
        print("FAILED EXTRACTIONS (need manual/API extraction):")
        print("-" * 70)
        for r in results:
            if r["status"] != "FOUND":
                print(f"  - {r['name']} ({r['refs']} refs)")
    
    return report

if __name__ == "__main__":
    main()
