"""
PRISM Validation Integration v1.0
=================================
Adds validation skills, agents, and swarm patterns to the orchestrator.
Also updates CAPABILITY_MATRIX with validation capabilities.

Purpose: Ensure swarms CANNOT produce garbage data by making validation
mandatory at every step.
"""

import json
import re
from pathlib import Path
from datetime import datetime

PRISM_ROOT = Path(r"C:\PRISM")
ORCHESTRATOR_PATH = PRISM_ROOT / "scripts" / "prism_unified_system_v6.py"
CAPABILITY_MATRIX_PATH = PRISM_ROOT / "data" / "coordination" / "CAPABILITY_MATRIX.json"


# =============================================================================
# NEW VALIDATION SKILLS TO ADD
# =============================================================================

NEW_VALIDATION_SKILLS = {
    # Core validation skills
    "prism-data-validator": ["validate", "check", "verify", "data", "quality", "garbage", "placeholder"],
    "prism-alarm-validator": ["alarm", "validate", "controller", "error", "code", "check"],
    "prism-material-validator-strict": ["material", "validate", "physics", "range", "strict", "verify"],
    "prism-machine-validator": ["machine", "validate", "spec", "travel", "spindle", "verify"],
    "prism-placeholder-detector": ["placeholder", "garbage", "filler", "dummy", "detect", "todo", "fake"],
    "prism-completeness-checker": ["complete", "check", "missing", "field", "required", "full"],
    "prism-physics-range-validator": ["physics", "range", "validate", "bound", "limit", "check"],
    "prism-cross-reference-validator": ["cross", "reference", "link", "validate", "source", "verify"],
    "prism-output-validator": ["output", "validate", "result", "check", "verify", "quality"],
    "prism-swarm-output-validator": ["swarm", "output", "validate", "garbage", "filter", "check"],
}


# =============================================================================
# NEW VALIDATION AGENTS TO ADD
# =============================================================================

NEW_VALIDATION_AGENTS = {
    # OPUS tier - critical validation
    "data_quality_enforcer": {
        "tier": "OPUS", 
        "role": "Data Quality Enforcer - Rejects ALL garbage/placeholder data",
        "domains": ["validation", "quality", "data"],
        "operations": ["validate", "reject", "enforce"]
    },
    "placeholder_hunter": {
        "tier": "OPUS",
        "role": "Placeholder Hunter - Detects and rejects TODO/TBD/filler content",
        "domains": ["validation", "quality"],
        "operations": ["detect", "reject", "hunt"]
    },
    
    # SONNET tier - detailed validation  
    "alarm_validator": {
        "tier": "SONNET",
        "role": "Alarm Data Validator - Validates CNC alarm entries",
        "domains": ["validation", "alarm", "controller"],
        "operations": ["validate", "check", "verify"]
    },
    "material_validator": {
        "tier": "SONNET", 
        "role": "Material Data Validator - Validates physics ranges",
        "domains": ["validation", "materials", "physics"],
        "operations": ["validate", "check", "verify"]
    },
    "machine_validator": {
        "tier": "SONNET",
        "role": "Machine Data Validator - Validates CNC machine specs",
        "domains": ["validation", "machine", "spec"],
        "operations": ["validate", "check", "verify"]
    },
    "completeness_validator": {
        "tier": "SONNET",
        "role": "Completeness Validator - Ensures no missing required fields",
        "domains": ["validation", "completeness"],
        "operations": ["validate", "check", "audit"]
    },
    "output_sanitizer": {
        "tier": "SONNET",
        "role": "Output Sanitizer - Cleans and validates all output data",
        "domains": ["validation", "output", "quality"],
        "operations": ["validate", "sanitize", "clean"]
    },
    
    # HAIKU tier - fast checks
    "quick_placeholder_check": {
        "tier": "HAIKU",
        "role": "Quick Placeholder Check - Fast garbage detection",
        "domains": ["validation"],
        "operations": ["detect", "check"]
    },
    "field_validator": {
        "tier": "HAIKU",
        "role": "Field Validator - Validates individual field values",
        "domains": ["validation"],
        "operations": ["validate", "check"]
    },
}


# =============================================================================
# NEW SWARM PATTERNS
# =============================================================================

NEW_SWARM_PATTERNS = {
    "strict_validation_swarm": {
        "description": "Multi-level strict validation - rejects ALL garbage",
        "agents": [
            "data_quality_enforcer",
            "placeholder_hunter", 
            "completeness_validator",
            "output_sanitizer",
            "quality_gate"
        ],
        "parallel": False,  # Sequential for thorough validation
        "mandatory_after": ["data_extraction", "swarm_output"]
    },
    "alarm_validation_swarm": {
        "description": "Validates CNC alarm database entries",
        "agents": [
            "alarm_validator",
            "completeness_validator",
            "placeholder_hunter",
            "quality_gate"
        ],
        "parallel": False
    },
    "material_validation_swarm": {
        "description": "Validates material database entries with physics checks",
        "agents": [
            "material_validator",
            "physics_validator",
            "completeness_validator",
            "quality_gate"
        ],
        "parallel": False
    }
}


def update_orchestrator():
    """Update the orchestrator with validation skills and agents"""
    print("="*70)
    print("PRISM VALIDATION INTEGRATION v1.0")
    print("="*70)
    
    with open(ORCHESTRATOR_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Backup
    backup_path = ORCHESTRATOR_PATH.with_suffix('.py.backup_validation')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n[1/4] Backup created: {backup_path}")
    
    # Add validation skills to SKILL_KEYWORDS
    skills_added = 0
    for skill_name, keywords in NEW_VALIDATION_SKILLS.items():
        if f'"{skill_name}"' not in content:
            # Find end of SKILL_KEYWORDS dict
            pattern = r'(SKILL_KEYWORDS\s*=\s*\{[^}]+)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                keywords_str = json.dumps(keywords)
                insertion = f'    "{skill_name}": {keywords_str},\n'
                # Insert before closing brace
                content = content.replace(
                    '"prism-wiring-templates":',
                    f'{insertion}    "prism-wiring-templates":'
                )
                skills_added += 1
    
    print(f"[2/4] Added {skills_added} validation skills to SKILL_KEYWORDS")
    
    # Add validation agents to AGENT_DEFINITIONS
    agents_added = 0
    for agent_name, agent_def in NEW_VALIDATION_AGENTS.items():
        if f'"{agent_name}"' not in content:
            # Find HAIKU section and add before it for OPUS/SONNET
            tier = agent_def["tier"]
            role = agent_def["role"]
            
            if tier == "OPUS":
                # Add after proof_generator (last OPUS)
                content = content.replace(
                    '"proof_generator": {"tier": "OPUS", "role": "Mathematical Proof Generator"},',
                    f'"proof_generator": {{"tier": "OPUS", "role": "Mathematical Proof Generator"}},\n    "{agent_name}": {{"tier": "{tier}", "role": "{role}"}},'
                )
            elif tier == "SONNET":
                # Add after test_orchestrator (last SONNET)
                content = content.replace(
                    '"test_orchestrator": {"tier": "SONNET", "role": "Ralph Loop Test Orchestrator"},',
                    f'"test_orchestrator": {{"tier": "SONNET", "role": "Ralph Loop Test Orchestrator"}},\n    "{agent_name}": {{"tier": "{tier}", "role": "{role}"}},'
                )
            elif tier == "HAIKU":
                # Add after knowledge_graph_builder
                content = content.replace(
                    '"knowledge_graph_builder": {"tier": "HAIKU", "role": "Knowledge Graph Builder"},',
                    f'"knowledge_graph_builder": {{"tier": "HAIKU", "role": "Knowledge Graph Builder"}},\n    "{agent_name}": {{"tier": "{tier}", "role": "{role}"}},'
                )
            agents_added += 1
    
    print(f"[3/4] Added {agents_added} validation agents to AGENT_DEFINITIONS")
    
    # Add swarm patterns
    patterns_added = 0
    for pattern_name, pattern_def in NEW_SWARM_PATTERNS.items():
        if f'"{pattern_name}"' not in content:
            # Add after validation_swarm
            pattern_json = json.dumps(pattern_def, indent=8)
            # Clean up formatting
            pattern_json = pattern_json.replace('\n        ', '\n            ')
            content = content.replace(
                '"research_swarm":',
                f'"{pattern_name}": {pattern_def},\n    "research_swarm":'
            )
            patterns_added += 1
    
    print(f"[4/4] Added {patterns_added} validation swarm patterns")
    
    # Write updated content
    with open(ORCHESTRATOR_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"\n✓ Orchestrator updated: {ORCHESTRATOR_PATH}")
    return skills_added, agents_added, patterns_added


def update_capability_matrix():
    """Add validation capabilities to the capability matrix"""
    print("\n" + "="*70)
    print("Updating CAPABILITY_MATRIX with validation resources...")
    print("="*70)
    
    with open(CAPABILITY_MATRIX_PATH, 'r', encoding='utf-8') as f:
        matrix = json.load(f)
    
    caps = matrix.get("capabilityMatrix", {}).get("resourceCapabilities", {})
    
    # Add skill capabilities
    skills_added = 0
    for skill_name, keywords in NEW_VALIDATION_SKILLS.items():
        if skill_name not in caps:
            caps[f"SKILL-VAL-{skills_added+1:03d}"] = {
                "name": skill_name,
                "domainScores": {
                    "validation": 0.98,
                    "quality": 0.95,
                    "data": 0.90
                },
                "operationScores": {
                    "validate": 0.98,
                    "check": 0.95,
                    "verify": 0.92,
                    "reject": 0.90
                },
                "complexity": 0.75,
                "taskTypeScores": {}
            }
            skills_added += 1
    
    # Add agent capabilities
    agents_added = 0
    for agent_name, agent_def in NEW_VALIDATION_AGENTS.items():
        if agent_name not in caps:
            domains = {d: 0.95 for d in agent_def.get("domains", ["validation"])}
            ops = {o: 0.95 for o in agent_def.get("operations", ["validate"])}
            
            caps[f"AGENT-VAL-{agents_added+1:03d}"] = {
                "name": agent_name,
                "domainScores": domains,
                "operationScores": ops,
                "complexity": 0.80 if agent_def["tier"] == "OPUS" else 0.60,
                "taskTypeScores": {}
            }
            agents_added += 1
    
    matrix["capabilityMatrix"]["resourceCapabilities"] = caps
    matrix["capabilityMatrix"]["metadata"]["lastUpdated"] = datetime.now().isoformat()
    
    with open(CAPABILITY_MATRIX_PATH, 'w', encoding='utf-8') as f:
        json.dump(matrix, f, indent=2)
    
    print(f"  Added {skills_added} skill capabilities")
    print(f"  Added {agents_added} agent capabilities")
    print(f"  ✓ CAPABILITY_MATRIX updated")
    
    return skills_added + agents_added


def main():
    skills, agents, patterns = update_orchestrator()
    caps = update_capability_matrix()
    
    print("\n" + "="*70)
    print("VALIDATION INTEGRATION COMPLETE")
    print("="*70)
    print(f"""
  Validation Skills Added:  {len(NEW_VALIDATION_SKILLS)}
  Validation Agents Added:  {len(NEW_VALIDATION_AGENTS)}
  Swarm Patterns Added:     {len(NEW_SWARM_PATTERNS)}
  Capability Entries:       {caps}

  NEW SWARM PATTERNS:
    - strict_validation_swarm: Multi-level strict validation
    - alarm_validation_swarm: CNC alarm validation
    - material_validation_swarm: Material physics validation

  USAGE:
    # Validate swarm output
    from validation import ValidationEnforcer
    valid_data = ValidationEnforcer().validate_and_filter(data, "alarm")

    # Run validation swarm
    py -3 prism_unified_system_v6.py --swarm strict_validation_swarm "Validate data"
""")


if __name__ == "__main__":
    main()
