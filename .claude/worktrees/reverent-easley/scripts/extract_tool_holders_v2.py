#!/usr/bin/env python3
"""
PRISM Tool Holder Database Extractor v2.0
==========================================
Improved extraction using character-based search
"""

import re
import json
import os
from pathlib import Path
from datetime import datetime, timezone
import sys

MONOLITH_PATH = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html")
OUTPUT_DIR = Path(r"C:\PRISM\data\tool_holders")

def find_js_object(content: str, marker: str, max_depth: int = 20) -> str:
    """Find a JavaScript object by marker, handling nested braces."""
    idx = content.find(marker)
    if idx == -1:
        return ""
    
    # Find the opening brace
    brace_start = content.find('{', idx)
    if brace_start == -1:
        return ""
    
    # Track braces to find matching close
    depth = 0
    in_string = False
    string_char = None
    escape_next = False
    
    for i in range(brace_start, min(brace_start + 500000, len(content))):
        char = content[i]
        
        if escape_next:
            escape_next = False
            continue
        
        if char == '\\':
            escape_next = True
            continue
        
        if char in '"\'':
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            continue
        
        if in_string:
            continue
        
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return content[brace_start:i+1]
    
    return ""


def extract_holders_from_js(js_obj: str) -> list:
    """Extract holder entries from JavaScript object string."""
    holders = []
    
    # Look for patterns like:
    # "HOLDER-ID": { ...properties... }
    # or holder entries in arrays
    
    # Pattern 1: Object properties
    pattern1 = r'["\']([\w\-]+)["\']:\s*\{\s*([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}'
    
    for match in re.finditer(pattern1, js_obj):
        holder_id = match.group(1)
        props = match.group(2)
        
        # Skip non-holder entries (like "name", "version" at root level)
        if holder_id in ['name', 'version', 'manufacturer', 'description', 'interface', 
                         'tapers', 'BCV40', 'BCV50', 'millingChucks', 'erColletChucks',
                         'statistics', 'categories']:
            continue
        
        holder = parse_holder_properties(holder_id, props)
        if holder:
            holders.append(holder)
    
    # Pattern 2: Look for arrays of holders
    array_pattern = r'holders:\s*\[(.*?)\]'
    array_match = re.search(array_pattern, js_obj, re.DOTALL)
    if array_match:
        array_content = array_match.group(1)
        # Parse individual objects in array
        obj_pattern = r'\{\s*([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}'
        for obj_match in re.finditer(obj_pattern, array_content):
            props = obj_match.group(1)
            holder = parse_holder_properties("array_holder", props)
            if holder and holder.get('catalogNumber'):
                holder['id'] = holder['catalogNumber']
                holders.append(holder)
    
    return holders


def parse_holder_properties(holder_id: str, props: str) -> dict:
    """Parse holder properties from string."""
    holder = {
        'id': holder_id,
        'source': 'monolith_v8.89',
        'extraction_date': datetime.now(timezone.utc).isoformat()
    }
    
    # Extract key-value pairs
    patterns = {
        'catalogNumber': r'catalogNumber:\s*["\']([^"\']+)["\']',
        'description': r'description:\s*["\']([^"\']+)["\']',
        'type': r'type:\s*["\']([^"\']+)["\']',
        'category': r'category:\s*["\']([^"\']+)["\']',
        'colletSystem': r'colletSystem:\s*["\']([^"\']+)["\']',
        'overallLength': r'(?:overallLength|length):\s*([\d.]+)',
        'gaugeLength': r'gaugeLength:\s*([\d.]+)',
        'bodyDiameter': r'(?:bodyDiameter|diameter):\s*([\d.]+)',
        'boreMin': r'(?:boreMin|minBore):\s*([\d.]+)',
        'boreMax': r'(?:boreMax|maxBore):\s*([\d.]+)',
        'runout': r'runout:\s*([\d.]+)',
        'maxRPM': r'maxRPM:\s*(\d+)',
        'balanceGrade': r'balanceGrade:\s*["\']([^"\']+)["\']',
        'weight': r'weight:\s*([\d.]+)',
    }
    
    for field, pattern in patterns.items():
        match = re.search(pattern, props, re.IGNORECASE)
        if match:
            value = match.group(1)
            # Convert numeric strings
            if field not in ['catalogNumber', 'description', 'type', 'category', 
                            'colletSystem', 'balanceGrade']:
                try:
                    value = float(value) if '.' in value else int(value)
                except:
                    pass
            holder[field] = value
    
    return holder if len(holder) > 3 else None


def main():
    print("=" * 60)
    print("PRISM Tool Holder Extractor v2.0")
    print("=" * 60)
    
    # Load monolith
    print(f"\n[1] Loading monolith: {MONOLITH_PATH}")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"    Loaded {len(content):,} characters")
    
    all_holders = []
    
    # Find BIG_DAISHOWA database
    print("\n[2] Searching for BIG_DAISHOWA_HOLDER_DATABASE...")
    marker = "PRISM_BIG_DAISHOWA_HOLDER_DATABASE"
    idx = content.find(marker)
    if idx != -1:
        print(f"    Found at character position: {idx:,}")
        
        # Get surrounding context (100KB)
        start = max(0, idx - 1000)
        end = min(len(content), idx + 100000)
        context = content[start:end]
        
        # Extract the database object
        db_obj = find_js_object(context, marker)
        if db_obj:
            print(f"    Extracted object: {len(db_obj):,} characters")
            
            # Save raw for debugging
            debug_file = OUTPUT_DIR / "raw_big_daishowa.js"
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            with open(debug_file, 'w', encoding='utf-8') as f:
                f.write(db_obj)
            print(f"    Saved raw to: {debug_file}")
            
            # Parse holders
            holders = extract_holders_from_js(db_obj)
            print(f"    Extracted {len(holders)} holders")
            
            for h in holders:
                h['vendor'] = 'BIG_DAISHOWA'
            all_holders.extend(holders)
    else:
        print("    NOT FOUND")
    
    # Search for TOOL_HOLDER patterns
    print("\n[3] Searching for other tool holder patterns...")
    patterns_to_search = [
        ("MASTER_TOOL_HOLDER", "master"),
        ("ToolHolderDatabase", "toolholder_db"),
        ("holderInventory", "inventory"),
        ("HOLDER_DATABASE", "holder_db"),
    ]
    
    for marker, source in patterns_to_search:
        idx = content.find(marker)
        if idx != -1:
            print(f"    Found {marker} at position {idx:,}")
            
            # Get context and extract
            start = max(0, idx - 500)
            end = min(len(content), idx + 50000)
            context = content[start:end]
            
            db_obj = find_js_object(context, marker)
            if db_obj and len(db_obj) > 100:
                holders = extract_holders_from_js(db_obj)
                if holders:
                    print(f"        Extracted {len(holders)} holders")
                    for h in holders:
                        h['vendor'] = source
                    all_holders.extend(holders)
    
    # Search for holder definitions in functions
    print("\n[4] Searching for holder definitions in code...")
    
    # Look for patterns like: holders.push({...}) or createHolder({...})
    holder_def_pattern = r'(?:holders\.push|createHolder|addHolder)\s*\(\s*\{([^}]+)\}'
    for match in re.finditer(holder_def_pattern, content):
        props = match.group(1)
        holder = parse_holder_properties("code_defined", props)
        if holder and holder.get('catalogNumber'):
            holder['id'] = holder['catalogNumber']
            holder['vendor'] = 'CODE_DEFINED'
            all_holders.append(holder)
    
    print(f"    Found {len([h for h in all_holders if h.get('vendor') == 'CODE_DEFINED'])} code-defined holders")
    
    # Deduplicate
    print("\n[5] Deduplicating...")
    seen = set()
    unique_holders = []
    for h in all_holders:
        key = f"{h.get('vendor', '')}_{h.get('catalogNumber', h.get('id', ''))}"
        if key not in seen and key != '_':
            seen.add(key)
            unique_holders.append(h)
    
    print(f"    Unique holders: {len(unique_holders)}")
    
    # Save results
    print("\n[6] Saving results...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save all holders
    output_file = OUTPUT_DIR / "extracted_holders.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'extraction_date': datetime.now(timezone.utc).isoformat(),
            'source': str(MONOLITH_PATH),
            'total_count': len(unique_holders),
            'holders': unique_holders
        }, f, indent=2)
    print(f"    Saved to: {output_file}")
    
    # Summary by vendor
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    vendors = {}
    for h in unique_holders:
        v = h.get('vendor', 'UNKNOWN')
        vendors[v] = vendors.get(v, 0) + 1
    
    for v, count in sorted(vendors.items()):
        print(f"  {v}: {count}")
    
    print(f"\nTOTAL: {len(unique_holders)} holders")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
