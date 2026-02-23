"""
PRISM Resource Wiring Updater v1.0
==================================
Applies accurate capability scores for unwired skills and updates registries.
"""

import json
from pathlib import Path
from datetime import datetime

PRISM_ROOT = Path(r"C:\PRISM")
COORDINATION_DIR = PRISM_ROOT / "data" / "coordination"
CAPABILITY_MATRIX = COORDINATION_DIR / "CAPABILITY_MATRIX.json"
SCRIPT_REGISTRY = COORDINATION_DIR / "SCRIPT_REGISTRY.json"

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str)

# Accurate capability definitions for unwired skills
SKILL_CAPABILITIES = {
    "prism-skill-orchestrator": {
        "domainScores": {"coordination": 1.0, "planning": 0.95, "optimization": 0.9},
        "operationScores": {"coordinate": 1.0, "plan": 0.95, "optimize": 0.9, "analyze": 0.85},
        "complexity": 0.88
    },
    "prism-anti-regression": {
        "domainScores": {"validation": 1.0, "safety": 0.95, "testing": 0.9},
        "operationScores": {"validate": 1.0, "verify": 0.95, "analyze": 0.9, "test": 0.85},
        "complexity": 0.82
    },
    "prism-life-safety-mindset": {
        "domainScores": {"safety": 1.0, "validation": 0.95, "machining": 0.85},
        "operationScores": {"validate": 1.0, "verify": 0.95, "analyze": 0.9},
        "complexity": 0.75
    },
    "prism-maximum-completeness": {
        "domainScores": {"validation": 1.0, "planning": 0.9, "coordination": 0.85},
        "operationScores": {"validate": 1.0, "verify": 0.95, "analyze": 0.9, "plan": 0.85},
        "complexity": 0.78
    },
    "prism-predictive-thinking": {
        "domainScores": {"planning": 1.0, "optimization": 0.9, "coordination": 0.85},
        "operationScores": {"plan": 1.0, "analyze": 0.95, "optimize": 0.9, "verify": 0.8},
        "complexity": 0.85
    },
    "prism-mandatory-microsession": {
        "domainScores": {"coordination": 1.0, "planning": 0.95, "safety": 0.85},
        "operationScores": {"coordinate": 1.0, "plan": 0.95, "execute": 0.9, "verify": 0.85},
        "complexity": 0.72
    },
    "prism-prompt-engineering": {
        "domainScores": {"optimization": 1.0, "coordination": 0.9, "documentation": 0.85},
        "operationScores": {"optimize": 1.0, "generate": 0.95, "analyze": 0.9, "transform": 0.85},
        "complexity": 0.88
    },
    "prism-tdd-enhanced": {
        "domainScores": {"testing": 1.0, "validation": 0.95, "planning": 0.85},
        "operationScores": {"test": 1.0, "validate": 0.95, "verify": 0.9, "plan": 0.85},
        "complexity": 0.8
    },
    "prism-design-patterns": {
        "domainScores": {"planning": 1.0, "documentation": 0.9, "optimization": 0.85},
        "operationScores": {"plan": 1.0, "document": 0.95, "analyze": 0.9, "synthesize": 0.85},
        "complexity": 0.82
    },
    "prism-solid-principles": {
        "domainScores": {"planning": 1.0, "documentation": 0.9, "validation": 0.85},
        "operationScores": {"plan": 1.0, "document": 0.95, "validate": 0.9, "analyze": 0.85},
        "complexity": 0.8
    },
    "prism-error-handling-patterns": {
        "domainScores": {"validation": 1.0, "safety": 0.95, "planning": 0.85},
        "operationScores": {"validate": 1.0, "debug": 0.95, "analyze": 0.9, "plan": 0.85},
        "complexity": 0.78
    },
    "prism-performance-patterns": {
        "domainScores": {"optimization": 1.0, "validation": 0.9, "testing": 0.85},
        "operationScores": {"optimize": 1.0, "analyze": 0.95, "test": 0.9, "validate": 0.85},
        "complexity": 0.82
    },
    "prism-security-coding": {
        "domainScores": {"safety": 1.0, "validation": 0.95, "planning": 0.85},
        "operationScores": {"validate": 1.0, "verify": 0.95, "analyze": 0.9, "plan": 0.85},
        "complexity": 0.8
    },
    "prism-typescript-safety": {
        "domainScores": {"validation": 1.0, "safety": 0.95, "planning": 0.85},
        "operationScores": {"validate": 1.0, "verify": 0.95, "analyze": 0.9, "generate": 0.8},
        "complexity": 0.78
    },
    "prism-code-complete-integration": {
        "domainScores": {"planning": 1.0, "documentation": 0.9, "validation": 0.85},
        "operationScores": {"plan": 1.0, "document": 0.95, "validate": 0.9, "analyze": 0.85},
        "complexity": 0.82
    },
    "prism-codebase-packaging": {
        "domainScores": {"extraction": 1.0, "coordination": 0.9, "documentation": 0.85},
        "operationScores": {"extract": 1.0, "transform": 0.95, "analyze": 0.9, "document": 0.85},
        "complexity": 0.75
    },
    "prism-skill-deployer": {
        "domainScores": {"coordination": 1.0, "planning": 0.9, "validation": 0.85},
        "operationScores": {"execute": 1.0, "coordinate": 0.95, "validate": 0.9, "verify": 0.85},
        "complexity": 0.72
    }
}

# Important scripts to add to registry
SCRIPT_ADDITIONS = {
    "integration": {
        "excel_to_json": {
            "path": "C:\\PRISM\\scripts\\integration\\excel_to_json.py",
            "commands": ["<excel_file>"],
            "trigger": "excel convert",
            "description": "Convert Excel to JSON"
        },
        "json_to_duckdb": {
            "path": "C:\\PRISM\\scripts\\integration\\json_to_duckdb.py",
            "commands": ["<json_dir>"],
            "trigger": "duckdb",
            "description": "Load JSON to DuckDB"
        },
        "obsidian_generator": {
            "path": "C:\\PRISM\\scripts\\integration\\obsidian_generator.py",
            "commands": [],
            "trigger": "obsidian",
            "description": "Generate Obsidian vault"
        },
        "master_sync": {
            "path": "C:\\PRISM\\scripts\\integration\\master_sync.py",
            "commands": ["--full", "--incremental"],
            "trigger": "sync all",
            "description": "Master sync pipeline"
        }
    },
    "automation": {
        "auto_context": {
            "path": "C:\\PRISM\\scripts\\automation\\auto_context.py",
            "commands": [],
            "trigger": "auto context",
            "description": "Auto-generate context"
        },
        "template_generator": {
            "path": "C:\\PRISM\\scripts\\automation\\template_generator.py",
            "commands": ["<type>"],
            "trigger": "generate template",
            "description": "Generate code templates"
        },
        "git_manager": {
            "path": "C:\\PRISM\\scripts\\automation\\git_manager.py",
            "commands": ["commit", "push", "status"],
            "trigger": "git",
            "description": "Git operations"
        }
    },
    "core": {
        "prism_cli": {
            "path": "C:\\PRISM\\scripts\\prism.py",
            "commands": ["sync", "audit", "health", "validate"],
            "trigger": "prism",
            "description": "PRISM CLI master tool"
        },
        "skill_tree_navigator": {
            "path": "C:\\PRISM\\scripts\\skill_tree_navigator.py",
            "commands": ["find", "list", "path"],
            "trigger": "skill tree",
            "description": "Navigate skill tree"
        },
        "skill_tree_sync": {
            "path": "C:\\PRISM\\scripts\\skill_tree_sync.py",
            "commands": [],
            "trigger": "sync skills",
            "description": "Sync skill tree registry"
        },
        "resource_wiring_audit": {
            "path": "C:\\PRISM\\scripts\\resource_wiring_audit.py",
            "commands": ["audit", "gaps", "wire", "report"],
            "trigger": "wiring audit",
            "description": "Audit resource wiring"
        }
    }
}

def update_capability_matrix():
    """Add unwired skills to capability matrix"""
    cap_matrix = load_json(CAPABILITY_MATRIX)
    
    caps = cap_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
    
    # Find next available ID
    existing_ids = [int(k.split("-")[1]) for k in caps.keys() if k.startswith("SKILL-")]
    next_id = max(existing_ids) + 1 if existing_ids else 1
    
    added = 0
    for skill_name, skill_caps in SKILL_CAPABILITIES.items():
        # Check if already exists
        exists = any(v.get("name") == skill_name for v in caps.values())
        if not exists:
            skill_id = f"SKILL-{next_id:03d}"
            caps[skill_id] = {
                "name": skill_name,
                **skill_caps,
                "taskTypeScores": {},
                "addedBy": "wiring_updater",
                "addedAt": datetime.now().isoformat()
            }
            next_id += 1
            added += 1
            print(f"  [+] Added {skill_name} as {skill_id}")
    
    # Update metadata
    cap_matrix["capabilityMatrix"]["resourceCapabilities"] = caps
    cap_matrix["capabilityMatrix"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    cap_matrix["capabilityMatrix"]["metadata"]["dimensions"]["resources"] = len(caps)
    
    save_json(CAPABILITY_MATRIX, cap_matrix)
    return added

def update_script_registry():
    """Add important scripts to registry"""
    script_reg = load_json(SCRIPT_REGISTRY)
    
    categories = script_reg.get("scriptRegistry", {}).get("categories", {})
    
    added = 0
    for cat_name, scripts in SCRIPT_ADDITIONS.items():
        if cat_name not in categories:
            categories[cat_name] = {
                "description": f"{cat_name.title()} scripts",
                "scripts": {}
            }
        
        for script_name, script_data in scripts.items():
            if script_name not in categories[cat_name].get("scripts", {}):
                categories[cat_name]["scripts"][script_name] = script_data
                added += 1
                print(f"  [+] Added {script_name} to {cat_name}")
    
    # Update counts
    total = sum(len(cat.get("scripts", {})) for cat in categories.values())
    script_reg["scriptRegistry"]["categories"] = categories
    script_reg["scriptRegistry"]["metadata"]["totalScripts"] = total
    script_reg["scriptRegistry"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    
    save_json(SCRIPT_REGISTRY, script_reg)
    return added

def main():
    print("="*60)
    print("PRISM Resource Wiring Updater")
    print("="*60)
    
    print("\n[1] Updating Capability Matrix...")
    cap_added = update_capability_matrix()
    print(f"    Added {cap_added} skills to capability matrix")
    
    print("\n[2] Updating Script Registry...")
    script_added = update_script_registry()
    print(f"    Added {script_added} scripts to registry")
    
    print("\n[COMPLETE]")
    print(f"  Total capability additions: {cap_added}")
    print(f"  Total script additions: {script_added}")
    print("="*60)

if __name__ == "__main__":
    main()
