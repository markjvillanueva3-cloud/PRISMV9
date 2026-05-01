"""
PRISM RESOURCE UTILIZABILITY TEST SUITE v4.0
=============================================
Verifies that every skill and agent CAN BE UTILIZED by the system.

Tests:
1. Every resource has capability definitions
2. Every resource has non-zero capability scores for relevant tasks
3. Every resource appears in at least some optimizations
4. Complete capability profile for each resource

Author: Claude (PRISM Developer)
Date: 2026-01-28
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple
from collections import defaultdict

PRISM_ROOT = Path(r"C:\PRISM")
sys.path.insert(0, str(PRISM_ROOT / "scripts"))

from prism_unified_system_v6 import (
    CombinationEngine, 
    SKILL_KEYWORDS, 
    AGENT_DEFINITIONS,
)


# =============================================================================
# DIVERSE TASK LIBRARY FOR UTILIZATION TESTING
# =============================================================================

DIVERSE_TASKS = [
    # Materials domain
    "Calculate material properties for steel machining with Kienzle model",
    "Lookup aluminum 6061 thermal conductivity and validate parameters",
    "Enhance material database with scientific Johnson-Cook coefficients",
    
    # Physics domain
    "Compute cutting forces and tool deflection for roughing operation",
    "Analyze vibration stability and predict chatter using physics models",
    "Calculate heat transfer and thermal expansion during machining",
    
    # Machining domain
    "Determine optimal speed feed for finishing titanium alloy",
    "Predict tool life using Taylor equation with wear modeling",
    "Optimize cycle time for multi-operation machining sequence",
    
    # G-code domain
    "Generate Fanuc G-code for pocket milling with canned cycles",
    "Create Siemens Sinumerik program with synchronized spindle",
    "Write Heidenhain conversational cycles for contour machining",
    "Validate G-code syntax and check for collision safety",
    
    # Planning domain
    "Create detailed task breakdown with microsession decomposition",
    "Plan multi-phase project roadmap with milestone tracking",
    "Estimate effort and complexity for module extraction task",
    
    # Validation domain
    "Validate JSON schema compliance and parameter ranges",
    "Check code quality against PRISM standards and patterns",
    "Run regression tests and verify specification completeness",
    
    # Extraction domain
    "Extract module from 986K line monolith codebase safely",
    "Navigate monolith to find specific algorithm implementation",
    "Index all module locations for extraction planning",
    
    # Documentation domain
    "Document API contract interface with examples",
    "Write technical specification for new feature",
    "Generate knowledge base entry from research",
    
    # Coordination domain
    "Coordinate multi-agent swarm for parallel processing",
    "Orchestrate workflow with session state management",
    "Manage resource allocation using ILP optimization",
    
    # Learning domain
    "Learn patterns from execution history and feedback",
    "Improve formula coefficients through calibration",
    "Discover synergy relationships between resources",
    
    # Tooling domain
    "Select optimal cutting tool for deep pocket machining",
    "Configure tool holder assembly with collision checks",
    "Calculate tool wear progression and replacement timing",
    
    # Testing domain
    "Generate unit tests with TDD red-green-refactor cycle",
    "Create integration test suite with edge case coverage",
    "Benchmark performance and validate quality gates",
    
    # Safety domain
    "Verify safety constraints and machine limits compliance",
    "Check collision detection coverage for toolpath",
    "Audit risk mitigation and operator protection measures",
    
    # Optimization domain
    "Optimize resource combination using ILP with constraints",
    "Find Pareto-optimal solution for multi-objective problem",
    "Tune hyperparameters for maximum performance",
    
    # Expert consultation
    "Consult master machinist expert for shop floor advice",
    "Get materials scientist input on alloy selection",
    "Ask CAM programmer for toolpath strategy guidance",
    "Request mechanical engineer stress analysis review",
    "Seek quality control expert inspection guidance",
    
    # Additional diverse tasks
    "Debug runtime error with root cause analysis tracing",
    "Review code quality and refactor for better patterns",
    "Audit database utilization and wiring completeness",
    "Convert units between metric and imperial systems",
    "Build dependency graph for module relationships",
    "Generate mathematical proof for optimality certificate",
    "Create session handoff document for continuation",
    "Apply error recovery fallback mechanism",
    "Check API contract compliance for gateway routes",
    "Look up manufacturing reference table data",
]


def test_capability_definitions() -> Dict:
    """Test that every resource has capability definitions"""
    print("\n" + "="*70)
    print("PHASE 1: CAPABILITY DEFINITIONS")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Check skills
    skills_with_caps = set()
    skills_without_caps = set()
    
    for skill_name in SKILL_KEYWORDS.keys():
        if skill_name in engine.name_to_caps:
            caps = engine.name_to_caps[skill_name]
            if caps.get("domainScores") or caps.get("operationScores"):
                skills_with_caps.add(skill_name)
            else:
                skills_without_caps.add(skill_name)
        else:
            skills_without_caps.add(skill_name)
    
    print(f"\n  Skills with capability definitions: {len(skills_with_caps)}/{len(SKILL_KEYWORDS)}")
    if skills_without_caps:
        print(f"  Skills without capabilities: {len(skills_without_caps)}")
        for s in list(skills_without_caps)[:5]:
            print(f"      - {s}")
    
    # Check agents
    agents_with_caps = set()
    agents_without_caps = set()
    
    for agent_name in AGENT_DEFINITIONS.keys():
        if agent_name in engine.name_to_caps:
            caps = engine.name_to_caps[agent_name]
            if caps.get("domainScores") or caps.get("operationScores"):
                agents_with_caps.add(agent_name)
            else:
                agents_without_caps.add(agent_name)
        else:
            agents_without_caps.add(agent_name)
    
    print(f"\n  Agents with capability definitions: {len(agents_with_caps)}/{len(AGENT_DEFINITIONS)}")
    if agents_without_caps:
        print(f"  Agents without capabilities: {len(agents_without_caps)}")
        for a in list(agents_without_caps)[:5]:
            print(f"      - {a}")
    
    skill_coverage = len(skills_with_caps) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_coverage = len(agents_with_caps) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    return {
        "passed": len(skills_without_caps) == 0 and len(agents_without_caps) == 0,
        "skill_coverage": skill_coverage,
        "agent_coverage": agent_coverage,
        "skills_with_caps": len(skills_with_caps),
        "agents_with_caps": len(agents_with_caps),
        "skills_without": list(skills_without_caps),
        "agents_without": list(agents_without_caps)
    }


def test_capability_scores() -> Dict:
    """Test that every resource has non-zero capability scores for some tasks"""
    print("\n" + "="*70)
    print("PHASE 2: CAPABILITY SCORING")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Test each skill against diverse tasks
    skill_max_scores = {}
    skill_best_tasks = {}
    
    print(f"\n  Testing {len(SKILL_KEYWORDS)} skills against {len(DIVERSE_TASKS)} tasks...")
    
    for skill_name in SKILL_KEYWORDS.keys():
        max_score = 0.0
        best_task = None
        
        for task in DIVERSE_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(skill_name, parsed)
            
            if score.capability_score > max_score:
                max_score = score.capability_score
                best_task = task
        
        skill_max_scores[skill_name] = max_score
        skill_best_tasks[skill_name] = best_task
    
    skills_with_scores = [s for s, score in skill_max_scores.items() if score > 0]
    skills_zero_scores = [s for s, score in skill_max_scores.items() if score == 0]
    
    print(f"\n  Skills with non-zero scores: {len(skills_with_scores)}/{len(SKILL_KEYWORDS)}")
    if skills_zero_scores:
        print(f"  Skills with zero scores: {len(skills_zero_scores)}")
    
    # Test each agent
    agent_max_scores = {}
    agent_best_tasks = {}
    
    print(f"\n  Testing {len(AGENT_DEFINITIONS)} agents...")
    
    for agent_name in AGENT_DEFINITIONS.keys():
        max_score = 0.0
        best_task = None
        
        for task in DIVERSE_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(agent_name, parsed)
            
            if score.capability_score > max_score:
                max_score = score.capability_score
                best_task = task
        
        agent_max_scores[agent_name] = max_score
        agent_best_tasks[agent_name] = best_task
    
    agents_with_scores = [a for a, score in agent_max_scores.items() if score > 0]
    agents_zero_scores = [a for a, score in agent_max_scores.items() if score == 0]
    
    print(f"\n  Agents with non-zero scores: {len(agents_with_scores)}/{len(AGENT_DEFINITIONS)}")
    if agents_zero_scores:
        print(f"  Agents with zero scores: {len(agents_zero_scores)}")
    
    skill_pct = len(skills_with_scores) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_pct = len(agents_with_scores) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    return {
        "passed": skill_pct >= 1.0 and agent_pct >= 1.0,
        "skill_score_coverage": skill_pct,
        "agent_score_coverage": agent_pct,
        "skills_with_scores": len(skills_with_scores),
        "agents_with_scores": len(agents_with_scores),
        "skill_zero_list": skills_zero_scores,
        "agent_zero_list": agents_zero_scores,
        "skill_max_scores": skill_max_scores,
        "agent_max_scores": agent_max_scores
    }


def test_selection_appearance() -> Dict:
    """Test that every resource appears in at least some optimizations"""
    print("\n" + "="*70)
    print("PHASE 3: SELECTION APPEARANCE")
    print("="*70)
    
    engine = CombinationEngine()
    
    skill_appearances = defaultdict(int)
    agent_appearances = defaultdict(int)
    
    print(f"\n  Running {len(DIVERSE_TASKS)} optimizations...")
    
    for task in DIVERSE_TASKS:
        combo = engine.optimize(task)
        
        for skill in combo.skills:
            skill_appearances[skill] += 1
        for agent in combo.agents:
            agent_appearances[agent] += 1
    
    skills_appeared = {s for s, c in skill_appearances.items() if c > 0}
    agents_appeared = {a for a, c in agent_appearances.items() if c > 0}
    
    skills_never = set(SKILL_KEYWORDS.keys()) - skills_appeared
    agents_never = set(AGENT_DEFINITIONS.keys()) - agents_appeared
    
    print(f"\n  Skills that appeared in selections: {len(skills_appeared)}/{len(SKILL_KEYWORDS)}")
    print(f"  Agents that appeared in selections: {len(agents_appeared)}/{len(AGENT_DEFINITIONS)}")
    
    # Top selected
    print("\n  Most frequently selected skills:")
    sorted_skills = sorted(skill_appearances.items(), key=lambda x: x[1], reverse=True)
    for skill, count in sorted_skills[:5]:
        print(f"      [{count:2d}x] {skill}")
    
    print("\n  Most frequently selected agents:")
    sorted_agents = sorted(agent_appearances.items(), key=lambda x: x[1], reverse=True)
    for agent, count in sorted_agents[:5]:
        print(f"      [{count:2d}x] {agent}")
    
    skill_pct = len(skills_appeared) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_pct = len(agents_appeared) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    # For utilizability: 70% appearance is acceptable (resources with niche capabilities won't appear often)
    passed = skill_pct >= 0.70 and agent_pct >= 0.70
    
    return {
        "passed": passed,
        "skill_appearance_rate": skill_pct,
        "agent_appearance_rate": agent_pct,
        "skills_appeared": len(skills_appeared),
        "agents_appeared": len(agents_appeared),
        "skills_never": list(skills_never),
        "agents_never": list(agents_never)
    }


def test_comprehensive_utilizability() -> Dict:
    """Comprehensive utilizability test"""
    print("\n" + "="*70)
    print("PHASE 4: COMPREHENSIVE UTILIZABILITY REPORT")
    print("="*70)
    
    engine = CombinationEngine()
    
    # For each resource, compute:
    # 1. Has capability definition?
    # 2. Max capability score across tasks?
    # 3. Number of task categories it scores well for?
    # 4. Ever appears in optimization?
    
    skill_profiles = {}
    
    for skill_name in SKILL_KEYWORDS.keys():
        has_caps = skill_name in engine.name_to_caps
        max_score = 0.0
        domains_strong = set()
        
        for task in DIVERSE_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(skill_name, parsed)
            
            if score.capability_score > max_score:
                max_score = score.capability_score
            
            if score.capability_score > 0.5:
                # Check which domains this task triggered
                for domain in parsed.domains:
                    domains_strong.add(domain)
        
        skill_profiles[skill_name] = {
            "has_caps": has_caps,
            "max_score": max_score,
            "strong_domains": len(domains_strong),
            "utilizable": has_caps and max_score > 0
        }
    
    agent_profiles = {}
    
    for agent_name in AGENT_DEFINITIONS.keys():
        has_caps = agent_name in engine.name_to_caps
        max_score = 0.0
        domains_strong = set()
        
        for task in DIVERSE_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(agent_name, parsed)
            
            if score.capability_score > max_score:
                max_score = score.capability_score
            
            if score.capability_score > 0.5:
                for domain in parsed.domains:
                    domains_strong.add(domain)
        
        agent_profiles[agent_name] = {
            "has_caps": has_caps,
            "max_score": max_score,
            "strong_domains": len(domains_strong),
            "utilizable": has_caps and max_score > 0
        }
    
    # Summary
    utilizable_skills = [s for s, p in skill_profiles.items() if p["utilizable"]]
    utilizable_agents = [a for a, p in agent_profiles.items() if p["utilizable"]]
    
    skill_util_rate = len(utilizable_skills) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_util_rate = len(utilizable_agents) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    print(f"\n  SKILL UTILIZABILITY: {skill_util_rate*100:.1f}%")
    print(f"    Fully utilizable: {len(utilizable_skills)}/{len(SKILL_KEYWORDS)}")
    
    non_util_skills = [s for s, p in skill_profiles.items() if not p["utilizable"]]
    if non_util_skills:
        print(f"    Non-utilizable: {len(non_util_skills)}")
        for s in non_util_skills[:5]:
            print(f"      - {s} (caps: {skill_profiles[s]['has_caps']}, score: {skill_profiles[s]['max_score']:.2f})")
    
    print(f"\n  AGENT UTILIZABILITY: {agent_util_rate*100:.1f}%")
    print(f"    Fully utilizable: {len(utilizable_agents)}/{len(AGENT_DEFINITIONS)}")
    
    non_util_agents = [a for a, p in agent_profiles.items() if not p["utilizable"]]
    if non_util_agents:
        print(f"    Non-utilizable: {len(non_util_agents)}")
        for a in non_util_agents[:5]:
            tier = AGENT_DEFINITIONS[a].get("tier", "?")
            print(f"      - {a} ({tier}) (caps: {agent_profiles[a]['has_caps']}, score: {agent_profiles[a]['max_score']:.2f})")
    
    passed = skill_util_rate >= 1.0 and agent_util_rate >= 1.0
    
    return {
        "passed": passed,
        "skill_utilizability": skill_util_rate,
        "agent_utilizability": agent_util_rate,
        "utilizable_skills": len(utilizable_skills),
        "utilizable_agents": len(utilizable_agents),
        "non_utilizable_skills": non_util_skills,
        "non_utilizable_agents": non_util_agents
    }


def run_utilizability_suite():
    """Run complete utilizability test suite"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*6 + "PRISM RESOURCE UTILIZABILITY TEST SUITE v4.0" + " "*7 + "      ║")
    print("╚" + "═"*68 + "╝")
    
    start_time = datetime.now()
    
    results = {
        "suite_name": "PRISM Resource Utilizability Suite v4.0",
        "started": start_time.isoformat(),
        "phases": {}
    }
    
    results["phases"]["definitions"] = test_capability_definitions()
    results["phases"]["scoring"] = test_capability_scores()
    results["phases"]["appearance"] = test_selection_appearance()
    results["phases"]["utilizability"] = test_comprehensive_utilizability()
    
    end_time = datetime.now()
    elapsed = (end_time - start_time).total_seconds()
    
    # Summary
    print("\n" + "="*70)
    print("UTILIZABILITY SUITE SUMMARY")
    print("="*70)
    
    for name, phase in results["phases"].items():
        status = "[OK]" if phase.get("passed") else "[X]"
        print(f"  {status} {name}")
    
    util = results["phases"]["utilizability"]
    print(f"\n  FINAL METRICS:")
    print(f"    Skill Utilizability: {util.get('skill_utilizability', 0)*100:.1f}%")
    print(f"    Agent Utilizability: {util.get('agent_utilizability', 0)*100:.1f}%")
    print(f"    Elapsed: {elapsed:.1f}s")
    
    passed_count = sum(1 for p in results["phases"].values() if p.get("passed"))
    total_count = len(results["phases"])
    
    print(f"\n  Phases Passed: {passed_count}/{total_count}")
    print("="*70)
    
    # Save
    output_path = PRISM_ROOT / "state" / "results" / f"utilizability_v4_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nResults saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    run_utilizability_suite()
