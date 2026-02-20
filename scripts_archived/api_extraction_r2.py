#!/usr/bin/env python3
"""
PRISM API Extraction - Session R2.0.2 Ralph Iteration 3
Extract remaining subsystems using Claude API
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

# Remaining subsystems that need API extraction
REMAINING_SUBSYSTEMS = [
    {"name": "PRISM_MASTER", "category": "core", "refs": 366},
    {"name": "PRISM_UNIT_SYSTEM", "category": "units", "refs": 99},
]

def find_context_around_name(content: str, name: str, context_size: int = 5000) -> list:
    """Find all occurrences and get surrounding context"""
    contexts = []
    for match in re.finditer(name, content):
        start = max(0, match.start() - context_size)
        end = min(len(content), match.end() + context_size)
        contexts.append({
            "pos": match.start(),
            "line": content[:match.start()].count('\n') + 1,
            "context": content[start:end]
        })
        if len(contexts) >= 3:  # Get up to 3 contexts
            break
    return contexts

async def extract_with_api(client, name: str, contexts: list) -> dict:
    """Use Claude API to extract and reconstruct subsystem"""
    
    contexts_text = "\n\n---CONTEXT---\n\n".join([c["context"] for c in contexts])
    
    prompt = f"""You are extracting JavaScript code for `{name}` from a large monolith.

Here are the contexts where `{name}` appears. Look for:
1. Class definitions (class {name})
2. Object definitions (const/let/var {name} = {{}})
3. Function definitions (function {name})
4. Property assignments ({name}: {{}})

If you find a complete definition, extract it entirely.
If the definition is spread across contexts, reconstruct it.
If it's just a reference (not a definition), look for the actual definition pattern.

IMPORTANT: Output ONLY valid JavaScript code. No explanations.

Contexts:
{contexts_text}

Extract the complete `{name}` code:"""

    try:
        response = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}]
        )
        
        code = response.content[0].text
        
        # Clean up code - remove markdown if present
        if code.startswith("```"):
            lines = code.split('\n')
            code = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        
        return {
            "name": name,
            "status": "SUCCESS",
            "code": code,
            "tokens": response.usage.input_tokens + response.usage.output_tokens
        }
    except Exception as e:
        return {
            "name": name,
            "status": "ERROR",
            "error": str(e),
            "code": None
        }

async def main():
    print("=" * 70)
    print("PRISM API EXTRACTION - Session R2.0.2 Ralph Iteration 3")
    print("=" * 70)
    print(f"\nAPI Key: {API_KEY[:20]}...{API_KEY[-10:]}")
    print(f"Model: {MODEL}")
    print(f"Remaining subsystems: {len(REMAINING_SUBSYSTEMS)}")
    
    # Load monolith
    print("\nLoading monolith...")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    print(f"Loaded {len(content):,} characters")
    
    client = AsyncAnthropic(api_key=API_KEY)
    
    results = []
    success_count = 0
    
    print("\n" + "-" * 70)
    print("EXTRACTING WITH API:")
    print("-" * 70)
    
    for subsystem in REMAINING_SUBSYSTEMS:
        name = subsystem["name"]
        print(f"\n{name}...")
        
        # Find contexts
        contexts = find_context_around_name(content, name, context_size=8000)
        print(f"  Found {len(contexts)} context regions")
        
        if not contexts:
            print(f"  ERROR: No occurrences found!")
            results.append({
                "name": name,
                "status": "NO_OCCURRENCES",
                "code": None
            })
            continue
        
        # Extract with API
        result = await extract_with_api(client, name, contexts)
        results.append(result)
        
        if result["status"] == "SUCCESS" and result["code"]:
            lines = result["code"].count('\n') + 1
            print(f"  EXTRACTED: {lines} lines ({result.get('tokens', 0)} tokens)")
            
            # Save
            category = subsystem["category"]
            output_dir = os.path.join(OUTPUT_PATH, category)
            os.makedirs(output_dir, exist_ok=True)
            
            filepath = os.path.join(output_dir, f"{name}.js")
            header = f"""/**
 * {name}
 * Extracted from PRISM v8.89.002 monolith (API extraction)
 * References: {subsystem['refs']}
 * Lines: {lines}
 * Session: R2.0.2 Ralph Iteration 3
 */

"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + result["code"])
            
            success_count += 1
            result["path"] = filepath
            result["lines"] = lines
        else:
            print(f"  FAILED: {result.get('error', 'Unknown error')}")
    
    # Save report
    report = {
        "session": "R2.0.2",
        "ralphIteration": 3,
        "method": "API_EXTRACTION",
        "model": MODEL,
        "attempted": len(REMAINING_SUBSYSTEMS),
        "successful": success_count,
        "results": results
    }
    
    report_path = os.path.join(AUDIT_PATH, "extraction_api_r2_0_2.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, default=str)
    
    print("\n" + "=" * 70)
    print("API EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"\nSuccessful: {success_count}/{len(REMAINING_SUBSYSTEMS)}")
    print(f"Report: {report_path}")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
