#!/usr/bin/env python3
"""
PRISM Algorithm Extraction - Critical algorithm modules
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

# Missing algorithm modules
ALGORITHM_MODULES = [
    {"name": "PRISM_MANUFACTURING_ALGORITHMS", "refs": 42, "category": "manufacturing"},
    {"name": "PRISM_OPTIMIZATION_ALGORITHMS", "refs": 40, "category": "optimization"},
    {"name": "PRISM_ALGORITHM_ORCHESTRATOR", "refs": 40, "category": "core"},
    {"name": "PRISM_SIGNAL_ALGORITHMS", "refs": 38, "category": "signal"},
    {"name": "PRISM_ALGORITHM_REGISTRY", "refs": 38, "category": "core"},
    {"name": "PRISM_UNIVERSITY_ALGORITHM_PACK_", "refs": 33, "category": "university"},
    {"name": "PRISM_ALGORITHM_ENSEMBLER", "refs": 30, "category": "ai_ml"},
    {"name": "PRISM_CORE_ALGORITHMS", "refs": 28, "category": "core"},
    {"name": "PRISM_GRAPH_ALGORITHMS", "refs": 24, "category": "graph"},
    {"name": "PRISM_RL_ALGORITHMS", "refs": 22, "category": "ai_ml"},
    {"name": "PRISM_MATH_FOUNDATIONS", "refs": 21, "category": "math"},
    {"name": "PRISM_ALGORITHM_STRATEGIES", "refs": 20, "category": "core"},
    {"name": "PRISM_LOCAL_SEARCH", "refs": 17, "category": "optimization"},
    {"name": "PRISM_CRITICAL_ALGORITHM_INTEGRATION", "refs": 16, "category": "integration"},
    {"name": "PRISM_LP_SOLVERS", "refs": 11, "category": "optimization"},
    {"name": "PRISM_SORTING", "refs": 11, "category": "data_structures"},
    {"name": "PRISM_DS_SEARCH", "refs": 11, "category": "data_structures"},
    {"name": "PRISM_ODE_SOLVERS_MIT", "refs": 9, "category": "numerical"},
    {"name": "PRISM_NUMERICAL_METHODS_MIT", "refs": 8, "category": "numerical"},
    {"name": "PRISM_SPECTRAL_GRAPH_CAD", "refs": 12, "category": "graph"},
    {"name": "PRISM_KDTREE_", "refs": 9, "category": "data_structures"},
    {"name": "PRISM_OCTREE_", "refs": 7, "category": "data_structures"},
]

def find_definition(content: str, name: str) -> str:
    """Find and extract complete definition"""
    # Handle names ending with underscore (partial match)
    if name.endswith('_'):
        # Find full name first
        pattern = rf'({name}[A-Z0-9_]*)\s*='
        match = re.search(pattern, content)
        if match:
            name = match.group(1)
    
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

def get_context(content: str, name: str, size: int = 20000) -> str:
    """Get context around a name"""
    # Handle partial names
    search_name = name.rstrip('_')
    match = re.search(search_name, content)
    if match:
        start = max(0, match.start() - size)
        end = min(len(content), match.end() + size)
        return content[start:end]
    return None

async def extract_with_api(client, name: str, context: str) -> str:
    """Use API to extract when regex fails"""
    search_name = name.rstrip('_')
    
    prompt = f"""Extract the COMPLETE JavaScript definition that contains `{search_name}` from this code.

Look for patterns like:
- class {search_name}... {{ ... }}
- const {search_name}... = {{ ... }}
- {search_name}... = {{ ... }}

Return ONLY valid JavaScript code. No explanations. If you cannot find it, return "NOT_FOUND".

Code context:
{context[:30000]}

Extract the definition:"""

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
    
    # Clean name for filename
    clean_name = name.rstrip('_')
    filepath = os.path.join(OUTPUT_PATH, f"{clean_name}.js")
    lines = code.count('\n') + 1
    
    header = f'''/**
 * {clean_name}
 * Extracted from PRISM v8.89.002 monolith
 * References: {refs}
 * Category: {category}
 * Lines: {lines}
 * Session: R2.3.2 Algorithm Extraction
 */

'''
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(header + code)
    
    return {
        "name": clean_name,
        "status": "SUCCESS",
        "lines": lines,
        "category": category,
        "path": filepath
    }

async def main():
    print("=" * 70)
    print("PRISM ALGORITHM EXTRACTION")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(ALGORITHM_MODULES)} algorithm modules...")
    print("-" * 70)
    
    results = []
    for i, module in enumerate(ALGORITHM_MODULES, 1):
        result = await extract_single(module, content, client, i, len(ALGORITHM_MODULES))
        results.append(result)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("ALGORITHM EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}")
    
    # Save report
    report = {
        "session": "R2.3.2-ALGORITHMS",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\algorithm_extraction.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
