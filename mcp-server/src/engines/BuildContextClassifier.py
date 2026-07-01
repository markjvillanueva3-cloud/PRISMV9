"""
BuildContextClassifier
Classifies the current task/build type to enable automatic skill/script/hook invocation.
"""

from typing import Dict, List, Literal

TaskType = Literal[
    "engine_creation",
    "refactor",
    "debug",
    "performance_optimization",
    "heavy_reasoning",
    "architecture_design",
    "knowledge_synthesis",
    "build_verification",
    "general"
]

def classify_task(prompt: str, context: Dict) -> TaskType:
    prompt_lower = prompt.lower()
    
    if any(kw in prompt_lower for kw in ["create engine", "new engine", "build engine"]):
        return "engine_creation"
    if any(kw in prompt_lower for kw in ["refactor", "large change", "restructure"]):
        return "refactor"
    if any(kw in prompt_lower for kw in ["debug", "fix bug", "error", "broken"]):
        return "debug"
    if any(kw in prompt_lower for kw in ["optimize", "performance", "speed up", "faster"]):
        return "performance_optimization"
    if any(kw in prompt_lower for kw in ["architecture", "design system", "new pipeline"]):
        return "architecture_design"
    if any(kw in prompt_lower for kw in ["synthesize", "summarize knowledge", "weekly brief"]):
        return "knowledge_synthesis"
    if any(kw in prompt_lower for kw in ["verify build", "check build", "validate"]):
        return "build_verification"
    if any(kw in prompt_lower for kw in ["complex reasoning", "deep analysis", "multi-step"]):
        return "heavy_reasoning"
    
    return "general"

def get_auto_invocations(task_type: TaskType) -> Dict:
    """Returns skills, scripts, and hooks to auto-invoke for this task type."""
    
    base = {
        "skills": [],
        "scripts": [],
        "hooks": ["duplication-guard"]
    }
    
    if task_type == "engine_creation":
        base["skills"].extend(["build-verify", "codebase-memory-tracing"])
        base["scripts"].append("inventory-refresh")
        base["hooks"].append("logical-build-hook")
    
    elif task_type == "refactor":
        base["skills"].extend(["codebase-memory-tracing", "adaptive-optimize"])
    
    elif task_type == "performance_optimization":
        base["skills"].append("adaptive-optimize")
    
    elif task_type == "build_verification":
        base["skills"].append("build-verify")
        base["scripts"].append("inventory-refresh")
    
    elif task_type == "heavy_reasoning":
        # Prefer local models first
        base["skills"].append("context-budget")
    
    return base
