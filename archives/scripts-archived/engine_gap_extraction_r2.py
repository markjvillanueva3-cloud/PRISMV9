#!/usr/bin/env python3
"""
PRISM Engine Gap Extraction Round 2 - Critical Missing Engines
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

# Critical gaps from audit
PRIORITY_ENGINES = [
    # TOP MISSING from audit
    {"name": "PRISM_BREP_CAD_GENERATOR", "refs": 86, "category": "cad_cam"},
    {"name": "PRISM_POST_PROCESSOR", "refs": 72, "category": "post_processor"},
    
    # Not extracted at all (>=15 refs)
    {"name": "PRISM_SUBSCRIPTION_SYSTEM", "refs": 31, "category": "business"},
    {"name": "PRISM_BSPLINE_ENGINE", "refs": 24, "category": "cad_cam"},
    {"name": "PRISM_POST_INTEGRATION_MODULE", "refs": 24, "category": "post_processor"},
    {"name": "PRISM_REPORTING_ENGINE", "refs": 22, "category": "business"},
    {"name": "PRISM_LATHE_PARAM_ENGINE", "refs": 20, "category": "tools"},
    {"name": "PRISM_PHASE2_QUALITY_SYSTEM", "refs": 20, "category": "quality"},
    {"name": "PRISM_SEQUENCE_MODEL_ENGINE", "refs": 18, "category": "ai_ml"},
    {"name": "PRISM_POST_OPTIMIZER", "refs": 18, "category": "post_processor"},
    {"name": "PRISM_CALCULATOR_RECOMMENDATION_ENGINE", "refs": 17, "category": "ai_ml"},
    {"name": "PRISM_ATTENTION_ENGINE", "refs": 17, "category": "ai_ml"},
    {"name": "PRISM_SEARCH_ENHANCED_ENGINE", "refs": 17, "category": "ai_ml"},
    {"name": "PRISM_GRAPH_ALGORITHMS_ENGINE", "refs": 17, "category": "ai_ml"},
    {"name": "PRISM_CAD_QUALITY_ASSURANCE_ENGINE", "refs": 16, "category": "cad_cam"},
    {"name": "PRISM_MODEL_COMPRESSION_ENGINE", "refs": 16, "category": "ai_ml"},
    {"name": "PRISM_PARAMETRIC_CAD_ENHANCEMENT_ENGINE", "refs": 15, "category": "cad_cam"},
    {"name": "PRISM_CONSTRUCTION_GEOMETRY_ENGINE", "refs": 15, "category": "cad_cam"},
    {"name": "PRISM_TOPOLOGY_ENGINE", "refs": 15, "category": "cad_cam"},
    {"name": "PRISM_FEATURE_INTERACTION_ENGINE", "refs": 15, "category": "cad_cam"},
    {"name": "PRISM_ACTIVATIONS_ENGINE", "refs": 15, "category": "ai_ml"},
    {"name": "PRISM_REGULARIZATION_ENGINE", "refs": 15, "category": "ai_ml"},
    {"name": "PRISM_LOSS_FUNCTIONS_ENGINE", "refs": 15, "category": "ai_ml"},
    {"name": "PRISM_MULTI_OBJECTIVE_ENGINE", "refs": 15, "category": "optimization"},
    {"name": "PRISM_MOEAD_ENGINE", "refs": 15, "category": "optimization"},
    {"name": "PRISM_RAPIDS_OPTIMIZER", "refs": 15, "category": "optimization"},
    {"name": "PRISM_UNIVERSAL_POST_GENERATOR", "refs": 15, "category": "post_processor"},
    {"name": "PRISM_MACHINE_RIGIDITY_SYSTEM", "refs": 15, "category": "machines"},
    
    # Referenced but no dedicated file (>=14 refs)
    {"name": "PRISM_NLP_ENGINE", "refs": 20, "category": "ai_ml"},
    {"name": "PRISM_MONTE_CARLO_ENGINE", "refs": 19, "category": "optimization"},
    {"name": "PRISM_SKETCH_ENGINE", "refs": 19, "category": "cad_cam"},
    {"name": "PRISM_INTERVAL_ENGINE", "refs": 18, "category": "core"},
    {"name": "PRISM_JACOBIAN_ENGINE", "refs": 17, "category": "physics"},
    {"name": "PRISM_CONTACT_CONSTRAINT_ENGINE", "refs": 17, "category": "physics"},
    {"name": "PRISM_ENHANCED_ORCHESTRATION_ENGINE", "refs": 16, "category": "core"},
    {"name": "PRISM_INVENTORY_ENGINE", "refs": 16, "category": "business"},
    {"name": "PRISM_FAILSAFE_GENERATOR", "refs": 15, "category": "core"},
    {"name": "PRISM_OCR_ENGINE", "refs": 14, "category": "ai_ml"},
    {"name": "PRISM_UNIFIED_LEARNING_ENGINE", "refs": 14, "category": "ai_ml"},
    {"name": "PRISM_JOB_TRACKING_ENGINE", "refs": 14, "category": "business"},
    {"name": "PRISM_FINANCIAL_ENGINE", "refs": 14, "category": "business"},
    {"name": "PRISM_CONSTRAINED_OPTIMIZER", "refs": 14, "category": "optimization"},
    {"name": "PRISM_TOOL_HOLDER_3D_GENERATOR", "refs": 14, "category": "tools"},
    {"name": "PRISM_INVERSE_KINEMATICS_SOLVER", "refs": 14, "category": "physics"},
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

def get_context(content: str, name: str, size: int = 20000) -> str:
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

Return ONLY valid JavaScript code. If you can't find a complete definition, return "NOT_FOUND".

Code context:
{context[:30000]}"""

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
        
        return code
    except Exception as e:
        print(f"    API error: {e}")
        return None

async def extract_batch(engines: list, content: str, client, batch_size: int = 5) -> list:
    """Extract engines with parallel API calls"""
    results = []
    
    for i in range(0, len(engines), batch_size):
        batch = engines[i:i+batch_size]
        
        tasks = []
        for engine in batch:
            name = engine["name"]
            category = engine["category"]
            refs = engine["refs"]
            
            idx = i + batch.index(engine) + 1
            print(f"[{idx:2}/{len(engines)}] {name} ({refs} refs)...")
            
            # Try direct extraction first
            code = find_definition(content, name)
            
            if code and len(code) > 100:
                lines = code.count('\n') + 1
                print(f"    Direct: {lines} lines")
                results.append({
                    "name": name,
                    "status": "SUCCESS",
                    "lines": lines,
                    "category": category,
                    "code": code
                })
            else:
                # Queue for API
                context = get_context(content, name)
                if context:
                    tasks.append((engine, context))
                else:
                    print(f"    No context found")
                    results.append({"name": name, "status": "NO_CONTEXT"})
        
        # Process API batch
        if tasks:
            api_tasks = [extract_with_api(client, e["name"], ctx) for e, ctx in tasks]
            api_results = await asyncio.gather(*api_tasks)
            
            for (engine, _), code in zip(tasks, api_results):
                if code:
                    lines = code.count('\n') + 1
                    print(f"    API: {lines} lines")
                    results.append({
                        "name": engine["name"],
                        "status": "SUCCESS",
                        "lines": lines,
                        "category": engine["category"],
                        "code": code
                    })
                else:
                    print(f"    FAILED")
                    results.append({"name": engine["name"], "status": "FAILED"})
    
    return results

async def main():
    print("=" * 70)
    print("PRISM ENGINE GAP EXTRACTION - ROUND 2")
    print("=" * 70)
    
    print(f"\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    print(f"\nExtracting {len(PRIORITY_ENGINES)} priority engines...")
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
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + result["code"])
        
        result["path"] = filepath
        del result["code"]  # Don't save in report
    
    total_lines = sum(r.get("lines", 0) for r in success)
    
    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {len(success)}/{len(results)}")
    print(f"Total lines: {total_lines:,}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  - {r['name']}: {r.get('status', 'UNKNOWN')}")
    
    # Save report
    report = {
        "session": "R2.3.1-ENGINE-GAP-R2",
        "attempted": len(results),
        "successful": len(success),
        "totalLines": total_lines,
        "results": results
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\engine_gap_extraction_r2.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
