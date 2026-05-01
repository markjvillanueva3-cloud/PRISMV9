#!/usr/bin/env python3
"""
PRISM Engine Gap Extraction Round 3 - Remaining Critical Gaps
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

# Remaining gaps from audit (all >=10 refs not yet extracted)
PRIORITY_ENGINES = [
    # Top missing (retry with larger context)
    {"name": "PRISM_BREP_CAD_GENERATOR", "refs": 86, "category": "cad_cam"},
    {"name": "PRISM_POST_PROCESSOR", "refs": 72, "category": "post_processor"},
    {"name": "PRISM_SUBSCRIPTION_SYSTEM", "refs": 31, "category": "business"},
    {"name": "PRISM_UNIVERSAL_POST_GENERATOR", "refs": 15, "category": "post_processor"},
    
    # Not extracted at all (>=10 refs)
    {"name": "PRISM_UNIFIED_OUTPUT_ENGINE", "refs": 14, "category": "core"},
    {"name": "PRISM_FILLETING_ENGINE", "refs": 14, "category": "cad_cam"},
    {"name": "PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_EKF_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE", "refs": 13, "category": "tools"},
    {"name": "PRISM_ENHANCED_MILL_TURN_CAM_ENGINE", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_ISOSURFACE_ENGINE", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_HIGH_FIDELITY_MACHINE_GENERATOR", "refs": 13, "category": "machines"},
    {"name": "PRISM_PURCHASING_SYSTEM", "refs": 13, "category": "business"},
    {"name": "PRISM_NURBS_ADVANCED_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_CURVATURE_ANALYSIS_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_ADVANCED_BLADE_SURFACE_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_FUSION_SKETCH_CONSTRAINT_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_SOLID_EDITING_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_PATTERN_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_VOXEL_STOCK_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_SILHOUETTE_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_GEODESIC_DISTANCE_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_BATCH_STEP_IMPORT_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_ADVANCED_SWEEP_LOFT_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_SIEMENS_5AXIS_CAM_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_CAD_CONFIDENCE_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_INTERIOR_POINT_ENGINE", "refs": 11, "category": "optimization"},
    {"name": "PRISM_MESH_DECIMATION_ENGINE", "refs": 11, "category": "cad_cam"},
    {"name": "PRISM_RL_SARSA_ENGINE", "refs": 11, "category": "ai_ml"},
    {"name": "PRISM_DQN_ENGINE", "refs": 11, "category": "ai_ml"},
    {"name": "PRISM_LP_SOLVER", "refs": 11, "category": "optimization"},
    {"name": "PRISM_INTELLIGENT_COLLISION_SYSTEM", "refs": 11, "category": "cad_cam"},
    
    # Referenced but no dedicated file (>=10 refs)
    {"name": "PRISM_CSP_ENHANCED_ENGINE", "refs": 14, "category": "ai_ml"},
    {"name": "PRISM_CLUSTERING_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_JOB_COSTING_ENGINE", "refs": 13, "category": "business"},
    {"name": "PRISM_XAI_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_MOTION_PLANNING_ENHANCED_ENGINE", "refs": 13, "category": "cad_cam"},
    {"name": "PRISM_MANUFACTURING_SEARCH_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_PROBABILISTIC_REASONING_ENGINE", "refs": 13, "category": "ai_ml"},
    {"name": "PRISM_SQP_INTERIOR_POINT_ENGINE", "refs": 13, "category": "optimization"},
    {"name": "PRISM_COMBINATORIAL_OPTIMIZER", "refs": 13, "category": "optimization"},
    {"name": "PRISM_INSPECTION_ENGINE", "refs": 12, "category": "quality"},
    {"name": "PRISM_UNIFIED_3D_VIEWPORT_ENGINE", "refs": 12, "category": "cad_cam"},
    {"name": "PRISM_CALCULATOR_PHYSICS_ENGINE", "refs": 12, "category": "physics"},
    {"name": "PRISM_CALCULATOR_CONSTRAINT_ENGINE", "refs": 12, "category": "ai_ml"},
    {"name": "PRISM_QUOTING_ENGINE", "refs": 12, "category": "business"},
    {"name": "PRISM_JOB_SHOP_SCHEDULING_ENGINE", "refs": 12, "category": "business"},
    {"name": "PRISM_DECISION_TREE_ENGINE", "refs": 12, "category": "ai_ml"},
    {"name": "PRISM_ADVANCED_FEED_OPTIMIZER", "refs": 12, "category": "optimization"},
    {"name": "PRISM_TRUST_REGION_OPTIMIZER", "refs": 12, "category": "optimization"},
    {"name": "PRISM_AI_100_PHYSICS_GENERATOR", "refs": 12, "category": "physics"},
    
    # Additional 10-ref engines
    {"name": "PRISM_SURFACE_INTERSECTION_ENGINE", "refs": 10, "category": "cad_cam"},
    {"name": "PRISM_OFFSET_SURFACE_ENGINE", "refs": 10, "category": "cad_cam"},
    {"name": "PRISM_BOOLEAN_OPERATIONS_ENGINE", "refs": 10, "category": "cad_cam"},
    {"name": "PRISM_WIRE_EDM_ENGINE", "refs": 10, "category": "cad_cam"},
    {"name": "PRISM_SINKER_EDM_ENGINE", "refs": 10, "category": "cad_cam"},
]

def find_definition_expanded(content: str, name: str) -> str:
    """Find definition with expanded search"""
    patterns = [
        rf'(class\s+{name}\s*(?:extends\s+\w+)?\s*\{{)',
        rf'(const\s+{name}\s*=\s*\{{)',
        rf'(const\s+{name}\s*=\s*class\s*\{{)',
        rf'(let\s+{name}\s*=\s*\{{)',
        rf'(var\s+{name}\s*=\s*\{{)',
        rf'({name}\s*=\s*\{{)',
        rf'(window\.{name}\s*=\s*\{{)',
        rf'(function\s+{name}\s*\([^)]*\)\s*\{{)',  # function syntax
        rf'({name}\s*:\s*\{{)',  # object property
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            start_pos = match.start()
            brace_pos = content.find('{', start_pos)
            
            if brace_pos == -1 or brace_pos - start_pos > 500:
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
            
            if end_pos > brace_pos + 50:
                return content[start_pos:end_pos]
    
    return None

def get_large_context(content: str, name: str, size: int = 40000) -> str:
    """Get larger context for API extraction"""
    match = re.search(name, content)
    if match:
        start = max(0, match.start() - size)
        end = min(len(content), match.end() + size)
        return content[start:end]
    return None

async def extract_with_api(client, name: str, context: str) -> str:
    """Use API with enhanced prompt"""
    prompt = f"""Extract the COMPLETE JavaScript definition of `{name}` from this code.

The definition could be:
- class {name} {{ ... }}
- const {name} = {{ ... }}
- {name} = {{ ... }}
- function {name}(...) {{ ... }}
- {name}: {{ ... }} (as object property)

Rules:
1. Include the ENTIRE definition with all methods and properties
2. Include closing braces and semicolons
3. Return ONLY valid JavaScript code
4. If you can't find a complete definition, return exactly "NOT_FOUND"

Code:
{context[:45000]}"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=16384,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text.strip()
        
        if "NOT_FOUND" in code or len(code) < 30:
            return None
        
        if code.startswith("```"):
            lines = code.split('\n')
            end_idx = -1 if lines[-1].strip() in ['```', '```javascript', '```js'] else len(lines)
            code = '\n'.join(lines[1:end_idx])
        
        return code
    except Exception as e:
        print(f"    API error: {e}")
        return None

async def extract_batch(engines: list, content: str, client) -> list:
    """Extract engines sequentially with retry"""
    results = []
    
    for i, engine in enumerate(engines, 1):
        name = engine["name"]
        category = engine["category"]
        refs = engine["refs"]
        
        print(f"[{i:2}/{len(engines)}] {name} ({refs} refs)...")
        
        # Try direct extraction first
        code = find_definition_expanded(content, name)
        
        if code and len(code) > 50:
            lines = code.count('\n') + 1
            print(f"    Direct: {lines} lines")
            results.append({
                "name": name,
                "status": "SUCCESS",
                "lines": lines,
                "category": category,
                "code": code
            })
            continue
        
        # Try API with larger context
        context = get_large_context(content, name)
        if context:
            code = await extract_with_api(client, name, context)
            if code and len(code) > 30:
                lines = code.count('\n') + 1
                print(f"    API: {lines} lines")
                results.append({
                    "name": name,
                    "status": "SUCCESS",
                    "lines": lines,
                    "category": category,
                    "code": code
                })
            else:
                print(f"    FAILED")
                results.append({"name": name, "status": "FAILED"})
        else:
            print(f"    No context")
            results.append({"name": name, "status": "NO_CONTEXT"})
    
    return results

async def main():
    print("=" * 70)
    print("PRISM ENGINE GAP EXTRACTION - ROUND 3")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(PRIORITY_ENGINES)} engines...")
    print("-" * 70)
    
    results = await extract_batch(PRIORITY_ENGINES, content, client)
    
    # Save successful extractions
    success = [r for r in results if r.get("status") == "SUCCESS"]
    failed = [r for r in results if r.get("status") != "SUCCESS"]
    
    for result in success:
        output_dir = os.path.join(OUTPUT_PATH, result["category"])
        os.makedirs(output_dir, exist_ok=True)
        
        filepath = os.path.join(output_dir, f"{result['name']}.js")
        
        header = f"""/**
 * {result['name']}
 * Extracted from PRISM v8.89.002 monolith
 * Lines: {result['lines']}
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + result["code"])
        
        result["path"] = filepath
        del result["code"]
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed[:20]:
            print(f"  - {r['name']}")
        if len(failed) > 20:
            print(f"  ... and {len(failed)-20} more")
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_gap_extraction_r3.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump({"attempted": len(results), "successful": len(success), "totalLines": total_lines, "results": results}, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
