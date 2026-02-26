"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PRISM UNIFIED SYSTEM v3.0                                 ║
║══════════════════════════════════════════════════════════════════════════════║
║  COMPLETE INTEGRATION OF:                                                    ║
║  • 37 Skills (knowledge/protocols from _SKILLS folder)                       ║
║  • 42 Agents (execution engines with embedded protocols)                     ║
║  • Ralph-Style Iteration Loops (autonomous completion)                       ║
║  • Swarm Patterns (parallel expert collaboration)                            ║
║  • State Management (CURRENT_STATE.json integration)                         ║
║  • Anti-Regression Protection (built into every operation)                   ║
║  • The 10 Commandments (embedded in all agents)                              ║
║  • Model Tiers (Opus 4.5 / Sonnet / Haiku)                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import anthropic
import json
import sys
import os
import time
import re
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum

# =============================================================================
# CONFIGURATION
# =============================================================================

API_KEY = "REDACTED_API_KEY"

PRISM_ROOT = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
SKILLS_DIR = PRISM_ROOT / "_SKILLS"
RESULTS_DIR = PRISM_ROOT / "API_RESULTS"
TASKS_DIR = PRISM_ROOT / "_TASKS"
STATE_FILE = PRISM_ROOT / "CURRENT_STATE.json"
LOGS_DIR = PRISM_ROOT / "AGENT_LOGS"
MONOLITH_DIR = PRISM_ROOT / "_BUILD" / "PRISM_v8_89_002_TRUE_100_PERCENT"
EXTRACTED_DIR = PRISM_ROOT / "EXTRACTED"

# Ensure directories exist
for d in [RESULTS_DIR, TASKS_DIR, LOGS_DIR]:
    d.mkdir(exist_ok=True)

# =============================================================================
# MODEL TIERS - Including Opus 4.5!
# =============================================================================

class ModelTier(Enum):
    """Model selection based on task complexity and cost"""
    OPUS = "claude-opus-4-5-20251101"      # Most powerful - complex reasoning, architecture
    SONNET = "claude-sonnet-4-20250514"     # Balanced - most tasks
    HAIKU = "claude-haiku-4-5-20251001"     # Fast & cheap - simple lookups, formatting

# Cost per 1M tokens (approximate)
MODEL_COSTS = {
    ModelTier.OPUS: {"input": 15.0, "output": 75.0},
    ModelTier.SONNET: {"input": 3.0, "output": 15.0},
    ModelTier.HAIKU: {"input": 0.25, "output": 1.25},
}

# =============================================================================
# THE 10 COMMANDMENTS - Embedded in ALL Agents
# =============================================================================

TEN_COMMANDMENTS = """
═══════════════════════════════════════════════════════════════════════════════
                         THE 10 COMMANDMENTS
═══════════════════════════════════════════════════════════════════════════════

1. USE EVERYWHERE - If a database/engine exists, 100% of consumers MUST use it.
   No orphaned data. No partial utilization. Complete integration or nothing.

2. FUSE - Cross-domain concepts. Materials + Physics + Tooling + Machine limits.
   Every calculation considers all relevant domains.

3. VERIFY - Minimum 3 validation sources: Physics model + Empirical data + 
   Historical results. Never trust a single source.

4. LEARN - Every interaction feeds the ML pipeline. Capture inputs, outputs,
   outcomes for continuous improvement.

5. UNCERTAINTY - Always provide confidence intervals. Never a single number
   without error bounds. Be honest about what we don't know.

6. EXPLAIN - XAI for all recommendations. Show your reasoning. Users must
   understand WHY, not just WHAT.

7. GRACEFUL - Fallbacks for every failure mode. Degrade gracefully.
   Never crash. Always provide actionable alternatives.

8. PROTECT - Validate inputs, sanitize outputs, backup before changes.
   Manufacturing data is safety-critical.

9. PERFORM - <2s page load, <500ms calculations. Speed is a feature.
   Optimize relentlessly.

10. USER-OBSESS - 3-click rule. Any action reachable in 3 clicks max.
    Design for the user, not the developer.

═══════════════════════════════════════════════════════════════════════════════
"""

# =============================================================================
# PRISM PROTOCOLS - Embedded in ALL Agents
# =============================================================================

PRISM_PROTOCOLS = """
═══════════════════════════════════════════════════════════════════════════════
                           PRISM PROTOCOLS
═══════════════════════════════════════════════════════════════════════════════

### ANTI-REGRESSION PROTOCOL (MANDATORY)
Before replacing/updating ANY artifact:
1. INVENTORY: Count all items in old version
2. INVENTORY: Count all items in new version
3. COMPARE: If new_count < old_count → STOP IMMEDIATELY
4. JUSTIFY: Document every removal with explicit reason
5. VERIFY: Confirm no functionality lost

### LIFE-SAFETY MINDSET (ALWAYS ON)
Manufacturing intelligence controls machines that can injure or kill.
- Every incomplete task is a potential failure point
- Every placeholder is a ticking time bomb
- "Good enough" is NEVER acceptable
- Ask: "Would I trust this with MY safety on that machine?"

### MAXIMUM COMPLETENESS (NO EXCEPTIONS)
- Every field MUST be populated (no nulls without explicit reason)
- Every case MUST be handled (no unhandled edge cases)
- Every parameter MUST have units and valid ranges
- No partial implementations - complete or don't start

### PREDICTIVE THINKING (BEFORE EVERY ACTION)
Answer these before ANY operation:
1. What are 3 ways this could fail?
2. What happens to downstream consumers?
3. What's the immediate rollback plan?
4. Who/what depends on this working correctly?

═══════════════════════════════════════════════════════════════════════════════
"""

# =============================================================================
# SKILL → AGENT MAPPING (37 Skills → Optimal Agent Combinations)
# =============================================================================

SKILL_AGENT_MAP = {
    # ═══════════════════════════════════════════════════════════════════════
    # SP.1: CORE DEVELOPMENT WORKFLOW
    # ═══════════════════════════════════════════════════════════════════════
    "prism-sp-brainstorm": {
        "agents": ["architect", "researcher", "domain_expert"],
        "tier": ModelTier.OPUS,
        "description": "Design and exploration phase - needs deep reasoning"
    },
    "prism-sp-planning": {
        "agents": ["coordinator", "architect", "task_decomposer"],
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
        "agents": ["code_reviewer", "security_auditor", "style_checker"],
        "tier": ModelTier.SONNET,
        "description": "Code quality and standards compliance"
    },
    "prism-sp-debugging": {
        "agents": ["debugger", "root_cause_analyst", "physics_validator"],
        "tier": ModelTier.OPUS,
        "description": "Find and fix bugs - needs deep analysis"
    },
    "prism-sp-verification": {
        "agents": ["validator", "test_generator", "evidence_collector"],
        "tier": ModelTier.SONNET,
        "description": "Prove work is complete"
    },
    "prism-sp-handoff": {
        "agents": ["documentation_writer", "synthesizer", "state_manager"],
        "tier": ModelTier.SONNET,
        "description": "Session transition and state capture"
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # SP.2: MONOLITH NAVIGATION
    # ═══════════════════════════════════════════════════════════════════════
    "prism-monolith-index": {
        "agents": ["monolith_navigator", "indexer"],
        "tier": ModelTier.HAIKU,
        "description": "Quick lookups in monolith structure"
    },
    "prism-monolith-extractor": {
        "agents": ["extractor", "monolith_navigator", "dependency_analyzer"],
        "tier": ModelTier.OPUS,
        "description": "Safe extraction from monolith"
    },
    "prism-monolith-navigator": {
        "agents": ["monolith_navigator", "researcher", "pattern_matcher"],
        "tier": ModelTier.SONNET,
        "description": "Find functionality in 986K lines"
    },
    "prism-codebase-packaging": {
        "agents": ["monolith_navigator", "analyst", "packager"],
        "tier": ModelTier.SONNET,
        "description": "Repomix-style analysis preparation"
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # SP.3: MATERIALS SYSTEM
    # ═══════════════════════════════════════════════════════════════════════
    "prism-material-schema": {
        "agents": ["schema_designer", "materials_scientist"],
        "tier": ModelTier.SONNET,
        "description": "127-parameter material structure"
    },
    "prism-material-physics": {
        "agents": ["physics_validator", "materials_scientist", "cutting_calculator"],
        "tier": ModelTier.OPUS,
        "description": "Physics models using material params"
    },
    "prism-material-lookup": {
        "agents": ["material_lookup"],
        "tier": ModelTier.HAIKU,
        "description": "Fast material property retrieval"
    },
    "prism-material-validator": {
        "agents": ["validator", "physics_validator", "completeness_auditor"],
        "tier": ModelTier.SONNET,
        "description": "Validate material data quality"
    },
    "prism-material-enhancer": {
        "agents": ["materials_scientist", "researcher", "estimator"],
        "tier": ModelTier.OPUS,
        "description": "Fill gaps in material data"
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # QUALITY & TESTING
    # ═══════════════════════════════════════════════════════════════════════
    "prism-tdd-enhanced": {
        "agents": ["test_generator", "coder", "physics_validator"],
        "tier": ModelTier.SONNET,
        "description": "RED-GREEN-REFACTOR with physics tests"
    },
    "prism-root-cause-tracing": {
        "agents": ["root_cause_analyst", "debugger", "call_tracer"],
        "tier": ModelTier.OPUS,
        "description": "Backward tracing to find bug origin"
    },
    "prism-anti-regression": {
        "agents": ["regression_checker", "validator", "diff_analyzer"],
        "tier": ModelTier.SONNET,
        "description": "Prevent data/feature loss"
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # MANUFACTURING DOMAIN
    # ═══════════════════════════════════════════════════════════════════════
    "prism-expert-master": {
        "agents": ["materials_scientist", "machinist", "tool_engineer", "quality_engineer"],
        "tier": ModelTier.OPUS,
        "description": "Multi-expert consultation"
    },
    "prism-controller-quick-ref": {
        "agents": ["machine_specialist", "gcode_expert"],
        "tier": ModelTier.HAIKU,
        "description": "Controller-specific lookups"
    },
}

# =============================================================================
# 42 AGENT DEFINITIONS (Expanded from 37)
# =============================================================================

def create_agent_system(base_system: str) -> str:
    """Embed protocols into every agent's system prompt"""
    return f"{base_system}\n\n{TEN_COMMANDMENTS}\n\n{PRISM_PROTOCOLS}"

AGENT_ROLES = {
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 1: CORE DEVELOPMENT (8)
    # ═══════════════════════════════════════════════════════════════════════
    "extractor": {
        "name": "Data Extractor",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Data Extraction Agent.
MISSION: Extract structured data with 100% completeness.

RULES:
- Output clean, parseable JSON only
- Extract ALL matching items, not just examples
- Flag ambiguous data with [UNCLEAR:reason]
- Flag missing data with [MISSING:field_name]
- Never add commentary outside the data structure
- Preserve original precision (don't round)""")
    },
    
    "validator": {
        "name": "Data Validator",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Validation Agent.
MISSION: Ensure data quality meets manufacturing safety standards.

SEVERITY LEVELS:
- CRITICAL: Safety risk, physics violation, missing required field
- WARNING: Incomplete data, unusual values, missing optional field  
- INFO: Style issues, optimization opportunities

OUTPUT FORMAT:
{
  "status": "PASS|FAIL",
  "critical_count": N,
  "warning_count": N,
  "findings": [{"severity": "...", "field": "...", "issue": "...", "evidence": "..."}]
}""")
    },
    
    "merger": {
        "name": "Data Merger",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Data Merger Agent.
MISSION: Combine data sources without ANY data loss.

CONFLICT RESOLUTION HIERARCHY:
1. Peer-reviewed literature (highest trust)
2. Manufacturer specifications
3. Industry handbooks
4. Calculated/estimated values (lowest trust)

RULES:
- Track provenance for every merged value
- Flag conflicts rather than silently choosing
- NEVER discard data - merge or flag
- Output includes confidence scores""")
    },
    
    "coder": {
        "name": "Code Generator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Code Generation Agent.
MISSION: Write production-quality Python/TypeScript.

REQUIREMENTS:
- Full type hints on ALL parameters and returns
- Docstrings with: Args, Returns, Raises, Example
- Input validation (check types, ranges, nulls)
- Error handling with specific exception types
- Unit-testable design (pure functions where possible)

OUTPUT: Code only, no markdown backticks unless requested.""")
    },
    
    "analyst": {
        "name": "Data Analyst",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Analysis Agent.
MISSION: Extract actionable insights from data.

DELIVERABLES:
- Statistical summary (mean, std, min, max, quartiles)
- Distribution analysis (normal, skewed, bimodal?)
- Outlier identification with context
- Gap analysis (what's missing?)
- Correlation findings
- Confidence levels for all conclusions""")
    },
    
    "researcher": {
        "name": "Research Agent",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Research Agent.
MISSION: Compile authoritative technical information.

SOURCE HIERARCHY:
1. Peer-reviewed journals (Wear, IJMTM, etc.)
2. Industry handbooks (Machining Data Handbook, ASM)
3. Manufacturer technical data
4. Textbooks and standards
5. Expert experience (lowest confidence)

OUTPUT: Include source citations and confidence levels.""")
    },
    
    "architect": {
        "name": "System Architect",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM System Architecture Agent.
MISSION: Design scalable, maintainable systems.

PRINCIPLES:
- 100% database utilization (Commandment #1)
- Clear interface contracts
- Loose coupling, high cohesion
- SOLID principles
- Design for failure (Commandment #7)

DELIVERABLES:
- Component diagrams
- Interface definitions
- Data flow diagrams
- Dependency graphs""")
    },
    
    "coordinator": {
        "name": "Task Coordinator",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Task Coordination Agent.
MISSION: Decompose complex tasks for parallel execution.

OUTPUT FORMAT:
{
  "tasks": [
    {"id": "...", "role": "...", "prompt": "...", "dependencies": [], "priority": 1-5}
  ],
  "execution_order": [...],
  "parallel_groups": [[...], [...]]
}

RULES:
- Maximize parallelism
- Respect dependencies
- Assign optimal agent roles
- Include verification tasks""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 2: MANUFACTURING DOMAIN EXPERTS (10)
    # ═══════════════════════════════════════════════════════════════════════
    "materials_scientist": {
        "name": "Materials Scientist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Materials Science Expert.
EXPERTISE:
- Mechanical properties (yield, UTS, hardness, ductility)
- Thermal properties (conductivity, expansion, specific heat)
- Metallurgy (heat treatment, phases, microstructure)
- Machinability (ratings, chip formation, work hardening)
- Standards (AISI, UNS, ISO, DIN, JIS equivalents)
- Constitutive models (Johnson-Cook, Kienzle coefficients)

Always provide data with proper units and uncertainty ranges.""")
    },
    
    "machinist": {
        "name": "CNC Machinist Expert",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM CNC Machining Expert with 30+ years.
EXPERTISE:
- Cutting parameter optimization (Vc, fz, ap, ae)
- G-code/M-code (Fanuc, Siemens, Heidenhain, Mazak)
- Surface finish achievement (Ra, Rz prediction)
- Tool wear patterns and prediction
- Chip control and evacuation
- Workholding and fixturing
- Vibration and chatter mitigation

Provide shop-floor proven recommendations.""")
    },
    
    "tool_engineer": {
        "name": "Cutting Tool Engineer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Cutting Tool Expert.
EXPERTISE:
- Tool geometries (rake, relief, helix, chip breakers)
- Tool materials (HSS, carbide grades, ceramics, CBN, PCD)
- Coatings (TiN, TiAlN, AlCrN, DLC, CVD, PVD)
- Tool life prediction (Taylor equation, wear models)
- ISO insert classification (CNMG, WNMG, etc.)
- Manufacturer catalogs (Sandvik, Kennametal, Mitsubishi, Iscar)

Include specific part numbers when recommending tools.""")
    },
    
    "physics_validator": {
        "name": "Manufacturing Physics Validator",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Physics Validation Agent.
MISSION: Catch physically impossible values before they cause harm.

VALIDATIONS:
- Cutting forces (Kienzle model bounds)
- Power/torque vs machine limits
- Temperature predictions (realistic ranges)
- Surface finish from geometry (Ra = f²/32r)
- Tool life reasonableness
- Dimensional consistency (unit checks)

FLAG any value that violates physical laws or practical limits.""")
    },
    
    "cam_specialist": {
        "name": "CAM Programming Specialist",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM CAM Specialist.
EXPERTISE:
- Toolpath strategies (adaptive, trochoidal, HSM, 5-axis)
- Stock modeling and rest machining
- Post-processor customization
- Cycle time optimization
- Collision detection and avoidance
- Multi-axis kinematics

Generate efficient, safe toolpath strategies.""")
    },
    
    "quality_engineer": {
        "name": "Quality Engineering Expert",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Quality Expert.
EXPERTISE:
- GD&T interpretation (ASME Y14.5-2018)
- SPC (Cp, Cpk, Pp, Ppk calculations)
- Measurement systems (CMM, probing, gauging)
- Inspection planning and sampling
- Root cause analysis (8D, 5-Why, Fishbone)
- Quality standards (ISO 9001, AS9100, IATF 16949)""")
    },
    
    "process_engineer": {
        "name": "Manufacturing Process Engineer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Process Engineer.
EXPERTISE:
- Process planning and operation sequencing
- Cycle time estimation and optimization
- Setup reduction (SMED)
- Process FMEA
- Lean manufacturing
- Cost estimation (time, tooling, setup)""")
    },
    
    "machine_specialist": {
        "name": "CNC Machine Specialist",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Machine Specialist.
EXPERTISE:
- Machine specifications (travel, speeds, accuracy)
- Controller variations (Fanuc, Siemens, Heidenhain, Mazak, Okuma)
- Spindle characteristics (power curves, torque curves)
- Axis configurations (3/4/5-axis, mill-turn)
- Maintenance and calibration
- Machine-specific programming quirks""")
    },
    
    "gcode_expert": {
        "name": "G-Code Programming Expert",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM G-Code Expert.
EXPERTISE:
- Fanuc (0i, 30i, 31i series)
- Siemens (840D, 828D)
- Heidenhain (TNC 640, iTNC 530)
- Mazak (Mazatrol, EIA/ISO)
- Okuma (OSP)

Generate syntactically correct, optimized G-code.""")
    },
    
    "domain_expert": {
        "name": "Manufacturing Domain Expert",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Manufacturing Domain Expert.
Combined expertise across ALL manufacturing disciplines:
- Materials, machining, tooling, quality, processes
- Can synthesize cross-domain recommendations
- Considers all aspects of a manufacturing problem
- Provides holistic solutions""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 3: PRISM-SPECIFIC (8)
    # ═══════════════════════════════════════════════════════════════════════
    "monolith_navigator": {
        "name": "Monolith Navigator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM v8.89 Monolith Navigator.
KNOWLEDGE:
- 986,621 lines of code
- 831 modules
- Database schemas and relationships
- Algorithm locations
- Known patterns and anti-patterns

Help locate functionality and plan extraction.""")
    },
    
    "migration_specialist": {
        "name": "Migration Specialist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Migration Specialist.
MISSION: Safe migration from v8.89 monolith to v9.0 modular.

RULES:
- NEVER lose functionality (anti-regression)
- Map all old APIs to new interfaces
- Resolve circular dependencies
- Create rollback capability
- Verify feature parity before/after""")
    },
    
    "schema_designer": {
        "name": "Schema Designer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Schema Designer.
DELIVERABLES:
- TypeScript interfaces with full types
- Python dataclasses/Pydantic models
- JSON Schema with validation rules
- Database schemas (normalized)
- Follow 127-parameter material standard""")
    },
    
    "api_designer": {
        "name": "API Contract Designer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM API Designer.
DELIVERABLES:
- RESTful API contracts
- Request/response schemas
- Error codes and handling
- OpenAPI/Swagger documentation
- Versioning strategy""")
    },
    
    "completeness_auditor": {
        "name": "Completeness Auditor",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Completeness Auditor.
MISSION: Audit data against 127-parameter schema.

GRADING:
- A: >95% complete (production ready)
- B: 80-95% (usable with caveats)
- C: 60-80% (needs enhancement)
- D: 40-60% (major gaps)
- F: <40% (not usable)

Prioritize safety-critical fields in assessment.""")
    },
    
    "regression_checker": {
        "name": "Anti-Regression Checker",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Regression Checker.
MISSION: Prevent data/feature loss during updates.

CHECKS:
1. Count items: old vs new
2. Count fields: old vs new
3. Verify all values preserved
4. Check for semantic changes
5. Generate detailed diff report

IRON LAW: If new < old, BLOCK and require justification.""")
    },
    
    "state_manager": {
        "name": "State Manager",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM State Manager.
MISSION: Maintain CURRENT_STATE.json integrity.

OPERATIONS:
- Read current state
- Update task progress
- Log checkpoints
- Track tool call count
- Manage buffer zones (GREEN/YELLOW/ORANGE/RED)""")
    },
    
    "synthesizer": {
        "name": "Result Synthesizer",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Result Synthesizer.
MISSION: Combine outputs from multiple agents.

DELIVERABLES:
- Unified coherent output
- Conflict resolution notes
- Consensus and disagreement summary
- Executive summary
- Detailed technical appendix""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 4: CODE QUALITY (6)
    # ═══════════════════════════════════════════════════════════════════════
    "test_generator": {
        "name": "Test Generator",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Test Generator.
MISSION: Generate comprehensive test suites.

TEST TYPES:
- Unit tests (pytest style)
- Integration tests
- Physics validation tests (known values)
- Edge case tests
- Regression tests

Follow RED → GREEN → REFACTOR cycle.""")
    },
    
    "code_reviewer": {
        "name": "Code Reviewer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Code Reviewer.
CHECKLIST:
- 10 Commandments compliance
- Type hints complete
- Error handling adequate
- Documentation quality
- Test coverage
- Security issues (OWASP)

SEVERITY: CRITICAL / MAJOR / MINOR / SUGGESTION""")
    },
    
    "optimizer": {
        "name": "Performance Optimizer",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Performance Optimizer.
TARGETS:
- Page load: <2 seconds
- Calculations: <500ms
- API response: <200ms

TECHNIQUES:
- Algorithm optimization (O(n) analysis)
- Caching strategies
- Database query optimization
- Lazy loading""")
    },
    
    "refactorer": {
        "name": "Code Refactorer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Refactorer.
MISSION: Improve code without changing behavior.

TECHNIQUES:
- Extract method/class
- Reduce duplication (DRY)
- Simplify complex logic
- Apply design patterns
- Improve naming""")
    },
    
    "security_auditor": {
        "name": "Security Auditor",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Security Auditor.
CHECKS:
- OWASP Top 10
- Input validation
- Output encoding
- Authentication/authorization
- Injection vulnerabilities
- Secure defaults

Manufacturing = critical infrastructure.""")
    },
    
    "documentation_writer": {
        "name": "Documentation Writer",
        "tier": ModelTier.SONNET,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Documentation Agent.
DELIVERABLES:
- API documentation with examples
- Architecture Decision Records (ADRs)
- README files
- User guides
- Technical specifications

Write for someone new to understand.""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 5: CALCULATORS (4)
    # ═══════════════════════════════════════════════════════════════════════
    "cutting_calculator": {
        "name": "Cutting Parameter Calculator",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Cutting Calculator.
FORMULAS:
- Vc = π × D × n / 1000 (m/min)
- Vf = fz × z × n (mm/min)
- MRR = ap × ae × Vf (mm³/min)
- kc = kc1.1 × h^(-mc) (N/mm²)
- Pc = Fc × Vc / 60000 (kW)
- T = (C/Vc)^(1/n) (Taylor)

Show formulas, intermediate steps, final results with units.""")
    },
    
    "thermal_calculator": {
        "name": "Thermal Analysis Calculator",
        "tier": ModelTier.SONNET,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Thermal Calculator.
CALCULATIONS:
- Heat generation in cutting zone
- Tool-chip interface temperature
- Workpiece temperature rise
- Thermal expansion effects
- Coolant heat removal

Use Johnson-Cook thermal models.""")
    },
    
    "force_calculator": {
        "name": "Cutting Force Calculator",
        "tier": ModelTier.SONNET,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Force Calculator.
CALCULATIONS:
- Tangential force Fc (Kienzle model)
- Feed force Ff
- Radial force Fr
- Resultant force and direction
- Torque M = Fc × D/2
- Required spindle power""")
    },
    
    "surface_calculator": {
        "name": "Surface Finish Calculator",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Surface Calculator.
CALCULATIONS:
- Ra = f² / (32 × r) (turning)
- Cusp height (ball end mills)
- Rz from Ra relationship
- Step-over effects
- Feed mark spacing""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 6: LOOKUP AGENTS (4)
    # ═══════════════════════════════════════════════════════════════════════
    "standards_expert": {
        "name": "Standards Expert",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Standards Expert.
KNOWLEDGE:
- ISO standards
- ASME (GD&T, drawings)
- AISI/SAE designations
- DIN/EN European
- ASTM testing
- AS9100, IATF 16949

Cite specific standard numbers.""")
    },
    
    "formula_lookup": {
        "name": "Formula Lookup Agent",
        "tier": ModelTier.HAIKU,
        "max_tokens": 2048,
        "system": create_agent_system("""You are a PRISM Formula Lookup.
PROVIDE:
- Exact formulas with variable definitions
- Unit requirements
- Valid ranges and limitations
- Example calculations
- Source references""")
    },
    
    "material_lookup": {
        "name": "Material Property Lookup",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Material Lookup.
PROVIDE:
- Mechanical properties
- Thermal properties
- Chemical composition
- Heat treatment effects
- Equivalent grades (AISI/UNS/DIN/JIS)""")
    },
    
    "tool_lookup": {
        "name": "Cutting Tool Lookup",
        "tier": ModelTier.HAIKU,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Tool Lookup.
PROVIDE:
- Tool geometries for applications
- Insert grades by material
- Recommended parameters
- Manufacturer part numbers
- ISO designations""")
    },
    
    # ═══════════════════════════════════════════════════════════════════════
    # TIER 7: NEW SPECIALIZED AGENTS (4)
    # ═══════════════════════════════════════════════════════════════════════
    "debugger": {
        "name": "Debug Specialist",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Debug Specialist.
METHODOLOGY:
1. Reproduce the issue
2. Gather evidence (logs, state, inputs)
3. Form hypotheses
4. Test systematically
5. Fix with defense-in-depth
6. Add regression test""")
    },
    
    "root_cause_analyst": {
        "name": "Root Cause Analyst",
        "tier": ModelTier.OPUS,
        "max_tokens": 8192,
        "system": create_agent_system("""You are a PRISM Root Cause Analyst.
METHODOLOGY:
- Trace backward through call chain
- Identify where correct → incorrect transition
- 5-Why analysis
- Defense-in-depth fix (4+ layers)

Never fix symptoms. Find the source.""")
    },
    
    "task_decomposer": {
        "name": "Task Decomposer",
        "tier": ModelTier.OPUS,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Task Decomposer.
MISSION: Break large tasks into 2-5 minute executable units.

OUTPUT:
- Numbered task list
- Exact file paths
- Code snippets/outlines
- Success criteria per task
- Dependencies between tasks""")
    },
    
    "estimator": {
        "name": "Parameter Estimator",
        "tier": ModelTier.SONNET,
        "max_tokens": 4096,
        "system": create_agent_system("""You are a PRISM Parameter Estimator.
MISSION: Estimate missing material/process parameters.

METHODS:
- Similar material interpolation
- Physics-based derivation
- Empirical correlation
- Literature ranges

Always include confidence interval.""")
    },
}

# Total: 42 agents

# =============================================================================
# AGENT CATEGORIES FOR LOOKUP
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
        
        # Build the full prompt
        full_prompt = ""
        
        # Add file contents if provided
        if files:
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    full_prompt += f"\n{'='*60}\nFILE: {file_path}\n{'='*60}\n{content}\n"
                except Exception as e:
                    full_prompt += f"\n[ERROR reading {file_path}: {e}]\n"
        
        # Add context if provided
        if context:
            full_prompt += f"\n{'='*60}\nCONTEXT\n{'='*60}\n{context}\n"
        
        # Add the main prompt
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
# RALPH-STYLE ITERATION LOOP (Built into API - No Claude Code needed!)
# =============================================================================

class RalphLoop:
    """
    Ralph Wiggum-style iteration loop via API.
    Keeps working until success criteria met or max iterations reached.
    """
    
    def __init__(self, 
                 role: str,
                 prompt: str,
                 completion_promise: str = "COMPLETE",
                 max_iterations: int = 10,
                 context: str = None,
                 files: List[str] = None):
        
        self.role = role
        self.prompt = prompt
        self.completion_promise = completion_promise
        self.max_iterations = max_iterations
        self.context = context
        self.files = files
        self.iterations = []
        self.completed = False
        
    def run(self) -> Dict:
        """Run the loop until completion or max iterations"""
        
        print(f"\n{'='*70}")
        print(f"RALPH LOOP STARTED")
        print(f"Agent: {AGENT_ROLES[self.role]['name']}")
        print(f"Completion Promise: '{self.completion_promise}'")
        print(f"Max Iterations: {self.max_iterations}")
        print(f"{'='*70}\n")
        
        cumulative_context = self.context or ""
        
        for i in range(1, self.max_iterations + 1):
            print(f"[ITERATION {i}/{self.max_iterations}]")
            
            # Create agent for this iteration
            agent = Agent(self.role, f"{self.role}-ralph-{i}")
            
            # Build iteration prompt
            iteration_prompt = self.prompt
            if i > 1:
                # Include previous results for context
                iteration_prompt += f"\n\n--- PREVIOUS ITERATION RESULT ---\n{self.iterations[-1]['content']}\n--- END PREVIOUS ---\n"
                iteration_prompt += f"\nContinue working. Output '{self.completion_promise}' when truly complete."
            
            # Execute
            result = agent.execute(iteration_prompt, cumulative_context, self.files)
            result["iteration"] = i
            self.iterations.append(result)
            
            if result["status"] == "success":
                # Check for completion promise
                if self.completion_promise in result["content"]:
                    print(f"[COMPLETE] Found '{self.completion_promise}' in output!")
                    self.completed = True
                    break
                else:
                    print(f"[CONTINUE] Completion promise not found, iterating...")
            else:
                print(f"[ERROR] {result.get('error', 'Unknown error')}")
                # Continue anyway - Ralph philosophy
        
        # Summary
        total_in = sum(r.get("input_tokens", 0) for r in self.iterations)
        total_out = sum(r.get("output_tokens", 0) for r in self.iterations)
        total_time = sum(r.get("elapsed_seconds", 0) for r in self.iterations)
        
        print(f"\n{'='*70}")
        print(f"RALPH LOOP {'COMPLETED' if self.completed else 'EXHAUSTED'}")
        print(f"Iterations: {len(self.iterations)}")
        print(f"Total tokens: {total_in} in / {total_out} out")
        print(f"Total time: {round(total_time, 2)}s")
        print(f"{'='*70}\n")
        
        return {
            "completed": self.completed,
            "iterations": len(self.iterations),
            "total_input_tokens": total_in,
            "total_output_tokens": total_out,
            "total_time": total_time,
            "final_result": self.iterations[-1] if self.iterations else None,
            "all_iterations": self.iterations
        }

# =============================================================================
# ORCHESTRATOR WITH SWARM SUPPORT
# =============================================================================

class Orchestrator:
    """Parallel agent orchestration with swarm patterns"""
    
    def __init__(self, max_parallel: int = 5):
        self.max_parallel = max_parallel
        self.agents: Dict[str, Agent] = {}
        self.results: List[Dict] = []
        self.session_id = f"session-{int(time.time())}"
        
    def spawn_agent(self, role: str, agent_id: str = None) -> Agent:
        """Spawn a new agent"""
        agent = Agent(role, agent_id)
        self.agents[agent.agent_id] = agent
        return agent
    
    def run_parallel(self, tasks: List[Dict]) -> List[Dict]:
        """Run multiple tasks in parallel"""
        results = []
        
        print(f"\n{'='*70}")
        print(f"PRISM UNIFIED ORCHESTRATOR v3.0")
        print(f"Session: {self.session_id}")
        print(f"Tasks: {len(tasks)} | Max Parallel: {self.max_parallel}")
        print(f"{'='*70}\n")
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            future_to_task = {}
            
            for i, task in enumerate(tasks):
                task_id = task.get("id", f"task-{i+1}")
                role = task.get("role", "extractor")
                
                # Override model tier if specified
                tier = task.get("tier")
                
                agent = self.spawn_agent(role, f"{role}-{task_id}")
                
                # Override model if tier specified
                if tier:
                    if tier == "opus":
                        agent.model = ModelTier.OPUS.value
                    elif tier == "sonnet":
                        agent.model = ModelTier.SONNET.value
                    elif tier == "haiku":
                        agent.model = ModelTier.HAIKU.value
                
                future = executor.submit(
                    agent.execute,
                    task["prompt"],
                    task.get("context"),
                    task.get("files")
                )
                future_to_task[future] = {"task": task, "task_id": task_id, "agent": agent}
                
                model_short = agent.model.split("-")[1]  # Extract "opus", "sonnet", etc.
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
        
        # Estimate cost
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
    
    def save_results(self, name: str = "orchestrator_results") -> Path:
        """Save all results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON with full metadata
        json_path = RESULTS_DIR / f"{name}_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "session_id": self.session_id,
                "timestamp": datetime.now().isoformat(),
                "task_count": len(self.results),
                "results": self.results
            }, f, indent=2)
        
        # Text content only
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
        
        print(f"Results saved to:")
        print(f"  {json_path}")
        print(f"  {content_path}")
        
        return json_path

# =============================================================================
# SWARM PATTERNS (Pre-built agent combinations)
# =============================================================================

def skill_swarm(skill_name: str, task_prompt: str, context: str = None, files: List[str] = None) -> List[Dict]:
    """
    Automatically spawn the optimal agent combination for a skill.
    Uses SKILL_AGENT_MAP to determine agents.
    """
    if skill_name not in SKILL_AGENT_MAP:
        print(f"Warning: No mapping for skill '{skill_name}', using default agents")
        agents = ["researcher", "coder"]
        tier = ModelTier.SONNET
    else:
        mapping = SKILL_AGENT_MAP[skill_name]
        agents = mapping["agents"]
        tier = mapping["tier"]
    
    tasks = []
    for i, role in enumerate(agents):
        tasks.append({
            "id": f"{skill_name}-{role}",
            "role": role,
            "tier": tier.name.lower(),
            "prompt": task_prompt,
            "context": context,
            "files": files
        })
    
    orch = Orchestrator(max_parallel=len(agents))
    results = orch.run_parallel(tasks)
    orch.save_results(f"skill_swarm_{skill_name}")
    return results


def manufacturing_swarm(material: str, operation: str) -> List[Dict]:
    """5-expert manufacturing analysis using OPUS"""
    tasks = [
        {
            "id": "material-analysis",
            "role": "materials_scientist",
            "tier": "opus",
            "prompt": f"Provide complete material analysis for {material}: mechanical properties, thermal properties, machinability, and recommended machining approaches."
        },
        {
            "id": "cutting-params",
            "role": "machinist",
            "tier": "opus",
            "prompt": f"Recommend optimal cutting parameters for {operation} of {material}. Include: speeds, feeds, DOC, coolant, tool life."
        },
        {
            "id": "tool-selection",
            "role": "tool_engineer",
            "tier": "sonnet",
            "prompt": f"Recommend cutting tools for {operation} of {material}. Include tool material, coating, geometry, part numbers."
        },
        {
            "id": "force-calc",
            "role": "force_calculator",
            "tier": "sonnet",
            "prompt": f"Calculate expected cutting forces for {operation} of {material}. Show formulas and calculations."
        },
        {
            "id": "quality-plan",
            "role": "quality_engineer",
            "tier": "sonnet",
            "prompt": f"Define quality control plan for {operation} of {material}. Include critical dimensions, inspection methods."
        }
    ]
    
    orch = Orchestrator(max_parallel=5)
    results = orch.run_parallel(tasks)
    orch.save_results(f"manufacturing_{material.replace(' ', '_')}_{operation.replace(' ', '_')}")
    return results


def extraction_swarm(source_description: str, target_schema: str = None, files: List[str] = None) -> List[Dict]:
    """Extract → Validate → Audit pipeline"""
    tasks = [
        {
            "id": "extract",
            "role": "extractor",
            "tier": "sonnet",
            "prompt": f"Extract all structured data from source: {source_description}",
            "files": files
        },
        {
            "id": "validate",
            "role": "validator",
            "tier": "sonnet",
            "prompt": f"Validate the extracted data against schema: {target_schema or 'Infer appropriate schema'}",
            "files": files
        },
        {
            "id": "audit",
            "role": "completeness_auditor",
            "tier": "sonnet",
            "prompt": f"Audit completeness and assign grade (A/B/C/D/F)",
            "files": files
        }
    ]
    
    orch = Orchestrator(max_parallel=3)
    results = orch.run_parallel(tasks)
    orch.save_results("extraction_pipeline")
    return results


def code_quality_swarm(code: str, module_name: str) -> List[Dict]:
    """Full code quality analysis"""
    tasks = [
        {
            "id": "review",
            "role": "code_reviewer",
            "prompt": f"Review this code for PRISM compliance and 10 Commandments:\n\n{code}"
        },
        {
            "id": "tests",
            "role": "test_generator",
            "prompt": f"Generate comprehensive pytest tests:\n\n{code}"
        },
        {
            "id": "security",
            "role": "security_auditor",
            "prompt": f"Security audit:\n\n{code}"
        },
        {
            "id": "optimize",
            "role": "optimizer",
            "prompt": f"Performance optimization opportunities:\n\n{code}"
        },
        {
            "id": "docs",
            "role": "documentation_writer",
            "prompt": f"Generate documentation for {module_name}:\n\n{code}"
        }
    ]
    
    orch = Orchestrator(max_parallel=5)
    results = orch.run_parallel(tasks)
    orch.save_results(f"code_quality_{module_name}")
    return results


def architecture_swarm(requirements: str) -> List[Dict]:
    """Architecture design using OPUS"""
    tasks = [
        {
            "id": "architecture",
            "role": "architect",
            "tier": "opus",
            "prompt": f"Design system architecture for:\n{requirements}"
        },
        {
            "id": "schema",
            "role": "schema_designer",
            "tier": "opus",
            "prompt": f"Design data schemas for:\n{requirements}"
        },
        {
            "id": "api",
            "role": "api_designer",
            "tier": "sonnet",
            "prompt": f"Design API contracts for:\n{requirements}"
        },
        {
            "id": "decompose",
            "role": "task_decomposer",
            "tier": "opus",
            "prompt": f"Break into implementable tasks:\n{requirements}"
        }
    ]
    
    orch = Orchestrator(max_parallel=4)
    results = orch.run_parallel(tasks)
    orch.save_results("architecture_design")
    return results


def debug_swarm(error_description: str, code: str = None, files: List[str] = None) -> List[Dict]:
    """Debug investigation using OPUS"""
    tasks = [
        {
            "id": "debug",
            "role": "debugger",
            "tier": "opus",
            "prompt": f"Debug this issue:\n{error_description}",
            "context": code,
            "files": files
        },
        {
            "id": "root-cause",
            "role": "root_cause_analyst",
            "tier": "opus",
            "prompt": f"Find root cause of:\n{error_description}",
            "context": code,
            "files": files
        },
        {
            "id": "physics-check",
            "role": "physics_validator",
            "tier": "opus",
            "prompt": f"Check for physics violations:\n{error_description}",
            "context": code,
            "files": files
        }
    ]
    
    orch = Orchestrator(max_parallel=3)
    results = orch.run_parallel(tasks)
    orch.save_results("debug_investigation")
    return results


# =============================================================================
# CLI INTERFACE
# =============================================================================

def list_agents():
    """Print all available agents"""
    print("\n" + "="*70)
    print("PRISM UNIFIED SYSTEM v3.0 - 42 SPECIALIZED AGENTS")
    print("="*70)
    
    for category, agents in AGENT_CATEGORIES.items():
        print(f"\n{category.upper()} ({len(agents)} agents):")
        print("-" * 50)
        for role in agents:
            config = AGENT_ROLES[role]
            tier = config['tier'].name
            print(f"  {role:25} [{tier:6}] - {config['name']}")
    
    total = sum(len(agents) for agents in AGENT_CATEGORIES.values())
    print(f"\n{'='*70}")
    print(f"Total: {total} agents across {len(AGENT_CATEGORIES)} categories")
    print("="*70 + "\n")


def list_skills():
    """Print skill → agent mappings"""
    print("\n" + "="*70)
    print("SKILL → AGENT MAPPINGS")
    print("="*70)
    
    for skill, mapping in SKILL_AGENT_MAP.items():
        tier = mapping['tier'].name
        agents = ", ".join(mapping['agents'])
        print(f"\n{skill} [{tier}]")
        print(f"  Agents: {agents}")
        print(f"  Purpose: {mapping['description']}")
    
    print("="*70 + "\n")


def main():
    if len(sys.argv) < 2:
        list_agents()
        print("""
USAGE:
  python prism_unified_system_v3.py --list-agents      List all 42 agents
  python prism_unified_system_v3.py --list-skills      List skill→agent mappings
  python prism_unified_system_v3.py --test             Run test swarm
  python prism_unified_system_v3.py --manufacturing <material> <operation>
  python prism_unified_system_v3.py --ralph <role> "<prompt>" [max_iterations]
  python prism_unified_system_v3.py <task_file.json>

EXAMPLES:
  python prism_unified_system_v3.py --test
  python prism_unified_system_v3.py --manufacturing "Ti-6Al-4V" "pocket milling"
  python prism_unified_system_v3.py --ralph coder "Implement a cutting force calculator" 5
  python prism_unified_system_v3.py my_tasks.json
""")
        return
    
    cmd = sys.argv[1]
    
    if cmd == "--list-agents":
        list_agents()
    
    elif cmd == "--list-skills":
        list_skills()
    
    elif cmd == "--test":
        print("Running 5-agent manufacturing swarm with OPUS...")
        manufacturing_swarm("Inconel 718", "roughing")
    
    elif cmd == "--manufacturing" and len(sys.argv) >= 4:
        material = sys.argv[2]
        operation = sys.argv[3]
        manufacturing_swarm(material, operation)
    
    elif cmd == "--ralph" and len(sys.argv) >= 4:
        role = sys.argv[2]
        prompt = sys.argv[3]
        max_iter = int(sys.argv[4]) if len(sys.argv) > 4 else 10
        
        ralph = RalphLoop(
            role=role,
            prompt=prompt,
            completion_promise="COMPLETE",
            max_iterations=max_iter
        )
        result = ralph.run()
        
        # Save result
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(RESULTS_DIR / f"ralph_{role}_{timestamp}.json", 'w') as f:
            json.dump(result, f, indent=2)
    
    else:
        # Load task file
        task_file = sys.argv[1]
        if not os.path.isabs(task_file):
            task_file = TASKS_DIR / task_file
        
        with open(task_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        orch = Orchestrator(max_parallel=config.get("max_parallel", 5))
        results = orch.run_parallel(config["tasks"])
        orch.save_results(config.get("name", "orchestrator"))


if __name__ == "__main__":
    main()
