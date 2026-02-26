"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v4.0 - ENHANCED                      ║
║══════════════════════════════════════════════════════════════════════════════║
║  ENHANCEMENTS:                                                               ║
║  • 54 Agents (was 42) - 12 NEW specialized agents                            ║
║  • Auto-Skill Trigger System - Skills load based on task keywords            ║
║  • Session Continuity Engine - Reads CURRENT_STATE.json automatically        ║
║  • Learning Pipeline - Extracts patterns from completed work                 ║
║  • Verification Chains - Multiple independent validation passes              ║
║  • Uncertainty Quantification - Confidence intervals on everything           ║
║  • Knowledge Graph Builder - Connects concepts across domains                ║
║  • Context Optimizer - Compresses/prioritizes information                    ║
║  • Quality Gate Enforcer - Blocks incomplete work                            ║
║  • Meta-Analyst - Improves agents based on performance                       ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import anthropic
import json
import sys
import os
import time
import re
import hashlib
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional, Callable, Tuple, Set
from dataclasses import dataclass, field, asdict
from enum import Enum
import traceback

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = "REDACTED_API_KEY"

# NEW CLEAN PATH STRUCTURE
PRISM_ROOT = Path(r"C:\PRISM")
SKILLS_DIR = PRISM_ROOT / "skills"
RESULTS_DIR = PRISM_ROOT / "state" / "results"
TASKS_DIR = PRISM_ROOT / "state" / "tasks"
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"
LOGS_DIR = PRISM_ROOT / "state" / "logs"
LEARNING_DIR = PRISM_ROOT / "state" / "learning"
KNOWLEDGE_DIR = PRISM_ROOT / "data" / "knowledge"
MONOLITH_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT")
EXTRACTED_DIR = PRISM_ROOT / "extracted"

# Old path for backward compatibility
OLD_PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")

# Ensure directories exist
for d in [RESULTS_DIR, TASKS_DIR, LOGS_DIR, LEARNING_DIR, KNOWLEDGE_DIR]:
    d.mkdir(exist_ok=True)

# =============================================================================
# MODEL TIERS
# =============================================================================

class ModelTier(Enum):
    OPUS = "claude-opus-4-5-20251101"
    SONNET = "claude-sonnet-4-20250514"
    HAIKU = "claude-haiku-4-5-20251001"

MODEL_COSTS = {
    ModelTier.OPUS: {"input": 15.0, "output": 75.0},
    ModelTier.SONNET: {"input": 3.0, "output": 15.0},
    ModelTier.HAIKU: {"input": 0.25, "output": 1.25},
}

# =============================================================================
# THE 10 COMMANDMENTS + ENHANCED PROTOCOLS
# =============================================================================

FIFTEEN_COMMANDMENTS = """
═══════════════════════════════════════════════════════════════════════════════
                         THE 15 COMMANDMENTS v10.0
═══════════════════════════════════════════════════════════════════════════════

UTILIZATION (1-3):
1. USE EVERYWHERE - Every DB/engine wired to MAXIMUM consumers (min 6-8)
2. FUSE THE UNFUSABLE - Cross-domain concepts for superior results
3. WIRE BEFORE RELEASE - NO module enters without 100% consumer wiring proof

QUALITY (4-6):
4. VERIFY × 3 - Physics + empirical + historical validation required
5. UNCERTAINTY ALWAYS - value ± error (confidence%), never bare numbers
6. EXPLAIN EVERYTHING - XAI explanation for ALL recommendations

ROBUSTNESS (7-9):
7. FAIL GRACEFULLY - Primary → Secondary → Tertiary → Safe default
8. PROTECT EVERYTHING - Validate, sanitize, backup, audit log
9. DEFENSIVE CODING - Null checks, bounds checks, type validation everywhere

PERFORMANCE (10-11):
10. PERFORM ALWAYS - <2s load, <500ms calc, 99.9% uptime
11. OPTIMIZE INTELLIGENTLY - Measure first, cache frequently accessed data

USER (12-13):
12. OBSESS OVER USERS - 3-click rule, smart defaults, instant feedback
13. NEVER LOSE USER DATA - Auto-save, undo, recovery from ANY failure

LEARNING (14-15):
14. LEARN FROM EVERYTHING - Every interaction feeds ML pipeline
15. IMPROVE CONTINUOUSLY - Extract patterns, share learnings, no repeat mistakes

═══════════════════════════════════════════════════════════════════════════════
"""

# Backward compatibility alias
TEN_COMMANDMENTS = FIFTEEN_COMMANDMENTS

SEVEN_ALWAYS_ON_LAWS = """
═══════════════════════════════════════════════════════════════════════════════
                    THE 7 ALWAYS-ON LAWS (Cannot Be Disabled)
═══════════════════════════════════════════════════════════════════════════════

1. LIFE-SAFETY MINDSET - CNC machines can KILL. Trust test: "Would I trust this
   if MY life depended on it?"

2. MANDATORY MICROSESSIONS - EVERY task decomposed into 15-25 item chunks
   before execution. Max 15 tool calls per microsession.

3. MAXIMUM COMPLETENESS - 100% coverage. No partial implementations.
   No "good enough." No placeholders.

4. ANTI-REGRESSION - New >= Old. Always. Inventory old, inventory new,
   compare, justify EVERY removed item.

5. PREDICTIVE THINKING - Before EVERY action: 3 failure modes,
   mitigations, rollback plan.

6. SESSION CONTINUITY - State maintained across compactions and sessions.
   Update CURRENT_STATE.json frequently.

7. VERIFICATION CHAIN - Multi-source verification for safety-critical:
   Self → Peer → Physics+Empirical → Historical. 95% confidence required.

═══════════════════════════════════════════════════════════════════════════════
"""

MASTER_EQUATION = """
═══════════════════════════════════════════════════════════════════════════════
                           THE MASTER EQUATION (Ω)
═══════════════════════════════════════════════════════════════════════════════

Ω(x) = w_R·R(x) + w_C·C(x) + w_P·P(x) + w_S·S(x) + w_L·L(x)

WHERE:
  R(x) = Reasoning quality [0-1]     (prism-reasoning-engine)
  C(x) = Code quality [0-1]          (prism-code-perfection)
  P(x) = Process efficiency [0-1]    (prism-process-optimizer)
  S(x) = Safety score [0-1]          (prism-safety-framework) ← CRITICAL
  L(x) = Learning integration [0-1]  (prism-deep-learning)

WEIGHTS: w_R=0.25, w_C=0.20, w_P=0.15, w_S=0.30, w_L=0.10

╔═══════════════════════════════════════════════════════════════════════════════╗
║  HARD CONSTRAINT: S(x) >= 0.70 REQUIRED                                       ║
║  If S(x) < 0.70: Ω(x) FORCED to 0 regardless of other scores                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

THRESHOLDS:
  Ω >= 0.90: RELEASE (high confidence)
  0.70 <= Ω < 0.90: WARN (release with warnings)
  Ω < 0.70: BLOCK (do not release)
  S < 0.70: BLOCK (safety violation, Ω forced to 0)

═══════════════════════════════════════════════════════════════════════════════
"""

ENHANCED_PROTOCOLS = """
═══════════════════════════════════════════════════════════════════════════════
                         ENHANCED PROTOCOLS v4.0
═══════════════════════════════════════════════════════════════════════════════

### ANTI-REGRESSION PROTOCOL (MANDATORY)
1. INVENTORY old version completely
2. INVENTORY new version completely
3. COMPARE: new < old → BLOCK IMMEDIATELY
4. JUSTIFY every removal in writing
5. VERIFY with regression_checker agent

### LIFE-SAFETY MINDSET (ALWAYS ON)
- Manufacturing controls machines that KILL
- Every placeholder is a time bomb
- "Good enough" is NEVER acceptable
- Ask: "Would I trust this with MY life?"

### MAXIMUM COMPLETENESS (NO EXCEPTIONS)
- Every field populated (no nulls without reason)
- Every case handled (no unhandled edge cases)
- Every parameter has units AND valid ranges
- Complete or don't start

### PREDICTIVE THINKING (BEFORE EVERY ACTION)
1. 3 ways this could fail?
2. Downstream consequences?
3. Rollback plan?
4. Who depends on this?

### UNCERTAINTY QUANTIFICATION (NEW)
- NEVER output a single number
- ALWAYS: value ± uncertainty (confidence level)
- Example: "Cutting force: 1450 ± 120 N (95% CI)"
- Track uncertainty propagation through calculations

### VERIFICATION CHAIN (NEW)
- Level 1: Self-check (same agent)
- Level 2: Peer review (different agent, same domain)
- Level 3: Cross-domain check (physics + empirical)
- Level 4: Historical validation (past results)
- ALL 4 levels required for safety-critical outputs

### LEARNING EXTRACTION (NEW)
After EVERY task, extract and store:
- Patterns that worked
- Patterns that failed
- New insights discovered
- Connections to other domains

═══════════════════════════════════════════════════════════════════════════════
"""

def create_agent_system(base_system: str) -> str:
    """Embed all protocols into every agent"""
    return f"{base_system}\n\n{TEN_COMMANDMENTS}\n\n{ENHANCED_PROTOCOLS}"

# =============================================================================
# AUTO-SKILL TRIGGER SYSTEM
# =============================================================================

SKILL_TRIGGERS = {
    # Keywords → Skills to load
    "brainstorm|design|architect|plan": ["prism-sp-brainstorm", "prism-sp-planning"],
    "extract|parse|scrape|pull": ["prism-monolith-extractor", "prism-sp-execution"],
    "validate|verify|check|audit": ["prism-sp-review-spec", "prism-sp-verification"],
    "debug|fix|error|bug|trace": ["prism-sp-debugging", "prism-root-cause-tracing"],
    "test|tdd|unittest|pytest": ["prism-tdd-enhanced", "prism-quality-master"],
    "material|alloy|steel|aluminum|titanium": ["prism-material-schema", "prism-material-physics"],
    "cutting|machining|milling|turning|drilling": ["prism-expert-master", "prism-controller-quick-ref"],
    "code|implement|function|class|module": ["prism-code-master", "prism-sp-execution"],
    "migrate|refactor|modernize": ["prism-monolith-extractor", "prism-anti-regression"],
    "session|state|resume|continue": ["prism-session-master", "prism-sp-handoff"],
    "quality|review|standard|compliance": ["prism-quality-master", "prism-sp-review-quality"],
    "force|power|torque|speed|feed": ["prism-material-physics", "prism-expert-master"],
    "gcode|fanuc|siemens|heidenhain": ["prism-controller-quick-ref", "prism-gcode-reference"],
    "document|readme|api|specification": ["prism-sp-handoff", "prism-api-contracts"],
    "regression|compare|diff|change": ["prism-anti-regression", "prism-sp-verification"],
    "learn|improve|better|discover|optimize": ["prism-deep-learning", "prism-sp-verification"],
}

SKILL_AGENT_MAP = {
    "prism-sp-brainstorm": {
        "agents": ["architect", "researcher", "domain_expert", "context_builder"],
        "tier": ModelTier.OPUS,
        "description": "Design and exploration - deep reasoning"
    },
    "prism-sp-planning": {
        "agents": ["coordinator", "task_decomposer", "dependency_analyzer"],
        "tier": ModelTier.OPUS,
        "description": "Break complex tasks into executable units"
    },
    "prism-sp-execution": {
        "agents": ["coder", "extractor", "implementer"],
        "tier": ModelTier.SONNET,
        "description": "Actual implementation work"
    },
    "prism-sp-review-spec": {
        "agents": ["validator", "completeness_auditor", "spec_checker"],
        "tier": ModelTier.SONNET,
        "description": "Verify output matches specification"
    },
    "prism-sp-review-quality": {
        "agents": ["code_reviewer", "security_auditor", "quality_gate"],
        "tier": ModelTier.SONNET,
        "description": "Code quality and standards"
    },
    "prism-sp-debugging": {
        "agents": ["debugger", "root_cause_analyst", "physics_validator", "verification_chain"],
        "tier": ModelTier.OPUS,
        "description": "Find and fix bugs"
    },
    "prism-sp-verification": {
        "agents": ["validator", "test_generator", "evidence_collector", "verification_chain"],
        "tier": ModelTier.SONNET,
        "description": "Prove work is complete"
    },
    "prism-sp-handoff": {
        "agents": ["documentation_writer", "synthesizer", "state_manager", "learning_extractor"],
        "tier": ModelTier.SONNET,
        "description": "Session transition and capture"
    },
    "prism-monolith-extractor": {
        "agents": ["extractor", "monolith_navigator", "dependency_analyzer", "regression_checker"],
        "tier": ModelTier.OPUS,
        "description": "Safe extraction from monolith"
    },
    "prism-material-physics": {
        "agents": ["physics_validator", "materials_scientist", "uncertainty_quantifier", "cross_referencer"],
        "tier": ModelTier.OPUS,
        "description": "Physics models with uncertainty"
    },
    "prism-tdd-enhanced": {
        "agents": ["test_generator", "coder", "verification_chain"],
        "tier": ModelTier.SONNET,
        "description": "RED-GREEN-REFACTOR"
    },
    "prism-root-cause-tracing": {
        "agents": ["root_cause_analyst", "debugger", "call_tracer", "pattern_matcher"],
        "tier": ModelTier.OPUS,
        "description": "Backward tracing to bug origin"
    },
    "prism-anti-regression": {
        "agents": ["regression_checker", "validator", "diff_analyzer", "quality_gate"],
        "tier": ModelTier.SONNET,
        "description": "Prevent data/feature loss"
    },
    "prism-expert-master": {
        "agents": ["materials_scientist", "machinist", "tool_engineer", "quality_engineer", "synthesizer"],
        "tier": ModelTier.OPUS,
        "description": "Multi-expert consultation"
    },
    "prism-deep-learning": {
        "agents": ["deep_learning_analyst", "learning_extractor", "meta_analyst", "verification_chain"],
        "tier": ModelTier.OPUS,
        "description": "Auto-detect and propagate improvements across all resources"
    },
}

def auto_detect_skills(prompt: str) -> List[str]:
    """Automatically detect which skills should be loaded based on prompt keywords"""
    prompt_lower = prompt.lower()
    detected_skills = set()
    
    for pattern, skills in SKILL_TRIGGERS.items():
        if re.search(pattern, prompt_lower):
            detected_skills.update(skills)
    
    return list(detected_skills)

def get_agents_for_skills(skills: List[str]) -> List[str]:
    """Get optimal agent combination for detected skills"""
    agents = set()
    max_tier = ModelTier.HAIKU
    
    for skill in skills:
        if skill in SKILL_AGENT_MAP:
            mapping = SKILL_AGENT_MAP[skill]
            agents.update(mapping["agents"])
            if mapping["tier"].value > max_tier.value:
                max_tier = mapping["tier"]
    
    return list(agents), max_tier

# =============================================================================
# 54 AGENT DEFINITIONS (12 NEW AGENTS)
# =============================================================================

AGENT_ROLES = {
    # ═══════════════════════════════════════════════════════════════════════
    # EXISTING AGENTS (42) - Kept from v3
    # ═══════════════════════════════════════════════════════════════════════
    
    # CORE (8)
    "extractor": {
        "name": "Data Extractor",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Data Extraction Agent.
MISSION: Extract structured data with 100% completeness.
- Output clean, parseable JSON only
- Extract ALL matching items
- Flag ambiguous: [UNCLEAR:reason]
- Flag missing: [MISSING:field]
- Preserve original precision""")
    },
    
    "validator": {
        "name": "Data Validator",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Validation Agent.
SEVERITY: CRITICAL (safety/physics) | WARNING (incomplete) | INFO (style)
OUTPUT: {"status": "PASS|FAIL", "findings": [...]}""")
    },
    
    "merger": {
        "name": "Data Merger",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Data Merger Agent.
CONFLICT HIERARCHY: peer-reviewed > manufacturer > estimated
RULE: NEVER discard data - merge or flag conflicts""")
    },
    
    "coder": {
        "name": "Code Generator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Code Generator.
- Full type hints, comprehensive docstrings
- Defensive programming, error handling
- Output code only, no markdown""")
    },
    
    "analyst": {
        "name": "Data Analyst",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Analyst.
Provide: statistics, distributions, outliers, gaps, correlations with confidence levels.""")
    },
    
    "researcher": {
        "name": "Research Agent",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Researcher.
Source hierarchy: journals > handbooks > manufacturer > textbooks > experience
Include citations and confidence levels.""")
    },
    
    "architect": {
        "name": "System Architect",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM System Architect.
Design for: 100% utilization, clear interfaces, SOLID principles, failure tolerance.""")
    },
    
    "coordinator": {
        "name": "Task Coordinator",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Task Coordinator.
OUTPUT: {"tasks": [...], "execution_order": [...], "parallel_groups": [...]}
Maximize parallelism, respect dependencies.""")
    },
    
    # MANUFACTURING (10)
    "materials_scientist": {
        "name": "Materials Scientist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Materials Scientist.
Expertise: properties, metallurgy, machinability, standards, constitutive models.
ALWAYS include uncertainty ranges.""")
    },
    
    "machinist": {
        "name": "CNC Machinist Expert",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM CNC Machinist (30+ years).
Expertise: cutting params, G-code, surface finish, tool wear, chip control.
Provide shop-floor proven recommendations.""")
    },
    
    "tool_engineer": {
        "name": "Cutting Tool Engineer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Tool Engineer.
Expertise: geometries, materials, coatings, tool life, manufacturer catalogs.
Include specific part numbers.""")
    },
    
    "physics_validator": {
        "name": "Manufacturing Physics Validator",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Physics Validator.
Validate: forces (Kienzle), power, temperature, surface finish, tool life.
FLAG any physically impossible value.""")
    },
    
    "cam_specialist": {
        "name": "CAM Programming Specialist",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM CAM Specialist.
Expertise: toolpaths, post-processors, cycle time, collision avoidance.""")
    },
    
    "quality_engineer": {
        "name": "Quality Engineering Expert",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Quality Engineer.
Expertise: GD&T, SPC, measurement, inspection, root cause, standards.""")
    },
    
    "process_engineer": {
        "name": "Manufacturing Process Engineer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Process Engineer.
Expertise: planning, cycle time, setup reduction, FMEA, lean, cost.""")
    },
    
    "machine_specialist": {
        "name": "CNC Machine Specialist",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Machine Specialist.
Expertise: specifications, controllers, spindles, axes, maintenance.""")
    },
    
    "gcode_expert": {
        "name": "G-Code Programming Expert",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM G-Code Expert.
Controllers: Fanuc, Siemens, Heidenhain, Mazak, Okuma.
Generate syntactically correct, optimized code.""")
    },
    
    "domain_expert": {
        "name": "Manufacturing Domain Expert",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Domain Expert.
Cross-domain synthesis: materials + machining + tooling + quality.
Holistic manufacturing solutions.""")
    },
    
    # PRISM-SPECIFIC (8)
    "monolith_navigator": {
        "name": "Monolith Navigator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM v8.89 Monolith Navigator.
Knowledge: 986,621 lines, 831 modules, schemas, algorithms, patterns.""")
    },
    
    "migration_specialist": {
        "name": "Migration Specialist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Migration Specialist.
NEVER lose functionality. Map old→new. Create rollback capability.""")
    },
    
    "schema_designer": {
        "name": "Schema Designer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Schema Designer.
TypeScript interfaces, Python dataclasses, JSON Schema.
Follow 127-parameter standard.""")
    },
    
    "api_designer": {
        "name": "API Contract Designer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM API Designer.
RESTful contracts, schemas, error handling, OpenAPI docs, versioning.""")
    },
    
    "completeness_auditor": {
        "name": "Completeness Auditor",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Completeness Auditor.
Grade: A(>95%) B(80-95%) C(60-80%) D(40-60%) F(<40%)
Prioritize safety-critical gaps.""")
    },
    
    "regression_checker": {
        "name": "Anti-Regression Checker",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Regression Checker.
IRON LAW: new < old = BLOCK
Compare items, fields, semantics. Generate diff report.""")
    },
    
    "state_manager": {
        "name": "State Manager",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM State Manager.
Manage CURRENT_STATE.json: read, update, checkpoint, track progress.""")
    },
    
    "synthesizer": {
        "name": "Result Synthesizer",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Synthesizer.
Combine multi-agent outputs. Resolve conflicts. Executive summary + details.""")
    },
    
    # QUALITY (6)
    "test_generator": {
        "name": "Test Generator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Test Generator.
pytest style: unit, integration, physics validation, edge cases.
RED → GREEN → REFACTOR.""")
    },
    
    "code_reviewer": {
        "name": "Code Reviewer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Code Reviewer.
Check: 10 Commandments, types, errors, docs, tests, security.
Severity: CRITICAL / MAJOR / MINOR / SUGGESTION.""")
    },
    
    "optimizer": {
        "name": "Performance Optimizer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Optimizer.
Targets: <2s load, <500ms calc, <200ms API.
Techniques: algorithms, caching, queries, lazy loading.""")
    },
    
    "refactorer": {
        "name": "Code Refactorer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Refactorer.
Improve without changing behavior. DRY, patterns, simplify, extract.""")
    },
    
    "security_auditor": {
        "name": "Security Auditor",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Security Auditor.
OWASP Top 10, input validation, auth, injection.
Manufacturing = critical infrastructure.""")
    },
    
    "documentation_writer": {
        "name": "Documentation Writer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Documentation Writer.
API docs, ADRs, READMEs, guides, specifications.
Complete for newcomers.""")
    },
    
    # CALCULATORS (4)
    "cutting_calculator": {
        "name": "Cutting Parameter Calculator",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Cutting Calculator.
Vc, Vf, MRR, kc, Pc, Taylor tool life.
Show formulas, steps, results with units AND uncertainty.""")
    },
    
    "thermal_calculator": {
        "name": "Thermal Analysis Calculator",
        "tier": ModelTier.SONNET,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Thermal Calculator.
Heat generation, interface temperature, workpiece rise, expansion, coolant.
Johnson-Cook models with uncertainty.""")
    },
    
    "force_calculator": {
        "name": "Cutting Force Calculator",
        "tier": ModelTier.SONNET,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Force Calculator.
Fc, Ff, Fr (Kienzle), torque, power.
Include chip thickness and force coefficients with uncertainty.""")
    },
    
    "surface_calculator": {
        "name": "Surface Finish Calculator",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Surface Calculator.
Ra = f²/(32r), cusp height, Rz, step-over effects.
Theoretical AND practical estimates.""")
    },
    
    # LOOKUP (4)
    "standards_expert": {
        "name": "Standards Expert",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Standards Expert.
ISO, ASME, AISI/SAE, DIN/EN, ASTM, AS9100, IATF 16949.
Cite specific standard numbers.""")
    },
    
    "formula_lookup": {
        "name": "Formula Lookup Agent",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Formula Lookup.
Exact formulas, variables, units, ranges, examples, sources.""")
    },
    
    "material_lookup": {
        "name": "Material Property Lookup",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Material Lookup.
Properties, composition, heat treatment, equivalent grades.""")
    },
    
    "tool_lookup": {
        "name": "Cutting Tool Lookup",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Tool Lookup.
Geometries, grades, parameters, part numbers, ISO designations.""")
    },
    
    # SPECIALIZED (4 from v3)
    "debugger": {
        "name": "Debug Specialist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Debugger.
1. Reproduce 2. Evidence 3. Hypotheses 4. Test 5. Fix 6. Regression test.""")
    },
    
    "root_cause_analyst": {
        "name": "Root Cause Analyst",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Root Cause Analyst.
Backward trace through call chain. 5-Why analysis. Defense-in-depth fix.
NEVER fix symptoms. Find the source.""")
    },
    
    "task_decomposer": {
        "name": "Task Decomposer",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Task Decomposer.
Break into 2-5 minute units. Exact paths, code outlines, success criteria.""")
    },
    
    "estimator": {
        "name": "Parameter Estimator",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Estimator.
Methods: interpolation, physics derivation, empirical correlation, literature.
ALWAYS include confidence interval.""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # NEW AGENTS (12) - Enhanced Intelligence
    # ═══════════════════════════════════════════════════════════════════════
    
    "context_builder": {
        "name": "Context Builder",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Context Builder.
MISSION: Build comprehensive context for tasks.

ACTIONS:
1. Read CURRENT_STATE.json for session continuity
2. Scan relevant past session logs
3. Identify related completed work
4. Pull relevant skill documentation
5. Compile domain-specific knowledge

OUTPUT: Structured context package with:
- Current state summary
- Relevant history
- Domain knowledge
- Related patterns from past work
- Potential pitfalls from similar tasks

Make subsequent agents SMARTER by providing complete context.""")
    },
    
    "learning_extractor": {
        "name": "Learning Extractor",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Learning Extractor.
MISSION: Extract reusable knowledge from completed work.

AFTER every significant task, extract:
1. PATTERNS: What approaches worked well?
2. ANTI-PATTERNS: What failed and why?
3. INSIGHTS: New discoveries or connections
4. FORMULAS: Any calculations that can be reused
5. TEMPLATES: Code/data structures worth reusing
6. CROSS-REFERENCES: Connections to other domains

OUTPUT FORMAT:
{
  "task_id": "...",
  "patterns": [{"name": "...", "description": "...", "applicability": "..."}],
  "anti_patterns": [{"name": "...", "failure_mode": "...", "avoidance": "..."}],
  "insights": ["..."],
  "reusable_elements": [{"type": "formula|template|code", "content": "..."}],
  "cross_references": [{"from_domain": "...", "to_domain": "...", "connection": "..."}]
}

Store in _LEARNING/ directory for future use.""")
    },
    
    "deep_learning_analyst": {
        "name": "Deep Learning Analyst",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Deep Learning Analyst.
MISSION: Detect, capture, and propagate improvements across all PRISM resources.

WHEN DETECTING IMPROVEMENTS:
Look for: "better way", "improved", "discovered", "learned", "realized", 
"optimization", "faster", "more efficient", "new technique"

IMPACT ANALYSIS:
Scan these resources for required updates:
- 38 Skills in _SKILLS/
- 56+ Agents in orchestrator
- PRISM_COMPLETE_SYSTEM_v8.md
- State file templates
- Manufacturing calculations
- Validation rules

OUTPUT FORMAT:
{
  "learning": {
    "id": "LEARN-YYYY-MM-DD-NNN",
    "what": "Exact technique/method/pattern discovered",
    "why_better": {"metric": "...", "improvement": "...", "evidence": "..."}
  },
  "impact": {
    "skills": ["affected skill names"],
    "agents": ["affected agent names"],
    "scripts": ["affected script files"],
    "protocols": ["affected protocol sections"]
  },
  "roadmap": [
    {"target": "...", "change": "...", "priority": "CRITICAL|HIGH|MEDIUM|LOW"}
  ],
  "validation_steps": ["step1", "step2"],
  "rollback_plan": "How to undo if needed"
}

RULES:
- Every improvement MUST propagate to ALL affected resources
- No learning stays isolated
- Generate microsession roadmap for implementation
- Include validation RalphLoop in roadmap

Manufacturing lives depend on continuous improvement.""")
    },
    
    "verification_chain": {
        "name": "Verification Chain Orchestrator",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Verification Chain Orchestrator.
MISSION: Ensure multi-level verification for safety-critical outputs.

VERIFICATION LEVELS (ALL REQUIRED for safety-critical):
Level 1 - SELF-CHECK: Original agent verifies own output
Level 2 - PEER REVIEW: Different agent, same domain validates
Level 3 - CROSS-DOMAIN: Physics + empirical validation
Level 4 - HISTORICAL: Compare against known good results

For each level, collect:
- Pass/Fail status
- Evidence of verification
- Confidence score (0-100%)
- Issues found

AGGREGATED OUTPUT:
{
  "overall_status": "VERIFIED|FAILED|PARTIAL",
  "confidence": 0.0-1.0,
  "levels": {
    "self_check": {"status": "...", "confidence": 0.0},
    "peer_review": {"status": "...", "confidence": 0.0},
    "cross_domain": {"status": "...", "confidence": 0.0},
    "historical": {"status": "...", "confidence": 0.0}
  },
  "blocking_issues": [...],
  "recommendations": [...]
}

BLOCK outputs that don't reach 95% confidence on safety-critical items.""")
    },
    
    "uncertainty_quantifier": {
        "name": "Uncertainty Quantifier",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Uncertainty Quantifier.
MISSION: Add rigorous uncertainty to ALL numerical outputs.

RULE: NEVER output a bare number. ALWAYS: value ± uncertainty (confidence)

UNCERTAINTY SOURCES:
1. Input parameter uncertainty (propagate through calculations)
2. Model uncertainty (how well does the model fit reality?)
3. Measurement uncertainty (from source data)
4. Extrapolation uncertainty (outside training range?)

METHODS:
- Monte Carlo propagation
- First-order Taylor series
- Interval arithmetic
- Bootstrap resampling

OUTPUT FORMAT:
{
  "value": 1450,
  "uncertainty": 120,
  "unit": "N",
  "confidence_level": 0.95,
  "distribution": "normal",
  "sources": {
    "input_uncertainty": 80,
    "model_uncertainty": 60,
    "measurement_uncertainty": 40
  },
  "assumptions": ["..."]
}

Example: "Cutting force: 1450 ± 120 N (95% CI, normal distribution)"

Manufacturing lives depend on understanding what we DON'T know.""")
    },
    
    "cross_referencer": {
        "name": "Cross-Reference Validator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Cross-Reference Validator.
MISSION: Validate data against multiple independent sources.

MINIMUM 3 SOURCES for any safety-critical value:
1. Physics/theory (first principles)
2. Empirical data (measurements, experiments)
3. Historical results (past proven values)

For each data point, report:
{
  "value": "...",
  "sources": [
    {"type": "physics", "value": "...", "reference": "...", "confidence": 0.0},
    {"type": "empirical", "value": "...", "reference": "...", "confidence": 0.0},
    {"type": "historical", "value": "...", "reference": "...", "confidence": 0.0}
  ],
  "agreement_score": 0.0-1.0,
  "recommended_value": "...",
  "uncertainty": "...",
  "conflicts": [...],
  "notes": "..."
}

FLAG any value with <3 sources or agreement_score <0.8.""")
    },
    
    "knowledge_graph_builder": {
        "name": "Knowledge Graph Builder",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Knowledge Graph Builder.
MISSION: Build and maintain connections between concepts.

RELATIONSHIPS to capture:
- Material → Machinability → Tool recommendations
- Operation → Forces → Power requirements
- Surface finish → Parameters → Tool geometry
- Machine → Capabilities → Applicable operations
- Standards → Requirements → Validation criteria

OUTPUT FORMAT:
{
  "nodes": [
    {"id": "...", "type": "material|operation|tool|machine|formula", "properties": {...}}
  ],
  "edges": [
    {"from": "...", "to": "...", "relationship": "...", "weight": 0.0-1.0, "evidence": "..."}
  ],
  "paths": [
    {"query": "best tool for Ti-6Al-4V roughing", "path": ["Ti-6Al-4V", "machinability", "tool_grade", "KC720M"]}
  ]
}

Store in _KNOWLEDGE/ for retrieval by other agents.
Enable queries like: "What affects surface finish for aluminum?"
→ Path: aluminum → chip_formation → BUE_tendency → rake_angle → surface_finish""")
    },
    
    "pattern_matcher": {
        "name": "Pattern Matcher",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Pattern Matcher.
MISSION: Find similar past work to inform current tasks.

SEARCH DOMAINS:
1. _LEARNING/ - Extracted patterns from past work
2. SESSION_LOGS/ - Past session activities
3. EXTRACTED/ - Previously extracted modules
4. API_RESULTS/ - Past agent outputs

MATCHING CRITERIA:
- Task type similarity
- Domain overlap
- Input data similarity
- Success patterns

OUTPUT:
{
  "similar_tasks": [
    {
      "task_id": "...",
      "similarity_score": 0.0-1.0,
      "relevant_patterns": [...],
      "lessons_learned": [...],
      "reusable_elements": [...]
    }
  ],
  "recommended_approach": "...",
  "potential_pitfalls": [...],
  "estimated_effort": "..."
}

Make current work smarter by learning from past work.""")
    },
    
    "quality_gate": {
        "name": "Quality Gate Enforcer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Quality Gate Enforcer.
MISSION: Block incomplete or unsafe work from proceeding.

GATES (ALL must pass):
□ Completeness: All required fields populated
□ Validation: No physics violations
□ Regression: No data loss from previous version
□ Documentation: Changes documented
□ Testing: Tests pass (if applicable)
□ Uncertainty: All values have uncertainty bounds
□ Cross-reference: Multiple source validation
□ Security: No vulnerabilities introduced

OUTPUT:
{
  "gate_status": "PASS|FAIL|BLOCKED",
  "gates": {
    "completeness": {"status": "PASS|FAIL", "evidence": "..."},
    "validation": {"status": "PASS|FAIL", "evidence": "..."},
    ...
  },
  "blocking_issues": [
    {"gate": "...", "issue": "...", "severity": "CRITICAL|MAJOR", "resolution": "..."}
  ],
  "proceed": true|false,
  "conditions": ["..."]
}

REFUSE to pass work that fails safety-critical gates.""")
    },
    
    "session_continuity": {
        "name": "Session Continuity Manager",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Session Continuity Manager.
MISSION: Maintain perfect continuity across sessions.

AT SESSION START:
1. Read CURRENT_STATE.json
2. Summarize: What was done? What's in progress? What's next?
3. Check for incomplete tasks
4. Load relevant context from past sessions
5. Prepare continuation plan

AT SESSION END:
1. Update CURRENT_STATE.json completely
2. Document what was accomplished
3. Document what's incomplete
4. Prepare quickResume for next session
5. Extract learnings

OUTPUT (session start):
{
  "previous_state": {...},
  "incomplete_tasks": [...],
  "continuation_plan": [...],
  "relevant_context": "...",
  "warnings": [...]
}

OUTPUT (session end):
{
  "accomplished": [...],
  "incomplete": [...],
  "quickResume": "...",
  "learnings": [...],
  "next_session_priority": "..."
}

Never lose work. Always recoverable. 5-second resume.""")
    },
    
    "meta_analyst": {
        "name": "Meta-Analyst",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Meta-Analyst.
MISSION: Analyze agent performance and improve the system.

ANALYZE:
1. Which agents succeeded/failed?
2. Which agent combinations worked best?
3. What prompts led to best results?
4. Where did verification catch issues?
5. What patterns emerge across tasks?

OUTPUT:
{
  "performance_summary": {
    "total_tasks": N,
    "success_rate": 0.0-1.0,
    "by_agent": {...},
    "by_tier": {...}
  },
  "best_practices": [
    {"pattern": "...", "evidence": "...", "recommendation": "..."}
  ],
  "improvement_opportunities": [
    {"area": "...", "current_state": "...", "proposed_improvement": "...", "expected_impact": "..."}
  ],
  "agent_recommendations": {
    "add": [...],
    "modify": [...],
    "remove": [...]
  },
  "prompt_improvements": [
    {"agent": "...", "current_prompt_issue": "...", "suggested_improvement": "..."}
  ]
}

Continuously improve the multi-agent system.""")
    },
    
    "dependency_analyzer": {
        "name": "Dependency Analyzer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Dependency Analyzer.
MISSION: Map and manage dependencies for safe extraction/migration.

ANALYZE:
- Code dependencies (imports, calls)
- Data dependencies (schemas, foreign keys)
- Logical dependencies (must run before/after)
- Circular dependencies (detect and flag)

OUTPUT:
{
  "nodes": ["module_a", "module_b", ...],
  "edges": [{"from": "a", "to": "b", "type": "imports|calls|data"}],
  "circular_dependencies": [...],
  "extraction_order": ["...", "...", ...],
  "risk_assessment": {
    "high_risk": [...],
    "medium_risk": [...],
    "low_risk": [...]
  },
  "safe_extraction_plan": [...]
}

BLOCK extraction that would break dependencies.""")
    },
    
    "call_tracer": {
        "name": "Call Chain Tracer",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Call Chain Tracer.
MISSION: Trace execution paths for debugging and analysis.

TRACE:
- Function call sequences
- Data transformations
- State changes
- Error propagation paths

OUTPUT:
{
  "trace": [
    {"step": 1, "function": "...", "input": {...}, "output": {...}, "state_change": {...}},
    ...
  ],
  "critical_points": [
    {"step": N, "reason": "This is where correct → incorrect"}
  ],
  "root_cause_candidates": [...],
  "fix_recommendations": [...]
}

Trace BACKWARD from symptom to find root cause.""")
    },
}

# =============================================================================
# AGENT CATEGORIES
# =============================================================================

AGENT_CATEGORIES = {
    "core": ["extractor", "validator", "merger", "coder", "analyst", "researcher", "architect", "coordinator"],
    "manufacturing": ["materials_scientist", "machinist", "tool_engineer", "physics_validator", 
                      "cam_specialist", "quality_engineer", "process_engineer", "machine_specialist",
                      "gcode_expert", "domain_expert"],
    "prism": ["monolith_navigator", "migration_specialist", "schema_designer", "api_designer",
              "completeness_auditor", "regression_checker", "state_manager", "synthesizer"],
    "quality": ["test_generator", "code_reviewer", "optimizer", "refactorer", 
                "security_auditor", "documentation_writer"],
    "calculators": ["cutting_calculator", "thermal_calculator", "force_calculator", "surface_calculator"],
    "lookup": ["standards_expert", "formula_lookup", "material_lookup", "tool_lookup"],
    "specialized": ["debugger", "root_cause_analyst", "task_decomposer", "estimator"],
    "intelligence": ["context_builder", "learning_extractor", "verification_chain", 
                     "uncertainty_quantifier", "cross_referencer", "knowledge_graph_builder",
                     "pattern_matcher", "quality_gate", "session_continuity", "meta_analyst",
                     "dependency_analyzer", "call_tracer"],
}

# =============================================================================
# CORE AGENT CLASS
# =============================================================================

class Agent:
    """Individual agent with embedded protocols"""
    
    def __init__(self, role: str, agent_id: str = None):
        if role not in AGENT_ROLES:
            raise ValueError(f"Unknown role: {role}. Available: {list(AGENT_ROLES.keys())}")
        
        self.role = role
        self.config = AGENT_ROLES[role]
        self.agent_id = agent_id or f"{role}-{int(time.time())}"
        self.client = anthropic.Anthropic(api_key=API_KEY)
        self.history = []
        self.model = self.config["tier"].value
        
    def execute(self, prompt: str, context: str = None, files: List[str] = None) -> Dict:
        """Execute a task and return results"""
        start_time = time.time()
        
        full_prompt = ""
        
        if files:
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    full_prompt += f"\n{'='*60}\nFILE: {file_path}\n{'='*60}\n{content}\n"
                except Exception as e:
                    full_prompt += f"\n[ERROR reading {file_path}: {e}]\n"
        
        if context:
            full_prompt += f"\n{'='*60}\nCONTEXT\n{'='*60}\n{context}\n"
        
        full_prompt += f"\n{'='*60}\nTASK\n{'='*60}\n{prompt}"
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.config["max_tokens"],
                system=self.config["system"],
                messages=[{"role": "user", "content": full_prompt}]
            )
            
            elapsed = time.time() - start_time
            
            result = {
                "agent_id": self.agent_id,
                "role": self.role,
                "agent_name": self.config["name"],
                "model": self.model,
                "status": "success",
                "content": response.content[0].text,
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "elapsed_seconds": round(elapsed, 2),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            elapsed = time.time() - start_time
            result = {
                "agent_id": self.agent_id,
                "role": self.role,
                "agent_name": self.config["name"],
                "status": "error",
                "error": str(e),
                "elapsed_seconds": round(elapsed, 2),
                "timestamp": datetime.now().isoformat()
            }
        
        self.history.append(result)
        return result

# =============================================================================
# ENHANCED ORCHESTRATOR WITH AUTO-SKILLS AND LEARNING
# =============================================================================

class EnhancedOrchestrator:
    """Enhanced orchestrator with auto-skill detection and learning"""
    
    def __init__(self, max_parallel: int = 5, auto_skills: bool = True, learn: bool = True):
        self.max_parallel = max_parallel
        self.auto_skills = auto_skills
        self.learn = learn
        self.agents: Dict[str, Agent] = {}
        self.results: List[Dict] = []
        self.session_id = f"session-{int(time.time())}"
        self.detected_skills = []
        self.context = ""
        
    def load_session_context(self) -> str:
        """Load context from CURRENT_STATE.json and past sessions"""
        context_parts = []
        
        # Load current state
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                context_parts.append(f"=== CURRENT STATE ===\n{json.dumps(state, indent=2)}")
            except:
                pass
        
        # Load recent learning extracts
        if LEARNING_DIR.exists():
            learning_files = sorted(LEARNING_DIR.glob("*.json"), reverse=True)[:5]
            for lf in learning_files:
                try:
                    with open(lf, 'r', encoding='utf-8') as f:
                        learning = json.load(f)
                    context_parts.append(f"=== LEARNING: {lf.name} ===\n{json.dumps(learning, indent=2)[:2000]}")
                except:
                    pass
        
        self.context = "\n\n".join(context_parts)
        return self.context
    
    def auto_detect_and_prepare(self, prompt: str) -> Tuple[List[str], List[str], ModelTier]:
        """Automatically detect skills and prepare optimal agent combination"""
        
        # Detect relevant skills
        self.detected_skills = auto_detect_skills(prompt)
        
        # Get agents for detected skills
        agents, tier = get_agents_for_skills(self.detected_skills)
        
        # Always include intelligence agents for complex tasks
        if tier == ModelTier.OPUS:
            agents.extend(["context_builder", "verification_chain", "learning_extractor"])
        
        return self.detected_skills, list(set(agents)), tier
    
    def spawn_agent(self, role: str, agent_id: str = None) -> Agent:
        """Spawn a new agent"""
        agent = Agent(role, agent_id)
        self.agents[agent.agent_id] = agent
        return agent
    
    def run_intelligent(self, prompt: str, files: List[str] = None) -> List[Dict]:
        """Run with automatic skill detection, context loading, and learning"""
        
        print(f"\n{'='*70}")
        print(f"PRISM ENHANCED ORCHESTRATOR v4.0")
        print(f"Session: {self.session_id}")
        print(f"{'='*70}\n")
        
        # Step 1: Load session context
        if self.auto_skills:
            print("[1/5] Loading session context...")
            self.load_session_context()
            if self.context:
                print(f"      Loaded {len(self.context)} chars of context")
        
        # Step 2: Auto-detect skills
        print("[2/5] Detecting relevant skills...")
        skills, agents, tier = self.auto_detect_and_prepare(prompt)
        print(f"      Detected skills: {skills}")
        print(f"      Selected agents: {agents}")
        print(f"      Model tier: {tier.name}")
        
        # Step 3: Build tasks
        print("[3/5] Building agent tasks...")
        tasks = []
        for role in agents:
            if role in AGENT_ROLES:
                tasks.append({
                    "id": f"auto-{role}",
                    "role": role,
                    "prompt": prompt,
                    "context": self.context,
                    "files": files
                })
        
        print(f"      Created {len(tasks)} tasks")
        
        # Step 4: Execute in parallel
        print("[4/5] Executing parallel swarm...")
        results = self.run_parallel(tasks)
        
        # Step 5: Extract learnings
        if self.learn:
            print("[5/5] Extracting learnings...")
            self._extract_and_store_learnings(prompt, results)
        
        return results
    
    def run_parallel(self, tasks: List[Dict]) -> List[Dict]:
        """Run multiple tasks in parallel"""
        results = []
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            future_to_task = {}
            
            for i, task in enumerate(tasks):
                task_id = task.get("id", f"task-{i+1}")
                role = task.get("role", "extractor")
                
                agent = self.spawn_agent(role, f"{role}-{task_id}")
                
                # Override model if tier specified
                if "tier" in task:
                    tier_name = task["tier"]
                    if tier_name == "opus":
                        agent.model = ModelTier.OPUS.value
                    elif tier_name == "sonnet":
                        agent.model = ModelTier.SONNET.value
                    elif tier_name == "haiku":
                        agent.model = ModelTier.HAIKU.value
                
                future = executor.submit(
                    agent.execute,
                    task["prompt"],
                    task.get("context"),
                    task.get("files")
                )
                future_to_task[future] = {"task": task, "task_id": task_id, "agent": agent}
                
                model_short = agent.model.split("-")[1]
                print(f"[QUEUED] {task_id} -> {AGENT_ROLES[role]['name']} ({model_short})")
            
            for future in as_completed(future_to_task):
                task_info = future_to_task[future]
                task_id = task_info["task_id"]
                
                try:
                    result = future.result()
                    result["task_id"] = task_id
                    results.append(result)
                    
                    status = "✓" if result["status"] == "success" else "✗"
                    tokens = f"{result.get('input_tokens', 0)}in/{result.get('output_tokens', 0)}out"
                    print(f"[{status}] {task_id} completed in {result['elapsed_seconds']}s ({tokens})")
                    
                except Exception as e:
                    print(f"[ERROR] {task_id}: {e}")
                    results.append({"task_id": task_id, "status": "error", "error": str(e)})
        
        elapsed = time.time() - start_time
        
        success_count = sum(1 for r in results if r.get("status") == "success")
        total_in = sum(r.get("input_tokens", 0) for r in results)
        total_out = sum(r.get("output_tokens", 0) for r in results)
        cost = self._estimate_cost(results)
        
        print(f"\n{'='*70}")
        print(f"COMPLETE: {success_count}/{len(tasks)} succeeded")
        print(f"Total tokens: {total_in:,} in / {total_out:,} out")
        print(f"Estimated cost: ${cost:.4f}")
        print(f"Total time: {round(elapsed, 2)}s")
        print(f"{'='*70}\n")
        
        self.results = results
        return results
    
    def _estimate_cost(self, results: List[Dict]) -> float:
        """Estimate API cost from results"""
        total = 0.0
        for r in results:
            model = r.get("model", "")
            in_tokens = r.get("input_tokens", 0)
            out_tokens = r.get("output_tokens", 0)
            
            if "opus" in model:
                costs = MODEL_COSTS[ModelTier.OPUS]
            elif "haiku" in model:
                costs = MODEL_COSTS[ModelTier.HAIKU]
            else:
                costs = MODEL_COSTS[ModelTier.SONNET]
            
            total += (in_tokens * costs["input"] + out_tokens * costs["output"]) / 1_000_000
        
        return total
    
    def _extract_and_store_learnings(self, prompt: str, results: List[Dict]):
        """Extract learnings and store for future use"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        learning = {
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "prompt_summary": prompt[:200],
            "detected_skills": self.detected_skills,
            "agents_used": [r.get("role") for r in results],
            "success_rate": sum(1 for r in results if r.get("status") == "success") / len(results) if results else 0,
            "total_tokens": sum(r.get("input_tokens", 0) + r.get("output_tokens", 0) for r in results),
            "patterns": [],
            "issues": []
        }
        
        # Extract patterns from successful results
        for r in results:
            if r.get("status") == "success":
                learning["patterns"].append({
                    "agent": r.get("role"),
                    "output_length": len(r.get("content", "")),
                    "execution_time": r.get("elapsed_seconds")
                })
            else:
                learning["issues"].append({
                    "agent": r.get("role"),
                    "error": r.get("error", "unknown")
                })
        
        # Save learning
        learning_file = LEARNING_DIR / f"learning_{timestamp}.json"
        with open(learning_file, 'w', encoding='utf-8') as f:
            json.dump(learning, f, indent=2)
        
        print(f"Learning saved to: {learning_file.name}")
    
    def save_results(self, name: str = "enhanced_results") -> Path:
        """Save all results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        json_path = RESULTS_DIR / f"{name}_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "detected_skills": self.detected_skills,
                "task_count": len(self.results),
                "results": self.results
            }, f, indent=2)
        
        content_path = RESULTS_DIR / f"{name}_{timestamp}_content.txt"
        with open(content_path, 'w', encoding='utf-8') as f:
            for r in self.results:
                f.write(f"\n{'='*70}\n")
                f.write(f"Task: {r.get('task_id', 'unknown')}\n")
                f.write(f"Agent: {r.get('agent_name', 'unknown')} ({r.get('role', 'unknown')})\n")
                f.write(f"Model: {r.get('model', 'unknown')}\n")
                f.write(f"Status: {r.get('status', 'unknown')}\n")
                f.write(f"{'='*70}\n\n")
                if r.get("status") == "success":
                    f.write(r.get("content", ""))
                else:
                    f.write(f"ERROR: {r.get('error', 'unknown')}")
                f.write("\n\n")
        
        print(f"Results saved to: {json_path}")
        return json_path

# =============================================================================
# RALPH LOOP (Enhanced)
# =============================================================================

class RalphLoop:
    """Ralph-style iteration loop with learning"""
    
    def __init__(self, role: str, prompt: str, completion_promise: str = "COMPLETE",
                 max_iterations: int = 10, context: str = None, files: List[str] = None,
                 learn: bool = True):
        
        self.role = role
        self.prompt = prompt
        self.completion_promise = completion_promise
        self.max_iterations = max_iterations
        self.context = context
        self.files = files
        self.learn = learn
        self.iterations = []
        self.completed = False
        
    def run(self) -> Dict:
        """Run the loop until completion or max iterations"""
        
        print(f"\n{'='*70}")
        print(f"RALPH LOOP v4.0 (Enhanced)")
        print(f"Agent: {AGENT_ROLES[self.role]['name']}")
        print(f"Completion Promise: '{self.completion_promise}'")
        print(f"Max Iterations: {self.max_iterations}")
        print(f"{'='*70}\n")
        
        # Load session context
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r', encoding='utf-8') as f:
                    state = json.load(f)
                self.context = (self.context or "") + f"\n\n=== SESSION STATE ===\n{json.dumps(state.get('quickResume', {}), indent=2)}"
            except:
                pass
        
        cumulative_learnings = []
        
        for i in range(1, self.max_iterations + 1):
            print(f"[ITERATION {i}/{self.max_iterations}]")
            
            agent = Agent(self.role, f"{self.role}-ralph-{i}")
            
            # Build iteration prompt with cumulative learning
            iteration_prompt = self.prompt
            if i > 1:
                iteration_prompt += f"\n\n--- PREVIOUS ITERATION ---\n{self.iterations[-1]['content'][:2000]}\n--- END PREVIOUS ---"
                if cumulative_learnings:
                    iteration_prompt += f"\n\n--- LEARNINGS SO FAR ---\n{json.dumps(cumulative_learnings[-3:], indent=2)}\n--- END LEARNINGS ---"
                iteration_prompt += f"\n\nContinue working. Output '{self.completion_promise}' when truly complete."
            
            result = agent.execute(iteration_prompt, self.context, self.files)
            result["iteration"] = i
            self.iterations.append(result)
            
            if result["status"] == "success":
                # Extract learnings from this iteration
                if self.learn:
                    learning = {
                        "iteration": i,
                        "progress": "partial",
                        "key_points": result["content"][:500]
                    }
                    cumulative_learnings.append(learning)
                
                if self.completion_promise in result["content"]:
                    print(f"[COMPLETE] Found '{self.completion_promise}'!")
                    self.completed = True
                    break
                else:
                    print(f"[CONTINUE] Iterating...")
            else:
                print(f"[ERROR] {result.get('error', 'Unknown')}")
        
        # Summary
        total_in = sum(r.get("input_tokens", 0) for r in self.iterations)
        total_out = sum(r.get("output_tokens", 0) for r in self.iterations)
        total_time = sum(r.get("elapsed_seconds", 0) for r in self.iterations)
        
        print(f"\n{'='*70}")
        print(f"RALPH LOOP {'COMPLETED' if self.completed else 'EXHAUSTED'}")
        print(f"Iterations: {len(self.iterations)}")
        print(f"Total tokens: {total_in:,} in / {total_out:,} out")
        print(f"Total time: {round(total_time, 2)}s")
        print(f"{'='*70}\n")
        
        return {
            "completed": self.completed,
            "iterations": len(self.iterations),
            "total_input_tokens": total_in,
            "total_output_tokens": total_out,
            "total_time": total_time,
            "final_result": self.iterations[-1] if self.iterations else None,
            "all_iterations": self.iterations,
            "learnings": cumulative_learnings
        }

# =============================================================================
# ENHANCED SWARM PATTERNS
# =============================================================================

def intelligent_swarm(prompt: str, files: List[str] = None) -> List[Dict]:
    """
    Fully automatic swarm - detects skills, selects agents, loads context, learns.
    This is the RECOMMENDED way to use the system.
    """
    orch = EnhancedOrchestrator(max_parallel=8, auto_skills=True, learn=True)
    results = orch.run_intelligent(prompt, files)
    orch.save_results("intelligent_swarm")
    return results


def verified_manufacturing_swarm(material: str, operation: str) -> List[Dict]:
    """Manufacturing analysis with verification chain and uncertainty"""
    tasks = [
        # Expert analysis
        {"id": "material", "role": "materials_scientist", "tier": "opus",
         "prompt": f"Complete material analysis for {material} with uncertainty bounds on all properties."},
        {"id": "cutting", "role": "machinist", "tier": "opus",
         "prompt": f"Optimal cutting parameters for {operation} of {material} with confidence intervals."},
        {"id": "tools", "role": "tool_engineer", "tier": "sonnet",
         "prompt": f"Tool recommendations for {operation} of {material} with part numbers."},
        {"id": "forces", "role": "force_calculator", "tier": "sonnet",
         "prompt": f"Force calculations for {operation} of {material} with uncertainty propagation."},
        
        # Verification
        {"id": "physics-check", "role": "physics_validator", "tier": "opus",
         "prompt": f"Validate physics of all calculations for {operation} of {material}."},
        {"id": "cross-ref", "role": "cross_referencer", "tier": "sonnet",
         "prompt": f"Cross-reference all values against multiple sources for {material}."},
        {"id": "uncertainty", "role": "uncertainty_quantifier", "tier": "opus",
         "prompt": f"Quantify uncertainty on all outputs for {operation} of {material}."},
        
        # Synthesis
        {"id": "synthesize", "role": "synthesizer", "tier": "opus",
         "prompt": f"Synthesize all expert analyses for {operation} of {material} into unified recommendation."},
    ]
    
    orch = EnhancedOrchestrator(max_parallel=8)
    results = orch.run_parallel(tasks)
    orch.save_results(f"verified_manufacturing_{material.replace(' ', '_')}")
    return results


def deep_extraction_swarm(source_description: str, files: List[str] = None) -> List[Dict]:
    """Extraction with context building, verification, and learning"""
    tasks = [
        # Context
        {"id": "context", "role": "context_builder", "tier": "sonnet",
         "prompt": f"Build context for extracting: {source_description}", "files": files},
        {"id": "patterns", "role": "pattern_matcher", "tier": "sonnet",
         "prompt": f"Find similar past extractions for: {source_description}"},
        
        # Extraction
        {"id": "extract", "role": "extractor", "tier": "sonnet",
         "prompt": f"Extract all structured data from: {source_description}", "files": files},
        
        # Verification
        {"id": "validate", "role": "validator", "tier": "sonnet",
         "prompt": f"Validate extracted data for: {source_description}", "files": files},
        {"id": "completeness", "role": "completeness_auditor", "tier": "sonnet",
         "prompt": f"Audit completeness of extraction from: {source_description}"},
        {"id": "regression", "role": "regression_checker", "tier": "sonnet",
         "prompt": f"Check for regression in extraction: {source_description}"},
        {"id": "quality-gate", "role": "quality_gate", "tier": "sonnet",
         "prompt": f"Apply quality gates to extraction: {source_description}"},
        
        # Learning
        {"id": "learn", "role": "learning_extractor", "tier": "opus",
         "prompt": f"Extract reusable patterns from extraction of: {source_description}"},
    ]
    
    orch = EnhancedOrchestrator(max_parallel=8)
    results = orch.run_parallel(tasks)
    orch.save_results("deep_extraction")
    return results


def debug_with_tracing_swarm(error_description: str, code: str = None, files: List[str] = None) -> List[Dict]:
    """Deep debugging with call tracing and root cause analysis"""
    tasks = [
        # Investigation
        {"id": "trace", "role": "call_tracer", "tier": "opus",
         "prompt": f"Trace call chain for: {error_description}", "context": code, "files": files},
        {"id": "root-cause", "role": "root_cause_analyst", "tier": "opus",
         "prompt": f"5-Why analysis for: {error_description}", "context": code, "files": files},
        {"id": "debug", "role": "debugger", "tier": "opus",
         "prompt": f"Debug: {error_description}", "context": code, "files": files},
        
        # Validation
        {"id": "physics", "role": "physics_validator", "tier": "opus",
         "prompt": f"Check physics violations for: {error_description}", "context": code},
        {"id": "dependencies", "role": "dependency_analyzer", "tier": "sonnet",
         "prompt": f"Analyze dependencies affected by: {error_description}", "files": files},
        
        # Synthesis
        {"id": "synthesize", "role": "synthesizer", "tier": "opus",
         "prompt": f"Synthesize debugging findings for: {error_description}"},
    ]
    
    orch = EnhancedOrchestrator(max_parallel=6)
    results = orch.run_parallel(tasks)
    orch.save_results("debug_investigation")
    return results

# =============================================================================
# CLI
# =============================================================================

def list_agents():
    """Print all 54 agents"""
    print("\n" + "="*70)
    print("PRISM UNIFIED SYSTEM v4.0 - 54 SPECIALIZED AGENTS")
    print("="*70)
    
    for category, agents in AGENT_CATEGORIES.items():
        print(f"\n{category.upper()} ({len(agents)} agents):")
        print("-" * 55)
        for role in agents:
            config = AGENT_ROLES[role]
            tier = config['tier'].name
            print(f"  {role:28} [{tier:6}] - {config['name']}")
    
    total = sum(len(agents) for agents in AGENT_CATEGORIES.values())
    print(f"\n{'='*70}")
    print(f"Total: {total} agents across {len(AGENT_CATEGORIES)} categories")
    print(f"NEW in v4.0: 12 intelligence agents for smarter operation")
    print("="*70 + "\n")


def main():
    if len(sys.argv) < 2:
        list_agents()
        print("""
USAGE:
  python prism_unified_system_v4.py --list              List all 54 agents
  python prism_unified_system_v4.py --intelligent "<prompt>"   Auto-detect, auto-context, auto-learn
  python prism_unified_system_v4.py --manufacturing <material> <operation>
  python prism_unified_system_v4.py --ralph <role> "<prompt>" [max_iterations]
  python prism_unified_system_v4.py <task_file.json>

EXAMPLES:
  python prism_unified_system_v4.py --intelligent "Extract all aluminum alloys from monolith"
  python prism_unified_system_v4.py --manufacturing "Inconel 718" "roughing"
  python prism_unified_system_v4.py --ralph architect "Design X. Output COMPLETE when done." 10
""")
        return
    
    cmd = sys.argv[1]
    
    if cmd == "--list":
        list_agents()
    
    elif cmd == "--intelligent" and len(sys.argv) >= 3:
        prompt = sys.argv[2]
        intelligent_swarm(prompt)
    
    elif cmd == "--manufacturing" and len(sys.argv) >= 4:
        material = sys.argv[2]
        operation = sys.argv[3]
        verified_manufacturing_swarm(material, operation)
    
    elif cmd == "--ralph" and len(sys.argv) >= 4:
        role = sys.argv[2]
        prompt = sys.argv[3]
        max_iter = int(sys.argv[4]) if len(sys.argv) > 4 else 10
        
        ralph = RalphLoop(role=role, prompt=prompt, max_iterations=max_iter, learn=True)
        result = ralph.run()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(RESULTS_DIR / f"ralph_{role}_{timestamp}.json", 'w') as f:
            json.dump(result, f, indent=2, default=str)
    
    else:
        task_file = sys.argv[1]
        if not os.path.isabs(task_file):
            task_file = TASKS_DIR / task_file
        
        with open(task_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        orch = EnhancedOrchestrator(max_parallel=config.get("max_parallel", 5))
        results = orch.run_parallel(config["tasks"])
        orch.save_results(config.get("name", "orchestrator"))


if __name__ == "__main__":
    main()
