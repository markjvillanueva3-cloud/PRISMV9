"""
PRISM Swarm Trigger - Simple interface for running multi-agent tasks
Called by Desktop App Claude to execute parallel work
"""

import sys
import os
import json
from pathlib import Path

# Add scripts dir to path
sys.path.insert(0, str(Path(__file__).parent))
from prism_orchestrator import Orchestrator, Agent, AGENT_ROLES

PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
RESULTS_DIR = PRISM_ROOT / "API_RESULTS"

def quick_extract(prompts: list, name: str = "quick_extract"):
    """Quick extraction from multiple prompts in parallel"""
    tasks = [{"id": f"extract-{i+1}", "role": "extractor", "prompt": p} for i, p in enumerate(prompts)]
    orch = Orchestrator(max_parallel=min(5, len(prompts)))
    results = orch.run_parallel(tasks)
    orch.save_results(name)
    return results

def quick_code(specs: list, name: str = "quick_code"):
    """Quick code generation from multiple specs in parallel"""
    tasks = [{"id": f"code-{i+1}", "role": "coder", "prompt": s} for i, s in enumerate(specs)]
    orch = Orchestrator(max_parallel=min(5, len(specs)))
    results = orch.run_parallel(tasks)
    orch.save_results(name)
    return results

def quick_analyze(items: list, name: str = "quick_analyze"):
    """Quick analysis of multiple items in parallel"""
    tasks = [{"id": f"analyze-{i+1}", "role": "analyst", "prompt": item} for i, item in enumerate(items)]
    orch = Orchestrator(max_parallel=min(5, len(items)))
    results = orch.run_parallel(tasks)
    orch.save_results(name)
    return results

def quick_validate(items: list, schema: str = None, name: str = "quick_validate"):
    """Quick validation of multiple items in parallel"""
    tasks = []
    for i, item in enumerate(items):
        prompt = f"Validate this data:\n\n{item}"
        if schema:
            prompt += f"\n\nExpected schema:\n{schema}"
        tasks.append({"id": f"validate-{i+1}", "role": "validator", "prompt": prompt})
    
    orch = Orchestrator(max_parallel=min(5, len(items)))
    results = orch.run_parallel(tasks)
    orch.save_results(name)
    return results

def single_agent(role: str, prompt: str, name: str = "single_agent"):
    """Run a single agent task"""
    if role not in AGENT_ROLES:
        print(f"Unknown role: {role}")
        print(f"Available: {list(AGENT_ROLES.keys())}")
        return None
    
    agent = Agent(role)
    result = agent.execute(prompt)
    
    # Save result
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = RESULTS_DIR / f"{name}_{timestamp}.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2)
    
    txt_path = RESULTS_DIR / f"{name}_{timestamp}.txt"
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(result.get("content", ""))
    
    print(f"\n[SUCCESS] {role} agent completed")
    print(f"Tokens: {result.get('input_tokens', 0)} in / {result.get('output_tokens', 0)} out")
    print(f"Results: {json_path}")
    
    return result

# =============================================================================
# PRISM-SPECIFIC SWARM PATTERNS
# =============================================================================

def extract_materials_batch(material_categories: list):
    """Extract material data for multiple categories"""
    prompts = []
    for cat in material_categories:
        prompts.append(f"""Generate a JSON array of materials for category: {cat}
Each material should have:
- id (string)
- name (string)  
- density_kg_m3 (number)
- tensile_strength_mpa (number)
- hardness (number with appropriate scale)
- machinability_rating (0-100)
- typical_applications (array of strings)

Return ONLY valid JSON, no markdown, no explanation.""")
    
    return quick_extract(prompts, f"materials_{len(material_categories)}_categories")

def extract_from_files(file_paths: list, instruction: str):
    """Extract data from multiple files in parallel"""
    tasks = []
    for i, fp in enumerate(file_paths):
        tasks.append({
            "id": f"file-{i+1}",
            "role": "extractor",
            "prompt": instruction,
            "files": [fp]
        })
    
    orch = Orchestrator(max_parallel=min(5, len(file_paths)))
    results = orch.run_parallel(tasks)
    orch.save_results("file_extraction")
    return results

def generate_module_code(module_specs: list):
    """Generate code for multiple modules in parallel"""
    tasks = []
    for spec in module_specs:
        tasks.append({
            "id": f"module-{spec['name']}",
            "role": "coder",
            "prompt": f"""Generate a Python module: {spec['name']}

Requirements:
{spec['requirements']}

Include:
- Type hints for all functions
- Docstrings for all public functions
- Error handling
- Example usage in __main__

Output ONLY the Python code, no markdown backticks."""
        })
    
    orch = Orchestrator(max_parallel=min(5, len(module_specs)))
    results = orch.run_parallel(tasks)
    orch.save_results("module_generation")
    return results

# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
PRISM Swarm Trigger
==================

Quick Commands:
  python swarm_trigger.py single <role> "<prompt>"
  python swarm_trigger.py materials <cat1> <cat2> ...
  python swarm_trigger.py task <task_file.json>

Examples:
  python swarm_trigger.py single coder "Write a function to calculate feed rate"
  python swarm_trigger.py materials "Aluminum" "Steel" "Titanium"
  python swarm_trigger.py task my_task.json

Roles: extractor, validator, merger, coder, analyst, researcher
""")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "single" and len(sys.argv) >= 4:
        role = sys.argv[2]
        prompt = sys.argv[3]
        single_agent(role, prompt)
    
    elif cmd == "materials" and len(sys.argv) >= 3:
        categories = sys.argv[2:]
        extract_materials_batch(categories)
    
    elif cmd == "task" and len(sys.argv) >= 3:
        # Import and run from orchestrator
        from prism_orchestrator import main as orch_main
        sys.argv = [sys.argv[0], sys.argv[2]]
        orch_main()
    
    else:
        print(f"Unknown command: {cmd}")
        print("Run without arguments for help")
