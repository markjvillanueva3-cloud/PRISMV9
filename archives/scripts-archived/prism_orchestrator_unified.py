"""
PRISM Unified Orchestration System v7.0
=======================================
Efficient resource coordination with complete wiring.

Features:
- Complete skill wiring (118 skills, 100% coverage)
- 64 agents across 3 tiers
- 22 formulas with dependencies
- 8 swarm patterns
- 147 hooks (15 system-enforced)
- Unified CLI interface

Usage:
  py -3 prism_orchestrator_unified.py status      # System status
  py -3 prism_orchestrator_unified.py route <task> # Route task to optimal resources
  py -3 prism_orchestrator_unified.py execute <mode> <task>  # Execute task
  py -3 prism_orchestrator_unified.py optimize    # Optimize wiring
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field

# Configuration
PRISM_ROOT = Path(r"C:\PRISM")
DATA_DIR = PRISM_ROOT / "data"
COORDINATION_DIR = DATA_DIR / "coordination"
STATE_DIR = PRISM_ROOT / "state"
SCRIPTS_DIR = PRISM_ROOT / "scripts"

# Registry files
RESOURCE_REGISTRY = COORDINATION_DIR / "RESOURCE_REGISTRY.json"
CAPABILITY_MATRIX = COORDINATION_DIR / "CAPABILITY_MATRIX.json"
SYNERGY_MATRIX = COORDINATION_DIR / "SYNERGY_MATRIX.json"
AGENT_REGISTRY = COORDINATION_DIR / "AGENT_REGISTRY.json"
SCRIPT_REGISTRY = COORDINATION_DIR / "SCRIPT_REGISTRY.json"
CURRENT_STATE = STATE_DIR / "CURRENT_STATE.json"

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

@dataclass
class SystemStatus:
    """Complete system status"""
    skills_total: int = 0
    skills_wired: int = 0
    agents_total: int = 0
    agents_wired: int = 0
    scripts_total: int = 0
    scripts_wired: int = 0
    formulas_total: int = 0
    hooks_total: int = 0
    hooks_active: int = 0
    swarms_total: int = 0
    wiring_coverage: float = 0.0
    orchestrator_version: str = "7.0"
    last_updated: str = ""

def get_system_status() -> SystemStatus:
    """Get comprehensive system status"""
    status = SystemStatus()
    status.last_updated = datetime.now().isoformat()
    
    # Load registries
    res_reg = load_json(RESOURCE_REGISTRY)
    cap_matrix = load_json(CAPABILITY_MATRIX)
    script_reg = load_json(SCRIPT_REGISTRY)
    state = load_json(CURRENT_STATE)
    
    # Skills
    if res_reg:
        resources = res_reg.get("resourceRegistry", {}).get("resources", {})
        status.skills_total = resources.get("skills", {}).get("count", 0)
        status.agents_total = resources.get("agents", {}).get("count", 0)
        status.formulas_total = resources.get("formulas", {}).get("count", 0)
        status.hooks_total = resources.get("hooks", {}).get("count", 0)
        status.hooks_active = resources.get("hooks", {}).get("active", 0)
        status.swarms_total = resources.get("swarmPatterns", {}).get("count", 0)
    
    # Capability matrix
    if cap_matrix:
        caps = cap_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
        status.skills_wired = len([k for k in caps if k.startswith("SKILL-")])
        status.agents_wired = len([k for k in caps if k.startswith("AGENT-")])
    
    # Scripts
    if script_reg:
        categories = script_reg.get("scriptRegistry", {}).get("categories", {})
        status.scripts_wired = sum(len(cat.get("scripts", {})) for cat in categories.values())
    
    # Count scripts on disk
    status.scripts_total = len(list(SCRIPTS_DIR.rglob("*.py")))
    
    # Calculate coverage
    total = status.skills_total + status.agents_total + status.scripts_total
    wired = status.skills_wired + status.agents_wired + status.scripts_wired
    status.wiring_coverage = (wired / total * 100) if total > 0 else 0
    
    # Version from state
    if state:
        infra = state.get("infrastructure", {})
        status.orchestrator_version = infra.get("orchestratorVersion", "7.0")
    
    return status

def route_task(task: str) -> Dict:
    """Route task to optimal resources using capability matching"""
    cap_matrix = load_json(CAPABILITY_MATRIX)
    agent_reg = load_json(AGENT_REGISTRY)
    
    # Extract task keywords
    task_lower = task.lower()
    
    # Domain detection
    domains = []
    domain_keywords = {
        "materials": ["material", "steel", "aluminum", "alloy", "metal"],
        "physics": ["force", "thermal", "stress", "temperature"],
        "machining": ["cut", "mill", "turn", "drill", "cnc", "machine"],
        "gcode": ["gcode", "g-code", "fanuc", "siemens", "post"],
        "validation": ["validate", "verify", "check", "test"],
        "extraction": ["extract", "parse", "monolith"],
        "planning": ["plan", "design", "architect"],
        "coordination": ["coordinate", "orchestrate"],
        "optimization": ["optimize", "improve", "enhance"],
        "safety": ["safety", "safe", "risk"],
        "documentation": ["document", "readme", "guide"],
    }
    
    for domain, keywords in domain_keywords.items():
        if any(kw in task_lower for kw in keywords):
            domains.append(domain)
    
    if not domains:
        domains = ["planning"]  # Default
    
    # Find matching skills
    caps = cap_matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
    skill_scores = []
    
    for skill_id, skill_data in caps.items():
        if not skill_id.startswith("SKILL-"):
            continue
        
        domain_scores = skill_data.get("domainScores", {})
        score = sum(domain_scores.get(d, 0) for d in domains) / len(domains)
        
        if score > 0.3:
            skill_scores.append({
                "id": skill_id,
                "name": skill_data.get("name", skill_id),
                "score": score,
                "domains": list(domain_scores.keys())
            })
    
    # Sort by score
    skill_scores.sort(key=lambda x: x["score"], reverse=True)
    
    # Find matching agents
    agent_scores = []
    agents = agent_reg.get("agentRegistry", {}).get("agents", {}) if agent_reg else {}
    
    for agent_id, agent_data in agents.items():
        agent_domains = agent_data.get("domains", [])
        match = len(set(domains) & set(agent_domains)) / len(domains) if domains else 0
        
        if match > 0.2:
            agent_scores.append({
                "id": agent_id,
                "name": agent_data.get("name", agent_id),
                "tier": agent_data.get("tier", "SONNET"),
                "score": match,
                "capabilities": agent_data.get("capabilities", [])
            })
    
    agent_scores.sort(key=lambda x: x["score"], reverse=True)
    
    # Determine execution mode
    if len(skill_scores) > 5 or len(agent_scores) > 3:
        mode = "swarm"
    elif len(skill_scores) > 2:
        mode = "intelligent"
    else:
        mode = "single"
    
    return {
        "task": task,
        "detected_domains": domains,
        "recommended_skills": skill_scores[:8],
        "recommended_agents": agent_scores[:5],
        "execution_mode": mode,
        "timestamp": datetime.now().isoformat()
    }

def print_status():
    """Print system status"""
    status = get_system_status()
    
    print("\n" + "="*60)
    print("       PRISM UNIFIED ORCHESTRATION SYSTEM v7.0")
    print("="*60)
    
    print(f"\n[WIRING STATUS]")
    print(f"  Skills:     {status.skills_wired}/{status.skills_total} wired")
    print(f"  Agents:     {status.agents_wired}/{status.agents_total} wired")
    print(f"  Scripts:    {status.scripts_wired}/{status.scripts_total} registered")
    print(f"  Formulas:   {status.formulas_total} active")
    print(f"  Hooks:      {status.hooks_active}/{status.hooks_total} enforcing")
    print(f"  Swarms:     {status.swarms_total} patterns")
    print(f"\n  COVERAGE:   {status.wiring_coverage:.1f}%")
    
    print(f"\n[INFRASTRUCTURE]")
    print(f"  Orchestrator: v{status.orchestrator_version}")
    print(f"  Last Updated: {status.last_updated}")
    
    print("\n" + "="*60)

def print_routing(task: str):
    """Print task routing"""
    routing = route_task(task)
    
    print("\n" + "="*60)
    print(f"TASK ROUTING: {task[:50]}...")
    print("="*60)
    
    print(f"\n[DETECTED DOMAINS] {', '.join(routing['detected_domains'])}")
    
    print(f"\n[RECOMMENDED SKILLS] ({len(routing['recommended_skills'])} found)")
    for skill in routing['recommended_skills'][:5]:
        print(f"  {skill['name']}: {skill['score']:.2f}")
    
    print(f"\n[RECOMMENDED AGENTS] ({len(routing['recommended_agents'])} found)")
    for agent in routing['recommended_agents'][:3]:
        print(f"  {agent['name']} ({agent['tier']}): {agent['score']:.2f}")
    
    print(f"\n[EXECUTION MODE] {routing['execution_mode'].upper()}")
    print("="*60)

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == "status":
        print_status()
        
    elif cmd == "route":
        if len(sys.argv) < 3:
            print("Usage: prism_orchestrator_unified.py route <task>")
            sys.exit(1)
        task = " ".join(sys.argv[2:])
        print_routing(task)
        
    elif cmd == "execute":
        if len(sys.argv) < 4:
            print("Usage: prism_orchestrator_unified.py execute <mode> <task>")
            print("  Modes: single, swarm, intelligent, ralph")
            sys.exit(1)
        mode = sys.argv[2]
        task = " ".join(sys.argv[3:])
        
        # Delegate to unified system v6
        unified_script = SCRIPTS_DIR / "prism_unified_system_v6.py"
        if unified_script.exists():
            mode_flag = f"--{mode}"
            os.system(f'py -3 "{unified_script}" {mode_flag} "{task}"')
        else:
            print(f"[ERROR] Unified system not found: {unified_script}")
            sys.exit(1)
            
    elif cmd == "optimize":
        # Run wiring audit and optimization
        audit_script = SCRIPTS_DIR / "resource_wiring_audit.py"
        updater_script = SCRIPTS_DIR / "resource_wiring_updater.py"
        
        print("[*] Running wiring audit...")
        os.system(f'py -3 "{audit_script}" audit')
        
        print("\n[*] Running wiring updater...")
        os.system(f'py -3 "{updater_script}"')
        
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)

if __name__ == "__main__":
    main()
