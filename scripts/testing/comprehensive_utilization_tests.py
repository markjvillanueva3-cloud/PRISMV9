"""
PRISM COMPREHENSIVE RESOURCE UTILIZATION TEST SUITE v2.0
=========================================================
Ensures EVERY skill and agent can be utilized by the CombinationEngine.

Strategy:
1. Generate targeted trigger tasks for each skill based on its keywords
2. Generate targeted trigger tasks for each agent based on its domains
3. Test direct capability scoring for each resource
4. Test selection via optimization for each resource
5. Report any gaps and provide fixes

Author: Claude (PRISM Developer)
Date: 2026-01-28
"""

import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
from dataclasses import dataclass

PRISM_ROOT = Path(r"C:\PRISM")
sys.path.insert(0, str(PRISM_ROOT / "scripts"))

from prism_unified_system_v6 import (
    CombinationEngine, 
    SKILL_KEYWORDS, 
    AGENT_DEFINITIONS,
    SWARM_PATTERNS
)


@dataclass
class ResourceTestResult:
    """Result of testing a single resource"""
    name: str
    resource_type: str  # 'skill' or 'agent'
    has_keywords: bool
    has_capabilities: bool
    capability_score: float
    was_selected: bool
    trigger_task: str
    issues: List[str]
    
    @property
    def passed(self) -> bool:
        return self.has_keywords and self.has_capabilities and self.capability_score > 0


# =============================================================================
# SKILL TRIGGER TASK GENERATOR
# =============================================================================

def generate_skill_trigger_task(skill_name: str, keywords: List[str]) -> str:
    """Generate a task that will trigger selection of this specific skill"""
    
    # Use primary keywords to construct task
    if not keywords:
        return f"Use {skill_name} for this task"
    
    # Create task using skill keywords
    kw = keywords[:3]  # Top 3 keywords
    
    # Skill-specific task templates
    templates = {
        "material": "Calculate {kw0} properties for {kw1} steel with {kw2} analysis",
        "physics": "Compute {kw0} forces using {kw1} model for {kw2} operation",
        "extract": "Extract {kw0} data from {kw1} source with {kw2} validation",
        "validate": "Validate {kw0} compliance with {kw1} standards using {kw2}",
        "optimize": "Optimize {kw0} parameters for {kw1} performance with {kw2}",
        "coordinate": "Coordinate {kw0} workflow with {kw1} agents for {kw2}",
        "generate": "Generate {kw0} code for {kw1} controller with {kw2} format",
        "debug": "Debug {kw0} issue in {kw1} module with {kw2} tracing",
        "plan": "Plan {kw0} roadmap for {kw1} phase with {kw2} milestones",
        "document": "Document {kw0} interface for {kw1} API with {kw2} examples",
        "test": "Test {kw0} functionality with {kw1} coverage using {kw2}",
        "learn": "Learn {kw0} patterns from {kw1} data with {kw2} model",
        "convert": "Convert {kw0} units to {kw1} format with {kw2} precision",
        "lookup": "Lookup {kw0} in {kw1} database with {kw2} filters",
        "verify": "Verify {kw0} completion with {kw1} evidence at {kw2} level",
    }
    
    # Find best template based on keywords
    selected_template = "Use {kw0} for {kw1} task with {kw2} approach"
    
    for key, template in templates.items():
        if any(key in k.lower() for k in kw):
            selected_template = template
            break
    
    # Also check skill name
    skill_lower = skill_name.lower()
    if "material" in skill_lower:
        selected_template = templates["material"]
    elif "physics" in skill_lower:
        selected_template = templates["physics"]
    elif "extract" in skill_lower:
        selected_template = templates["extract"]
    elif "valid" in skill_lower:
        selected_template = templates["validate"]
    elif "optim" in skill_lower:
        selected_template = templates["optimize"]
    elif "coord" in skill_lower or "swarm" in skill_lower:
        selected_template = templates["coordinate"]
    elif "gcode" in skill_lower or "fanuc" in skill_lower or "siemens" in skill_lower:
        selected_template = templates["generate"]
    elif "debug" in skill_lower:
        selected_template = templates["debug"]
    elif "plan" in skill_lower:
        selected_template = templates["plan"]
    elif "doc" in skill_lower or "api" in skill_lower:
        selected_template = templates["document"]
    elif "test" in skill_lower or "tdd" in skill_lower:
        selected_template = templates["test"]
    elif "learn" in skill_lower:
        selected_template = templates["learn"]
    elif "convert" in skill_lower or "unit" in skill_lower:
        selected_template = templates["convert"]
    elif "lookup" in skill_lower or "reference" in skill_lower:
        selected_template = templates["lookup"]
    elif "verif" in skill_lower:
        selected_template = templates["verify"]
    
    # Pad keywords if needed
    while len(kw) < 3:
        kw.append("system")
    
    task = selected_template.format(kw0=kw[0], kw1=kw[1], kw2=kw[2] if len(kw) > 2 else "")
    
    # Add skill name explicitly to boost selection
    task += f" using {skill_name}"
    
    return task


# =============================================================================
# AGENT TRIGGER TASK GENERATOR
# =============================================================================

def generate_agent_trigger_task(agent_name: str, agent_def: Dict) -> str:
    """Generate a task that will trigger selection of this specific agent"""
    
    domains = agent_def.get("domains", [])
    operations = agent_def.get("operations", [])
    tier = agent_def.get("tier", "SONNET")
    
    # Build task from agent definition
    if domains:
        domain = domains[0]
    else:
        domain = "general"
    
    if operations:
        operation = operations[0]
    else:
        operation = "process"
    
    # Agent-specific templates based on tier
    if tier == "OPUS":
        complexity = "complex multi-step"
    elif tier == "SONNET":
        complexity = "detailed"
    else:
        complexity = "quick"
    
    # Create task
    task = f"Execute {complexity} {operation} task in {domain} domain"
    
    # Add agent name keywords
    agent_words = agent_name.replace("_", " ").replace("-", " ")
    task += f" requiring {agent_words} capabilities"
    
    return task


# =============================================================================
# TEST PHASE 1: SKILL INVENTORY
# =============================================================================

def test_skill_inventory() -> Dict:
    """Verify all skills exist in SKILL_KEYWORDS and have proper definitions"""
    print("\n" + "="*70)
    print("PHASE 1: SKILL INVENTORY VERIFICATION")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Get skills from various sources
    keyword_skills = set(SKILL_KEYWORDS.keys())
    capability_skills = set(engine.name_to_caps.keys())
    
    # Load resource registry for reference
    registry_path = PRISM_ROOT / "data" / "coordination" / "RESOURCE_REGISTRY.json"
    registry_skills = set()
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            reg = json.load(f)
        items = reg.get("resourceRegistry", {}).get("resources", {}).get("skills", {}).get("items", {})
        registry_skills = set(items.keys())
    
    print(f"\n  Skills in SKILL_KEYWORDS: {len(keyword_skills)}")
    print(f"  Skills in CAPABILITY_MATRIX: {len(capability_skills)}")
    print(f"  Skills in RESOURCE_REGISTRY: {len(registry_skills)}")
    
    # Find discrepancies
    missing_keywords = registry_skills - keyword_skills
    missing_capabilities = keyword_skills - capability_skills
    
    if missing_keywords:
        print(f"\n  ⚠️ Skills in registry but missing keywords: {len(missing_keywords)}")
        for s in sorted(missing_keywords)[:5]:
            print(f"      - {s}")
    
    if missing_capabilities:
        print(f"\n  ⚠️ Skills in keywords but missing capabilities: {len(missing_capabilities)}")
        for s in sorted(missing_capabilities)[:5]:
            print(f"      - {s}")
    
    all_skills = keyword_skills | capability_skills | registry_skills
    
    return {
        "passed": len(missing_keywords) == 0 and len(missing_capabilities) == 0,
        "total_skills": len(all_skills),
        "keyword_skills": len(keyword_skills),
        "capability_skills": len(capability_skills),
        "registry_skills": len(registry_skills),
        "missing_keywords": list(missing_keywords),
        "missing_capabilities": list(missing_capabilities)
    }


# =============================================================================
# TEST PHASE 2: AGENT INVENTORY
# =============================================================================

def test_agent_inventory() -> Dict:
    """Verify all agents exist in AGENT_DEFINITIONS"""
    print("\n" + "="*70)
    print("PHASE 2: AGENT INVENTORY VERIFICATION")
    print("="*70)
    
    engine = CombinationEngine()
    
    definition_agents = set(AGENT_DEFINITIONS.keys())
    
    # Load agent registry
    registry_path = PRISM_ROOT / "data" / "coordination" / "AGENT_REGISTRY.json"
    registry_agents = set()
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            reg = json.load(f)
        items = reg.get("agentRegistry", {}).get("agents", {})
        registry_agents = set(items.keys())
    
    print(f"\n  Agents in AGENT_DEFINITIONS: {len(definition_agents)}")
    print(f"  Agents in AGENT_REGISTRY: {len(registry_agents)}")
    
    # Count by tier
    tier_counts = defaultdict(int)
    for agent, defn in AGENT_DEFINITIONS.items():
        tier_counts[defn.get("tier", "UNKNOWN")] += 1
    
    print("\n  Agents by tier:")
    for tier in ["OPUS", "SONNET", "HAIKU"]:
        print(f"    {tier}: {tier_counts[tier]}")
    
    missing = registry_agents - definition_agents
    if missing:
        print(f"\n  ⚠️ Agents in registry but missing definitions: {len(missing)}")
        for a in sorted(missing)[:5]:
            print(f"      - {a}")
    
    return {
        "passed": len(missing) == 0,
        "total_agents": len(definition_agents),
        "tier_counts": dict(tier_counts),
        "missing_definitions": list(missing)
    }


# =============================================================================
# TEST PHASE 3: INDIVIDUAL SKILL CAPABILITY TEST
# =============================================================================

def test_individual_skill_capabilities() -> Dict:
    """Test each skill individually for capability scoring"""
    print("\n" + "="*70)
    print("PHASE 3: INDIVIDUAL SKILL CAPABILITY TESTING")
    print("="*70)
    
    engine = CombinationEngine()
    results = []
    
    print(f"\n  Testing {len(SKILL_KEYWORDS)} skills...")
    
    for skill_name, keywords in SKILL_KEYWORDS.items():
        # Generate trigger task
        trigger_task = generate_skill_trigger_task(skill_name, keywords)
        
        # Parse task and compute capability
        parsed = engine.parse_task(trigger_task)
        score = engine.compute_capability_score(skill_name, parsed)
        
        # Check if skill has capabilities defined
        has_caps = skill_name in engine.name_to_caps
        
        result = ResourceTestResult(
            name=skill_name,
            resource_type="skill",
            has_keywords=len(keywords) > 0,
            has_capabilities=has_caps,
            capability_score=score.capability_score,
            was_selected=False,  # Will be tested in phase 5
            trigger_task=trigger_task,
            issues=[]
        )
        
        if not result.has_keywords:
            result.issues.append("No keywords defined")
        if not result.has_capabilities:
            result.issues.append("No capability matrix entry")
        if result.capability_score == 0:
            result.issues.append("Zero capability score")
        
        results.append(result)
    
    # Summary
    passed = [r for r in results if r.passed]
    failed = [r for r in results if not r.passed]
    
    print(f"\n  Skills with capability > 0: {len(passed)}")
    print(f"  Skills with issues: {len(failed)}")
    
    if failed:
        print("\n  ⚠️ Skills with issues:")
        for r in failed[:10]:
            print(f"      - {r.name}: {', '.join(r.issues)}")
        if len(failed) > 10:
            print(f"      ... and {len(failed) - 10} more")
    
    return {
        "passed": len(failed) == 0,
        "total": len(results),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "failed_skills": [{"name": r.name, "issues": r.issues} for r in failed]
    }


# =============================================================================
# TEST PHASE 4: INDIVIDUAL AGENT CAPABILITY TEST
# =============================================================================

def test_individual_agent_capabilities() -> Dict:
    """Test each agent individually for capability scoring"""
    print("\n" + "="*70)
    print("PHASE 4: INDIVIDUAL AGENT CAPABILITY TESTING")
    print("="*70)
    
    engine = CombinationEngine()
    results = []
    
    print(f"\n  Testing {len(AGENT_DEFINITIONS)} agents...")
    
    for agent_name, agent_def in AGENT_DEFINITIONS.items():
        # Generate trigger task
        trigger_task = generate_agent_trigger_task(agent_name, agent_def)
        
        # Parse task and compute capability
        parsed = engine.parse_task(trigger_task)
        score = engine.compute_capability_score(agent_name, parsed)
        
        # Check if agent has capabilities defined
        has_caps = agent_name in engine.name_to_caps
        
        result = ResourceTestResult(
            name=agent_name,
            resource_type="agent",
            has_keywords=True,  # Agents use domains/operations, not keywords
            has_capabilities=has_caps,
            capability_score=score.capability_score,
            was_selected=False,
            trigger_task=trigger_task,
            issues=[]
        )
        
        if not result.has_capabilities:
            result.issues.append("No capability matrix entry")
        if result.capability_score == 0:
            result.issues.append("Zero capability score")
        
        results.append(result)
    
    # Summary
    passed = [r for r in results if r.passed]
    failed = [r for r in results if not r.passed]
    
    print(f"\n  Agents with capability > 0: {len(passed)}")
    print(f"  Agents with issues: {len(failed)}")
    
    if failed:
        print("\n  ⚠️ Agents with issues:")
        for r in failed[:10]:
            tier = AGENT_DEFINITIONS[r.name].get("tier", "?")
            print(f"      - {r.name} ({tier}): {', '.join(r.issues)}")
        if len(failed) > 10:
            print(f"      ... and {len(failed) - 10} more")
    
    return {
        "passed": len(failed) == 0,
        "total": len(results),
        "passed_count": len(passed),
        "failed_count": len(failed),
        "failed_agents": [{"name": r.name, "issues": r.issues} for r in failed]
    }


# =============================================================================
# TEST PHASE 5: SKILL SELECTION COVERAGE
# =============================================================================

def test_skill_selection_coverage() -> Dict:
    """Test that each skill can be selected via optimization"""
    print("\n" + "="*70)
    print("PHASE 5: SKILL SELECTION COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    selection_counts = defaultdict(int)
    skill_trigger_tasks = {}
    
    print(f"\n  Testing selection for {len(SKILL_KEYWORDS)} skills...")
    
    # Generate and run trigger task for each skill
    for i, (skill_name, keywords) in enumerate(SKILL_KEYWORDS.items()):
        if (i + 1) % 25 == 0:
            print(f"    Progress: {i+1}/{len(SKILL_KEYWORDS)}")
        
        trigger_task = generate_skill_trigger_task(skill_name, keywords)
        skill_trigger_tasks[skill_name] = trigger_task
        
        combo = engine.optimize(trigger_task)
        
        for skill in combo.skills:
            selection_counts[skill] += 1
    
    # Identify never-selected skills
    selected = {k for k, v in selection_counts.items() if v > 0}
    never_selected = set(SKILL_KEYWORDS.keys()) - selected
    
    print(f"\n  Skills ever selected: {len(selected)}/{len(SKILL_KEYWORDS)}")
    print(f"  Never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ Never-selected skills:")
        for skill in sorted(never_selected)[:15]:
            print(f"      - {skill}")
        if len(never_selected) > 15:
            print(f"      ... and {len(never_selected) - 15} more")
    
    coverage = len(selected) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    
    return {
        "passed": len(never_selected) == 0,
        "coverage": coverage,
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected),
        "selection_counts": dict(selection_counts)
    }


# =============================================================================
# TEST PHASE 6: AGENT SELECTION COVERAGE
# =============================================================================

def test_agent_selection_coverage() -> Dict:
    """Test that each agent can be selected via optimization"""
    print("\n" + "="*70)
    print("PHASE 6: AGENT SELECTION COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    selection_counts = defaultdict(int)
    
    print(f"\n  Testing selection for {len(AGENT_DEFINITIONS)} agents...")
    
    # Generate and run trigger task for each agent
    for i, (agent_name, agent_def) in enumerate(AGENT_DEFINITIONS.items()):
        if (i + 1) % 20 == 0:
            print(f"    Progress: {i+1}/{len(AGENT_DEFINITIONS)}")
        
        trigger_task = generate_agent_trigger_task(agent_name, agent_def)
        combo = engine.optimize(trigger_task)
        
        for agent in combo.agents:
            selection_counts[agent] += 1
    
    # Identify never-selected agents
    selected = {k for k, v in selection_counts.items() if v > 0}
    never_selected = set(AGENT_DEFINITIONS.keys()) - selected
    
    print(f"\n  Agents ever selected: {len(selected)}/{len(AGENT_DEFINITIONS)}")
    print(f"  Never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ Never-selected agents:")
        for agent in sorted(never_selected)[:15]:
            tier = AGENT_DEFINITIONS[agent].get("tier", "?")
            print(f"      - {agent} ({tier})")
        if len(never_selected) > 15:
            print(f"      ... and {len(never_selected) - 15} more")
    
    # Show by tier
    print("\n  Selection by tier:")
    for tier in ["OPUS", "SONNET", "HAIKU"]:
        tier_agents = [a for a in AGENT_DEFINITIONS if AGENT_DEFINITIONS[a].get("tier") == tier]
        tier_selected = [a for a in tier_agents if selection_counts[a] > 0]
        print(f"    {tier}: {len(tier_selected)}/{len(tier_agents)}")
    
    coverage = len(selected) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    return {
        "passed": len(never_selected) == 0,
        "coverage": coverage,
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected),
        "selection_counts": dict(selection_counts)
    }


# =============================================================================
# TEST PHASE 7: SYNERGY PAIR COVERAGE
# =============================================================================

def test_synergy_coverage() -> Dict:
    """Test synergy matrix completeness"""
    print("\n" + "="*70)
    print("PHASE 7: SYNERGY PAIR COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    pairs = engine.synergy_matrix.get("synergyMatrix", {}).get("pairs", {})
    
    # Extract skills from pairs
    skills_in_synergy = set()
    for pair_key in pairs.keys():
        parts = pair_key.split(":")
        if len(parts) == 2:
            skills_in_synergy.add(parts[0])
            skills_in_synergy.add(parts[1])
    
    # Check coverage
    keyword_skills = set(SKILL_KEYWORDS.keys())
    covered = keyword_skills & skills_in_synergy
    not_covered = keyword_skills - skills_in_synergy
    
    print(f"\n  Total synergy pairs: {len(pairs)}")
    print(f"  Skills with synergy data: {len(covered)}/{len(keyword_skills)}")
    print(f"  Skills using default synergy: {len(not_covered)}")
    
    # Validate synergy values
    invalid = []
    for pair_key, pair_data in pairs.items():
        synergy = pair_data.get("synergy", 0)
        if not (0.5 <= synergy <= 2.0):
            invalid.append((pair_key, synergy))
    
    if invalid:
        print(f"\n  ⚠️ Invalid synergy values: {len(invalid)}")
    
    coverage = len(covered) / len(keyword_skills) if keyword_skills else 0
    
    return {
        "passed": len(invalid) == 0,
        "total_pairs": len(pairs),
        "skills_covered": len(covered),
        "skills_not_covered": len(not_covered),
        "not_covered_list": list(not_covered)[:20],
        "invalid_pairs": len(invalid),
        "coverage": coverage
    }


# =============================================================================
# TEST PHASE 8: COMPREHENSIVE UTILIZATION
# =============================================================================

def test_comprehensive_utilization() -> Dict:
    """Final comprehensive utilization test"""
    print("\n" + "="*70)
    print("PHASE 8: COMPREHENSIVE UTILIZATION REPORT")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Collect all trigger tasks
    all_tasks = []
    
    # Skill trigger tasks
    for skill_name, keywords in SKILL_KEYWORDS.items():
        task = generate_skill_trigger_task(skill_name, keywords)
        all_tasks.append(("skill", skill_name, task))
    
    # Agent trigger tasks
    for agent_name, agent_def in AGENT_DEFINITIONS.items():
        task = generate_agent_trigger_task(agent_name, agent_def)
        all_tasks.append(("agent", agent_name, task))
    
    print(f"\n  Running {len(all_tasks)} optimizations...")
    
    skill_selections = defaultdict(int)
    agent_selections = defaultdict(int)
    psi_scores = []
    
    for i, (res_type, res_name, task) in enumerate(all_tasks):
        if (i + 1) % 50 == 0:
            print(f"    Progress: {i+1}/{len(all_tasks)}")
        
        combo = engine.optimize(task)
        psi_scores.append(combo.psi_score)
        
        for skill in combo.skills:
            skill_selections[skill] += 1
        for agent in combo.agents:
            agent_selections[agent] += 1
    
    # Calculate utilization
    skills_used = {k for k, v in skill_selections.items() if v > 0}
    agents_used = {k for k, v in agent_selections.items() if v > 0}
    
    skill_utilization = len(skills_used) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_utilization = len(agents_used) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    unused_skills = set(SKILL_KEYWORDS.keys()) - skills_used
    unused_agents = set(AGENT_DEFINITIONS.keys()) - agents_used
    
    print(f"\n  SKILL UTILIZATION: {skill_utilization*100:.1f}%")
    print(f"    Used: {len(skills_used)}/{len(SKILL_KEYWORDS)}")
    print(f"    Unused: {len(unused_skills)}")
    
    print(f"\n  AGENT UTILIZATION: {agent_utilization*100:.1f}%")
    print(f"    Used: {len(agents_used)}/{len(AGENT_DEFINITIONS)}")
    print(f"    Unused: {len(unused_agents)}")
    
    avg_psi = sum(psi_scores) / len(psi_scores) if psi_scores else 0
    print(f"\n  Average PSI Score: {avg_psi:.2f}")
    
    # Target: 80% utilization minimum
    passed = skill_utilization >= 0.80 and agent_utilization >= 0.80
    
    return {
        "passed": passed,
        "skill_utilization": skill_utilization,
        "agent_utilization": agent_utilization,
        "skills_used": len(skills_used),
        "agents_used": len(agents_used),
        "unused_skills": list(unused_skills),
        "unused_agents": list(unused_agents),
        "average_psi": avg_psi,
        "total_optimizations": len(all_tasks)
    }


# =============================================================================
# MAIN RUNNER
# =============================================================================

def run_comprehensive_utilization_suite() -> Dict:
    """Run the complete utilization test suite"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*4 + "PRISM COMPREHENSIVE RESOURCE UTILIZATION SUITE v2.0" + " "*4 + "   ║")
    print("╚" + "═"*68 + "╝")
    
    start_time = datetime.now()
    
    results = {
        "suite_name": "PRISM Comprehensive Resource Utilization Suite v2.0",
        "started": start_time.isoformat(),
        "phases": {}
    }
    
    # Run all phases
    results["phases"]["skill_inventory"] = test_skill_inventory()
    results["phases"]["agent_inventory"] = test_agent_inventory()
    results["phases"]["skill_capabilities"] = test_individual_skill_capabilities()
    results["phases"]["agent_capabilities"] = test_individual_agent_capabilities()
    results["phases"]["skill_selection"] = test_skill_selection_coverage()
    results["phases"]["agent_selection"] = test_agent_selection_coverage()
    results["phases"]["synergy_coverage"] = test_synergy_coverage()
    results["phases"]["comprehensive"] = test_comprehensive_utilization()
    
    end_time = datetime.now()
    elapsed = (end_time - start_time).total_seconds()
    
    # Summary
    phase_results = [
        (name, phase.get("passed", False))
        for name, phase in results["phases"].items()
    ]
    
    passed = sum(1 for _, p in phase_results if p)
    failed = sum(1 for _, p in phase_results if not p)
    
    results["summary"] = {
        "total_passed": passed,
        "total_failed": failed,
        "success_rate": passed / (passed + failed) if (passed + failed) > 0 else 0,
        "elapsed_seconds": elapsed
    }
    
    # Final report
    print("\n" + "="*70)
    print("COMPREHENSIVE UTILIZATION SUITE SUMMARY")
    print("="*70)
    
    for name, p in phase_results:
        status = "[OK]" if p else "[X]"
        print(f"  {status} {name}")
    
    print(f"\n  Total Passed:  {passed}")
    print(f"  Total Failed:  {failed}")
    print(f"  Success Rate:  {results['summary']['success_rate']*100:.1f}%")
    print(f"  Elapsed:       {elapsed:.1f}s")
    
    # Key metrics
    comp = results["phases"]["comprehensive"]
    print(f"\n  KEY METRICS:")
    print(f"    Skill Utilization: {comp.get('skill_utilization', 0)*100:.1f}%")
    print(f"    Agent Utilization: {comp.get('agent_utilization', 0)*100:.1f}%")
    print(f"    Average PSI: {comp.get('average_psi', 0):.2f}")
    
    print("="*70)
    
    # Save results
    results["completed"] = end_time.isoformat()
    output_path = PRISM_ROOT / "state" / "results" / f"comprehensive_utilization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nResults saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    run_comprehensive_utilization_suite()
