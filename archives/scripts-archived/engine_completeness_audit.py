#!/usr/bin/env python3
"""
PRISM Engine Completeness Audit
Check all sources for engines we might have missed
"""

import os
import re
import json
from collections import defaultdict

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"
SKILLS_PATH = r"C:\PRISM\skills-consolidated"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

def scan_monolith_for_engines():
    """Find ALL engine references in monolith"""
    print("Scanning monolith for ENGINE patterns...")
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Find all PRISM_*_ENGINE patterns
    engine_pattern = r'PRISM_[A-Z][A-Z0-9_]*ENGINE[A-Z0-9_]*'
    engines = defaultdict(int)
    
    for match in re.finditer(engine_pattern, content):
        engines[match.group()] += 1
    
    # Also find other engine-like patterns
    other_patterns = [
        r'PRISM_[A-Z][A-Z0-9_]*_OPTIMIZER',
        r'PRISM_[A-Z][A-Z0-9_]*_CALCULATOR',
        r'PRISM_[A-Z][A-Z0-9_]*_PROCESSOR',
        r'PRISM_[A-Z][A-Z0-9_]*_GENERATOR',
        r'PRISM_[A-Z][A-Z0-9_]*_ANALYZER',
        r'PRISM_[A-Z][A-Z0-9_]*_PREDICTOR',
        r'PRISM_[A-Z][A-Z0-9_]*_SIMULATOR',
        r'PRISM_[A-Z][A-Z0-9_]*_SOLVER',
        r'PRISM_[A-Z][A-Z0-9_]*_SYSTEM',
        r'PRISM_[A-Z][A-Z0-9_]*_CORE',
        r'PRISM_[A-Z][A-Z0-9_]*_LIBRARY',
        r'PRISM_[A-Z][A-Z0-9_]*_MODULE',
    ]
    
    for pattern in other_patterns:
        for match in re.finditer(pattern, content):
            name = match.group()
            if name not in engines:
                engines[name] += 1
            else:
                engines[name] += 1
    
    print(f"  Found {len(engines)} engine-like subsystems in monolith")
    return dict(engines)

def scan_extracted_engines():
    """Scan what we have extracted"""
    print("\nScanning extracted engines...")
    
    extracted = {}
    engines_path = os.path.join(EXTRACTED_PATH, "engines")
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                name = file.replace('.js', '')
                
                # Check if it's an engine
                if 'ENGINE' in name.upper() or any(x in name.upper() for x in 
                    ['OPTIMIZER', 'CALCULATOR', 'PROCESSOR', 'GENERATOR', 'ANALYZER', 
                     'PREDICTOR', 'SIMULATOR', 'SOLVER', 'SYSTEM', 'CORE', 'LIBRARY']):
                    
                    try:
                        size = os.path.getsize(filepath)
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                        
                        rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                        extracted[name] = {
                            "path": rel_path,
                            "lines": lines,
                            "size": size
                        }
                    except:
                        pass
    
    print(f"  Found {len(extracted)} extracted engine files")
    return extracted

def scan_all_extracted_prism_names():
    """Get ALL PRISM_ names from extracted files"""
    print("\nScanning all PRISM_ names in extracted files...")
    
    all_names = set()
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        if 'backup' in root.lower():
            continue
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    names = set(re.findall(r'PRISM_[A-Z][A-Z0-9_]*', content))
                    all_names.update(names)
                except:
                    pass
    
    print(f"  Found {len(all_names)} unique PRISM_ names in extracted files")
    return all_names

def compare_and_identify_gaps(monolith_engines, extracted_engines, all_extracted_names):
    """Compare and find gaps"""
    print("\nComparing sources...")
    
    # Filter monolith engines by significance (>=5 refs)
    significant_engines = {k: v for k, v in monolith_engines.items() if v >= 5}
    
    extracted_names_upper = {name.upper() for name in extracted_engines.keys()}
    all_names_upper = {name.upper() for name in all_extracted_names}
    
    gaps = {
        "not_extracted_file": [],  # No dedicated file
        "not_in_any_extracted": [], # Not even referenced
        "extracted_but_small": []   # Has file but tiny
    }
    
    for engine, refs in sorted(significant_engines.items(), key=lambda x: -x[1]):
        engine_upper = engine.upper()
        
        # Check if we have a dedicated file
        has_file = any(engine_upper in name.upper() for name in extracted_engines.keys())
        
        # Check if it's referenced in any extracted file
        in_extracted = engine in all_extracted_names
        
        if not has_file and not in_extracted:
            gaps["not_in_any_extracted"].append({"name": engine, "refs": refs})
        elif not has_file and in_extracted:
            gaps["not_extracted_file"].append({"name": engine, "refs": refs})
    
    # Check for tiny files
    for name, info in extracted_engines.items():
        if info["lines"] < 20:
            gaps["extracted_but_small"].append({
                "name": name,
                "lines": info["lines"],
                "path": info["path"]
            })
    
    return gaps, significant_engines

def main():
    os.makedirs(AUDIT_PATH, exist_ok=True)
    
    print("=" * 70)
    print("PRISM ENGINE COMPLETENESS AUDIT")
    print("=" * 70)
    
    # Scan all sources
    monolith_engines = scan_monolith_for_engines()
    extracted_engines = scan_extracted_engines()
    all_extracted_names = scan_all_extracted_prism_names()
    
    # Compare
    gaps, significant = compare_and_identify_gaps(monolith_engines, extracted_engines, all_extracted_names)
    
    # Report
    print("\n" + "=" * 70)
    print("AUDIT RESULTS")
    print("=" * 70)
    
    print(f"\nMONOLITH:")
    print(f"  Total engine-like subsystems: {len(monolith_engines)}")
    print(f"  Significant (>=5 refs): {len(significant)}")
    
    print(f"\nEXTRACTED:")
    print(f"  Engine files: {len(extracted_engines)}")
    print(f"  Total PRISM_ names covered: {len(all_extracted_names)}")
    
    print(f"\nGAPS:")
    print(f"  Not in any extracted file: {len(gaps['not_in_any_extracted'])}")
    print(f"  Referenced but no dedicated file: {len(gaps['not_extracted_file'])}")
    print(f"  Extracted but tiny (<20 lines): {len(gaps['extracted_but_small'])}")
    
    if gaps['not_in_any_extracted']:
        print(f"\n" + "-" * 70)
        print("CRITICAL: NOT EXTRACTED AT ALL (need extraction)")
        print("-" * 70)
        for item in gaps['not_in_any_extracted'][:30]:
            print(f"  {item['name']}: {item['refs']} refs")
    
    if gaps['not_extracted_file']:
        print(f"\n" + "-" * 70)
        print("REFERENCED BUT NO DEDICATED FILE (may need separate extraction)")
        print("-" * 70)
        for item in gaps['not_extracted_file'][:20]:
            print(f"  {item['name']}: {item['refs']} refs")
    
    if gaps['extracted_but_small']:
        print(f"\n" + "-" * 70)
        print("TINY FILES (may need re-extraction)")
        print("-" * 70)
        for item in gaps['extracted_but_small'][:15]:
            print(f"  {item['name']}: {item['lines']} lines @ {item['path']}")
    
    # Top monolith engines by refs
    print(f"\n" + "-" * 70)
    print("TOP 30 ENGINES IN MONOLITH BY REFERENCE COUNT")
    print("-" * 70)
    for engine, refs in sorted(monolith_engines.items(), key=lambda x: -x[1])[:30]:
        status = "EXTRACTED" if engine in all_extracted_names else "MISSING"
        print(f"  {engine}: {refs} refs [{status}]")
    
    # Save report
    report = {
        "monolith_engines": len(monolith_engines),
        "significant_engines": len(significant),
        "extracted_engine_files": len(extracted_engines),
        "all_prism_names_covered": len(all_extracted_names),
        "gaps": {
            "not_in_any_extracted": gaps['not_in_any_extracted'],
            "not_extracted_file": gaps['not_extracted_file'][:50],
            "extracted_but_small": gaps['extracted_but_small']
        },
        "top_engines": [{"name": k, "refs": v} for k, v in sorted(monolith_engines.items(), key=lambda x: -x[1])[:50]]
    }
    
    report_path = os.path.join(AUDIT_PATH, "engine_completeness_audit.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport saved to: {report_path}")
    
    return gaps

if __name__ == "__main__":
    main()
