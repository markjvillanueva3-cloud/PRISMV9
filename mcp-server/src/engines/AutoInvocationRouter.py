"""
AutoInvocationRouter (Enhanced)
Now returns concrete, actionable recommendations for skills, scripts, and model routing.
"""

from typing import Dict, List
from .BuildContextClassifier import classify_task, TaskComplexity
from .ModelRouterEngine import route_task

def get_invocations_for_task(prompt: str, context: Dict = None) -> Dict:
    if context is None:
        context = {}
    
    task_type = classify_task(prompt, context)
    routing = route_task(prompt, context)
    
    # Base recommendations from central config logic
    recommendations = {
        "task_type": task_type,
        "model_recommendation": routing,
        "skills_to_load": [],
        "scripts_to_run": [],
        "hooks_to_activate": ["duplication-guard"],
        "force_claude": False
    }
    
    # Task-specific recommendations
    if task_type == "engine_creation":
        recommendations["skills_to_load"] = ["build-verify", "codebase-memory-tracing"]
        recommendations["scripts_to_run"] = ["inventory-refresh"]
        recommendations["hooks_to_activate"].append("logical-build-hook")
    
    elif task_type == "refactor":
        recommendations["skills_to_load"] = ["codebase-memory-tracing", "adaptive-optimize"]
    
    elif task_type == "performance_optimization":
        recommendations["skills_to_load"] = ["adaptive-optimize"]
    
    elif task_type == "architecture_design":
        recommendations["force_claude"] = True
        recommendations["reason"] = "Architectural work requires Claude"
    
    elif task_type == "build_verification":
        recommendations["skills_to_load"] = ["build-verify"]
        recommendations["scripts_to_run"] = ["inventory-refresh"]
    
    return recommendations
