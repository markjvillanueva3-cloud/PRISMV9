#!/usr/bin/env python3
"""
PRISM Engine Audit - Verify all engines from all sources
"""

import os
import re
import json
from collections import defaultdict

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"
SKILLS_PATH = r"C:\PRISM\skills-consolidated"
REGISTRY_PATH = r"C:\PRISM\registries\RESOURCE_REGISTRY.json"

def scan_monolith_engines():
    """Find all ENGINE references in monolith"""
    print("Scanning monolith for ENGINE patterns...")
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    engines = defaultdict(int)
    
    # Pattern 1: PRISM_*_ENGINE
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*ENGINE[A-Z0-9_]*', content):
        engines[match.group()] += 1
    
    # Pattern 2: PRISM_*Engine (camelCase)
    for match in re.finditer(r'PRISM_[A-Za-z0-9_]*Engine', content):
        engines[match.group()] += 1
    
    # Pattern 3: class *Engine
    for match in re.finditer(r'class\s+([A-Z][A-Za-z0-9]*Engine)\s*(?:extends|\{)', content):
        engines[match.group(1)] += 1
    
    # Pattern 4: const *_ENGINE = 
    for match in re.finditer(r'const\s+([A-Z][A-Z0-9_]*_ENGINE)\s*=', content):
        engines[match.group(1)] += 1
    
    # Pattern 5: PRISM_*_OPTIMIZER
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*OPTIM[A-Z0-9_]*', content):
        engines[match.group()] += 1
    
    # Pattern 6: PRISM_*_SYSTEM
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*SYSTEM', content):
        engines[match.group()] += 1
    
    # Pattern 7: PRISM_*_CALCULATOR
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*CALCULATOR', content):
        engines[match.group()] += 1
    
    # Pattern 8: PRISM_*_GENERATOR
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*GENERATOR', content):
        engines[match.group()] += 1
    
    # Pattern 9: PRISM_*_PREDICTOR
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*PREDICTOR', content):
        engines[match.group()] += 1
    
    # Pattern 10: PRISM_*_ANALYZER
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*ANALYZ[A-Z0-9_]*', content):
        engines[match.group()] += 1
    
    # Pattern 11: PRISM_*_PROCESSOR
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*PROCESSOR', content):
        engines[match.group()] += 1
    
    # Pattern 12: PRISM_*_DETECTOR
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*DETECTOR', content):
        engines[match.group()] += 1
    
    # Pattern 13: PRISM_*_SOLVER
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*SOLVER', content):
        engines[match.group()] += 1
    
    # Pattern 14: PRISM_*_MANAGER
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*MANAGER', content):
        engines[match.group()] += 1
        
    print(f"  Found {len(engines)} unique engine-like patterns")
    return dict(engines)

def scan_extracted_engines():
    """Scan all extracted engine files"""
    print("\nScanning extracted engines...")
    
    extracted = {}
    engines_path = os.path.join(EXTRACTED_PATH, "engines")
    
    if not os.path.exists(engines_path):
        print("  No engines directory found!")
        return extracted
    
    for root, dirs, files in os.walk(engines_path):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                
                try:
                    size = os.path.getsize(filepath)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        lines = len(content.split('\n'))
                    
                    name = file.replace('.js', '')
                    extracted[name] = {
                        "path": rel_path,
                        "lines": lines,
                        "size": size
                    }
                except:
                    pass
    
    print(f"  Found {len(extracted)} extracted engine files")
    return extracted

def scan_all_extracted():
    """Scan ALL extracted files for engine-like subsystems"""
    print("\nScanning ALL extracted directories...")
    
    all_engines = {}
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        if 'backup' in root.lower():
            continue
        
        for file in files:
            if file.endswith('.js'):
                name = file.replace('.js', '')
                
                # Check if it looks like an engine
                is_engine = any(x in name.upper() for x in [
                    'ENGINE', 'OPTIM', 'SYSTEM', 'CALCULATOR', 'GENERATOR',
                    'PREDICTOR', 'ANALYZER', 'PROCESSOR', 'DETECTOR', 'SOLVER',
                    'MANAGER', 'CONTROLLER', 'HANDLER', 'CONVERTER'
                ])
                
                if is_engine:
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.read().split('\n'))
                        
                        all_engines[name] = {
                            "path": rel_path,
                            "lines": lines
                        }
                    except:
                        pass
    
    print(f"  Found {len(all_engines)} engine-like files across all directories")
    return all_engines

def scan_registry():
    """Check what's in the registry"""
    print("\nChecking RESOURCE_REGISTRY...")
    
    with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
        registry = json.load(f)
    
    engines = registry["resources"].get("engines", [])
    print(f"  Registry has {len(engines)} engines")
    return {e["name"]: e for e in engines}

def main():
    print("=" * 70)
    print("PRISM ENGINE AUDIT - All Sources")
    print("=" * 70)
    
    # Scan all sources
    monolith_engines = scan_monolith_engines()
    extracted_engines = scan_extracted_engines()
    all_extracted = scan_all_extracted()
    registry_engines = scan_registry()
    
    # Filter monolith to significant engines (>= 5 refs)
    significant_monolith = {k: v for k, v in monolith_engines.items() if v >= 5}
    
    print("\n" + "=" * 70)
    print("COMPARISON")
    print("=" * 70)
    
    print(f"\nMonolith engine-patterns (>=5 refs): {len(significant_monolith)}")
    print(f"Extracted in /engines folder:        {len(extracted_engines)}")
    print(f"All engine-like extracted files:     {len(all_extracted)}")
    print(f"In RESOURCE_REGISTRY:                {len(registry_engines)}")
    
    # Find gaps
    extracted_names = set(extracted_engines.keys()) | set(all_extracted.keys())
    
    gaps = []
    for name, refs in sorted(significant_monolith.items(), key=lambda x: -x[1]):
        # Check various name forms
        found = False
        name_upper = name.upper()
        
        for extracted_name in extracted_names:
            if name_upper in extracted_name.upper() or extracted_name.upper() in name_upper:
                found = True
                break
        
        if not found:
            gaps.append((name, refs))
    
    print(f"\n" + "-" * 70)
    print(f"GAPS: {len(gaps)} engine-patterns NOT in extracted files")
    print("-" * 70)
    
    # Categorize gaps
    categories = defaultdict(list)
    for name, refs in gaps:
        if 'THERMAL' in name or 'HEAT' in name:
            categories['THERMAL'].append((name, refs))
        elif 'OPTIM' in name:
            categories['OPTIMIZATION'].append((name, refs))
        elif 'AI' in name or 'ML' in name or 'NEURAL' in name or 'LEARN' in name:
            categories['AI_ML'].append((name, refs))
        elif 'CAD' in name or 'BREP' in name or 'NURBS' in name or 'GEOMETRY' in name:
            categories['CAD'].append((name, refs))
        elif 'CAM' in name or 'TOOLPATH' in name or 'MACHINING' in name:
            categories['CAM'].append((name, refs))
        elif 'POST' in name or 'GCODE' in name:
            categories['POST'].append((name, refs))
        elif 'CHATTER' in name or 'VIBRATION' in name or 'STABILITY' in name:
            categories['VIBRATION'].append((name, refs))
        elif 'SURFACE' in name or 'FINISH' in name:
            categories['SURFACE'].append((name, refs))
        elif 'FORCE' in name or 'CUTTING' in name or 'PHYSICS' in name:
            categories['PHYSICS'].append((name, refs))
        elif 'MATERIAL' in name:
            categories['MATERIALS'].append((name, refs))
        elif 'TOOL' in name:
            categories['TOOLS'].append((name, refs))
        elif 'MACHINE' in name:
            categories['MACHINES'].append((name, refs))
        else:
            categories['OTHER'].append((name, refs))
    
    for cat, items in sorted(categories.items(), key=lambda x: -sum(r for _, r in x[1])):
        total_refs = sum(r for _, r in items)
        print(f"\n{cat} ({len(items)} gaps, {total_refs} total refs):")
        for name, refs in sorted(items, key=lambda x: -x[1])[:10]:
            print(f"  {refs:4d} refs: {name}")
        if len(items) > 10:
            print(f"  ... and {len(items) - 10} more")
    
    # Save full report
    report = {
        "summary": {
            "monolith_engine_patterns": len(significant_monolith),
            "extracted_in_engines_folder": len(extracted_engines),
            "all_engine_like_extracted": len(all_extracted),
            "in_registry": len(registry_engines),
            "total_gaps": len(gaps)
        },
        "gaps_by_category": {cat: [(n, r) for n, r in items] for cat, items in categories.items()},
        "top_gaps": [(n, r) for n, r in gaps[:50]],
        "all_monolith_engines": significant_monolith,
        "all_extracted_engines": list(extracted_names)
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_audit.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n\nFull report saved to: {report_path}")
    
    return report

if __name__ == "__main__":
    main()
