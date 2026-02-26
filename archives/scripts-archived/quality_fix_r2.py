#!/usr/bin/env python3
"""
PRISM Quality Fix + Gap Extraction - Session R2.1.1 Ralph Iteration 2
Fix tiny files and extract medium-priority gaps
"""

import asyncio
import json
import os
import re
from anthropic import AsyncAnthropic

API_KEY = "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"
MODEL = "claude-sonnet-4-20250514"

MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_PATH = r"C:\\PRISM\EXTRACTED"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits"

# Tiny files that need re-extraction
TINY_FILES = [
    {"name": "PRISM_PARAM_ENGINE", "category": "core"},
    {"name": "PRISM_RIGID_BODY_DYNAMICS_ENGINE", "category": "engines"},
    {"name": "PRISM_AI_AUTO_CAM", "category": "engines/ai_ml"},
    {"name": "PRISM_CNN_ENGINE", "category": "engines/ai_ml"},
    {"name": "PRISM_DEEP_LEARNING", "category": "engines/ai_ml"},
    {"name": "PRISM_PHASE6_DEEPLEARNING", "category": "engines/ai_ml"},
]

# Top medium-priority gaps to extract
MEDIUM_GAPS = [
    {"name": "PRISM_ADVANCED_OPTIMIZATION_ENGINE", "category": "engines/optimization", "refs": 43},
    {"name": "PRISM_PHASE3_MANUFACTURING_PHYSICS", "category": "engines", "refs": 43},
    {"name": "PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE", "category": "engines", "refs": 41},
    {"name": "PRISM_UNIVERSITY_ALGORITHMS", "category": "knowledge_bases", "refs": 41},
    {"name": "PRISM_PHASE3_ADVANCED_SIGNAL", "category": "engines", "refs": 41},
    {"name": "PRISM_CLIPPER2_ENGINE", "category": "engines/cad_cam", "refs": 40},
    {"name": "PRISM_PHASE3_ADVANCED_RL", "category": "engines/ai_ml", "refs": 39},
    {"name": "PRISM_DL", "category": "engines/ai_ml", "refs": 38},
    {"name": "PRISM_PHASE4_OPTIMIZATION", "category": "engines/optimization", "refs": 37},
    {"name": "PRISM_PHASE4_PROBABILISTIC", "category": "engines/ai_ml", "refs": 36},
    {"name": "PRISM_PHASE5_ADVANCED_OPTIMIZATION", "category": "engines/optimization", "refs": 35},
    {"name": "PRISM_PHASE5_SIMULATION", "category": "engines/simulation", "refs": 34},
    {"name": "PRISM_PROCESS_MONITORING_ENGINE", "category": "engines", "refs": 33},
    {"name": "PRISM_PHASE2_CAD_CAM", "category": "engines/cad_cam", "refs": 32},
    {"name": "PRISM_PHASE6_KNOWLEDGE", "category": "knowledge_bases", "refs": 31},
]

def find_definition_in_monolith(content: str, name: str) -> str:
    """Find and extract complete definition from monolith"""
    
    # Try multiple patterns
    patterns = [
        rf'(class\s+{name}\s*(?:extends\s+\w+)?\s*\{{)',
        rf'(const\s+{name}\s*=\s*\{{)',
        rf'(const\s+{name}\s*=\s*class\s*\{{)',
        rf'(const\s+{name}\s*=\s*function)',
        rf'(let\s+{name}\s*=\s*\{{)',
        rf'(var\s+{name}\s*=\s*\{{)',
        rf'(function\s+{name}\s*\()',
        rf'({name}\s*=\s*\{{)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            start_pos = match.start()
            
            # Find opening brace
            brace_pos = content.find('{', start_pos)
            if brace_pos == -1 or brace_pos - start_pos > 200:
                continue
            
            # Count braces to find end
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
                
                if i - brace_pos > 300000:
                    break
            
            if end_pos > brace_pos + 50:
                return content[start_pos:end_pos]
    
    return None

async def extract_with_api(client, name: str, contexts: list) -> str:
    """Use API to extract when regex fails"""
    
    contexts_text = "\n\n---CONTEXT---\n\n".join(contexts[:3])
    
    prompt = f"""Extract the COMPLETE JavaScript definition of `{name}` from these contexts.

Look for:
- class {name} {{ ... }}
- const {name} = {{ ... }}
- function {name}() {{ ... }}

Return ONLY valid JavaScript code, no explanations.

Contexts:
{contexts_text[:30000]}

Extract `{name}`:"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        
        # Clean markdown
        if code.startswith("```"):
            lines = code.split('\n')
            code = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        return code
    except Exception as e:
        print(f"    API error: {e}")
        return None

def get_contexts(content: str, name: str, context_size: int = 10000) -> list:
    """Get context regions around a name"""
    contexts = []
    for match in re.finditer(name, content):
        start = max(0, match.start() - context_size)
        end = min(len(content), match.end() + context_size)
        contexts.append(content[start:end])
        if len(contexts) >= 5:
            break
    return contexts

async def main():
    print("=" * 70)
    print("PRISM QUALITY FIX + GAP EXTRACTION - R2.1.1 Ralph Iteration 2")
    print("=" * 70)
    
    # Load monolith
    print("\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    all_items = TINY_FILES + MEDIUM_GAPS
    results = []
    success_count = 0
    
    print(f"\nProcessing {len(all_items)} items...")
    print("-" * 70)
    
    for i, item in enumerate(all_items, 1):
        name = item["name"]
        category = item["category"]
        refs = item.get("refs", "N/A")
        
        print(f"\n[{i:2}/{len(all_items)}] {name} ({refs} refs)...")
        
        # Try direct extraction first
        code = find_definition_in_monolith(content, name)
        
        if code and len(code) > 100:
            lines = code.count('\n') + 1
            print(f"    Direct: {lines} lines")
        else:
            # Fall back to API
            print(f"    Trying API extraction...")
            contexts = get_contexts(content, name)
            if contexts:
                code = await extract_with_api(client, name, contexts)
                if code and len(code) > 50:
                    lines = code.count('\n') + 1
                    print(f"    API: {lines} lines")
                else:
                    code = None
            else:
                print(f"    No contexts found!")
                code = None
        
        if code:
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
 * Session: R2.1.1 Ralph Iteration 2
 */

"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + code)
            
            results.append({
                "name": name,
                "status": "SUCCESS",
                "lines": lines,
                "path": filepath
            })
            success_count += 1
        else:
            results.append({
                "name": name,
                "status": "FAILED"
            })
    
    # Save report
    report = {
        "session": "R2.1.1",
        "ralphIteration": 2,
        "attempted": len(all_items),
        "successful": success_count,
        "results": results
    }
    
    report_path = os.path.join(AUDIT_PATH, "quality_fix_r2_1_1.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print("\n" + "=" * 70)
    print("QUALITY FIX COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {success_count}/{len(all_items)}")
    print(f"Report: {report_path}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
