"""
PRISM Resource Wiring Audit & Optimization System v1.0
=======================================================
Audits all resources (skills, agents, scripts, hooks, swarms, formulas)
and creates a unified wiring matrix for complete integration.

Usage:
  py -3 resource_wiring_audit.py audit     # Full audit
  py -3 resource_wiring_audit.py gaps      # Show gaps only
  py -3 resource_wiring_audit.py wire      # Generate wiring fixes
  py -3 resource_wiring_audit.py report    # Full report to file
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Any, Tuple
from dataclasses import dataclass, field, asdict

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
SCRIPTS_DIR = PRISM_ROOT / "scripts"
SKILLS_DIR = PRISM_ROOT / "skills-consolidated"
DATA_DIR = PRISM_ROOT / "data"
COORDINATION_DIR = DATA_DIR / "coordination"
STATE_DIR = PRISM_ROOT / "state"

# Registry files
RESOURCE_REGISTRY = COORDINATION_DIR / "RESOURCE_REGISTRY.json"
CAPABILITY_MATRIX = COORDINATION_DIR / "CAPABILITY_MATRIX.json"
SYNERGY_MATRIX = COORDINATION_DIR / "SYNERGY_MATRIX.json"
AGENT_REGISTRY = COORDINATION_DIR / "AGENT_REGISTRY.json"
SCRIPT_REGISTRY = COORDINATION_DIR / "SCRIPT_REGISTRY.json"
SKILL_TREE_REGISTRY = COORDINATION_DIR / "SKILL_TREE_REGISTRY.json"

@dataclass
class ResourceInventory:
    """Complete inventory of all PRISM resources"""
    skills_on_disk: Set[str] = field(default_factory=set)
    skills_registered: Set[str] = field(default_factory=set)
    skills_in_capability_matrix: Set[str] = field(default_factory=set)
    
    agents_registered: Set[str] = field(default_factory=set)
    agents_in_capability_matrix: Set[str] = field(default_factory=set)
    
    scripts_on_disk: Set[str] = field(default_factory=set)
    scripts_registered: Set[str] = field(default_factory=set)
    
    formulas_registered: Set[str] = field(default_factory=set)
    hooks_registered: Set[str] = field(default_factory=set)
    swarms_registered: Set[str] = field(default_factory=set)
    
    # Wiring gaps
    skills_unwired: Set[str] = field(default_factory=set)
    agents_unwired: Set[str] = field(default_factory=set)
    scripts_unwired: Set[str] = field(default_factory=set)

def load_json(path: Path) -> Dict:
    """Load JSON file safely"""
    try:
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"[WARN] Could not load {path.name}: {e}")
    return {}

def save_json(path: Path, data: Dict):
    """Save JSON file"""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str)

def scan_skills_on_disk() -> Set[str]:
    """Scan all skill directories"""
    skills = set()
    if SKILLS_DIR.exists():
        for item in SKILLS_DIR.iterdir():
            if item.is_dir() and item.name.startswith("prism-"):
                skill_file = item / "SKILL.md"
                if skill_file.exists():
                    skills.add(item.name)
    return skills

def scan_scripts_on_disk() -> Set[str]:
    """Scan all Python scripts (excluding __pycache__, tests, etc.)"""
    scripts = set()
    exclude_dirs = {"__pycache__", "_archive", "state", ".git"}
    exclude_prefixes = ("test_", "__")
    
    for item in SCRIPTS_DIR.rglob("*.py"):
        # Skip excluded directories
        if any(ex in str(item) for ex in exclude_dirs):
            continue
        # Skip test files and internal files
        if item.name.startswith(exclude_prefixes):
            continue
        scripts.add(item.stem)
    return scripts

def audit_resources() -> ResourceInventory:
    """Perform complete resource audit"""
    inventory = ResourceInventory()
    
    # 1. Scan disk
    print("[*] Scanning disk for resources...")
    inventory.skills_on_disk = scan_skills_on_disk()
    inventory.scripts_on_disk = scan_scripts_on_disk()
    
    # 2. Load registries
    print("[*] Loading registries...")
    
    # Resource Registry
    res_reg = load_json(RESOURCE_REGISTRY)
    if res_reg:
        resources = res_reg.get("resourceRegistry", {}).get("resources", {})
        
        # Skills
        skills_data = resources.get("skills", {}).get("items", {})
        for skill_id, skill_info in skills_data.items():
            inventory.skills_registered.add(skill_id)
        
        # Agents
        agents_data = resources.get("agents", {}).get("items", {})
        for agent_id, agent_info in agents_data.items():
            inventory.agents_registered.add(agent_id)
        
        # Formulas
        formulas_data = resources.get("formulas", {}).get("items", {})
        for formula_id in formulas_data:
            inventory.formulas_registered.add(formula_id)
        
        # Hooks
        hooks_data = resources.get("hooks", {}).get("items", {})
        for hook_id in hooks_data:
            inventory.hooks_registered.add(hook_id)
        
        # Swarms
        swarms_data = resources.get("swarmPatterns", {}).get("items", {})
        for swarm_id in swarms_data:
            inventory.swarms_registered.add(swarm_id)
    
    # Script Registry
    script_reg = load_json(SCRIPT_REGISTRY)
    if script_reg:
        categories = script_reg.get("scriptRegistry", {}).get("categories", {})
        for cat_name, cat_data in categories.items():
            scripts = cat_data.get("scripts", {})
            for script_name in scripts:
                inventory.scripts_registered.add(script_name)
    
    # Capability Matrix
    cap_matrix = load_json(CAPABILITY_MATRIX)
    if cap_matrix:
        caps = cap_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
        for res_id, res_data in caps.items():
            name = res_data.get("name", "")
            if name.startswith("prism-"):
                inventory.skills_in_capability_matrix.add(name)
            elif res_id.startswith("AGENT-"):
                inventory.agents_in_capability_matrix.add(res_data.get("name", res_id))
    
    # 3. Calculate gaps
    print("[*] Calculating wiring gaps...")
    
    # Skills on disk but not in capability matrix
    inventory.skills_unwired = inventory.skills_on_disk - inventory.skills_in_capability_matrix
    
    # Agents registered but not in capability matrix
    inventory.agents_unwired = inventory.agents_registered - inventory.agents_in_capability_matrix
    
    # Scripts on disk but not registered
    inventory.scripts_unwired = inventory.scripts_on_disk - inventory.scripts_registered
    
    return inventory

def print_audit_report(inventory: ResourceInventory):
    """Print detailed audit report"""
    print("\n" + "="*70)
    print("       PRISM RESOURCE WIRING AUDIT REPORT")
    print("       Generated:", datetime.now().isoformat())
    print("="*70)
    
    # Summary
    print("\n[SUMMARY]")
    print(f"  Skills on disk:          {len(inventory.skills_on_disk)}")
    print(f"  Skills registered:       {len(inventory.skills_registered)}")
    print(f"  Skills in capability:    {len(inventory.skills_in_capability_matrix)}")
    print(f"  Skills UNWIRED:          {len(inventory.skills_unwired)}")
    print()
    print(f"  Agents registered:       {len(inventory.agents_registered)}")
    print(f"  Agents in capability:    {len(inventory.agents_in_capability_matrix)}")
    print(f"  Agents UNWIRED:          {len(inventory.agents_unwired)}")
    print()
    print(f"  Scripts on disk:         {len(inventory.scripts_on_disk)}")
    print(f"  Scripts registered:      {len(inventory.scripts_registered)}")
    print(f"  Scripts UNWIRED:         {len(inventory.scripts_unwired)}")
    print()
    print(f"  Formulas registered:     {len(inventory.formulas_registered)}")
    print(f"  Hooks registered:        {len(inventory.hooks_registered)}")
    print(f"  Swarms registered:       {len(inventory.swarms_registered)}")
    
    # Wiring status
    total_resources = (len(inventory.skills_on_disk) + 
                       len(inventory.agents_registered) +
                       len(inventory.scripts_on_disk) +
                       len(inventory.formulas_registered) +
                       len(inventory.hooks_registered) +
                       len(inventory.swarms_registered))
    
    total_unwired = (len(inventory.skills_unwired) + 
                     len(inventory.agents_unwired) +
                     len(inventory.scripts_unwired))
    
    wired_pct = ((total_resources - total_unwired) / total_resources * 100) if total_resources > 0 else 0
    
    print()
    print(f"  TOTAL RESOURCES:         {total_resources}")
    print(f"  TOTAL UNWIRED:           {total_unwired}")
    print(f"  WIRING COVERAGE:         {wired_pct:.1f}%")
    
    # Gaps detail
    if inventory.skills_unwired:
        print("\n[UNWIRED SKILLS] (not in capability matrix)")
        for skill in sorted(inventory.skills_unwired):
            print(f"    - {skill}")
    
    if inventory.scripts_unwired:
        print("\n[UNWIRED SCRIPTS] (not in script registry)")
        # Group by type
        generators = [s for s in inventory.scripts_unwired if "generator" in s or "gen_" in s]
        materials = [s for s in inventory.scripts_unwired if "material" in s]
        other = [s for s in inventory.scripts_unwired if s not in generators and s not in materials]
        
        if generators:
            print("    Generators (likely one-off):")
            for s in sorted(generators)[:10]:
                print(f"      - {s}")
            if len(generators) > 10:
                print(f"      ... and {len(generators)-10} more")
        
        if materials:
            print("    Materials scripts:")
            for s in sorted(materials)[:10]:
                print(f"      - {s}")
            if len(materials) > 10:
                print(f"      ... and {len(materials)-10} more")
        
        if other:
            print("    Other scripts:")
            for s in sorted(other)[:15]:
                print(f"      - {s}")
            if len(other) > 15:
                print(f"      ... and {len(other)-15} more")
    
    print("\n" + "="*70)

def generate_capability_additions(inventory: ResourceInventory) -> Dict:
    """Generate capability matrix additions for unwired skills"""
    additions = {"skills": {}, "timestamp": datetime.now().isoformat()}
    
    # Domain inference based on skill name
    domain_patterns = {
        "material": ["materials", "physics"],
        "physics": ["physics", "calculation"],
        "machine": ["machining", "tooling"],
        "tool": ["tooling", "machining"],
        "fanuc": ["gcode", "machining"],
        "siemens": ["gcode", "machining"],
        "heidenhain": ["gcode", "machining"],
        "gcode": ["gcode", "machining"],
        "post": ["gcode", "machining"],
        "controller": ["gcode", "machining"],
        "alarm": ["validation", "safety"],
        "quality": ["validation", "testing"],
        "test": ["testing", "validation"],
        "valid": ["validation"],
        "code": ["planning", "documentation"],
        "session": ["coordination", "planning"],
        "state": ["coordination"],
        "extract": ["extraction"],
        "monolith": ["extraction"],
        "planning": ["planning"],
        "sp-": ["planning", "coordination"],
        "expert": ["documentation", "validation"],
        "knowledge": ["documentation"],
        "error": ["validation", "safety"],
        "safety": ["safety", "validation"],
    }
    
    operation_patterns = {
        "validator": ["validate", "verify"],
        "enhancer": ["transform", "optimize"],
        "generator": ["generate"],
        "extractor": ["extract"],
        "calculator": ["calculate"],
        "lookup": ["analyze"],
        "selector": ["analyze", "optimize"],
        "coordinator": ["coordinate"],
        "planning": ["plan"],
        "debugging": ["debug"],
        "execution": ["execute"],
        "verification": ["verify"],
        "review": ["validate", "analyze"],
    }
    
    for skill in inventory.skills_unwired:
        skill_lower = skill.lower()
        
        # Infer domains
        domains = {}
        for pattern, domain_list in domain_patterns.items():
            if pattern in skill_lower:
                for d in domain_list:
                    domains[d] = domains.get(d, 0) + 0.85
        
        # Default domains if none found
        if not domains:
            domains = {"planning": 0.5, "documentation": 0.5}
        
        # Normalize domain scores
        max_score = max(domains.values()) if domains else 1.0
        domains = {k: min(v/max_score, 1.0) for k, v in domains.items()}
        
        # Infer operations
        operations = {}
        for pattern, op_list in operation_patterns.items():
            if pattern in skill_lower:
                for op in op_list:
                    operations[op] = operations.get(op, 0) + 0.85
        
        # Default operations
        if not operations:
            operations = {"analyze": 0.5, "document": 0.5}
        
        # Normalize
        max_score = max(operations.values()) if operations else 1.0
        operations = {k: min(v/max_score, 1.0) for k, v in operations.items()}
        
        additions["skills"][skill] = {
            "domainScores": domains,
            "operationScores": operations,
            "complexity": 0.65,  # Default
            "inferred": True
        }
    
    return additions

def generate_script_registry_additions(inventory: ResourceInventory) -> Dict:
    """Generate script registry additions for unregistered scripts"""
    additions = {"scripts": {}, "timestamp": datetime.now().isoformat()}
    
    # Categorize scripts
    categories = {
        "generators": [],
        "materials": [],
        "validation": [],
        "extraction": [],
        "tools": [],
        "misc": []
    }
    
    for script in inventory.scripts_unwired:
        script_lower = script.lower()
        if "generator" in script_lower or "gen_" in script_lower:
            categories["generators"].append(script)
        elif "material" in script_lower:
            categories["materials"].append(script)
        elif "valid" in script_lower or "verify" in script_lower or "check" in script_lower:
            categories["validation"].append(script)
        elif "extract" in script_lower:
            categories["extraction"].append(script)
        elif "tool" in script_lower:
            categories["tools"].append(script)
        else:
            categories["misc"].append(script)
    
    additions["categories"] = categories
    additions["summary"] = {cat: len(scripts) for cat, scripts in categories.items()}
    
    return additions

def create_unified_wiring_matrix(inventory: ResourceInventory) -> Dict:
    """Create a unified wiring matrix connecting all resources"""
    matrix = {
        "metadata": {
            "version": "1.0.0",
            "created": datetime.now().isoformat(),
            "purpose": "Unified resource wiring for complete integration"
        },
        "totals": {
            "skills": len(inventory.skills_on_disk),
            "agents": len(inventory.agents_registered),
            "scripts": len(inventory.scripts_on_disk),
            "formulas": len(inventory.formulas_registered),
            "hooks": len(inventory.hooks_registered),
            "swarms": len(inventory.swarms_registered)
        },
        "wiring_status": {
            "skills_wired": len(inventory.skills_on_disk) - len(inventory.skills_unwired),
            "skills_unwired": len(inventory.skills_unwired),
            "agents_wired": len(inventory.agents_registered) - len(inventory.agents_unwired),
            "agents_unwired": len(inventory.agents_unwired),
            "scripts_wired": len(inventory.scripts_registered),
            "scripts_unwired": len(inventory.scripts_unwired)
        },
        "skill_to_agent_map": {},
        "agent_to_skill_map": {},
        "script_to_skill_map": {},
        "formula_dependencies": {},
        "hook_triggers": {},
        "swarm_compositions": {}
    }
    
    # Build skill-to-agent mappings from agent registry
    agent_reg = load_json(AGENT_REGISTRY)
    if agent_reg:
        agents = agent_reg.get("agentRegistry", {}).get("agents", {})
        for agent_id, agent_data in agents.items():
            skills_used = agent_data.get("skillsUsed", [])
            matrix["agent_to_skill_map"][agent_id] = skills_used
            for skill in skills_used:
                if skill not in matrix["skill_to_agent_map"]:
                    matrix["skill_to_agent_map"][skill] = []
                matrix["skill_to_agent_map"][skill].append(agent_id)
    
    return matrix

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "audit":
        inventory = audit_resources()
        print_audit_report(inventory)
        
    elif cmd == "gaps":
        inventory = audit_resources()
        print("\n[WIRING GAPS]")
        print(f"  Unwired skills: {len(inventory.skills_unwired)}")
        print(f"  Unwired scripts: {len(inventory.scripts_unwired)}")
        print(f"  Unwired agents: {len(inventory.agents_unwired)}")
        
    elif cmd == "wire":
        inventory = audit_resources()
        
        # Generate capability additions
        cap_additions = generate_capability_additions(inventory)
        cap_file = COORDINATION_DIR / "CAPABILITY_ADDITIONS.json"
        save_json(cap_file, cap_additions)
        print(f"[OK] Generated {len(cap_additions['skills'])} capability additions -> {cap_file}")
        
        # Generate script registry additions
        script_additions = generate_script_registry_additions(inventory)
        script_file = COORDINATION_DIR / "SCRIPT_ADDITIONS.json"
        save_json(script_file, script_additions)
        print(f"[OK] Generated script categorization -> {script_file}")
        
        # Create unified wiring matrix
        matrix = create_unified_wiring_matrix(inventory)
        matrix_file = COORDINATION_DIR / "UNIFIED_WIRING_MATRIX.json"
        save_json(matrix_file, matrix)
        print(f"[OK] Created unified wiring matrix -> {matrix_file}")
        
    elif cmd == "report":
        inventory = audit_resources()
        
        report = {
            "metadata": {
                "generated": datetime.now().isoformat(),
                "version": "1.0"
            },
            "inventory": {
                "skills_on_disk": sorted(inventory.skills_on_disk),
                "skills_registered": sorted(inventory.skills_registered),
                "skills_unwired": sorted(inventory.skills_unwired),
                "agents_registered": sorted(inventory.agents_registered),
                "scripts_on_disk": sorted(inventory.scripts_on_disk),
                "scripts_registered": sorted(inventory.scripts_registered),
                "scripts_unwired": sorted(inventory.scripts_unwired),
                "formulas": sorted(inventory.formulas_registered),
                "hooks": sorted(inventory.hooks_registered),
                "swarms": sorted(inventory.swarms_registered)
            },
            "summary": {
                "total_skills": len(inventory.skills_on_disk),
                "total_agents": len(inventory.agents_registered),
                "total_scripts": len(inventory.scripts_on_disk),
                "total_formulas": len(inventory.formulas_registered),
                "total_hooks": len(inventory.hooks_registered),
                "total_swarms": len(inventory.swarms_registered),
                "unwired_skills": len(inventory.skills_unwired),
                "unwired_scripts": len(inventory.scripts_unwired)
            }
        }
        
        report_file = STATE_DIR / "RESOURCE_WIRING_REPORT.json"
        save_json(report_file, report)
        print(f"[OK] Full report saved -> {report_file}")
        print_audit_report(inventory)
        
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)

if __name__ == "__main__":
    main()
