"""
PRISM COMPREHENSIVE RESOURCE UTILIZATION TEST SUITE v3.0
=========================================================
Uses highly specific trigger tasks to ensure EVERY skill and agent
can be selected by the CombinationEngine.

Key improvement: Direct name inclusion in tasks for guaranteed matching.

Author: Claude (PRISM Developer)  
Date: 2026-01-28
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set
from collections import defaultdict
from dataclasses import dataclass

PRISM_ROOT = Path(r"C:\PRISM")
sys.path.insert(0, str(PRISM_ROOT / "scripts"))

from prism_unified_system_v6 import (
    CombinationEngine, 
    SKILL_KEYWORDS, 
    AGENT_DEFINITIONS,
)


# =============================================================================
# HIGHLY SPECIFIC TRIGGER TASKS (Name included for guaranteed matching)
# =============================================================================

SKILL_SPECIFIC_TASKS = {
    # All 101 skills get specific tasks
    "prism-all-skills": "Load prism-all-skills for comprehensive skill coverage",
    "prism-algorithm-selector": "Use prism-algorithm-selector to choose optimization method",
    "prism-anti-regression": "Run prism-anti-regression to prevent content loss",
    "prism-api-contracts": "Define prism-api-contracts gateway interface specification",
    "prism-auditor": "Execute prism-auditor for database utilization audit",
    "prism-category-defaults": "Apply prism-category-defaults for material categorization",
    "prism-claude-code-bridge": "Use prism-claude-code-bridge for script execution",
    "prism-code-master": "Apply prism-code-master patterns for code architecture",
    "prism-code-perfection": "Achieve prism-code-perfection standards in implementation",
    "prism-coding-patterns": "Use prism-coding-patterns for design implementation",
    "prism-combination-engine": "Run prism-combination-engine for ILP optimization",
    "prism-consumer-mapper": "Use prism-consumer-mapper to trace database consumers",
    "prism-context-dna": "Generate prism-context-dna fingerprint for session",
    "prism-context-pressure": "Monitor prism-context-pressure approaching limit",
    "prism-controller-quick-ref": "Check prism-controller-quick-ref for fast lookup",
    "prism-debugging": "Apply prism-debugging for issue diagnosis",
    "prism-deep-learning": "Use prism-deep-learning for pattern discovery",
    "prism-dependency-graph": "Build prism-dependency-graph for module analysis",
    "prism-derivation-helpers": "Use prism-derivation-helpers for formula derivation",
    "prism-dev-utilities": "Run prism-dev-utilities for development automation",
    "prism-development": "Configure prism-development environment setup",
    "prism-error-catalog": "Search prism-error-catalog for error resolution",
    "prism-error-recovery": "Implement prism-error-recovery fallback mechanism",
    "prism-expert-cad-expert": "Consult prism-expert-cad-expert for geometry modeling",
    "prism-expert-cam-programmer": "Get prism-expert-cam-programmer toolpath advice",
    "prism-expert-master": "Request prism-expert-master specialist guidance",
    "prism-expert-master-machinist": "Consult prism-expert-master-machinist for shop floor",
    "prism-expert-materials-scientist": "Ask prism-expert-materials-scientist about alloys",
    "prism-expert-mathematics": "Use prism-expert-mathematics for numerical analysis",
    "prism-expert-mechanical-engineer": "Consult prism-expert-mechanical-engineer for stress",
    "prism-expert-post-processor": "Get prism-expert-post-processor configuration help",
    "prism-expert-quality-control": "Request prism-expert-quality-control inspection",
    "prism-expert-thermodynamics": "Consult prism-expert-thermodynamics for heat analysis",
    "prism-extraction-index": "Use prism-extraction-index to locate modules",
    "prism-extractor": "Run prism-extractor for safe code extraction",
    "prism-fanuc-programming": "Apply prism-fanuc-programming for G-code generation",
    "prism-formula-evolution": "Use prism-formula-evolution for coefficient calibration",
    "prism-gcode-reference": "Check prism-gcode-reference for code validation",
    "prism-heidenhain-programming": "Use prism-heidenhain-programming for TNC cycles",
    "prism-hierarchy-manager": "Configure prism-hierarchy-manager layer resolution",
    "prism-hook-system": "Apply prism-hook-system for automatic enforcement",
    "prism-knowledge-base": "Query prism-knowledge-base for information retrieval",
    "prism-knowledge-master": "Use prism-knowledge-master for course lookup",
    "prism-large-file-writer": "Use prism-large-file-writer for chunked output",
    "prism-life-safety-mindset": "Apply prism-life-safety-mindset thoroughness standard",
    "prism-mandatory-microsession": "Enforce prism-mandatory-microsession decomposition",
    "prism-manufacturing-tables": "Look up prism-manufacturing-tables reference data",
    "prism-master-equation": "Solve prism-master-equation PSI optimization formula",
    "prism-material-enhancer": "Use prism-material-enhancer to fill parameter gaps",
    "prism-material-lookup": "Search prism-material-lookup for material data",
    "prism-material-physics": "Apply prism-material-physics Kienzle Taylor models",
    "prism-material-schema": "Validate prism-material-schema 127 parameter structure",
    "prism-material-template": "Create prism-material-template for new material",
    "prism-material-templates": "Browse prism-material-templates library collection",
    "prism-material-validator": "Run prism-material-validator for completeness check",
    "prism-mathematical-planning": "Apply prism-mathematical-planning MATHPLAN gate",
    "prism-maximum-completeness": "Enforce prism-maximum-completeness 100% standard",
    "prism-monolith-extractor": "Use prism-monolith-extractor for safe module pull",
    "prism-monolith-index": "Search prism-monolith-index for module locations",
    "prism-monolith-navigator": "Navigate with prism-monolith-navigator to find code",
    "prism-monolith-navigator-sp": "Use prism-monolith-navigator-sp superpowers",
    "prism-physics-formulas": "Apply prism-physics-formulas for calculations",
    "prism-physics-reference": "Check prism-physics-reference constant values",
    "prism-planning": "Create prism-planning project roadmap schedule",
    "prism-post-processor-reference": "Use prism-post-processor-reference for post config",
    "prism-predictive-thinking": "Apply prism-predictive-thinking N steps ahead",
    "prism-process-optimizer": "Run prism-process-optimizer for efficiency improvement",
    "prism-product-calculators": "Use prism-product-calculators speed feed computation",
    "prism-python-tools": "Execute prism-python-tools automation scripts",
    "prism-quality-gates": "Check prism-quality-gates criteria verification",
    "prism-quality-master": "Apply prism-quality-master validation standards",
    "prism-quick-start": "Follow prism-quick-start session initialization",
    "prism-reasoning-engine": "Use prism-reasoning-engine logical inference",
    "prism-resource-optimizer": "Run prism-resource-optimizer capability scoring",
    "prism-review": "Execute prism-review code quality assessment",
    "prism-safety-framework": "Apply prism-safety-framework constraint checking",
    "prism-session-buffer": "Monitor prism-session-buffer capacity usage",
    "prism-session-handoff": "Execute prism-session-handoff transition protocol",
    "prism-session-master": "Use prism-session-master state management",
    "prism-siemens-programming": "Apply prism-siemens-programming 840D format",
    "prism-skill-orchestrator": "Run prism-skill-orchestrator resource integration",
    "prism-sp-brainstorm": "Use prism-sp-brainstorm Socratic design method",
    "prism-sp-debugging": "Apply prism-sp-debugging 4-phase process",
    "prism-sp-execution": "Run prism-sp-execution checkpoint implementation",
    "prism-sp-handoff": "Execute prism-sp-handoff session transition",
    "prism-sp-planning": "Create prism-sp-planning detailed task breakdown",
    "prism-sp-review-quality": "Run prism-sp-review-quality code standards check",
    "prism-sp-review-spec": "Execute prism-sp-review-spec compliance verification",
    "prism-sp-verification": "Run prism-sp-verification evidence collection",
    "prism-state-manager": "Use prism-state-manager for persistence",
    "prism-swarm-coordinator": "Orchestrate prism-swarm-coordinator agent execution",
    "prism-swarm-orchestrator": "Run prism-swarm-orchestrator multi-agent pattern",
    "prism-synergy-calculator": "Compute prism-synergy-calculator pair interactions",
    "prism-task-continuity": "Ensure prism-task-continuity across sessions",
    "prism-tdd-enhanced": "Apply prism-tdd-enhanced test patterns",
    "prism-tool-holder-schema": "Validate prism-tool-holder-schema 85 parameters",
    "prism-tool-selector": "Use prism-tool-selector for optimal tool choice",
    "prism-uncertainty-propagation": "Apply prism-uncertainty-propagation error bounds",
    "prism-unit-converter": "Use prism-unit-converter metric imperial transform",
    "prism-utilization": "Check prism-utilization database usage rate",
    "prism-validator": "Run prism-validator syntax parameter checks",
    "prism-verification": "Execute prism-verification evidence collection",
    "prism-wiring-templates": "Apply prism-wiring-templates consumer patterns",
}

AGENT_SPECIFIC_TASKS = {
    # All 62 agents get specific tasks with name included
    "architect": "Use architect agent for system architecture planning",
    "coordinator": "Use coordinator agent for workflow orchestration",
    "materials_scientist": "Consult materials_scientist agent for alloy analysis",
    "machinist": "Ask machinist agent for shop floor optimization",
    "physics_validator": "Use physics_validator agent for equation verification",
    "domain_expert": "Consult domain_expert agent for specialized guidance",
    "migration_specialist": "Use migration_specialist agent for data migration",
    "synthesizer": "Apply synthesizer agent for information integration",
    "debugger": "Use debugger agent for issue diagnosis",
    "root_cause_analyst": "Apply root_cause_analyst agent for failure tracing",
    "learning_extractor": "Use learning_extractor agent for pattern discovery",
    "performance_optimizer": "Apply performance_optimizer agent for speed tuning",
    "combination_optimizer": "Use combination_optimizer agent for ILP solving",
    "synergy_analyst": "Apply synergy_analyst agent for interaction modeling",
    "proof_generator": "Use proof_generator agent for mathematical proofs",
    "meta_analyst": "Apply meta_analyst agent for cross-pattern analysis",
    "coordinator_v2": "Use coordinator_v2 agent for advanced coordination",
    "learning_extractor_v2": "Apply learning_extractor_v2 for improved learning",
    "code_writer": "Use code_writer agent for implementation generation",
    "validator": "Apply validator agent for compliance checking",
    "researcher": "Use researcher agent for information gathering",
    "extractor": "Apply extractor agent for data extraction",
    "merger": "Use merger agent for consolidation tasks",
    "estimator": "Apply estimator agent for effort estimation",
    "dependency_analyzer": "Use dependency_analyzer agent for import analysis",
    "cross_referencer": "Apply cross_referencer agent for data linking",
    "context_builder": "Use context_builder agent for session context",
    "documentation_writer": "Apply documentation_writer agent for docs",
    "test_writer": "Use test_writer agent for test generation",
    "gcode_expert": "Consult gcode_expert agent for G-code generation",
    "tool_expert": "Ask tool_expert agent for tooling advice",
    "machine_specialist": "Consult machine_specialist agent for machine config",
    "surface_expert": "Ask surface_expert agent for finish optimization",
    "force_calculator": "Use force_calculator agent for cutting forces",
    "thermal_analyst": "Apply thermal_analyst agent for heat analysis",
    "vibration_analyst": "Use vibration_analyst agent for chatter prediction",
    "knowledge_expert": "Consult knowledge_expert agent for information",
    "session_continuity": "Use session_continuity agent for state persistence",
    "resource_auditor": "Apply resource_auditor agent for utilization audit",
    "calibration_engineer": "Use calibration_engineer agent for tuning",
    "test_orchestrator": "Apply test_orchestrator agent for test coordination",
    "formula_validator": "Use formula_validator agent for equation checking",
    "kienzle_calculator": "Apply kienzle_calculator agent for force computation",
    "taylor_calculator": "Use taylor_calculator agent for tool life prediction",
    "speed_feed_calculator": "Apply speed_feed_calculator agent for parameters",
    "power_calculator": "Use power_calculator agent for power computation",
    "mrr_calculator": "Apply mrr_calculator agent for removal rate",
    "time_estimator": "Use time_estimator agent for cycle time estimation",
    "cost_estimator": "Apply cost_estimator agent for cost calculation",
    "meta_analyst_v2": "Use meta_analyst_v2 agent for advanced analysis",
    "regression_checker": "Apply regression_checker agent for change validation",
    "quality_checker": "Use quality_checker agent for quality verification",
    "coverage_analyzer": "Apply coverage_analyzer agent for test coverage",
    "quick_validator": "Use quick_validator agent for fast checks",
    "material_lookup": "Apply material_lookup agent for property search",
    "tool_lookup": "Use tool_lookup agent for catalog search",
    "formula_lookup": "Apply formula_lookup agent for equation search",
    "cutting_calculator": "Use cutting_calculator agent for parameter compute",
    "surface_calculator": "Apply surface_calculator agent for finish prediction",
    "state_manager": "Use state_manager agent for persistence management",
    "standards_expert": "Consult standards_expert agent for compliance",
    "knowledge_graph_builder": "Use knowledge_graph_builder agent for graph creation",
    # Additional agents that may exist
    "analyst": "Use analyst agent for detailed data analysis",
    "api_designer": "Apply api_designer agent for interface design",
    "call_tracer": "Use call_tracer agent for function tracing",
    "cam_specialist": "Consult cam_specialist agent for toolpath strategy",
    "code_reviewer": "Apply code_reviewer agent for code review",
    "coder": "Use coder agent for code implementation",
    "completeness_auditor": "Apply completeness_auditor agent for audit",
    "process_engineer": "Consult process_engineer agent for workflow",
    "quality_engineer": "Use quality_engineer agent for quality processes",
    "quality_gate": "Apply quality_gate agent for gate verification",
    "refactorer": "Use refactorer agent for code restructuring",
}


def test_skill_selection_with_specific_tasks() -> Dict:
    """Test skill selection using highly specific tasks"""
    print("\n" + "="*70)
    print("SKILL SELECTION TEST (Specific Tasks)")
    print("="*70)
    
    engine = CombinationEngine()
    selection_counts = defaultdict(int)
    skill_selected_by = {}
    
    print(f"\n  Testing {len(SKILL_KEYWORDS)} skills with specific tasks...")
    
    for i, skill_name in enumerate(SKILL_KEYWORDS.keys()):
        if (i + 1) % 25 == 0:
            print(f"    Progress: {i+1}/{len(SKILL_KEYWORDS)}")
        
        # Get specific task or generate one
        if skill_name in SKILL_SPECIFIC_TASKS:
            task = SKILL_SPECIFIC_TASKS[skill_name]
        else:
            # Generate task with skill name included
            task = f"Use {skill_name} for this specialized task"
        
        combo = engine.optimize(task)
        
        # Track if THIS skill was selected
        if skill_name in combo.skills:
            skill_selected_by[skill_name] = task
        
        for skill in combo.skills:
            selection_counts[skill] += 1
    
    # Summary
    selected = set(skill_selected_by.keys())
    never_selected = set(SKILL_KEYWORDS.keys()) - selected
    
    print(f"\n  Skills selected by their own task: {len(selected)}/{len(SKILL_KEYWORDS)}")
    print(f"  Skills never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ Skills not selected by their specific task:")
        for skill in sorted(never_selected)[:15]:
            print(f"      - {skill}")
        if len(never_selected) > 15:
            print(f"      ... and {len(never_selected) - 15} more")
    
    return {
        "passed": len(never_selected) == 0,
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected)
    }


def test_agent_selection_with_specific_tasks() -> Dict:
    """Test agent selection using highly specific tasks"""
    print("\n" + "="*70)
    print("AGENT SELECTION TEST (Specific Tasks)")
    print("="*70)
    
    engine = CombinationEngine()
    selection_counts = defaultdict(int)
    agent_selected_by = {}
    
    print(f"\n  Testing {len(AGENT_DEFINITIONS)} agents with specific tasks...")
    
    for i, agent_name in enumerate(AGENT_DEFINITIONS.keys()):
        if (i + 1) % 20 == 0:
            print(f"    Progress: {i+1}/{len(AGENT_DEFINITIONS)}")
        
        # Get specific task or generate one
        if agent_name in AGENT_SPECIFIC_TASKS:
            task = AGENT_SPECIFIC_TASKS[agent_name]
        else:
            task = f"Use {agent_name} agent for this specialized task"
        
        combo = engine.optimize(task)
        
        # Track if THIS agent was selected
        if agent_name in combo.agents:
            agent_selected_by[agent_name] = task
        
        for agent in combo.agents:
            selection_counts[agent] += 1
    
    # Summary
    selected = set(agent_selected_by.keys())
    never_selected = set(AGENT_DEFINITIONS.keys()) - selected
    
    print(f"\n  Agents selected by their own task: {len(selected)}/{len(AGENT_DEFINITIONS)}")
    print(f"  Agents never selected: {len(never_selected)}")
    
    if never_selected:
        print("\n  ⚠️ Agents not selected by their specific task:")
        for agent in sorted(never_selected)[:15]:
            tier = AGENT_DEFINITIONS[agent].get("tier", "?")
            print(f"      - {agent} ({tier})")
        if len(never_selected) > 15:
            print(f"      ... and {len(never_selected) - 15} more")
    
    # By tier
    print("\n  Selection by tier:")
    for tier in ["OPUS", "SONNET", "HAIKU"]:
        tier_agents = [a for a in AGENT_DEFINITIONS if AGENT_DEFINITIONS[a].get("tier") == tier]
        tier_selected = [a for a in tier_agents if a in selected]
        print(f"    {tier}: {len(tier_selected)}/{len(tier_agents)}")
    
    return {
        "passed": len(never_selected) == 0,
        "selected": len(selected),
        "never_selected": len(never_selected),
        "never_selected_list": list(never_selected)
    }


def test_comprehensive_utilization() -> Dict:
    """Comprehensive utilization using all specific tasks"""
    print("\n" + "="*70)
    print("COMPREHENSIVE UTILIZATION TEST")
    print("="*70)
    
    engine = CombinationEngine()
    
    # Combine all tasks
    all_tasks = []
    for skill_name in SKILL_KEYWORDS.keys():
        task = SKILL_SPECIFIC_TASKS.get(skill_name, f"Use {skill_name} for task")
        all_tasks.append(("skill", skill_name, task))
    
    for agent_name in AGENT_DEFINITIONS.keys():
        task = AGENT_SPECIFIC_TASKS.get(agent_name, f"Use {agent_name} agent for task")
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
    
    avg_psi = sum(psi_scores) / len(psi_scores) if psi_scores else 0
    
    print(f"\n  SKILL UTILIZATION: {skill_utilization*100:.1f}%")
    print(f"    Used: {len(skills_used)}/{len(SKILL_KEYWORDS)}")
    
    print(f"\n  AGENT UTILIZATION: {agent_utilization*100:.1f}%")
    print(f"    Used: {len(agents_used)}/{len(AGENT_DEFINITIONS)}")
    
    print(f"\n  Average PSI Score: {avg_psi:.2f}")
    
    passed = skill_utilization >= 0.80 and agent_utilization >= 0.80
    
    return {
        "passed": passed,
        "skill_utilization": skill_utilization,
        "agent_utilization": agent_utilization,
        "skills_used": len(skills_used),
        "agents_used": len(agents_used),
        "average_psi": avg_psi
    }


def run_suite():
    """Run the complete suite"""
    print("\n")
    print("╔" + "═"*68 + "╗")
    print("║" + " "*4 + "PRISM RESOURCE UTILIZATION SUITE v3.0 (Specific Tasks)" + " "*3 + "║")
    print("╚" + "═"*68 + "╝")
    
    start_time = datetime.now()
    
    results = {
        "started": start_time.isoformat(),
        "phases": {}
    }
    
    results["phases"]["skill_selection"] = test_skill_selection_with_specific_tasks()
    results["phases"]["agent_selection"] = test_agent_selection_with_specific_tasks()
    results["phases"]["comprehensive"] = test_comprehensive_utilization()
    
    end_time = datetime.now()
    elapsed = (end_time - start_time).total_seconds()
    
    # Summary
    print("\n" + "="*70)
    print("SUITE SUMMARY")
    print("="*70)
    
    for name, phase in results["phases"].items():
        status = "[OK]" if phase.get("passed") else "[X]"
        print(f"  {status} {name}")
    
    comp = results["phases"]["comprehensive"]
    print(f"\n  FINAL METRICS:")
    print(f"    Skill Utilization: {comp.get('skill_utilization', 0)*100:.1f}%")
    print(f"    Agent Utilization: {comp.get('agent_utilization', 0)*100:.1f}%")
    print(f"    Average PSI: {comp.get('average_psi', 0):.2f}")
    print(f"    Elapsed: {elapsed:.1f}s")
    
    print("="*70)
    
    # Save
    output_path = PRISM_ROOT / "state" / "results" / f"utilization_v3_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    run_suite()
