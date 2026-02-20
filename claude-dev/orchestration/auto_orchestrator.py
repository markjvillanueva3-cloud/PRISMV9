"""
PRISM Auto-Orchestrator
Automatically routes tasks to optimal tools, agents, and swarms.
Intent Classification → Tool Selection → Agent Routing → Execution

Author: PRISM Claude Development Enhancement
Version: 1.0.0
"""

import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class TaskType(Enum):
    """Classification of task types"""
    CALCULATION = "calculation"      # Physics, math, formulas
    DATA_QUERY = "data_query"        # Search materials, machines, alarms
    CODE_GENERATION = "code"         # Write/modify code
    ANALYSIS = "analysis"            # Analyze data, patterns
    ORCHESTRATION = "orchestration"  # Multi-step, swarm tasks
    SESSION = "session"              # Session management
    VALIDATION = "validation"        # Review, verify
    DOCUMENTATION = "documentation"  # Write docs, skills
    DEV_TOOLS = "dev_tools"          # Background tasks, checkpoints, impact, search


class ExecutionMode(Enum):
    """How to execute the task"""
    SINGLE_TOOL = "single_tool"      # One MCP tool call
    TOOL_CHAIN = "tool_chain"        # Sequential tools
    AGENT_SINGLE = "agent_single"    # One agent
    SWARM_PARALLEL = "swarm_parallel"  # Parallel agents
    SWARM_PIPELINE = "swarm_pipeline"  # Sequential agents
    SWARM_CONSENSUS = "swarm_consensus"  # Voting agents


@dataclass
class TaskClassification:
    """Result of task classification"""
    task_type: TaskType
    confidence: float
    keywords_matched: List[str]
    execution_mode: ExecutionMode
    complexity: str  # SIMPLE, MODERATE, COMPLEX


@dataclass
class ExecutionPlan:
    """Plan for executing a task"""
    task_id: str
    task_type: TaskType
    execution_mode: ExecutionMode
    tools: List[str]
    agents: List[str]
    swarm_pattern: Optional[str]
    estimated_calls: int
    estimated_time_ms: int
    hooks_to_fire: List[str]


class IntentClassifier:
    """Classifies user intent and task type"""
    
    # Keyword patterns for each task type
    PATTERNS = {
        TaskType.CALCULATION: {
            "keywords": [
                "calculate", "compute", "formula", "equation", "kienzle", "taylor",
                "cutting force", "tool life", "mrr", "surface finish", "power",
                "speed", "feed", "deflection", "thermal", "stability", "torque"
            ],
            "regex": [
                r"calc(ulate)?",
                r"what is the (force|power|speed|feed)",
                r"how (much|many|fast)",
                r"\d+\s*(mm|m/min|rpm|kw|n)"
            ]
        },
        TaskType.DATA_QUERY: {
            "keywords": [
                "find", "search", "get", "list", "show", "lookup", "query",
                "material", "machine", "alarm", "tool", "agent", "skill", "hook"
            ],
            "regex": [
                r"find\s+(all|the|a)",
                r"search\s+for",
                r"show\s+me",
                r"what\s+(materials?|machines?|alarms?)"
            ]
        },
        TaskType.CODE_GENERATION: {
            "keywords": [
                "write", "create", "generate", "code", "script", "function",
                "implement", "python", "javascript", "typescript", "class", "module"
            ],
            "regex": [
                r"write\s+(a|the|some)\s+(code|script|function)",
                r"create\s+(a|the)\s+(class|module)",
                r"implement\s+"
            ]
        },
        TaskType.ANALYSIS: {
            "keywords": [
                "analyze", "analysis", "compare", "evaluate", "assess", "review",
                "pattern", "trend", "insight", "summary", "report"
            ],
            "regex": [
                r"analy[sz]e",
                r"compare\s+",
                r"what\s+are\s+the\s+(patterns?|trends?)"
            ]
        },
        TaskType.ORCHESTRATION: {
            "keywords": [
                "swarm", "parallel", "pipeline", "consensus", "ensemble",
                "multi-agent", "coordinate", "batch", "bulk", "all", "comprehensive"
            ],
            "regex": [
                r"(run|execute|deploy)\s+(swarm|agents?)",
                r"parallel\s+",
                r"(comprehensive|complete|full)\s+(analysis|review)"
            ]
        },
        TaskType.SESSION: {
            "keywords": [
                "session", "start", "end", "save", "load",
                "state", "resume", "handoff", "todo", "gsd"
            ],
            "regex": [
                r"(start|end|save)\s+session",
                r"load\s+state"
            ]
        },
        TaskType.VALIDATION: {
            "keywords": [
                "validate", "verify", "check", "review", "test", "ensure",
                "safety", "quality", "compliance", "gates"
            ],
            "regex": [
                r"(validate|verify|check)\s+",
                r"is\s+(this|it)\s+(safe|correct|valid)"
            ]
        },
        TaskType.DOCUMENTATION: {
            "keywords": [
                "document", "documentation", "skill", "write up", "explain",
                "readme", "guide", "tutorial", "manual"
            ],
            "regex": [
                r"(write|create)\s+(documentation|docs|readme)",
                r"(explain|document)\s+(how|what)"
            ]
        },
        TaskType.DEV_TOOLS: {
            "keywords": [
                "checkpoint", "rollback", "restore", "snapshot", "backup",
                "background", "task", "spawn", "run tests", "build",
                "impact", "dependency", "importers", "breaking",
                "semantic", "search code", "find code", "similar code",
                "watch", "file changes", "context sync", "stale",
                "dev_task", "dev_checkpoint", "dev_code", "dev_semantic", "dev_context"
            ],
            "regex": [
                r"(create|make|take)\s+(a\s+)?(checkpoint|snapshot)",
                r"(run|start|execute)\s+(tests?|build|lint)(\s+in)?\s*(the\s+)?background",
                r"(analyze|check|assess)\s+(the\s+)?impact",
                r"(find|search|look\s+for)\s+(similar|related)\s+code",
                r"(watch|monitor)\s+(for\s+)?(files?|changes?)",
                r"(restore|rollback|revert)\s+(to|from)",
                r"checkpoint\s+before",
                r"before\s+(editing|changing|modifying)",
                r"impact\s+of\s+(changing|editing|modifying)",
                r"code\s+search",
                r"semantic\s+search"
            ]
        }
    }
    
    def classify(self, task_description: str) -> TaskClassification:
        """Classify a task based on its description"""
        task_lower = task_description.lower()
        scores = {}
        matched_keywords = {}
        
        for task_type, patterns in self.PATTERNS.items():
            score = 0
            matches = []
            
            # Check keywords
            for keyword in patterns["keywords"]:
                if keyword in task_lower:
                    score += 1
                    matches.append(keyword)
            
            # Check regex patterns
            for pattern in patterns["regex"]:
                if re.search(pattern, task_lower, re.IGNORECASE):
                    score += 2
                    matches.append(f"regex:{pattern[:20]}")
            
            scores[task_type] = score
            matched_keywords[task_type] = matches
        
        # Get best match
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]
        total_possible = len(self.PATTERNS[best_type]["keywords"]) + len(self.PATTERNS[best_type]["regex"]) * 2
        confidence = min(best_score / max(total_possible * 0.3, 1), 1.0)
        
        # Determine complexity
        word_count = len(task_description.split())
        if word_count < 10:
            complexity = "SIMPLE"
        elif word_count < 30:
            complexity = "MODERATE"
        else:
            complexity = "COMPLEX"
        
        # Determine execution mode
        execution_mode = self._determine_execution_mode(best_type, complexity, task_lower)
        
        return TaskClassification(
            task_type=best_type,
            confidence=confidence,
            keywords_matched=matched_keywords[best_type],
            execution_mode=execution_mode,
            complexity=complexity
        )
    
    def _determine_execution_mode(self, task_type: TaskType, complexity: str, task: str) -> ExecutionMode:
        """Determine the best execution mode"""
        # Orchestration tasks use swarms
        if task_type == TaskType.ORCHESTRATION:
            if "consensus" in task:
                return ExecutionMode.SWARM_CONSENSUS
            elif "pipeline" in task or "sequential" in task:
                return ExecutionMode.SWARM_PIPELINE
            return ExecutionMode.SWARM_PARALLEL
        
        # Simple tasks use single tool
        if complexity == "SIMPLE":
            return ExecutionMode.SINGLE_TOOL
        
        # Complex analysis might need agents
        if task_type == TaskType.ANALYSIS and complexity == "COMPLEX":
            return ExecutionMode.AGENT_SINGLE
        
        # Code generation for complex tasks
        if task_type == TaskType.CODE_GENERATION and complexity == "COMPLEX":
            return ExecutionMode.AGENT_SINGLE
        
        # Validation might chain tools
        if task_type == TaskType.VALIDATION:
            return ExecutionMode.TOOL_CHAIN
        
        return ExecutionMode.SINGLE_TOOL


class ToolSelector:
    """Selects optimal tools for a task type"""
    
    TOOL_REGISTRY = {
        TaskType.CALCULATION: {
            "primary": [
                "prism:calc_cutting_force",
                "prism:calc_tool_life",
                "prism:calc_mrr",
                "prism:calc_surface_finish",
                "prism:calc_power",
                "prism:calc_stability",
                "prism:calc_deflection",
                "prism:calc_thermal"
            ],
            "supporting": [
                "prism:material_get",
                "prism:formula_calculate"
            ]
        },
        TaskType.DATA_QUERY: {
            "primary": [
                "prism:material_search",
                "prism:material_get",
                "prism:machine_search",
                "prism:machine_get",
                "prism:alarm_search",
                "prism:alarm_decode",
                "prism:tool_search",
                "prism:agent_list",
                "prism:skill_list",
                "prism:hook_list"
            ],
            "supporting": []
        },
        TaskType.CODE_GENERATION: {
            "primary": [
                "Desktop Commander:write_file",
                "Desktop Commander:edit_block"
            ],
            "supporting": [
                "Desktop Commander:read_file",
                "prism:prism_skill_load"
            ]
        },
        TaskType.ANALYSIS: {
            "primary": [
                "prism:material_compare",
                "prism:prism_cognitive_check",
                "prism:prism_knowledge_query"
            ],
            "supporting": [
                "prism:material_search",
                "prism:alarm_search"
            ]
        },
        TaskType.ORCHESTRATION: {
            "primary": [
                "prism:prism_autopilot_v2",
                "prism:swarm_execute",
                "prism:swarm_parallel",
                "prism:swarm_consensus",
                "prism:swarm_pipeline"
            ],
            "supporting": [
                "prism:agent_list",
                "prism:plan_create"
            ]
        },
        TaskType.SESSION: {
            "primary": [
                "prism:prism_gsd_core",
                "prism:prism_state_load",
                "prism:prism_state_save",
                "prism:prism_todo_update",
                "prism:prism_todo_read",
                "prism:prism_session_start_full",
                "prism:prism_session_end_full"
            ],
            "supporting": [
                "prism:prism_state_checkpoint"
            ]
        },
        TaskType.VALIDATION: {
            "primary": [
                "prism:prism_sp_review_spec",
                "prism:prism_sp_review_quality",
                "prism:prism_validate_gates_full",
                "prism:validate_material",
                "prism:validate_safety"
            ],
            "supporting": [
                "prism:prism_cognitive_check"
            ]
        },
        TaskType.DOCUMENTATION: {
            "primary": [
                "Desktop Commander:write_file",
                "prism:prism_skill_load"
            ],
            "supporting": [
                "prism:prism_skill_search",
                "Desktop Commander:read_file"
            ]
        },
        TaskType.DEV_TOOLS: {
            "primary": [
                "dev_task_spawn",
                "dev_task_status",
                "dev_task_stream",
                "dev_task_kill",
                "dev_task_list",
                "dev_checkpoint_create",
                "dev_checkpoint_list",
                "dev_checkpoint_diff",
                "dev_checkpoint_restore",
                "dev_checkpoint_delete",
                "dev_code_impact",
                "dev_impact_test_map",
                "dev_impact_dependency_graph",
                "dev_semantic_index_build",
                "dev_semantic_search",
                "dev_semantic_similar",
                "dev_context_watch_start",
                "dev_context_watch_stop",
                "dev_context_changes",
                "dev_context_snapshot"
            ],
            "supporting": [
                "Desktop Commander:read_file",
                "Desktop Commander:list_directory"
            ]
        }
    }
    
    def select_tools(self, task_type: TaskType, task_description: str = "") -> Dict:
        """Select tools for a task type"""
        if task_type not in self.TOOL_REGISTRY:
            return {"primary": [], "supporting": [], "recommended": None}
        
        tools = self.TOOL_REGISTRY[task_type]
        
        # Try to pick the most specific tool based on keywords
        recommended = self._pick_best_tool(tools["primary"], task_description)
        
        return {
            "primary": tools["primary"],
            "supporting": tools["supporting"],
            "recommended": recommended
        }
    
    def _pick_best_tool(self, tools: List[str], task: str) -> Optional[str]:
        """Pick the best specific tool for a task"""
        task_lower = task.lower()
        
        # Keyword to tool mapping
        keyword_tools = {
            "force": "calc_cutting_force",
            "tool life": "calc_tool_life",
            "mrr": "calc_mrr",
            "surface": "calc_surface_finish",
            "power": "calc_power",
            "stability": "calc_stability",
            "chatter": "calc_stability",
            "deflection": "calc_deflection",
            "thermal": "calc_thermal",
            "material": "material_",
            "machine": "machine_",
            "alarm": "alarm_",
            "agent": "agent_",
            "skill": "skill_",
            "hook": "hook_",
            "swarm": "swarm_",
            "autopilot": "autopilot",
            "gsd": "gsd_core",
            "todo": "todo_",
            "state": "state_",
            "validate": "validate_",
            "review": "review_",
            # Dev tools keywords
            "checkpoint": "dev_checkpoint_create",
            "snapshot": "dev_checkpoint_create",
            "rollback": "dev_checkpoint_restore",
            "restore": "dev_checkpoint_restore",
            "background": "dev_task_spawn",
            "spawn": "dev_task_spawn",
            "run tests": "dev_task_spawn",
            "build": "dev_task_spawn",
            "impact": "dev_code_impact",
            "dependency": "dev_impact_dependency_graph",
            "importers": "dev_code_impact",
            "semantic": "dev_semantic_search",
            "search code": "dev_semantic_search",
            "similar code": "dev_semantic_similar",
            "watch": "dev_context_watch_start",
            "file changes": "dev_context_changes",
            "context": "dev_context_changes"
        }
        
        for keyword, tool_fragment in keyword_tools.items():
            if keyword in task_lower:
                for tool in tools:
                    if tool_fragment in tool:
                        return tool
        
        return tools[0] if tools else None


class AgentRouter:
    """Routes tasks to optimal agents"""
    
    AGENT_CAPABILITIES = {
        "AGT-OPUS-ARCHITECT": ["architecture", "design", "complex_reasoning", "safety"],
        "AGT-OPUS-SAFETY": ["safety", "validation", "critical_review"],
        "AGT-SONNET-CODE": ["code_generation", "scripting", "debugging"],
        "AGT-SONNET-MATERIALS": ["materials", "machining", "physics"],
        "AGT-SONNET-ANALYSIS": ["analysis", "patterns", "data"],
        "AGT-HAIKU-FORMAT": ["formatting", "documentation", "cleanup"]
    }
    
    TASK_TO_AGENT = {
        TaskType.CALCULATION: ["AGT-SONNET-MATERIALS"],
        TaskType.DATA_QUERY: ["AGT-SONNET-ANALYSIS"],
        TaskType.CODE_GENERATION: ["AGT-SONNET-CODE"],
        TaskType.ANALYSIS: ["AGT-SONNET-ANALYSIS", "AGT-OPUS-ARCHITECT"],
        TaskType.ORCHESTRATION: ["AGT-OPUS-ARCHITECT"],
        TaskType.VALIDATION: ["AGT-OPUS-SAFETY"],
        TaskType.DOCUMENTATION: ["AGT-HAIKU-FORMAT", "AGT-SONNET-CODE"],
        TaskType.DEV_TOOLS: ["AGT-SONNET-CODE", "AGT-OPUS-ARCHITECT"]
    }
    
    def route(self, task_type: TaskType, complexity: str = "MODERATE") -> List[str]:
        """Route task to appropriate agents"""
        agents = self.TASK_TO_AGENT.get(task_type, ["AGT-SONNET-CODE"])
        
        # For complex tasks, add OPUS oversight
        if complexity == "COMPLEX" and "AGT-OPUS" not in str(agents):
            agents = ["AGT-OPUS-ARCHITECT"] + agents
        
        return agents


class AutoOrchestrator:
    """Main orchestrator that combines all components"""
    
    def __init__(self):
        self.classifier = IntentClassifier()
        self.tool_selector = ToolSelector()
        self.agent_router = AgentRouter()
        self.execution_history: List[Dict] = []
    
    def plan(self, task_description: str) -> ExecutionPlan:
        """Create an execution plan for a task"""
        # Classify the task
        classification = self.classifier.classify(task_description)
        
        # Select tools
        tools = self.tool_selector.select_tools(classification.task_type, task_description)
        
        # Route to agents
        agents = self.agent_router.route(classification.task_type, classification.complexity)
        
        # Determine swarm pattern if needed
        swarm_pattern = None
        if classification.execution_mode in [ExecutionMode.SWARM_PARALLEL, 
                                              ExecutionMode.SWARM_PIPELINE,
                                              ExecutionMode.SWARM_CONSENSUS]:
            swarm_pattern = classification.execution_mode.value.replace("swarm_", "")
        
        # Estimate calls and time
        if classification.execution_mode == ExecutionMode.SINGLE_TOOL:
            estimated_calls = 1
            estimated_time = 500
        elif classification.execution_mode == ExecutionMode.TOOL_CHAIN:
            estimated_calls = 3
            estimated_time = 1500
        elif classification.execution_mode == ExecutionMode.AGENT_SINGLE:
            estimated_calls = 1
            estimated_time = 5000
        else:  # Swarm modes
            estimated_calls = len(agents) + 2
            estimated_time = 10000
        
        # Determine hooks to fire
        hooks = self._get_hooks_for_task(classification.task_type)
        
        plan = ExecutionPlan(
            task_id=f"TASK-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            task_type=classification.task_type,
            execution_mode=classification.execution_mode,
            tools=tools["primary"][:3],  # Top 3 tools
            agents=agents,
            swarm_pattern=swarm_pattern,
            estimated_calls=estimated_calls,
            estimated_time_ms=estimated_time,
            hooks_to_fire=hooks
        )
        
        return plan
    
    def _get_hooks_for_task(self, task_type: TaskType) -> List[str]:
        """Get hooks that should fire for a task type"""
        hooks = ["BAYES-001"]  # Always initialize priors
        
        if task_type == TaskType.CALCULATION:
            hooks.extend(["CALC-SAFETY-001", "OPT-001"])
        elif task_type == TaskType.VALIDATION:
            hooks.extend(["VALIDATION-001", "RL-002"])
        elif task_type == TaskType.ORCHESTRATION:
            hooks.extend(["BATCH-001", "AGENT-001"])
        elif task_type in [TaskType.CODE_GENERATION, TaskType.ANALYSIS]:
            hooks.extend(["BAYES-003", "RL-002"])
        elif task_type == TaskType.DEV_TOOLS:
            hooks.extend(["DEV-001", "DEV-002", "DEV-003"])  # Auto-checkpoint, impact, context
        
        return hooks
    
    def execute(self, task_description: str) -> Dict:
        """Create plan and provide execution guidance"""
        plan = self.plan(task_description)
        
        result = {
            "task_id": plan.task_id,
            "classification": {
                "type": plan.task_type.value,
                "mode": plan.execution_mode.value
            },
            "plan": {
                "tools": plan.tools,
                "agents": plan.agents,
                "swarm_pattern": plan.swarm_pattern,
                "estimated_calls": plan.estimated_calls,
                "estimated_time_ms": plan.estimated_time_ms
            },
            "hooks": plan.hooks_to_fire,
            "recommended_action": self._get_recommendation(plan)
        }
        
        self.execution_history.append(result)
        return result
    
    def _get_recommendation(self, plan: ExecutionPlan) -> str:
        """Get human-readable recommendation"""
        if plan.execution_mode == ExecutionMode.SINGLE_TOOL:
            return f"Call {plan.tools[0]} directly"
        elif plan.execution_mode == ExecutionMode.TOOL_CHAIN:
            return f"Chain tools: {' → '.join(plan.tools[:3])}"
        elif plan.execution_mode == ExecutionMode.AGENT_SINGLE:
            return f"Invoke agent: {plan.agents[0]}"
        elif plan.swarm_pattern:
            return f"Deploy {plan.swarm_pattern} swarm with agents: {', '.join(plan.agents)}"
        return "Manual execution required"
    
    def get_status(self) -> Dict:
        """Get orchestrator status"""
        return {
            "executions_total": len(self.execution_history),
            "recent_tasks": [h["classification"]["type"] for h in self.execution_history[-5:]],
            "tool_registry_size": sum(
                len(v["primary"]) for v in self.tool_selector.TOOL_REGISTRY.values()
            ),
            "agent_count": len(self.agent_router.AGENT_CAPABILITIES)
        }


# Singleton
_orchestrator: Optional[AutoOrchestrator] = None

def get_orchestrator() -> AutoOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = AutoOrchestrator()
    return _orchestrator

def orchestrate(task: str) -> Dict:
    """Quick function to orchestrate a task"""
    return get_orchestrator().execute(task)


if __name__ == "__main__":
    orch = AutoOrchestrator()
    
    # Test various task types
    test_tasks = [
        "Calculate the cutting force for Ti-6Al-4V with 10mm depth",
        "Find all aluminum materials with hardness above 100 HB",
        "Write a Python script to process material data",
        "Analyze the patterns in alarm codes for FANUC controllers",
        "Deploy a parallel swarm to extract all material properties",
        "Start a new session and load GSD instructions",
        "Validate the safety score for this operation",
        "Create a checkpoint before refactoring",
        "Run tests in background while I continue working",
        "Analyze the impact of changing src/tools/myfile.ts",
        "Search for code related to cutting force calculation",
        "Watch for file changes in the src directory"
    ]
    
    for task in test_tasks:
        result = orch.execute(task)
        print(f"\nTask: {task[:50]}...")
        print(f"  Type: {result['classification']['type']}")
        print(f"  Mode: {result['classification']['mode']}")
        print(f"  Recommended: {result['recommended_action']}")
