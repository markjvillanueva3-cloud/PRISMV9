#!/usr/bin/env python3
"""
PRISM Algorithm Extraction - Wave 2: Remaining algorithms
"""

import asyncio
import json
import os
import re
from anthropic import AsyncAnthropic

API_KEY = "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"
MODEL = "claude-sonnet-4-20250514"

MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED\algorithms"

# Remaining algorithm modules
REMAINING_ALGORITHMS = [
    {"name": "PRISM_UNIVERSITY_ALGORITHM_PACK", "refs": 33, "category": "university"},
    {"name": "PRISM_GRAPHICS", "refs": 25, "category": "graphics"},
    {"name": "PRISM_GRAPHICS_KERNEL_PASS", "refs": 23, "category": "graphics"},
    {"name": "PRISM_GRAPHICS_MIT", "refs": 22, "category": "graphics"},
    {"name": "PRISM_SEARCH_ENHANCED", "refs": 16, "category": "search"},
    {"name": "PRISM_GRAPH", "refs": 14, "category": "graph"},
    {"name": "PRISM_NUMERICAL", "refs": 13, "category": "numerical"},
    {"name": "PRISM_MANUFACTURING_SEARCH_ENGINE", "refs": 13, "category": "manufacturing"},
    {"name": "PRISM_NURBS_MIT", "refs": 12, "category": "cad"},
    {"name": "PRISM_BEZIER_MIT", "refs": 11, "category": "cad"},
    {"name": "PRISM_MANUFACTURING_SEARCH", "refs": 9, "category": "manufacturing"},
    {"name": "PRISM_MEMORY_EFFICIENT_SEARCH", "refs": 9, "category": "search"},
    {"name": "PRISM_GRAPH_TOOLPATH", "refs": 8, "category": "cam"},
    {"name": "PRISM_CONTROL_SYSTEMS_MIT", "refs": 8, "category": "control"},
    {"name": "PRISM_LINALG_MIT", "refs": 8, "category": "math"},
    {"name": "PRISM_DIGITAL_CONTROL_MIT", "refs": 8, "category": "control"},
    {"name": "PRISM_DFM_MIT", "refs": 7, "category": "manufacturing"},
    {"name": "PRISM_SURFACE_GEOMETRY_MIT", "refs": 7, "category": "cad"},
]

def find_definition(content: str, name: str) -> str:
    """Find and extract complete definition"""
    patterns = [
        rf'(class\s+{name}\s*(?:extends\s+\w+)?\s*\{{)',
        rf'(const\s+{name}\s*=\s*\{{)',
        rf'(const\s+{name}\s*=\s*class\s*\{{)',
        rf'(let\s+{name}\s*=\s*\{{)',
        rf'(var\s+{name}\s*=\s*\{{)',
        rf'({name}\s*=\s*\{{)',
        rf'(window\.{name}\s*=\s*\{{)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            start_pos = match.start()
            brace_pos = content.find('{', start_pos)
            
            if brace_pos == -1 or brace_pos - start_pos > 300:
                continue
            
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
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_pos = i + 1
                            break
                
                if i - brace_pos > 500000:
                    break
            
            if end_pos > brace_pos + 100:
                return content[start_pos:end_pos]
    
    return None

def get_context(content: str, name: str, size: int = 25000) -> str:
    """Get context around a name"""
    match = re.search(name, content)
    if match:
        start = max(0, match.start() - size)
        end = min(len(content), match.end() + size)
        return content[start:end]
    return None

async def extract_with_api(client, name: str, context: str) -> str:
    """Use API to extract when regex fails"""
    prompt = f"""Extract the COMPLETE JavaScript definition of `{name}` from this code.

Look for patterns like:
- class {name} {{ ... }}
- const {name} = {{ ... }}
- {name} = {{ ... }}

Return ONLY valid JavaScript code. No explanations. If you cannot find it, return "NOT_FOUND".

Code context:
{context[:30000]}

Extract `{name}`:"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=16384,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        
        if "NOT_FOUND" in code or len(code) < 50:
            return None
        
        if code.startswith("```"):
            lines = code.split('\n')
            code = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        return code if len(code) > 50 else None
    except Exception as e:
        print(f"API error: {e}")
        return None

async def extract_single(module: dict, content: str, client, idx: int, total: int) -> dict:
    """Extract a single module"""
    name = module["name"]
    category = module["category"]
    refs = module["refs"]
    
    print(f"[{idx:2}/{total}] {name} ({refs} refs)...", end=" ", flush=True)
    
    # Try direct extraction
    code = find_definition(content, name)
    
    if code and len(code) > 100:
        lines = code.count('\n') + 1
        print(f"Direct: {lines} lines")
    else:
        # Try API
        context = get_context(content, name)
        if context:
            code = await extract_with_api(client, name, context)
            if code:
                lines = code.count('\n') + 1
                print(f"API: {lines} lines")
            else:
                print(f"FAILED")
                return {"name": name, "status": "FAILED"}
        else:
            print(f"No context")
            return {"name": name, "status": "NO_CONTEXT"}
    
    # Save
    os.makedirs(OUTPUT_PATH, exist_ok=True)
    
    filepath = os.path.join(OUTPUT_PATH, f"{name}.js")
    lines = code.count('\n') + 1
    
    header = f'''/**
 * {name}
 * Extracted from PRISM v8.89.002 monolith
 * References: {refs}
 * Category: {category}
 * Lines: {lines}
 * Session: R2.3.3 Algorithm Extraction Wave 2
 */

'''
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(header + code)
    
    return {
        "name": name,
        "status": "SUCCESS",
        "lines": lines,
        "category": category,
        "path": filepath
    }

async def main():
    print("=" * 70)
    print("PRISM ALGORITHM EXTRACTION - WAVE 2 (REMAINING)")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(REMAINING_ALGORITHMS)} remaining algorithm modules...")
    print("-" * 70)
    
    results = []
    for i, module in enumerate(REMAINING_ALGORITHMS, 1):
        result = await extract_single(module, content, client, i, len(REMAINING_ALGORITHMS))
        results.append(result)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("ALGORITHM EXTRACTION WAVE 2 COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}")
    
    # Save report
    report = {
        "session": "R2.3.3-ALGORITHMS-WAVE2",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\algorithm_extraction_wave2.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
