#!/usr/bin/env python3
"""
PRISM Script Registry Builder - R2.5
Extracts comprehensive metadata from all scripts and wires them to MCP registry.

Session: R2.5 - Complete Script Coverage
Target: 172 scripts with full metadata
"""

import os
import json
import re
import ast
from datetime import datetime

SCRIPTS_PATH = r"C:\PRISM\scripts"
REGISTRY_PATH = r"C:\PRISM\registries\RESOURCE_REGISTRY.json"
OUTPUT_PATH = r"C:\PRISM\registries\SCRIPT_REGISTRY.json"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits\script_registry_r2_5.json"

def extract_script_metadata(script_path: str) -> dict:
    """Extract metadata from a Python script."""
    script_name = os.path.basename(script_path)
    
    with open(script_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    lines = content.split('\n')
    size_bytes = os.path.getsize(script_path)
    
    # Extract docstring
    description = ""
    try:
        tree = ast.parse(content)
        docstring = ast.get_docstring(tree)
        if docstring:
            description = docstring.split('\n')[0][:200]
    except:
        pass
    
    if not description:
        # Look for comment at top
        for line in lines[:10]:
            if line.startswith('#') and len(line) > 5:
                description = line[1:].strip()[:200]
                break
    
    # Extract functions defined
    functions = list(set(re.findall(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', content)))
    
    # Extract imports
    imports = list(set(re.findall(r'^(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)', content, re.MULTILINE)))
    
    # Determine category
    category = determine_script_category(script_name, content)
    
    # Check for CLI interface
    has_cli = 'argparse' in content or 'sys.argv' in content or 'click' in content
    
    # Check for main
    has_main = 'if __name__' in content
    
    return {
        "id": f"SCRIPT-{script_name.upper().replace('.PY', '').replace('-', '_').replace(' ', '_')}",
        "name": script_name,
        "displayName": script_name.replace('.py', '').replace('_', ' ').replace('-', ' ').title(),
        "description": description if description else f"PRISM script: {script_name}",
        "path": script_path,
        "category": category,
        "sizeBytes": size_bytes,
        "sizeKB": round(size_bytes / 1024, 1),
        "lineCount": len(lines),
        "functionCount": len(functions),
        "functions": functions[:20],
        "imports": imports[:15],
        "hasCLI": has_cli,
        "hasMain": has_main,
        "lastUpdated": datetime.now().isoformat(),
        "status": "INDEXED"
    }

def determine_script_category(name: str, content: str) -> str:
    """Determine script category."""
    name_lower = name.lower()
    content_lower = content.lower()
    
    categories = {
        'SESSION': ['session', 'gsd', 'startup', 'memory_manager'],
        'API': ['api', 'swarm', 'parallel', 'worker'],
        'EXTRACTION': ['extract', 'monolith', 'audit'],
        'REGISTRY': ['registry', 'builder', 'index'],
        'SYNC': ['sync', 'pipeline', 'master_sync'],
        'VALIDATION': ['valid', 'verify', 'check', 'test'],
        'SKILL': ['skill'],
        'ANALYSIS': ['analy', 'report', 'summary'],
    }
    
    for cat, keywords in categories.items():
        if any(kw in name_lower for kw in keywords):
            return cat
    
    return 'UTILITY'

def build_script_registry():
    """Build complete script registry."""
    scripts = []
    processed = 0
    errors = []
    
    print("=" * 70)
    print("PRISM SCRIPT REGISTRY BUILDER - R2.5")
    print("=" * 70)
    
    # Scan all scripts
    for item in sorted(os.listdir(SCRIPTS_PATH)):
        if item.endswith('.py'):
            script_path = os.path.join(SCRIPTS_PATH, item)
            try:
                metadata = extract_script_metadata(script_path)
                scripts.append(metadata)
                processed += 1
                print(f"  [{processed:3d}] {metadata['name']}: {metadata['category']} ({metadata['lineCount']} lines)")
            except Exception as e:
                errors.append({'script': item, 'error': str(e)})
                print(f"  [ERR] {item}: {e}")
    
    print()
    print(f"Processed: {processed} scripts")
    print(f"Errors: {len(errors)}")
    
    # Build registry
    registry = {
        "version": "2.5.1",
        "generatedAt": datetime.now().isoformat(),
        "session": "R2.5",
        "summary": {
            "total": len(scripts),
            "byCategory": {},
            "totalLines": sum(s['lineCount'] for s in scripts),
            "totalFunctions": sum(s['functionCount'] for s in scripts)
        },
        "scripts": scripts
    }
    
    for script in scripts:
        cat = script['category']
        registry['summary']['byCategory'][cat] = registry['summary']['byCategory'].get(cat, 0) + 1
    
    return registry, errors

def update_main_registry(script_registry):
    """Update main registry with scripts."""
    with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
        main_registry = json.load(f)
    
    main_registry['scripts'] = script_registry['scripts']
    main_registry['summary']['scripts'] = len(script_registry['scripts'])
    
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(main_registry, f, indent=2)
    
    print(f"\nUpdated {REGISTRY_PATH}")
    print(f"  Scripts: {len(script_registry['scripts'])}")

def main():
    registry, errors = build_script_registry()
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved to {OUTPUT_PATH}")
    
    audit = {
        "session": "R2.5",
        "timestamp": datetime.now().isoformat(),
        "scriptsProcessed": len(registry['scripts']),
        "errors": errors,
        "summary": registry['summary']
    }
    with open(AUDIT_PATH, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit to {AUDIT_PATH}")
    
    update_main_registry(registry)
    
    print("\n" + "=" * 70)
    print("SCRIPT REGISTRY SUMMARY")
    print("=" * 70)
    print(f"Total Scripts: {registry['summary']['total']}")
    print(f"Total Lines: {registry['summary']['totalLines']:,}")
    print(f"Total Functions: {registry['summary']['totalFunctions']}")
    print("\nBy Category:")
    for cat, count in sorted(registry['summary']['byCategory'].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")

if __name__ == "__main__":
    main()
