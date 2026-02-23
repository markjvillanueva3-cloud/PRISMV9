#!/usr/bin/env python3
"""
PRISM Agent Registry Builder - R2.6
Extracts all 64 agents with full metadata and wires to MCP registry.

Session: R2.6 - Complete Agent Coverage
Target: 64 agents (18 OPUS + 37 SONNET + 9 HAIKU)
"""

import json
from datetime import datetime

REGISTRY_PATH = r"C:\PRISM\registries\RESOURCE_REGISTRY.json"
OUTPUT_PATH = r"C:\PRISM\registries\AGENT_REGISTRY.json"
AUDIT_PATH = r"C:\PRISM\mcp-server\audits\agent_registry_r2_6.json"

# Agent definitions from prism-skill-orchestrator v7.0
OPUS_AGENTS = [
    {"name": "architect", "role": "System design", "skills": ["sp-brainstorm", "code-master"], "costPer1M": 75},
    {"name": "coordinator_v2", "role": "ILP-based selection", "skills": ["combination-engine"], "costPer1M": 75},
    {"name": "materials_scientist", "role": "Materials expertise", "skills": ["material-physics", "material-schema"], "costPer1M": 75},
    {"name": "master_machinist", "role": "Shop floor wisdom", "skills": ["expert-master-machinist"], "costPer1M": 75},
    {"name": "physics_validator", "role": "Physics validation", "skills": ["material-physics", "uncertainty-propagation"], "costPer1M": 75},
    {"name": "domain_expert", "role": "Domain knowledge", "skills": ["expert-master", "knowledge-master"], "costPer1M": 75},
    {"name": "migration_specialist", "role": "Code migration", "skills": ["monolith-extractor"], "costPer1M": 75},
    {"name": "synthesizer", "role": "Cross-domain fusion", "skills": ["reasoning-engine"], "costPer1M": 75},
    {"name": "debugger", "role": "Root cause analysis", "skills": ["sp-debugging"], "costPer1M": 75},
    {"name": "root_cause_analyst", "role": "5-why analysis", "skills": ["sp-debugging"], "costPer1M": 75},
    {"name": "task_decomposer", "role": "Task breakdown", "skills": ["sp-planning"], "costPer1M": 75},
    {"name": "learning_extractor_v2", "role": "Synergy learning", "skills": ["deep-learning"], "costPer1M": 75},
    {"name": "verification_chain", "role": "Verification", "skills": ["sp-verification"], "costPer1M": 75},
    {"name": "uncertainty_quantifier", "role": "Uncertainty", "skills": ["uncertainty-propagation"], "costPer1M": 75},
    {"name": "knowledge_graph_builder", "role": "Knowledge", "skills": ["knowledge-master"], "costPer1M": 75},
    {"name": "meta_analyst_v2", "role": "Resource utilization", "skills": ["resource-optimizer"], "costPer1M": 75},
    {"name": "combination_optimizer", "role": "ILP solving", "skills": ["combination-engine"], "costPer1M": 75},
    {"name": "proof_generator", "role": "Optimality proofs", "skills": ["mathematical-planning"], "costPer1M": 75},
]

SONNET_AGENTS = [
    {"name": "coder", "role": "Code writing", "skills": ["code-master", "coding-patterns"], "costPer1M": 15},
    {"name": "extractor", "role": "Module extraction", "skills": ["monolith-extractor"], "costPer1M": 15},
    {"name": "validator", "role": "Validation", "skills": ["validator", "sp-verification"], "costPer1M": 15},
    {"name": "code_reviewer", "role": "Code review", "skills": ["sp-review-quality"], "costPer1M": 15},
    {"name": "security_auditor", "role": "Security", "skills": ["security-coding"], "costPer1M": 15},
    {"name": "test_generator", "role": "Test creation", "skills": ["tdd", "tdd-enhanced"], "costPer1M": 15},
    {"name": "documentation_writer", "role": "Documentation", "skills": ["code-master"], "costPer1M": 15},
    {"name": "optimizer", "role": "Optimization", "skills": ["ai-optimization", "process-optimizer"], "costPer1M": 15},
    {"name": "refactorer", "role": "Refactoring", "skills": ["coding-patterns", "solid-principles"], "costPer1M": 15},
    {"name": "pattern_matcher", "role": "Pattern matching", "skills": ["design-patterns"], "costPer1M": 15},
    {"name": "completeness_auditor", "role": "Completeness", "skills": ["quality-master", "auditor"], "costPer1M": 15},
    {"name": "dependency_analyzer", "role": "Dependencies", "skills": ["dependency-graph"], "costPer1M": 15},
    {"name": "formula_validator", "role": "Formula validation", "skills": ["universal-formulas"], "costPer1M": 15},
    {"name": "estimator", "role": "Estimation", "skills": ["process-optimizer"], "costPer1M": 15},
    {"name": "cross_referencer", "role": "Cross-reference", "skills": ["knowledge-master"], "costPer1M": 15},
    {"name": "monolith_navigator", "role": "Navigation", "skills": ["monolith-navigator"], "costPer1M": 15},
    {"name": "material_lookup", "role": "Material search", "skills": ["material-lookup"], "costPer1M": 15},
    {"name": "gcode_expert", "role": "G-code", "skills": ["gcode-reference"], "costPer1M": 15},
    {"name": "machine_specialist", "role": "Machine specs", "skills": ["manufacturing-tables"], "costPer1M": 15},
    {"name": "standards_expert", "role": "Standards", "skills": ["manufacturing-tables"], "costPer1M": 15},
    {"name": "session_continuity", "role": "Session state", "skills": ["session-master"], "costPer1M": 15},
    {"name": "state_manager", "role": "State persistence", "skills": ["state-manager"], "costPer1M": 15},
    {"name": "synergy_analyst", "role": "Synergy patterns", "skills": ["synergy-calculator"], "costPer1M": 15},
    {"name": "resource_auditor", "role": "Resource audit", "skills": ["resource-optimizer"], "costPer1M": 15},
    {"name": "calibration_engineer", "role": "Calibration", "skills": ["formula-evolution"], "costPer1M": 15},
    {"name": "test_orchestrator", "role": "Test orchestration", "skills": ["tdd-enhanced"], "costPer1M": 15},
    {"name": "cam_programmer", "role": "CAM programming", "skills": ["cam-strategies", "expert-cam-programmer"], "costPer1M": 15},
    {"name": "post_processor", "role": "Post processing", "skills": ["post-processor-reference", "expert-post-processor"], "costPer1M": 15},
    {"name": "thermal_analyst", "role": "Thermal analysis", "skills": ["expert-thermodynamics"], "costPer1M": 15},
    {"name": "signal_processor", "role": "Signal processing", "skills": ["signal-processing"], "costPer1M": 15},
    {"name": "learning_agent", "role": "Machine learning", "skills": ["learning-engines", "ai-deep-learning"], "costPer1M": 15},
    {"name": "cutting_mechanics", "role": "Cutting forces", "skills": ["cutting-mechanics"], "costPer1M": 15},
    {"name": "tool_selector", "role": "Tool selection", "skills": ["tool-selector", "cutting-tools"], "costPer1M": 15},
    {"name": "error_handler", "role": "Error handling", "skills": ["error-recovery", "error-handling-patterns"], "costPer1M": 15},
    {"name": "workflow_manager", "role": "Workflow", "skills": ["sp-execution", "sp-planning"], "costPer1M": 15},
    {"name": "quality_controller", "role": "Quality control", "skills": ["expert-quality-control", "quality-master"], "costPer1M": 15},
    {"name": "api_coordinator", "role": "API coordination", "skills": ["api-contracts"], "costPer1M": 15},
]

HAIKU_AGENTS = [
    {"name": "quick_lookup", "role": "Fast lookups", "skills": ["material-lookup", "gcode-reference"], "costPer1M": 1.25},
    {"name": "formatter", "role": "Formatting", "skills": ["large-file-writer"], "costPer1M": 1.25},
    {"name": "counter", "role": "Counting", "skills": ["auditor"], "costPer1M": 1.25},
    {"name": "lister", "role": "List operations", "skills": ["monolith-index"], "costPer1M": 1.25},
    {"name": "summarizer", "role": "Summarization", "skills": ["context-dna"], "costPer1M": 1.25},
    {"name": "translator", "role": "Translation", "skills": ["unit-converter"], "costPer1M": 1.25},
    {"name": "comparator", "role": "Comparison", "skills": ["validator"], "costPer1M": 1.25},
    {"name": "merger", "role": "Merging", "skills": ["large-file-writer"], "costPer1M": 1.25},
    {"name": "reporter", "role": "Reporting", "skills": ["auditor"], "costPer1M": 1.25},
]

def build_agent_registry():
    """Build complete agent registry with full metadata."""
    agents = []
    
    print("=" * 70)
    print("PRISM AGENT REGISTRY BUILDER - R2.6")
    print("=" * 70)
    
    # Process OPUS agents
    print("\nOPUS TIER (18 agents) - Complex Reasoning:")
    for i, agent in enumerate(OPUS_AGENTS, 1):
        entry = {
            "id": f"AGENT-OPUS-{i:03d}",
            "name": agent["name"],
            "displayName": agent["name"].replace("_", " ").title(),
            "tier": "OPUS",
            "role": agent["role"],
            "skills": [f"prism-{s}" for s in agent["skills"]],
            "costPer1M": agent["costPer1M"],
            "model": "claude-opus-4-5-20251101",
            "capabilities": [
                "Complex multi-step reasoning",
                "Cross-domain synthesis",
                "Deep analysis",
                agent["role"]
            ],
            "useCases": [
                f"When {agent['role'].lower()} is required",
                "For complex tasks requiring deep reasoning"
            ],
            "status": "ACTIVE"
        }
        agents.append(entry)
        print(f"  [{i:2d}] {agent['name']}: {agent['role']}")
    
    # Process SONNET agents
    print(f"\nSONNET TIER (37 agents) - Balanced Tasks:")
    for i, agent in enumerate(SONNET_AGENTS, 1):
        entry = {
            "id": f"AGENT-SONNET-{i:03d}",
            "name": agent["name"],
            "displayName": agent["name"].replace("_", " ").title(),
            "tier": "SONNET",
            "role": agent["role"],
            "skills": [f"prism-{s}" for s in agent["skills"]],
            "costPer1M": agent["costPer1M"],
            "model": "claude-sonnet-4-20250514",
            "capabilities": [
                "Balanced performance/cost",
                "Standard development tasks",
                agent["role"]
            ],
            "useCases": [
                f"When {agent['role'].lower()} is required",
                "For typical development tasks"
            ],
            "status": "ACTIVE"
        }
        agents.append(entry)
        print(f"  [{i:2d}] {agent['name']}: {agent['role']}")
    
    # Process HAIKU agents
    print(f"\nHAIKU TIER (9 agents) - Quick Tasks:")
    for i, agent in enumerate(HAIKU_AGENTS, 1):
        entry = {
            "id": f"AGENT-HAIKU-{i:03d}",
            "name": agent["name"],
            "displayName": agent["name"].replace("_", " ").title(),
            "tier": "HAIKU",
            "role": agent["role"],
            "skills": [f"prism-{s}" for s in agent["skills"]],
            "costPer1M": agent["costPer1M"],
            "model": "claude-haiku-4-5-20251001",
            "capabilities": [
                "Fast execution",
                "Low cost",
                agent["role"]
            ],
            "useCases": [
                f"Quick {agent['role'].lower()}",
                "High-volume simple tasks"
            ],
            "status": "ACTIVE"
        }
        agents.append(entry)
        print(f"  [{i:2d}] {agent['name']}: {agent['role']}")
    
    print(f"\nTotal agents: {len(agents)}")
    
    # Build registry
    registry = {
        "version": "2.6.1",
        "generatedAt": datetime.now().isoformat(),
        "session": "R2.6",
        "summary": {
            "total": len(agents),
            "byTier": {
                "OPUS": len(OPUS_AGENTS),
                "SONNET": len(SONNET_AGENTS),
                "HAIKU": len(HAIKU_AGENTS)
            }
        },
        "agents": agents
    }
    
    return registry

def update_main_registry(agent_registry):
    """Update main registry with agents."""
    with open(REGISTRY_PATH, 'r', encoding='utf-8') as f:
        main_registry = json.load(f)
    
    main_registry['agents'] = agent_registry['agents']
    main_registry['summary']['agents'] = len(agent_registry['agents'])
    
    with open(REGISTRY_PATH, 'w', encoding='utf-8') as f:
        json.dump(main_registry, f, indent=2)
    
    print(f"\nUpdated {REGISTRY_PATH}")
    print(f"  Agents: {len(agent_registry['agents'])}")

def main():
    registry = build_agent_registry()
    
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved to {OUTPUT_PATH}")
    
    audit = {
        "session": "R2.6",
        "timestamp": datetime.now().isoformat(),
        "agentsProcessed": len(registry['agents']),
        "summary": registry['summary']
    }
    with open(AUDIT_PATH, 'w', encoding='utf-8') as f:
        json.dump(audit, f, indent=2)
    print(f"Saved audit to {AUDIT_PATH}")
    
    update_main_registry(registry)
    
    print("\n" + "=" * 70)
    print("AGENT REGISTRY SUMMARY")
    print("=" * 70)
    print(f"Total Agents: {registry['summary']['total']}")
    print("\nBy Tier:")
    for tier, count in registry['summary']['byTier'].items():
        print(f"  {tier}: {count}")

if __name__ == "__main__":
    main()
