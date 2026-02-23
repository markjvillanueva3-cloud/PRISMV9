#!/usr/bin/env python3
"""
PRISM Engine Gap Extraction - Extract missing engines from monolith
"""

import asyncio
import json
import os
import re
from anthropic import AsyncAnthropic

API_KEY = "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"
MODEL = "claude-sonnet-4-20250514"

MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED\engines"

# Top priority engines to extract (>=20 refs)
PRIORITY_ENGINES = [
    # CAM (227 refs total)
    {"name": "PRISM_REAL_TOOLPATH_ENGINE", "refs": 104, "category": "cad_cam"},
    {"name": "PRISM_UNIFIED_TOOLPATH_DECISION_ENGINE", "refs": 36, "category": "cad_cam"},
    {"name": "PRISM_LATHE_TOOLPATH_ENGINE", "refs": 27, "category": "cad_cam"},
    {"name": "PRISM_REST_MACHINING_ENGINE", "refs": 21, "category": "cad_cam"},
    
    # AI/ML (597 refs total)
    {"name": "PRISM_UNIFIED_CAD_LEARNING_SYSTEM", "refs": 90, "category": "ai_ml"},
    {"name": "PRISM_MACHINE_3D_LEARNING_ENGINE", "refs": 87, "category": "ai_ml"},
    {"name": "PRISM_CAM_LEARNING_ENGINE", "refs": 78, "category": "ai_ml"},
    {"name": "PRISM_AI_ORCHESTRATION_ENGINE", "refs": 38, "category": "ai_ml"},
    {"name": "PRISM_PARAMETRIC_CONSTRAINT_SOLVER", "refs": 27, "category": "ai_ml"},
    {"name": "PRISM_MESH_REPAIR_ENGINE", "refs": 25, "category": "ai_ml"},
    {"name": "PRISM_AIRCUT_ELIMINATION_ENGINE", "refs": 25, "category": "ai_ml"},
    {"name": "PRISM_PIML_CHATTER_ENGINE", "refs": 25, "category": "ai_ml"},
    {"name": "PRISM_CALCULATOR_LEARNING_ENGINE", "refs": 24, "category": "ai_ml"},
    {"name": "PRISM_COMPLEX_CAD_LEARNING_ENGINE", "refs": 21, "category": "ai_ml"},
    
    # TOOLS (179 refs)
    {"name": "PRISM_TOOL_3D_GENERATOR", "refs": 95, "category": "tools"},
    {"name": "PRISM_TOOL_GENERATOR", "refs": 22, "category": "tools"},
    
    # OTHER high-value (2168 refs)
    {"name": "PRISM_NUMERICAL_ENGINE", "refs": 97, "category": "core"},
    {"name": "PRISM_EVENT_MANAGER", "refs": 69, "category": "infrastructure"},
    {"name": "PRISM_BVH_ENGINE", "refs": 57, "category": "cad_cam"},
    {"name": "PRISM_KINEMATIC_SOLVER", "refs": 54, "category": "physics"},
    {"name": "PRISM_INTELLIGENT_DECISION_ENGINE", "refs": 38, "category": "ai_ml"},
    {"name": "PRISM_QUALITY_MANAGER", "refs": 35, "category": "quality"},
    {"name": "PRISM_VORONOI_ENGINE", "refs": 33, "category": "cad_cam"},
    {"name": "PRISM_ORDER_MANAGER", "refs": 30, "category": "business"},
    {"name": "PRISM_ADAPTIVE_CLEARING_ENGINE", "refs": 26, "category": "cad_cam"},
    
    # POST (158 refs)
    {"name": "PRISM_GUARANTEED_POST_PROCESSOR", "refs": 50, "category": "post_processor"},
    {"name": "PRISM_INTERNAL_POST_ENGINE", "refs": 46, "category": "post_processor"},
    {"name": "PRISM_POST_PROCESSOR_GENERATOR", "refs": 26, "category": "post_processor"},
    
    # PHYSICS (99 refs)
    {"name": "PRISM_PHYSICS_ENGINE", "refs": 51, "category": "physics"},
    {"name": "PRISM_UNIFIED_CUTTING_ENGINE", "refs": 26, "category": "physics"},
    
    # OPTIMIZATION (218 refs)
    {"name": "PRISM_CALCULATOR_OPTIMIZER", "refs": 23, "category": "optimization"},
    {"name": "PRISM_MULTI_OBJECTIVE_OPTIMIZER", "refs": 19, "category": "optimization"},
    
    # VIBRATION (40 refs)
    {"name": "PRISM_CALCULATOR_CHATTER_ENGINE", "refs": 24, "category": "vibration"},
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
            
            # Count braces
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

def get_context(content: str, name: str, size: int = 15000) -> str:
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

Return ONLY valid JavaScript code. No explanations.

Code context:
{context[:25000]}

Extract `{name}`:"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        
        if code.startswith("```"):
            lines = code.split('\n')
            code = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        return code if len(code) > 50 else None
    except Exception as e:
        print(f"    API error: {e}")
        return None

async def extract_batch(engines: list, content: str, client) -> list:
    """Extract a batch of engines"""
    results = []
    
    for i, engine in enumerate(engines, 1):
        name = engine["name"]
        category = engine["category"]
        refs = engine["refs"]
        
        print(f"\n[{i:2}/{len(engines)}] {name} ({refs} refs)...")
        
        # Try direct extraction
        code = find_definition(content, name)
        
        if code and len(code) > 100:
            lines = code.count('\n') + 1
            print(f"    Direct: {lines} lines")
        else:
            # Try API
            context = get_context(content, name)
            if context:
                code = await extract_with_api(client, name, context)
                if code:
                    lines = code.count('\n') + 1
                    print(f"    API: {lines} lines")
                else:
                    print(f"    FAILED")
                    results.append({"name": name, "status": "FAILED"})
                    continue
            else:
                print(f"    No context found")
                results.append({"name": name, "status": "NO_CONTEXT"})
                continue
        
        # Save
        output_dir = os.path.join(OUTPUT_PATH, category)
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = os.path.join(output_dir, f"{name}.js")
        lines = code.count('\n') + 1
        
        header = f"""/**
 * {name}
 * Extracted from PRISM v8.89.002 monolith
 * References: {refs}
 * Lines: {lines}
 * Session: R2.3.1 Engine Gap Extraction
 */

"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + code)
        
        results.append({
            "name": name,
            "status": "SUCCESS",
            "lines": lines,
            "category": category,
            "path": filepath
        })
    
    return results

async def main():
    print("=" * 70)
    print("PRISM ENGINE GAP EXTRACTION")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(PRIORITY_ENGINES)} priority engines...")
    print("-" * 70)
    
    results = await extract_batch(PRIORITY_ENGINES, content, client)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}")
    
    # Save report
    report = {
        "session": "R2.3.1-ENGINE-GAP",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_gap_extraction.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
