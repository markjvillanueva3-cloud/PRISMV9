#!/usr/bin/env python3
"""
PRISM Algorithm Gap Extraction - Fill remaining algorithm gaps
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

# Missing algorithm modules from audit
ALGORITHM_GAPS = [
    # Physics Models (high priority)
    {"name": "PRISM_JOHNSON_COOK_DATABASE", "refs": 41, "category": "physics_models"},
    {"name": "PRISM_TAYLOR_COMPLETE", "refs": 30, "category": "physics_models"},
    {"name": "PRISM_TAYLOR_TOOL_LIFE", "refs": 18, "category": "physics_models"},
    {"name": "PRISM_TAYLOR_LOOKUP", "refs": 9, "category": "physics_models"},
    {"name": "PRISM_TAYLOR_ADVANCED", "refs": 5, "category": "physics_models"},
    
    # General Algorithms
    {"name": "ALGORITHM_LIBRARY", "refs": 34, "category": "general"},
    {"name": "PRISM_CORE_ALGORITHMS", "refs": 28, "category": "general"},
    {"name": "COMPLETE_TOOLPATH_ALGORITHM_LIBRARY", "refs": 22, "category": "general"},
    
    # Education
    {"name": "PRISM_UNIVERSITY_ALGORITHM_PACK_", "refs": 33, "category": "education"},
    
    # Knowledge
    {"name": "PRISM_PHASE7_KNOWLEDGE", "refs": 31, "category": "knowledge"},
    {"name": "PRISM_AI_100_KB", "refs": 17, "category": "knowledge"},
    {"name": "PRISM_AI_DEEP_LEARNING_KNOWLEDGE_DATABASE", "refs": 5, "category": "knowledge"},
    {"name": "PRISM_KNOWLEDGE_INTEGRATION_TESTS", "refs": 5, "category": "knowledge"},
    
    # Deep Learning
    {"name": "PRISM_PHASE3_GRAPH_NEURAL", "refs": 29, "category": "deep_learning"},
    
    # Metaheuristic
    {"name": "PRISM_ACO_SEQUENCER", "refs": 24, "category": "metaheuristic"},
    {"name": "PRISM_JACOBIAN_ENGINE", "refs": 17, "category": "metaheuristic"},
    
    # Probabilistic
    {"name": "PRISM_BAYESIAN_ENGINE", "refs": 6, "category": "probabilistic"},
    
    # Other
    {"name": "PRISM_ADVANCED_INTERPOLATION", "refs": 14, "category": "numerical"},
    {"name": "PRISM_FFT_PREDICTIVE_CHATTER", "refs": 10, "category": "signal"},
    {"name": "PRISM_FFT_ENGINE", "refs": 8, "category": "signal"},
    {"name": "PRISM_POLICY_GRADIENT_ENGINE", "refs": 9, "category": "optimization"},
]

def find_definition(content: str, name: str) -> str:
    """Find and extract complete definition"""
    # Handle names ending with underscore
    if name.endswith('_'):
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

def get_context(content: str, name: str, size: int = 25000) -> str:
    """Get context around a name"""
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
{context[:35000]}

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
    
    clean_name = name.rstrip('_')
    filepath = os.path.join(OUTPUT_PATH, f"{clean_name}.js")
    lines = code.count('\n') + 1
    
    header = f'''/**
 * {clean_name}
 * Extracted from PRISM v8.89.002 monolith
 * References: {refs}
 * Category: {category}
 * Lines: {lines}
 * Session: R2.3.3 Algorithm Gap Extraction
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
    print("PRISM ALGORITHM GAP EXTRACTION")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(ALGORITHM_GAPS)} algorithm gaps...")
    print("-" * 70)
    
    results = []
    for i, module in enumerate(ALGORITHM_GAPS, 1):
        result = await extract_single(module, content, client, i, len(ALGORITHM_GAPS))
        results.append(result)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("ALGORITHM GAP EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}")
    
    # Save report
    report = {
        "session": "R2.3.3-ALGORITHM-GAPS",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\algorithm_gap_extraction.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
