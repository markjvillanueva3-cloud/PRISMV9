#!/usr/bin/env python3
"""
PRISM Fallback Extraction - Session R2.0.2 Ralph Iteration 2
Extract failed subsystems with alternative patterns
"""

import re
import os
import json
from pathlib import Path

MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

# Failed from iteration 1
FAILED_SUBSYSTEMS = [
    {"name": "PRISM_RIGID_BODY_DYNAMICS_ENGINE", "category": "engines", "refs": 311},
    {"name": "PRISM_MASTER", "category": "core", "refs": 366},
    {"name": "PRISM_ENHANCEMENTS", "category": "core", "refs": 100},
    {"name": "PRISM_AI_AUTO_CAM", "category": "engines/ai_ml", "refs": 160},
    {"name": "PRISM_PHASE6_DEEPLEARNING", "category": "engines/ai_ml", "refs": 39},
    {"name": "PRISM_UNIT_SYSTEM", "category": "units", "refs": 99},
    {"name": "PRISM_PARAM_ENGINE", "category": "core", "refs": 45},
]

def find_all_occurrences(content: str, name: str) -> list:
    """Find all occurrences of a subsystem name and surrounding context"""
    occurrences = []
    
    # Find all matches
    for match in re.finditer(rf'{name}', content):
        start = max(0, match.start() - 200)
        end = min(len(content), match.end() + 500)
        context = content[start:end]
        
        # Check if this looks like a definition
        if any(pattern in context for pattern in [
            f'class {name}',
            f'const {name}',
            f'let {name}',
            f'var {name}',
            f'function {name}',
            f'{name} =',
            f'{name}:',
        ]):
            occurrences.append({
                "pos": match.start(),
                "context": context,
                "line": content[:match.start()].count('\n') + 1
            })
    
    return occurrences

def extract_object_literal(content: str, start_pos: int) -> str:
    """Extract an object literal starting from a position"""
    # Find the opening brace
    brace_pos = content.find('{', start_pos)
    if brace_pos == -1 or brace_pos - start_pos > 100:
        return None
    
    brace_count = 1
    end_pos = brace_pos + 1
    in_string = False
    string_char = None
    
    for i, char in enumerate(content[brace_pos+1:], brace_pos+1):
        if char in '"\'`' and (i == brace_pos+1 or content[i-1] != '\\'):
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
        
        if i - brace_pos > 200000:
            break
    
    if end_pos > brace_pos:
        return content[start_pos:end_pos]
    return None

def search_and_extract(content: str, name: str) -> tuple:
    """Search for subsystem with multiple patterns and extract"""
    
    # Pattern variations
    patterns = [
        # Standard patterns
        rf'(class\s+{name}\s*(?:extends\s+\w+)?\s*\{{)',
        rf'(const\s+{name}\s*=\s*\{{)',
        rf'(let\s+{name}\s*=\s*\{{)',
        rf'(var\s+{name}\s*=\s*\{{)',
        rf'(const\s+{name}\s*=\s*class\s*\{{)',
        rf'(const\s+{name}\s*=\s*function)',
        rf'(function\s+{name}\s*\()',
        
        # Property assignment patterns (common in monolith)
        rf'({name}\s*:\s*\{{)',
        rf'("{name}"\s*:\s*\{{)',
        rf"('{name}'\s*:\s*\{{)",
        
        # Window/global patterns
        rf'(window\.{name}\s*=\s*\{{)',
        rf'(window\["{name}"\]\s*=)',
        
        # Module patterns
        rf'(export\s+(?:default\s+)?class\s+{name})',
        rf'(export\s+const\s+{name})',
        
        # IIFE patterns
        rf'({name}\s*=\s*\(function)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            code = extract_object_literal(content, match.start())
            if code and len(code) > 50:
                return (match.start(), code)
    
    # Last resort: find any assignment with the name
    simple_pattern = rf'{name}\s*=\s*\{{'
    match = re.search(simple_pattern, content)
    if match:
        code = extract_object_literal(content, match.start())
        if code:
            return (match.start(), code)
    
    return (None, None)

def main():
    print("=" * 70)
    print("PRISM FALLBACK EXTRACTION - Session R2.0.2 Ralph Iteration 2")
    print("=" * 70)
    print(f"\nFailed subsystems to retry: {len(FAILED_SUBSYSTEMS)}")
    
    # Load monolith
    print("\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    results = []
    success_count = 0
    
    print("\n" + "-" * 70)
    print("RETRYING FAILED EXTRACTIONS:")
    print("-" * 70)
    
    for subsystem in FAILED_SUBSYSTEMS:
        name = subsystem["name"]
        print(f"\n{name}...")
        
        # Find all occurrences first
        occurrences = find_all_occurrences(content, name)
        print(f"  Found {len(occurrences)} occurrences")
        
        # Try extraction
        pos, code = search_and_extract(content, name)
        
        if code:
            lines = code.count('\n') + 1
            print(f"  EXTRACTED: {lines} lines")
            
            # Save
            category = subsystem["category"]
            output_dir = os.path.join(OUTPUT_PATH, category)
            os.makedirs(output_dir, exist_ok=True)
            
            filepath = os.path.join(output_dir, f"{name}.js")
            header = f"""/**
 * {name}
 * Extracted from PRISM v8.89.002 monolith (fallback extraction)
 * References: {subsystem['refs']}
 * Lines: {lines}
 * Session: R2.0.2 Ralph Iteration 2
 */

"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + code)
            
            results.append({
                "name": name,
                "status": "FOUND",
                "lines": lines,
                "path": filepath
            })
            success_count += 1
        else:
            print(f"  STILL NOT FOUND - may need manual extraction")
            
            # Print sample occurrences for debugging
            if occurrences:
                print(f"  Sample context from occurrence 1:")
                sample = occurrences[0]["context"][:200].replace('\n', ' ')
                print(f"    ...{sample}...")
            
            results.append({
                "name": name,
                "status": "NOT_FOUND",
                "occurrences": len(occurrences),
                "sample_lines": [o["line"] for o in occurrences[:5]]
            })
    
    print("\n" + "=" * 70)
    print("FALLBACK EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nRecovered: {success_count}/{len(FAILED_SUBSYSTEMS)}")
    
    # Save report
    report = {
        "session": "R2.0.2",
        "ralphIteration": 2,
        "attempted": len(FAILED_SUBSYSTEMS),
        "recovered": success_count,
        "results": results
    }
    
    report_path = os.path.join(AUDIT_PATH, "extraction_fallback_r2_0_2.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")
    
    return results

if __name__ == "__main__":
    main()
