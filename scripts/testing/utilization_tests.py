"""
PRISM Resource Utilization Test Suite v1.0
Comprehensive tests ensuring EVERY skill and agent can be utilized
by the CombinationEngine and ILP optimization system.

Tests:
- All 99+ skills have capability scores > 0 for at least one task
- All 64 agents have capability scores > 0 for at least one task
- All skills appear in at least one optimal combination
- All agents appear in at least one optimal combination
- All synergy pairs are valid and computable
- No orphaned resources exist

Author: Claude (PRISM Developer)
Date: 2026-01-28
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict

PRISM_ROOT = Path(r"C:\PRISM")
sys.path.insert(0, str(PRISM_ROOT / "scripts"))

from prism_unified_system_v6 import (
    CombinationEngine, 
    SKILL_KEYWORDS, 
    AGENT_DEFINITIONS,
    SWARM_PATTERNS
)

# =============================================================================
# TEST TASK LIBRARY - Diverse tasks to trigger all resources
# =============================================================================

TEST_TASKS = {
    # Materials domain
    "materials": [
        "Calculate material properties for 4140 steel machining",
        "Lookup thermal conductivity for aluminum 6061-T6",
        "Validate material database completeness",
        "Enhance material parameters with scientific data",
        "Find material by hardness and machinability rating",
    ],
    
    # Physics domain
    "physics": [
        "Calculate cutting forces using Kienzle model",
        "Compute heat transfer during machining operation",
        "Model tool deflection under cutting load",
        "Predict surface finish from parameters",
        "Analyze vibration and chatter stability",
    ],
    
    # Machining domain
    "machining": [
        "Calculate optimal speed and feed for roughing",
        "Determine tool life prediction using Taylor equation",
        "Select cutting parameters for finishing pass",
        "Optimize machining cycle time",
        "Plan tool change sequence",
    ],
    
    # G-code domain
    "gcode": [
        "Generate Fanuc G-code for pocket milling",
        "Create Siemens Sinumerik program",
        "Write Heidenhain conversational cycle",
        "Validate G-code syntax and safety",
        "Post-process toolpath for specific controller",
    ],
    
    # Planning domain
    "planning": [
        "Create detailed task decomposition plan",
        "Estimate effort for module extraction",
        "Design roadmap for database migration",
        "Schedule multi-phase development project",
        "Break complex task into microsessions",
    ],
    
    # Validation domain  
    "validation": [
        "Validate JSON schema compliance",
        "Check code quality against standards",
        "Verify specification completeness",
        "Run regression test suite",
        "Audit database utilization",
    ],
    
    # Extraction domain
    "extraction": [
        "Extract module from monolith codebase",
        "Parse legacy data structure",
        "Pull algorithm from 986K line file",
        "Navigate monolith to find function",
        "Index module locations in codebase",
    ],
    
    # Documentation domain
    "documentation": [
        "Document API contract interface",
        "Write technical specification",
        "Create user guide for feature",
        "Generate code comments",
        "Build knowledge base entry",
    ],
    
    # Coordination domain
    "coordination": [
        "Coordinate multi-agent swarm execution",
        "Orchestrate parallel task processing",
        "Manage resource allocation optimization",
        "Synchronize distributed workflow",
        "Handle session state transitions",
    ],
    
    # Learning domain
    "learning": [
        "Learn patterns from execution history",
        "Improve coefficients from calibration",
        "Evolve formula based on feedback",
        "Discover synergy relationships",
        "Adapt to user preferences",
    ],
    
    # Tooling domain
    "tooling": [
        "Select optimal cutting tool for operation",
        "Configure tool holder assembly",
        "Calculate tool wear progression",
        "Optimize tool path strategy",
        "Manage tool inventory database",
    ],
    
    # Testing domain
    "testing": [
        "Generate unit tests for module",
        "Run TDD red-green-refactor cycle",
        "Create integration test suite",
        "Benchmark performance metrics",
        "Validate edge case handling",
    ],
    
    # Safety domain
    "safety": [
        "Verify safety constraints satisfied",
        "Check collision detection coverage",
        "Validate machine limits respected",
        "Ensure operator protection protocols",
        "Audit risk mitigation measures",
    ],
    
    # Optimization domain
    "optimization": [
        "Optimize resource combination using ILP",
        "Minimize cost while maximizing coverage",
        "Find Pareto-optimal solution set",
        "Tune hyperparameters for performance",
        "Solve constrained optimization problem",
    ],
    
    # Expert consultation
    "expert": [
        "Consult master machinist for shop floor advice",
        "Get materials scientist input on alloy selection",
        "Ask CAM programmer for toolpath strategy",
        "Request mechanical engineer stress analysis",
        "Seek quality control inspection guidance",
    ],

    # Skill-specific triggering tasks
    "skill_specific": [
        "Select the best algorithm for multi-objective optimization",
        "Choose algorithm for constraint satisfaction problem",
        "Define API contract for gateway endpoint",
        "Document REST interface specification",
        "Apply factory pattern for object creation",
        "Implement observer coding pattern",
        "Map all consumers of materials database",
        "Create consumer dependency diagram",
        "Generate context DNA fingerprint for session",
        "Extract context signature from conversation",
        "Monitor context pressure approaching limit",
        "Manage context budget allocation",
        "Quick reference for controller selection",
        "Controller comparison quick lookup",
        "Debug runtime exception in module",
        "Trace bug through call stack",
        "Build module dependency graph",
        "Visualize import dependencies",
        "Derive formula from first principles",
        "Mathematical derivation assistance",
        "Run development utility script",
        "Execute dev helper function",
        "Set up development environment",
        "Configure development workflow",
        "Look up error code in catalog",
        "Find error message explanation",
        "Implement error recovery mechanism",
        "Handle graceful error recovery",
        "Consult master machinist for shop advice",
        "Get machinist expertise on cutting",
        "Mathematical expert consultation",
        "Complex math problem solving",
        "Post processor expert guidance",
        "Expert help with post configuration",
        "Quality control expert inspection",
        "QC expert measurement advice",
        "Manage database hierarchy layers",
        "Resolve hierarchical inheritance",
        "Query knowledge base for information",
        "Search knowledge repository",
        "Write large file in chunks",
        "Stream large output to file",
        "Apply master equation PSI formula",
        "Compute using master optimization equation",
        "Create material from template",
        "Apply material template structure",
        "Browse material templates library",
        "Select from material templates",
        "Apply physics formula for calculation",
        "Use physics equation model",
        "Look up physics reference data",
        "Check physics constant value",
        "Create project planning document",
        "Develop planning schedule",
        "Optimize manufacturing process",
        "Process optimization analysis",
        "Run Python automation tool",
        "Execute Python helper script",
        "Check quality gate criteria",
        "Verify quality gate passage",
        "Manage session buffer capacity",
        "Monitor session buffer usage",
        "Prepare session handoff document",
        "Execute session handoff protocol",
        "Orchestrate swarm execution pattern",
        "Manage swarm agent coordination",
        "Ensure task continuity across sessions",
        "Maintain task state persistence",
        "Select optimal cutting tool",
        "Choose tool for operation",
        "Convert between unit systems",
        "Unit conversion calculation",
        "Check resource utilization rate",
        "Verify database utilization",
        "Verify completion evidence",
        "Run verification checks",
    ],
    
    # Agent-specific triggering tasks
    "agent_specific": [
        "Build context from conversation history",
        "Construct context for continuation",
        "Cross-reference data across databases",
        "Find cross-references in documentation",
        "Calculate cutting parameters precisely",
        "Compute cutting speed and feed",
        "Perform meta-analysis of results",
        "Analyze patterns across datasets",
        "Plan database migration strategy",
        "Execute schema migration",
        "Generate mathematical proof",
        "Create optimality proof certificate",
        "Look up tool specifications",
        "Find tool in catalog",
    ],
}

# Flatten all tasks
ALL_TEST_TASKS = []
for domain, tasks in TEST_TASKS.items():
    for task in tasks:
        ALL_TEST_TASKS.append((domain, task))


# =============================================================================
# PHASE 1: SKILL CAPABILITY COVERAGE
# =============================================================================

def test_skill_capability_coverage() -> Dict:
    """Test that every skill has capability score > 0 for at least one task"""
    print("\n" + "="*70)
    print("PHASE 1: SKILL CAPABILITY COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Track which skills have been scored > 0
    skill_scores = defaultdict(float)
    skill_best_task = {}
    
    # Test each skill against all tasks
    for skill_name in SKILL_KEYWORDS.keys():
        best_score = 0.0
        best_task = None
        
        for domain, task in ALL_TEST_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(skill_name, parsed)
            
            if score.capability_score > best_score:
                best_score = score.capability_score
                best_task = task
        
        skill_scores[skill_name] = best_score
        skill_best_task[skill_name] = best_task
    
    # Check results
    utilized = {k: v for k, v in skill_scores.items() if v > 0}
    orphaned = {k: v for k, v in skill_scores.items() if v == 0}
    
    print(f"\n  Total skills in SKILL_KEYWORDS: {len(SKILL_KEYWORDS)}")
    print(f"  Skills with capability > 0: {len(utilized)}")
    print(f"  Orphaned skills (score = 0): {len(orphaned)}")
    
    if orphaned:
        print("\n  ⚠️ ORPHANED SKILLS (need task coverage):")
        for skill in sorted(orphaned.keys())[:10]:
            print(f"    - {skill}")
        if len(orphaned) > 10:
            print(f"    ... and {len(orphaned) - 10} more")
    
    # Show top utilized
    print("\n  Top 10 utilized skills:")
    sorted_skills = sorted(skill_scores.items(), key=lambda x: x[1], reverse=True)
    for skill, score in sorted_skills[:10]:
        print(f"    [{score:.3f}] {skill}")
    
    passed = len(orphaned) == 0
    coverage = len(utilized) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    
    return {
        "passed": passed,
        "total_skills": len(SKILL_KEYWORDS),
        "utilized": len(utilized),
        "orphaned": len(orphaned),
        "orphaned_list": list(orphaned.keys()),
        "coverage": coverage,
        "skill_scores": dict(skill_scores)
    }


# =============================================================================
# PHASE 2: AGENT CAPABILITY COVERAGE
# =============================================================================

def test_agent_capability_coverage() -> Dict:
    """Test that every agent has capability score > 0 for at least one task"""
    print("\n" + "="*70)
    print("PHASE 2: AGENT CAPABILITY COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Track which agents have been scored > 0
    agent_scores = defaultdict(float)
    agent_best_task = {}
    
    # Test each agent against all tasks
    for agent_name in AGENT_DEFINITIONS.keys():
        best_score = 0.0
        best_task = None
        
        for domain, task in ALL_TEST_TASKS:
            parsed = engine.parse_task(task)
            score = engine.compute_capability_score(agent_name, parsed)
            
            if score.capability_score > best_score:
                best_score = score.capability_score
                best_task = task
        
        agent_scores[agent_name] = best_score
        agent_best_task[agent_name] = best_task
    
    # Check results
    utilized = {k: v for k, v in agent_scores.items() if v > 0}
    orphaned = {k: v for k, v in agent_scores.items() if v == 0}
    
    print(f"\n  Total agents in AGENT_DEFINITIONS: {len(AGENT_DEFINITIONS)}")
    print(f"  Agents with capability > 0: {len(utilized)}")
    print(f"  Orphaned agents (score = 0): {len(orphaned)}")
    
    if orphaned:
        print("\n  ⚠️ ORPHANED AGENTS (need task coverage):")
        for agent in sorted(orphaned.keys())[:10]:
            tier = AGENT_DEFINITIONS[agent].get("tier", "?")
            print(f"    - {agent} ({tier})")
        if len(orphaned) > 10:
            print(f"    ... and {len(orphaned) - 10} more")
    
    # Show by tier
    print("\n  Agent utilization by tier:")
    for tier in ["OPUS", "SONNET", "HAIKU"]:
        tier_agents = [a for a in AGENT_DEFINITIONS if AGENT_DEFINITIONS[a].get("tier") == tier]
        tier_utilized = [a for a in tier_agents if agent_scores[a] > 0]
        print(f"    {tier}: {len(tier_utilized)}/{len(tier_agents)} utilized")
    
    passed = len(orphaned) == 0
    coverage = len(utilized) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    return {
        "passed": passed,
        "total_agents": len(AGENT_DEFINITIONS),
        "utilized": len(utilized),
        "orphaned": len(orphaned),
        "orphaned_list": list(orphaned.keys()),
        "coverage": coverage,
        "agent_scores": dict(agent_scores)
    }


# =============================================================================
# PHASE 3: SKILL SELECTION COVERAGE
# =============================================================================

def test_skill_selection_coverage() -> Dict:
    """Test that every skill gets selected in at least one optimal combination"""
    print("\n" + "="*70)
    print("PHASE 3: SKILL SELECTION COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Track which skills have been selected
    skill_selections = defaultdict(int)
    
    # Run optimization for all tasks
    print(f"\n  Running {len(ALL_TEST_TASKS)} optimizations...")
    
    for i, (domain, task) in enumerate(ALL_TEST_TASKS):
        if (i + 1) % 20 == 0:
            print(f"    Progress: {i+1}/{len(ALL_TEST_TASKS)}")
        
        combo = engine.optimize(task)
        
        for skill in combo.skills:
            skill_selections[skill] += 1
    
    # Check results
    selected = {k: v for k, v in skill_selections.items() if v > 0}
    never_selected = set(SKILL_KEYWORDS.keys()) - set(selected.keys())
    
    print(f"\n  Skills ever selected: {len(selected)}")
    print(f"  Skills never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ NEVER-SELECTED SKILLS:")
        for skill in sorted(never_selected)[:15]:
            print(f"    - {skill}")
        if len(never_selected) > 15:
            print(f"    ... and {len(never_selected) - 15} more")
    
    # Show most frequently selected
    print("\n  Most frequently selected skills:")
    sorted_skills = sorted(skill_selections.items(), key=lambda x: x[1], reverse=True)
    for skill, count in sorted_skills[:10]:
        print(f"    [{count:3d}x] {skill}")
    
    passed = len(never_selected) == 0
    coverage = len(selected) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    
    return {
        "passed": passed,
        "total_skills": len(SKILL_KEYWORDS),
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected),
        "coverage": coverage,
        "selection_counts": dict(skill_selections)
    }


# =============================================================================
# PHASE 4: AGENT SELECTION COVERAGE
# =============================================================================

def test_agent_selection_coverage() -> Dict:
    """Test that every agent gets selected in at least one optimal combination"""
    print("\n" + "="*70)
    print("PHASE 4: AGENT SELECTION COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Track which agents have been selected
    agent_selections = defaultdict(int)
    
    # Run optimization for all tasks (reuse from phase 3 would be more efficient)
    print(f"\n  Running {len(ALL_TEST_TASKS)} optimizations...")
    
    for i, (domain, task) in enumerate(ALL_TEST_TASKS):
        if (i + 1) % 20 == 0:
            print(f"    Progress: {i+1}/{len(ALL_TEST_TASKS)}")
        
        combo = engine.optimize(task)
        
        for agent in combo.agents:
            agent_selections[agent] += 1
    
    # Check results
    selected = {k: v for k, v in agent_selections.items() if v > 0}
    never_selected = set(AGENT_DEFINITIONS.keys()) - set(selected.keys())
    
    print(f"\n  Agents ever selected: {len(selected)}")
    print(f"  Agents never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ NEVER-SELECTED AGENTS:")
        for agent in sorted(never_selected)[:15]:
            tier = AGENT_DEFINITIONS[agent].get("tier", "?")
            print(f"    - {agent} ({tier})")
        if len(never_selected) > 15:
            print(f"    ... and {len(never_selected) - 15} more")
    
    # Show by tier
    print("\n  Selection frequency by tier:")
    for tier in ["OPUS", "SONNET", "HAIKU"]:
        tier_agents = [a for a in AGENT_DEFINITIONS if AGENT_DEFINITIONS[a].get("tier") == tier]
        tier_selected = [a for a in tier_agents if agent_selections[a] > 0]
        total_selections = sum(agent_selections[a] for a in tier_agents)
        print(f"    {tier}: {len(tier_selected)}/{len(tier_agents)} agents, {total_selections} total selections")
    
    passed = len(never_selected) == 0
    coverage = len(selected) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    return {
        "passed": passed,
        "total_agents": len(AGENT_DEFINITIONS),
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected),
        "coverage": coverage,
        "selection_counts": dict(agent_selections)
    }


# =============================================================================
# PHASE 5: CAPABILITY MATRIX COVERAGE
# =============================================================================

def test_capability_matrix_coverage() -> Dict:
    """Test that capability matrix covers all skills"""
    print("\n" + "="*70)
    print("PHASE 5: CAPABILITY MATRIX COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Check which skills are in capability matrix
    cap_skills = set(engine.name_to_caps.keys())
    keyword_skills = set(SKILL_KEYWORDS.keys())
    
    in_both = cap_skills & keyword_skills
    only_keywords = keyword_skills - cap_skills
    only_matrix = cap_skills - keyword_skills
    
    print(f"\n  Skills in SKILL_KEYWORDS: {len(keyword_skills)}")
    print(f"  Skills in CAPABILITY_MATRIX: {len(cap_skills)}")
    print(f"  In both: {len(in_both)}")
    print(f"  Only in KEYWORDS (missing from matrix): {len(only_keywords)}")
    print(f"  Only in MATRIX (orphaned): {len(only_matrix)}")
    
    if only_keywords:
        print("\n  ⚠️ SKILLS MISSING FROM CAPABILITY_MATRIX:")
        for skill in sorted(only_keywords)[:10]:
            print(f"    - {skill}")
        if len(only_keywords) > 10:
            print(f"    ... and {len(only_keywords) - 10} more")
    
    # Check domain coverage
    all_domains = set()
    all_operations = set()
    for skill, caps in engine.name_to_caps.items():
        all_domains.update(caps.get("domainScores", {}).keys())
        all_operations.update(caps.get("operationScores", {}).keys())
    
    print(f"\n  Domains covered: {len(all_domains)}")
    print(f"  Operations covered: {len(all_operations)}")
    
    passed = len(only_keywords) == 0
    coverage = len(in_both) / len(keyword_skills) if keyword_skills else 0
    
    return {
        "passed": passed,
        "keyword_skills": len(keyword_skills),
        "matrix_skills": len(cap_skills),
        "in_both": len(in_both),
        "missing_from_matrix": len(only_keywords),
        "missing_list": list(only_keywords),
        "coverage": coverage,
        "domains": len(all_domains),
        "operations": len(all_operations)
    }


# =============================================================================
# PHASE 6: SYNERGY MATRIX COVERAGE
# =============================================================================

def test_synergy_matrix_coverage() -> Dict:
    """Test synergy matrix completeness"""
    print("\n" + "="*70)
    print("PHASE 6: SYNERGY MATRIX COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Get synergy pairs
    pairs = engine.synergy_matrix.get("synergyMatrix", {}).get("pairs", {})
    
    # Extract unique skills from pairs
    skills_in_synergy = set()
    for pair_key in pairs.keys():
        parts = pair_key.split(":")
        if len(parts) == 2:
            skills_in_synergy.add(parts[0])
            skills_in_synergy.add(parts[1])
    
    keyword_skills = set(SKILL_KEYWORDS.keys())
    
    # Check coverage
    covered = keyword_skills & skills_in_synergy
    not_covered = keyword_skills - skills_in_synergy
    
    print(f"\n  Total synergy pairs: {len(pairs)}")
    print(f"  Unique skills in pairs: {len(skills_in_synergy)}")
    print(f"  Skills from KEYWORDS in pairs: {len(covered)}")
    print(f"  Skills not in any synergy pair: {len(not_covered)}")
    
    if not_covered:
        print("\n  Skills without synergy pairs (will use default 1.0):")
        for skill in sorted(not_covered)[:10]:
            print(f"    - {skill}")
        if len(not_covered) > 10:
            print(f"    ... and {len(not_covered) - 10} more")
    
    # Verify synergy values are valid
    invalid_synergies = []
    for pair_key, pair_data in pairs.items():
        synergy = pair_data.get("synergy", 0)
        if not (0.5 <= synergy <= 2.0):
            invalid_synergies.append((pair_key, synergy))
    
    if invalid_synergies:
        print(f"\n  ⚠️ Invalid synergy values (outside 0.5-2.0): {len(invalid_synergies)}")
    
    coverage = len(covered) / len(keyword_skills) if keyword_skills else 0
    
    return {
        "passed": len(invalid_synergies) == 0,
        "total_pairs": len(pairs),
        "skills_covered": len(covered),
        "skills_not_covered": len(not_covered),
        "not_covered_list": list(not_covered),
        "invalid_synergies": len(invalid_synergies),
        "coverage": coverage
    }


# =============================================================================
# PHASE 7: SWARM PATTERN COVERAGE
# =============================================================================

def test_swarm_pattern_coverage() -> Dict:
    """Test that swarm patterns reference valid agents"""
    print("\n" + "="*70)
    print("PHASE 7: SWARM PATTERN COVERAGE")
    print("="*70)
    
    results = []
    
    for pattern_name, pattern in SWARM_PATTERNS.items():
        agents = pattern.get("agents", [])
        
        valid_agents = [a for a in agents if a in AGENT_DEFINITIONS]
        invalid_agents = [a for a in agents if a not in AGENT_DEFINITIONS]
        
        passed = len(invalid_agents) == 0
        
        status = "[OK]" if passed else "[X]"
        print(f"  {status} {pattern_name}: {len(valid_agents)}/{len(agents)} valid agents")
        
        if invalid_agents:
            print(f"      Invalid: {invalid_agents}")
        
        results.append({
            "pattern": pattern_name,
            "total_agents": len(agents),
            "valid_agents": len(valid_agents),
            "invalid_agents": invalid_agents,
            "passed": passed
        })
    
    all_passed = all(r["passed"] for r in results)
    
    return {
        "passed": all_passed,
        "total_patterns": len(SWARM_PATTERNS),
        "results": results
    }


# =============================================================================
# PHASE 8: DOMAIN TASK COVERAGE
# =============================================================================

def test_domain_task_coverage() -> Dict:
    """Test that each domain has tasks that trigger relevant skills"""
    print("\n" + "="*70)
    print("PHASE 8: DOMAIN TASK COVERAGE")
    print("="*70)
    
    engine = CombinationEngine()
    domain_coverage = {}
    
    for domain, tasks in TEST_TASKS.items():
        triggered_skills = set()
        triggered_agents = set()
        
        for task in tasks:
            combo = engine.optimize(task)
            triggered_skills.update(combo.skills)
            triggered_agents.update(combo.agents)
        
        domain_coverage[domain] = {
            "tasks": len(tasks),
            "unique_skills": len(triggered_skills),
            "unique_agents": len(triggered_agents),
            "skills": list(triggered_skills),
            "agents": list(triggered_agents)
        }
        
        print(f"  {domain}: {len(tasks)} tasks → {len(triggered_skills)} skills, {len(triggered_agents)} agents")
    
    # Check for domains with low coverage
    low_coverage = [d for d, v in domain_coverage.items() if v["unique_skills"] < 3]
    
    if low_coverage:
        print(f"\n  ⚠️ Domains with < 3 unique skills: {low_coverage}")
    
    return {
        "passed": len(low_coverage) == 0,
        "total_domains": len(TEST_TASKS),
        "low_coverage_domains": low_coverage,
        "domain_coverage": domain_coverage
    }


# =============================================================================
# PHASE 9: COMPREHENSIVE UTILIZATION MATRIX
# =============================================================================

def test_comprehensive_utilization() -> Dict:
    """Generate comprehensive utilization report"""
    print("\n" + "="*70)
    print("PHASE 9: COMPREHENSIVE UTILIZATION MATRIX")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Run all optimizations and collect data
    all_combos = []
    for domain, task in ALL_TEST_TASKS:
        combo = engine.optimize(task)
        all_combos.append({
            "domain": domain,
            "task": task,
            "skills": combo.skills,
            "agents": combo.agents,
            "psi": combo.psi_score,
            "coverage": combo.coverage_score,
            "synergy": combo.synergy_score
        })
    
    # Compute utilization metrics
    all_skills_used = set()
    all_agents_used = set()
    skill_usage = defaultdict(int)
    agent_usage = defaultdict(int)
    
    for combo in all_combos:
        all_skills_used.update(combo["skills"])
        all_agents_used.update(combo["agents"])
        for s in combo["skills"]:
            skill_usage[s] += 1
        for a in combo["agents"]:
            agent_usage[a] += 1
    
    # Calculate metrics
    skill_utilization = len(all_skills_used) / len(SKILL_KEYWORDS) if SKILL_KEYWORDS else 0
    agent_utilization = len(all_agents_used) / len(AGENT_DEFINITIONS) if AGENT_DEFINITIONS else 0
    
    avg_psi = sum(c["psi"] for c in all_combos) / len(all_combos) if all_combos else 0
    avg_coverage = sum(c["coverage"] for c in all_combos) / len(all_combos) if all_combos else 0
    avg_synergy = sum(c["synergy"] for c in all_combos) / len(all_combos) if all_combos else 0
    
    print(f"\n  Total optimizations run: {len(all_combos)}")
    print(f"\n  SKILL UTILIZATION:")
    print(f"    Total in KEYWORDS: {len(SKILL_KEYWORDS)}")
    print(f"    Actually used: {len(all_skills_used)}")
    print(f"    Utilization rate: {skill_utilization*100:.1f}%")
    
    print(f"\n  AGENT UTILIZATION:")
    print(f"    Total in DEFINITIONS: {len(AGENT_DEFINITIONS)}")
    print(f"    Actually used: {len(all_agents_used)}")
    print(f"    Utilization rate: {agent_utilization*100:.1f}%")
    
    print(f"\n  OPTIMIZATION METRICS:")
    print(f"    Average PSI: {avg_psi:.2f}")
    print(f"    Average Coverage: {avg_coverage*100:.1f}%")
    print(f"    Average Synergy: {avg_synergy:.3f}")
    
    # Identify never-used resources
    unused_skills = set(SKILL_KEYWORDS.keys()) - all_skills_used
    unused_agents = set(AGENT_DEFINITIONS.keys()) - all_agents_used
    
    passed = skill_utilization >= 0.80 and agent_utilization >= 0.80
    
    return {
        "passed": passed,
        "skill_utilization": skill_utilization,
        "agent_utilization": agent_utilization,
        "skills_used": len(all_skills_used),
        "agents_used": len(all_agents_used),
        "unused_skills": list(unused_skills),
        "unused_agents": list(unused_agents),
        "avg_psi": avg_psi,
        "avg_coverage": avg_coverage,
        "avg_synergy": avg_synergy,
        "total_optimizations": len(all_combos)
    }


# =============================================================================
# MAIN RUNNER
# =============================================================================

def run_utilization_suite() -> Dict:
    """Run complete utilization test suite"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*8 + "PRISM RESOURCE UTILIZATION TEST SUITE v1.0" + " "*8 + "       ║")
    print("╚" + "═"*68 + "╝")
    
    results = {
        "suite_name": "PRISM Resource Utilization Tests v1.0",
        "started": datetime.now().isoformat(),
        "phases": {}
    }
    
    # Run all test phases
    results["phases"]["skill_capability"] = test_skill_capability_coverage()
    results["phases"]["agent_capability"] = test_agent_capability_coverage()
    results["phases"]["skill_selection"] = test_skill_selection_coverage()
    results["phases"]["agent_selection"] = test_agent_selection_coverage()
    results["phases"]["capability_matrix"] = test_capability_matrix_coverage()
    results["phases"]["synergy_matrix"] = test_synergy_matrix_coverage()
    results["phases"]["swarm_patterns"] = test_swarm_pattern_coverage()
    results["phases"]["domain_coverage"] = test_domain_task_coverage()
    results["phases"]["comprehensive"] = test_comprehensive_utilization()
    
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
        "success_rate": passed / (passed + failed) if (passed + failed) > 0 else 0
    }
    
    # Final report
    print("\n" + "="*70)
    print("UTILIZATION SUITE SUMMARY")
    print("="*70)
    
    for name, p in phase_results:
        status = "[OK]" if p else "[X]"
        print(f"  {status} {name}")
    
    print(f"\n  Total Passed:  {passed}")
    print(f"  Total Failed:  {failed}")
    print(f"  Success Rate:  {results['summary']['success_rate']*100:.1f}%")
    
    # Key metrics
    comp = results["phases"]["comprehensive"]
    print(f"\n  KEY METRICS:")
    print(f"    Skill Utilization: {comp.get('skill_utilization', 0)*100:.1f}%")
    print(f"    Agent Utilization: {comp.get('agent_utilization', 0)*100:.1f}%")
    print(f"    Average PSI: {comp.get('avg_psi', 0):.2f}")
    
    # Unused resources
    if comp.get("unused_skills"):
        print(f"\n  ⚠️ UNUSED SKILLS ({len(comp['unused_skills'])}):")
        for s in comp["unused_skills"][:5]:
            print(f"      - {s}")
        if len(comp["unused_skills"]) > 5:
            print(f"      ... and {len(comp['unused_skills']) - 5} more")
    
    if comp.get("unused_agents"):
        print(f"\n  ⚠️ UNUSED AGENTS ({len(comp['unused_agents'])}):")
        for a in comp["unused_agents"][:5]:
            tier = AGENT_DEFINITIONS.get(a, {}).get("tier", "?")
            print(f"      - {a} ({tier})")
        if len(comp["unused_agents"]) > 5:
            print(f"      ... and {len(comp['unused_agents']) - 5} more")
    
    print("="*70)
    
    # Save results
    results["completed"] = datetime.now().isoformat()
    output_path = PRISM_ROOT / "state" / "results" / f"utilization_suite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nResults saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    run_utilization_suite()
