# PRISM Orchestrator Auto-Trigger System
# Detects when multi-agent orchestration would be beneficial
# Integrates with session workflow

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

class TaskCategory(Enum):
    MATERIAL_ADD = "material_add"
    MATERIAL_ENHANCE = "material_enhance"
    ALARM_ADD = "alarm_add"
    MACHINE_ADD = "machine_add"
    TOOL_ADD = "tool_add"
    CODE_GENERATE = "code_generate"
    DATA_VALIDATE = "data_validate"
    RESEARCH_REQUIRED = "research_required"
    SIMPLE_TASK = "simple_task"  # No orchestration needed

@dataclass
class OrchestratorDecision:
    should_use: bool
    category: TaskCategory
    confidence: float
    reason: str
    agents_needed: List[str]
    estimated_benefit: str

# Trigger patterns for orchestrator usage
ORCHESTRATOR_TRIGGERS = {
    TaskCategory.MATERIAL_ADD: {
        "patterns": [
            r"add\s+(?:new\s+)?material",
            r"create\s+(?:new\s+)?material",
            r"add\s+(?:inconel|titanium|steel|aluminum|copper|brass|bronze|nickel|cobalt)",
            r"add\s+\w+\s+(?:alloy|steel|iron|metal)",
            r"127[- ]?param",
            r"full\s+(?:material\s+)?coverage",
            r"kienzle|johnson[- ]?cook|taylor\s+(?:coef|param)",
        ],
        "keywords": ["material", "alloy", "metal", "kc1.1", "mc", "machinability"],
        "agents": ["research", "physics", "code", "safety"],
        "benefit": "Ensures complete 127-parameter coverage with physics validation"
    },
    TaskCategory.MATERIAL_ENHANCE: {
        "patterns": [
            r"enhance\s+(?:existing\s+)?material",
            r"add\s+(?:missing\s+)?param",
            r"complete\s+(?:the\s+)?material",
            r"fill\s+(?:in\s+)?gaps",
        ],
        "keywords": ["enhance", "complete", "missing", "gaps", "parameters"],
        "agents": ["research", "physics", "safety"],
        "benefit": "Validates enhanced parameters against physics models"
    },
    TaskCategory.ALARM_ADD: {
        "patterns": [
            r"add\s+(?:new\s+)?alarm",
            r"create\s+alarm\s+(?:entry|code)",
            r"extract\s+(?:fanuc|haas|siemens|mazak|okuma)\s+alarm",
            r"alarm\s+(?:database|db)\s+(?:entry|add)",
        ],
        "keywords": ["alarm", "error code", "fault", "diagnostic"],
        "agents": ["research", "code", "safety"],
        "benefit": "Cross-references alarm data and validates severity"
    },
    TaskCategory.MACHINE_ADD: {
        "patterns": [
            r"add\s+(?:new\s+)?machine",
            r"create\s+machine\s+(?:entry|profile)",
            r"add\s+(?:dmg|mazak|haas|okuma|fanuc|hermle)",
        ],
        "keywords": ["machine", "cnc", "spindle", "axis", "envelope"],
        "agents": ["research", "physics", "code", "safety"],
        "benefit": "Validates machine specs and kinematic constraints"
    },
    TaskCategory.TOOL_ADD: {
        "patterns": [
            r"add\s+(?:new\s+)?(?:cutting\s+)?tool",
            r"create\s+tool\s+(?:entry|profile)",
            r"add\s+(?:end\s*mill|drill|tap|insert|holder)",
        ],
        "keywords": ["tool", "cutter", "insert", "holder", "geometry"],
        "agents": ["research", "physics", "code", "safety"],
        "benefit": "Validates tool geometry and cutting parameters"
    },
    TaskCategory.CODE_GENERATE: {
        "patterns": [
            r"generate\s+(?:typescript|code|interface)",
            r"create\s+(?:type|interface|schema)",
            r"implement\s+(?:the\s+)?(?:engine|module|system)",
        ],
        "keywords": ["typescript", "interface", "schema", "generate", "implement"],
        "agents": ["code", "safety"],
        "benefit": "Ensures code quality and safety compliance"
    },
    TaskCategory.DATA_VALIDATE: {
        "patterns": [
            r"validate\s+(?:the\s+)?(?:data|parameters|values)",
            r"check\s+(?:physics|consistency|plausibility)",
            r"verify\s+(?:the\s+)?(?:material|machine|tool)",
        ],
        "keywords": ["validate", "verify", "check", "physics", "plausibility"],
        "agents": ["physics", "safety"],
        "benefit": "Multi-agent validation catches more errors"
    },
    TaskCategory.RESEARCH_REQUIRED: {
        "patterns": [
            r"find\s+(?:data|info|parameters)\s+(?:for|about)",
            r"research\s+(?:the\s+)?(?:material|machine|process)",
            r"what\s+(?:are|is)\s+the\s+(?:kienzle|johnson|taylor)",
            r"look\s+up\s+(?:the\s+)?(?:specs|parameters|data)",
        ],
        "keywords": ["research", "find", "look up", "what is", "data for"],
        "agents": ["research", "physics"],
        "benefit": "Structured research with automatic validation"
    },
}

# Tasks that DON'T need orchestration
SIMPLE_TASK_PATTERNS = [
    r"^(?:hi|hello|hey)",
    r"^(?:what|how|why|when|where)\s+(?:is|are|do|does|did|was|were)",
    r"^(?:list|show|display)\s+",
    r"^(?:read|view|open)\s+(?:the\s+)?(?:file|state|log)",
    r"^(?:update|edit)\s+(?:the\s+)?(?:state|config|setting)",
    r"^(?:continue|resume|next)",
    r"^(?:explain|describe|tell\s+me)",
    r"checkpoint|save\s+state|update\s+state",
]


def should_use_orchestrator(task: str) -> OrchestratorDecision:
    """
    Analyze a task description and determine if the orchestrator should be used.
    
    Returns OrchestratorDecision with recommendation and reasoning.
    """
    task_lower = task.lower().strip()
    
    # Check for simple tasks first (no orchestration needed)
    for pattern in SIMPLE_TASK_PATTERNS:
        if re.search(pattern, task_lower, re.IGNORECASE):
            return OrchestratorDecision(
                should_use=False,
                category=TaskCategory.SIMPLE_TASK,
                confidence=0.9,
                reason="Simple task - direct response is sufficient",
                agents_needed=[],
                estimated_benefit="N/A"
            )
    
    # Check each orchestration trigger category
    best_match: Optional[Tuple[TaskCategory, float, Dict]] = None
    
    for category, config in ORCHESTRATOR_TRIGGERS.items():
        score = 0.0
        
        # Check regex patterns (high weight)
        for pattern in config["patterns"]:
            if re.search(pattern, task_lower, re.IGNORECASE):
                score += 0.4
                break
        
        # Check keywords (medium weight)
        keyword_matches = sum(1 for kw in config["keywords"] if kw in task_lower)
        score += min(keyword_matches * 0.15, 0.45)
        
        # Bonus for safety-critical indicators
        if any(term in task_lower for term in ["127", "full", "complete", "safety", "validate"]):
            score += 0.15
        
        if score > 0.3 and (best_match is None or score > best_match[1]):
            best_match = (category, score, config)
    
    if best_match and best_match[1] >= 0.4:
        category, confidence, config = best_match
        return OrchestratorDecision(
            should_use=True,
            category=category,
            confidence=min(confidence, 1.0),
            reason=f"Task matches {category.value} pattern - orchestration recommended",
            agents_needed=config["agents"],
            estimated_benefit=config["benefit"]
        )
    
    # Default: no orchestration
    return OrchestratorDecision(
        should_use=False,
        category=TaskCategory.SIMPLE_TASK,
        confidence=0.7,
        reason="No orchestration triggers detected",
        agents_needed=[],
        estimated_benefit="N/A"
    )


def format_orchestrator_prompt(task: str, decision: OrchestratorDecision) -> str:
    """
    Format a prompt suggesting orchestrator usage.
    """
    if not decision.should_use:
        return ""
    
    return f"""
╔══════════════════════════════════════════════════════════════════╗
║  🤖 ORCHESTRATOR RECOMMENDED                                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Task Category: {decision.category.value:<45} ║
║  Confidence: {decision.confidence:.0%:<48} ║
║  Agents: {', '.join(decision.agents_needed):<51} ║
╠══════════════════════════════════════════════════════════════════╣
║  Benefit: {decision.estimated_benefit:<50} ║
╚══════════════════════════════════════════════════════════════════╝

To use the orchestrator:
1. Open the PRISM Multi-Agent Orchestrator artifact
2. Enter task: "{task}"
3. Click Execute

Or continue here for manual processing.
"""


# CLI interface for testing
if __name__ == "__main__":
    import sys
    
    test_tasks = [
        "Add Inconel 718 with full 127-parameter coverage",
        "Create a new material entry for Ti-6Al-4V titanium alloy",
        "Extract FANUC alarms 1000-1050",
        "Add DMG MORI DMU 50 machine profile",
        "What is the capital of France?",
        "Continue from where we left off",
        "Validate the material parameters for 4140 steel",
        "Generate TypeScript interfaces for the alarm schema",
        "List all materials in the database",
        "Add 10mm carbide end mill with full specifications",
        "Research Johnson-Cook parameters for Waspaloy",
    ]
    
    print("=" * 70)
    print("PRISM ORCHESTRATOR AUTO-TRIGGER TEST")
    print("=" * 70)
    
    for task in test_tasks:
        decision = should_use_orchestrator(task)
        status = "✅ USE ORCHESTRATOR" if decision.should_use else "⏭️  SKIP"
        print(f"\nTask: {task}")
        print(f"  {status} ({decision.confidence:.0%} confidence)")
        if decision.should_use:
            print(f"  Category: {decision.category.value}")
            print(f"  Agents: {', '.join(decision.agents_needed)}")
            print(f"  Benefit: {decision.estimated_benefit}")
