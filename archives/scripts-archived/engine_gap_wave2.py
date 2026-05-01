#!/usr/bin/env python3
"""
PRISM Engine Gap Extraction - Wave 2
Extract remaining engines with >= 10 refs
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

# Wave 2 engines (10+ refs, not yet extracted)
WAVE2_ENGINES = [
    # OTHER high-value
    {"name": "PRISM_SUBSCRIPTION_SYSTEM", "refs": 31, "category": "business"},
    {"name": "PRISM_BSPLINE_ENGINE", "refs": 25, "category": "cad_cam"},
    {"name": "PRISM_DB_MANAGER", "refs": 25, "category": "infrastructure"},
    {"name": "PRISM_REPORTING_ENGINE", "refs": 23, "category": "business"},
    {"name": "PRISM_LATHE_PARAM_ENGINE", "refs": 21, "category": "physics"},
    {"name": "PRISM_NLP_ENGINE", "refs": 21, "category": "ai_ml"},
    {"name": "PRISM_FEATURE_HISTORY_MANAGER", "refs": 21, "category": "cad_cam"},
    {"name": "PRISM_MONTE_CARLO_ENGINE", "refs": 20, "category": "ai_ml"},
    {"name": "PRISM_SKETCH_ENGINE", "refs": 20, "category": "cad_cam"},
    {"name": "PRISM_PHASE2_QUALITY_SYSTEM", "refs": 20, "category": "quality"},
    
    # OPTIMIZATION
    {"name": "PRISM_POST_OPTIMIZER", "refs": 18, "category": "optimization"},
    {"name": "PRISM_RAPIDS_OPTIMIZER", "refs": 15, "category": "optimization"},
    {"name": "PRISM_CONSTRAINED_OPTIMIZER", "refs": 14, "category": "optimization"},
    {"name": "PRISM_COMBINATORIAL_OPTIMIZER", "refs": 13, "category": "optimization"},
    {"name": "PRISM_ADVANCED_FEED_OPTIMIZER", "refs": 12, "category": "optimization"},
    {"name": "PRISM_TRUST_REGION_OPTIMIZER", "refs": 12, "category": "optimization"},
    {"name": "PRISM_MFG_OPTIMIZATION", "refs": 11, "category": "optimization"},
    {"name": "PRISM_ROBUST_OPTIMIZATION", "refs": 11, "category": "optimization"},
    {"name": "PRISM_RAPID_PATH_OPTIMIZER", "refs": 11, "category": "optimization"},
    {"name": "PRISM_MFG_OPTIMIZATION_ADVANCED_B", "refs": 10, "category": "optimization"},
    
    # AI_ML
    {"name": "PRISM_CONTACT_CONSTRAINT_ENGINE", "refs": 18, "category": "ai_ml"},
    {"name": "PRISM_UNIFIED_LEARNING_ENGINE", "refs": 15, "category": "ai_ml"},
    {"name": "PRISM_FAILSAFE_GENERATOR", "refs": 15, "category": "ai_ml"},
    {"name": "PRISM_XAI_ENGINE", "refs": 14, "category": "ai_ml"},
    {"name": "PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_CALCULATOR_CONSTRAINT_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_AI_100_PHYSICS_GENERATOR", "refs": 12, "category": "ai_ml"},
    {"name": "PRISM_AXIS_BEHAVIOR_LEARNING_ENGINE", "refs": 11, "category": "ai_ml"},
    {"name": "PRISM_CONTACT_CONSTRAINT_LEARNING_ENGINE", "refs": 11, "category": "ai_ml"},
    {"name": "PRISM_AI_100_ENGINE_WRAPPER", "refs": 10, "category": "ai_ml"},
    
    # CAD
    {"name": "PRISM_CAD_QUALITY_ASSURANCE_ENGINE", "refs": 17, "category": "cad_cam"},
    {"name": "PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE", "refs": 16, "category": "cad_cam"},
    {"name": "PRISM_CONSTRUCTION_GEOMETRY_ENGINE", "refs": 16, "category": "cad_cam"},
    {"name": "PRISM_NURBS_ADVANCED_ENGINE", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_CAD_CONFIDENCE_ENGINE", "refs": 12, "category": "cad_cam"},
    
    # TOOLS
    {"name": "PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE", "refs": 14, "category": "tools"},
    {"name": "PRISM_TOOL_HOLDER_3D_GENERATOR", "refs": 14, "category": "tools"},
    {"name": "PRISM_TOOL_PERFORMANCE_ENGINE", "refs": 11, "category": "tools"},
    {"name": "PRISM_TOOL_LIBRARY_MANAGER", "refs": 11, "category": "tools"},
    
    # SURFACE
    {"name": "PRISM_ISOSURFACE_ENGINE", "refs": 14, "category": "cad_cam"},
    {"name": "PRISM_ADVANCED_BLADE_SURFACE_ENGINE", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_OFFSET_SURFACE_ENGINE", "refs": 10, "category": "cad_cam"},
    
    # MACHINES
    {"name": "PRISM_MACHINE_RIGIDITY_SYSTEM", "refs": 15, "category": "machines"},
    {"name": "PRISM_HIGH_FIDELITY_MACHINE_GENERATOR", "refs": 13, "category": "machines"},
    {"name": "PRISM_MACHINE_3D_SYSTEM", "refs": 12, "category": "machines"},
    
    # CAM
    {"name": "PRISM_ENHANCED_MILL_TURN_CAM_ENGINE", "refs": 14, "category": "cad_cam"},
    {"name": "PRISM_SIEMENS_5AXIS_CAM_ENGINE", "refs": 12, "category": "cad_cam"},
    
    # POST
    {"name": "PRISM_UNIVERSAL_POST_GENERATOR", "refs": 15, "category": "post_processor"},
    
    # PHYSICS
    {"name": "PRISM_CALCULATOR_PHYSICS_ENGINE", "refs": 13, "category": "physics"},
    
    # MATERIALS
    {"name": "PRISM_REST_MATERIAL_ENGINE", "refs": 11, "category": "materials"},
    {"name": "PRISM_MATERIAL_SIMULATION_ENGINE", "refs": 10, "category": "materials"},
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
        print(f"    API error: {e}")
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
 * Session: R2.3.1 Wave 2 Engine Gap Extraction
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
    print("PRISM ENGINE GAP EXTRACTION - WAVE 2")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(WAVE2_ENGINES)} engines (10+ refs)...")
    print("-" * 70)
    
    # Process in parallel batches
    results = []
    batch_size = 10
    
    for i in range(0, len(WAVE2_ENGINES), batch_size):
        batch = WAVE2_ENGINES[i:i+batch_size]
        tasks = [
            extract_single(eng, content, client, i+j+1, len(WAVE2_ENGINES))
            for j, eng in enumerate(batch)
        ]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
    
    # Summary
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("WAVE 2 EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}")
    
    # Save report
    report = {
        "session": "R2.3.1-WAVE2",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_gap_wave2.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
