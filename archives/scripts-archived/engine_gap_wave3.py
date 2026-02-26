#!/usr/bin/env python3
"""
PRISM Engine Gap Extraction - Wave 3
Extract remaining engines with 5-9 refs
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

# Wave 3 engines (5-9 refs)
WAVE3_ENGINES = [
    # POST
    {"name": "PRISM_RL_POST_PROCESSOR", "refs": 9, "category": "post_processor"},
    {"name": "PRISM_POST_PROCESSOR_ENGINE", "refs": 6, "category": "post_processor"},
    {"name": "PRISM_EXPANDED_POST_PROCESSOR", "refs": 6, "category": "post_processor"},
    
    # CAD/SURFACE
    {"name": "PRISM_REAL_CAD_PRIORITY_SYSTEM", "refs": 9, "category": "cad_cam"},
    {"name": "PRISM_V858_CAD_SYSTEM", "refs": 6, "category": "cad_cam"},
    {"name": "PRISM_SURFACE_INTERSECTION_ENGINE", "refs": 9, "category": "cad_cam"},
    {"name": "PRISM_SURFACE_RECONSTRUCTION_ENGINE", "refs": 8, "category": "cad_cam"},
    
    # CAM
    {"name": "PRISM_ENHANCED_TOOLPATH_GENERATOR", "refs": 7, "category": "cad_cam"},
    {"name": "PRISM_CAM_TOOLPATH_PARAMETERS_ENGINE", "refs": 6, "category": "cad_cam"},
    
    # PHYSICS/CUTTING
    {"name": "PRISM_CUTTING_FORCE_ENGINE", "refs": 9, "category": "physics"},
    
    # TOOLS
    {"name": "PRISM_TOOL_NOSE_RADIUS_COMPENSATION_ENGINE", "refs": 6, "category": "tools"},
    {"name": "PRISM_PHASE1_TOOL_LIFE_MANAGER", "refs": 6, "category": "tools"},
    
    # VIBRATION
    {"name": "PRISM_PHASE1_CHATTER_SYSTEM", "refs": 6, "category": "vibration"},
    {"name": "PRISM_STABILITY_ENGINE", "refs": 5, "category": "vibration"},
    {"name": "PRISM_FFT_CHATTER_ENGINE", "refs": 5, "category": "vibration"},
    
    # MACHINES
    {"name": "PRISM_MACHINE_SIMULATION_ENGINE", "refs": 5, "category": "machines"},
    
    # OTHER high-value (from audit)
    {"name": "PRISM_GEOMETRIC_KERNEL", "refs": 9, "category": "cad_cam"},
    {"name": "PRISM_BOOLEAN_ENGINE", "refs": 9, "category": "cad_cam"},
    {"name": "PRISM_MESH_BOOLEAN_ENGINE", "refs": 8, "category": "cad_cam"},
    {"name": "PRISM_TESSELLATION_ENGINE", "refs": 8, "category": "cad_cam"},
    {"name": "PRISM_RAYCAST_ENGINE", "refs": 7, "category": "cad_cam"},
    {"name": "PRISM_CONVEX_HULL_ENGINE", "refs": 7, "category": "cad_cam"},
    {"name": "PRISM_DELAUNAY_ENGINE", "refs": 6, "category": "cad_cam"},
    {"name": "PRISM_QUAD_REMESH_ENGINE", "refs": 6, "category": "cad_cam"},
    {"name": "PRISM_BLEND_SURFACE_ENGINE", "refs": 6, "category": "cad_cam"},
    {"name": "PRISM_FILLET_ENGINE", "refs": 5, "category": "cad_cam"},
    {"name": "PRISM_CHAMFER_ENGINE", "refs": 5, "category": "cad_cam"},
    
    # AI/Learning
    {"name": "PRISM_TRANSFER_LEARNING_ENGINE", "refs": 8, "category": "ai_ml"},
    {"name": "PRISM_ONLINE_LEARNING_ENGINE", "refs": 7, "category": "ai_ml"},
    {"name": "PRISM_ACTIVE_LEARNING_ENGINE", "refs": 6, "category": "ai_ml"},
    {"name": "PRISM_ENSEMBLE_ENGINE", "refs": 6, "category": "ai_ml"},
    {"name": "PRISM_CLUSTERING_ENGINE", "refs": 5, "category": "ai_ml"},
    
    # Optimization
    {"name": "PRISM_GENETIC_ALGORITHM_ENGINE", "refs": 8, "category": "optimization"},
    {"name": "PRISM_SIMULATED_ANNEALING_ENGINE", "refs": 7, "category": "optimization"},
    {"name": "PRISM_DIFFERENTIAL_EVOLUTION_ENGINE", "refs": 6, "category": "optimization"},
    {"name": "PRISM_BAYESIAN_OPTIMIZER", "refs": 6, "category": "optimization"},
    {"name": "PRISM_GRADIENT_FREE_OPTIMIZER", "refs": 5, "category": "optimization"},
    
    # Business/Shop
    {"name": "PRISM_SCHEDULING_ENGINE", "refs": 9, "category": "business"},
    {"name": "PRISM_INVENTORY_MANAGER", "refs": 8, "category": "business"},
    {"name": "PRISM_COST_ESTIMATOR", "refs": 8, "category": "business"},
    {"name": "PRISM_CAPACITY_PLANNER", "refs": 7, "category": "business"},
    {"name": "PRISM_QUOTE_GENERATOR", "refs": 7, "category": "business"},
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

Return ONLY valid JavaScript code. No explanations. If you cannot find it, return "NOT_FOUND".

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
        
        if "NOT_FOUND" in code or len(code) < 50:
            return None
        
        if code.startswith("```"):
            lines = code.split('\n')
            code = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        return code if len(code) > 50 else None
    except Exception as e:
        print(f"API error: {e}")
        return None

async def extract_single(engine: dict, content: str, client, idx: int, total: int) -> dict:
    """Extract a single engine"""
    name = engine["name"]
    category = engine["category"]
    refs = engine["refs"]
    
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
    output_dir = os.path.join(OUTPUT_PATH, category)
    os.makedirs(output_dir, exist_ok=True)
    
    filepath = os.path.join(output_dir, f"{name}.js")
    lines = code.count('\n') + 1
    
    header = f"""/**
 * {name}
 * Extracted from PRISM v8.89.002 monolith
 * References: {refs}
 * Lines: {lines}
 * Session: R2.3.1 Wave 3 Engine Gap Extraction
 */

"""
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
    print("PRISM ENGINE GAP EXTRACTION - WAVE 3")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(WAVE3_ENGINES)} engines (5-9 refs)...")
    print("-" * 70)
    
    # Process in parallel batches
    results = []
    batch_size = 10
    
    for i in range(0, len(WAVE3_ENGINES), batch_size):
        batch = WAVE3_ENGINES[i:i+batch_size]
        tasks = [
            extract_single(eng, content, client, i+j+1, len(WAVE3_ENGINES))
            for j, eng in enumerate(batch)
        ]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("WAVE 3 EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed[:20]:
            print(f"  - {r['name']}")
        if len(failed) > 20:
            print(f"  ... and {len(failed) - 20} more")
    
    # Save report
    report = {
        "session": "R2.3.1-WAVE3",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_gap_wave3.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
