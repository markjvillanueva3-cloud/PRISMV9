"""
ModelRouterEngine (Deep Version)
Advanced intelligent routing between local models and Claude.
Enforces "Claude only when necessary" policy with confidence scoring and fallback chains.
"""

from typing import Dict, Literal, Optional, List
from enum import Enum
import json

class ModelTier(str, Enum):
    LOCAL_LIGHT = "local_light"
    LOCAL_MEDIUM = "local_medium"
    LOCAL_HEAVY = "local_heavy"
    CLAUDE = "claude"

class TaskComplexity(str, Enum):
    TRIVIAL = "trivial"
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    ARCHITECTURAL = "architectural"
    SAFETY_CRITICAL = "safety_critical"

class RoutingDecision:
    def __init__(self, tier: ModelTier, reason: str, confidence: float, fallback: Optional[ModelTier] = None):
        self.tier = tier
        self.reason = reason
        self.confidence = confidence
        self.fallback = fallback
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "tier": self.tier.value,
            "reason": self.reason,
            "confidence": self.confidence,
            "fallback": self.fallback.value if self.fallback else None,
            "timestamp": self.timestamp
        }

def classify_complexity(prompt: str, context: Dict = None) -> TaskComplexity:
    prompt_lower = (prompt or "").lower()
    
    if any(kw in prompt_lower for kw in ["architecture", "system design", "new pipeline", "orchestrator design"]):
        return TaskComplexity.ARCHITECTURAL
    if any(kw in prompt_lower for kw in ["safety", "critical", "production guard", "security"]):
        return TaskComplexity.SAFETY_CRITICAL
    if any(kw in prompt_lower for kw in ["complex", "multi-step", "deep reasoning", "novel"]):
        return TaskComplexity.COMPLEX
    if any(kw in prompt_lower for kw in ["refactor", "optimize", "debug", "performance"]):
        return TaskComplexity.MODERATE
    if any(kw in prompt_lower for kw in ["explain", "summarize", "simple", "quick"]):
        return TaskComplexity.SIMPLE
    return TaskComplexity.MODERATE

def estimate_confidence(prompt: str, complexity: TaskComplexity, token_estimate: int) -> float:
    """Rough self-confidence estimator for local models."""
    base = 0.75
    
    if complexity == TaskComplexity.SAFETY_CRITICAL:
        return 0.35
    if complexity == TaskComplexity.ARCHITECTURAL:
        return 0.45
    if complexity == TaskComplexity.COMPLEX:
        base = 0.65
    if token_estimate > 15000:
        base -= 0.15
    if len(prompt) > 4000:
        base -= 0.1
    
    return max(0.3, min(0.95, base))

def route_task(
    prompt: str, 
    context: Dict = None, 
    token_estimate: int = 0,
    hardware_profile: str = "workstation-max"
) -> Dict:
    """
    Deep routing decision with confidence scoring and fallback chain.
    """
    if context is None:
        context = {}
    
    complexity = classify_complexity(prompt, context)
    confidence = estimate_confidence(prompt, complexity, token_estimate)
    
    # Hard escalation cases
    if complexity in [TaskComplexity.ARCHITECTURAL, TaskComplexity.SAFETY_CRITICAL]:
        decision = RoutingDecision(
            ModelTier.CLAUDE,
            f"Task is {complexity.value}. Requires maximum reliability.",
            confidence,
            ModelTier.LOCAL_HEAVY
        )
        return decision.to_dict()
    
    # High-end hardware bias toward stronger local models
    if hardware_profile == "workstation-max" and complexity == TaskComplexity.COMPLEX:
        if confidence >= 0.65:
            decision = RoutingDecision(
                ModelTier.LOCAL_HEAVY,
                "High-end hardware + sufficient confidence → use gpt-oss:120b first.",
                confidence,
                ModelTier.CLAUDE
            )
            return decision.to_dict()
    
    # Standard local-first routing
    if confidence >= 0.75:
        tier = ModelTier.LOCAL_MEDIUM
        if complexity == TaskComplexity.COMPLEX:
            tier = ModelTier.LOCAL_HEAVY
        decision = RoutingDecision(
            tier,
            f"Confidence {confidence:.2f} — handling with local model.",
            confidence,
            ModelTier.CLAUDE if complexity in [TaskComplexity.COMPLEX, TaskComplexity.MODERATE] else None
        )
        return decision.to_dict()
    
    # Low confidence → escalate
    decision = RoutingDecision(
        ModelTier.CLAUDE,
        f"Low confidence ({confidence:.2f}) on {complexity.value} task.",
        confidence,
        ModelTier.LOCAL_HEAVY
    )
    return decision.to_dict()

def should_escalate_after_local_attempt(
    local_output: str, 
    confidence: float,
    complexity: TaskComplexity
) -> bool:
    """Post-local attempt escalation check."""
    if complexity in [TaskComplexity.ARCHITECTURAL, TaskComplexity.SAFETY_CRITICAL]:
        return True
    if confidence < 0.6:
        return True
    if len(local_output) < 200 and complexity != TaskComplexity.SIMPLE:
        return True
    return False
