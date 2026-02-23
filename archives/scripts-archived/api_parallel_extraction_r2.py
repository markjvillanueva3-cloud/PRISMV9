#!/usr/bin/env python3
"""
PRISM API Parallel Extraction - Session R2.0.2
Extract remaining subsystems using maximum parallel agents
NO LIMITS - Scale to task
"""

import asyncio
import json
import os
import re
from pathlib import Path
from anthropic import AsyncAnthropic

# API Configuration - USE AGGRESSIVELY
API_KEY = "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"
MODEL = "claude-sonnet-4-20250514"

# Paths
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

# Top priority subsystems to extract (from gap analysis)
TOP_GAPS = [
    # THERMAL (923 refs total)
    {"name": "PRISM_CUTTING_THERMAL_ENGINE", "category": "engines", "refs": 305},
    {"name": "PRISM_HEAT_TRANSFER_ENGINE", "category": "engines", "refs": 305},
    {"name": "PRISM_THERMAL_EXPANSION_ENGINE", "category": "engines", "refs": 303},
    
    # SURFACE (405 refs total)
    {"name": "PRISM_SURFACE_FINISH_ENGINE", "category": "engines", "refs": 317},
    
    # KINEMATICS/DYNAMICS (624 refs total)
    {"name": "PRISM_ADVANCED_KINEMATICS_ENGINE", "category": "engines", "refs": 313},
    {"name": "PRISM_RIGID_BODY_DYNAMICS_ENGINE", "category": "engines", "refs": 311},
    
    # VIBRATION (306 refs)
    {"name": "PRISM_VIBRATION_ANALYSIS_ENGINE", "category": "engines", "refs": 306},
    
    # MASTER (624 refs total)
    {"name": "PRISM_MASTER", "category": "core", "refs": 366},
    {"name": "PRISM_MASTER_DB", "category": "core", "refs": 258},
    
    # AI/ML (862 refs total)
    {"name": "PRISM_AI_AUTO_CAM", "category": "engines/ai_ml", "refs": 160},
    {"name": "PRISM_PHASE3_DEEP_LEARNING", "category": "engines/ai_ml", "refs": 60},
    {"name": "PRISM_LEAN_SIX_SIGMA_KAIZEN", "category": "engines/ai_ml", "refs": 52},
    {"name": "PRISM_PHASE6_DEEPLEARNING", "category": "engines/ai_ml", "refs": 39},
    {"name": "PRISM_PHASE3_GRAPH_NEURAL", "category": "engines/ai_ml", "refs": 29},
    {"name": "PRISM_TRUE_AI_SYSTEM", "category": "engines/ai_ml", "refs": 21},
    
    # CAD (314 refs total)
    {"name": "PRISM_BREP_CAD_GENERATOR_V2", "category": "engines/cad_cam", "refs": 86},
    {"name": "PRISM_NURBS_LIBRARY", "category": "engines/cad_cam", "refs": 36},
    {"name": "PRISM_BREP_TESSELLATOR", "category": "engines/cad_cam", "refs": 35},
    
    # CAM (144 refs total)
    {"name": "PRISM_MULTIAXIS_TOOLPATH_ENGINE", "category": "engines/cad_cam", "refs": 58},
    
    # OPTIMIZATION (184 refs)
    {"name": "PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER", "category": "engines/optimization", "refs": 21},
    {"name": "PRISM_UNCONSTRAINED_OPTIMIZATION", "category": "engines/optimization", "refs": 18},
    
    # OTHER HIGH VALUE
    {"name": "PRISM_ENHANCEMENTS", "category": "core", "refs": 100},
    {"name": "PRISM_UNIT_SYSTEM", "category": "units", "refs": 99},
    {"name": "PRISM_PARAM_ENGINE", "category": "core", "refs": 45},
    {"name": "PRISM_CAPABILITY_REGISTRY", "category": "core", "refs": 44},
]

async def extract_subsystem(client, subsystem_name: str, monolith_content: str) -> dict:
    """Extract a single subsystem from monolith using Claude API"""
    
    prompt = f"""You are extracting JavaScript code from a monolith file.

Extract the COMPLETE definition of `{subsystem_name}` including:
1. The class/object definition
2. All methods and properties
3. All related helper functions
4. Any constants or configurations used by it

Search for patterns like:
- `class {subsystem_name}`
- `const {subsystem_name} =`
- `{subsystem_name}.prototype`
- `window.{subsystem_name}`

Return ONLY the extracted JavaScript code, nothing else. If you cannot find the complete definition, extract as much as you can find and note what's missing in a comment at the end.

Monolith content (search through this):
{monolith_content[:500000]}  // First 500K chars
"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        
        extracted_code = response.content[0].text
        
        return {
            "name": subsystem_name,
            "status": "SUCCESS",
            "code": extracted_code,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens
        }
    except Exception as e:
        return {
            "name": subsystem_name,
            "status": "ERROR",
            "error": str(e),
            "code": None
        }

async def run_parallel_extraction(subsystems: list, max_parallel: int = 10):
    """Run extraction in parallel with up to max_parallel concurrent requests"""
    
    print(f"\n{'='*60}")
    print(f"PARALLEL EXTRACTION - {len(subsystems)} subsystems, {max_parallel} agents")
    print(f"{'='*60}")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    # Load monolith content once
    print("Loading monolith content...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        monolith_content = f.read()
    print(f"Loaded {len(monolith_content):,} characters")
    
    # Create tasks in batches
    results = []
    semaphore = asyncio.Semaphore(max_parallel)
    
    async def extract_with_semaphore(subsystem):
        async with semaphore:
            print(f"  Extracting: {subsystem['name']}...")
            result = await extract_subsystem(client, subsystem['name'], monolith_content)
            result['category'] = subsystem['category']
            result['refs'] = subsystem['refs']
            return result
    
    # Run all extractions
    tasks = [extract_with_semaphore(s) for s in subsystems]
    results = await asyncio.gather(*tasks)
    
    return results

def save_extracted_files(results: list):
    """Save extracted code to appropriate directories"""
    
    print(f"\n{'='*60}")
    print("SAVING EXTRACTED FILES")
    print(f"{'='*60}")
    
    success_count = 0
    error_count = 0
    
    for result in results:
        if result['status'] == 'SUCCESS' and result['code']:
            # Determine output path
            category = result.get('category', 'core')
            output_dir = os.path.join(OUTPUT_PATH, category)
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"{result['name']}.js"
            filepath = os.path.join(output_dir, filename)
            
            # Add header
            header = f"""/**
 * {result['name']}
 * Extracted from PRISM v8.89.002 monolith
 * References in monolith: {result.get('refs', 'N/A')}
 * Extracted: 2026-01-31
 */

"""
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + result['code'])
            
            print(f"  [OK] Saved: {filepath}")
            success_count += 1
        else:
            print(f"  [FAIL] Failed: {result['name']} - {result.get('error', 'No code extracted')}")
            error_count += 1
    
    return success_count, error_count

def main():
    print("="*60)
    print("PRISM API PARALLEL EXTRACTION")
    print("Session R2.0.2 - Extract Remaining Subsystems")
    print("="*60)
    print(f"\nAPI Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"Model: {MODEL}")
    print(f"Subsystems to extract: {len(TOP_GAPS)}")
    print(f"Max parallel agents: SCALE TO TASK (10-20)")
    
    # Calculate optimal agent count
    agent_count = min(len(TOP_GAPS), 15)  # Up to 15 parallel
    print(f"Using {agent_count} parallel agents")
    
    # Run extraction
    results = asyncio.run(run_parallel_extraction(TOP_GAPS, max_parallel=agent_count))
    
    # Save results
    success, errors = save_extracted_files(results)
    
    # Save extraction report
    report = {
        "session": "R2.0.2",
        "total_attempted": len(TOP_GAPS),
        "successful": success,
        "failed": errors,
        "results": results
    }
    
    report_path = os.path.join(AUDIT_PATH, "extraction_report_r2_0_2.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n{'='*60}")
    print("EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"Successful: {success}")
    print(f"Failed: {errors}")
    print(f"Report: {report_path}")

if __name__ == "__main__":
    main()
