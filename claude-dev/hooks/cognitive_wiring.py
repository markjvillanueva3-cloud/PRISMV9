"""
PRISM Cognitive Hook Wiring
Connects all 7 cognitive hooks (BAYES-001/002/003, RL-001/002/003, OPT-001) to workflow events.
Auto-triggers based on conditions and manages data flow between hooks.

Author: PRISM Claude Development Enhancement
Version: 1.0.0
"""

import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

# === COGNITIVE HOOK DEFINITIONS ===

class CognitiveHookType(Enum):
    """All 7 cognitive hooks available in PRISM"""
    BAYES_001 = "BAYES-001"  # Prior initialization
    BAYES_002 = "BAYES-002"  # Change detection
    BAYES_003 = "BAYES-003"  # Hypothesis testing / Pattern extraction
    RL_001 = "RL-001"        # State continuity
    RL_002 = "RL-002"        # Outcome recording
    RL_003 = "RL-003"        # Policy update
    OPT_001 = "OPT-001"      # Optimization trigger

@dataclass
class HookTriggerCondition:
    """Defines when a hook should auto-trigger"""
    event_type: str
    condition: Callable[[Dict], bool]
    priority: int = 5  # 1-10, higher = more urgent
    description: str = ""

@dataclass
class HookExecution:
    """Record of a hook execution"""
    hook_id: str
    timestamp: str
    input_data: Dict
    output_data: Dict
    duration_ms: float
    success: bool
    error: Optional[str] = None

# === COGNITIVE WIRING ENGINE ===

class CognitiveWiringEngine:
    """
    Wires cognitive hooks to workflow events.
    Auto-triggers hooks based on conditions and manages data flow.
    """
    
    def __init__(self, state_path: str = "C:\\PRISM\\state"):
        self.state_path = Path(state_path)
        self.execution_history: List[HookExecution] = []
        self.prior_beliefs: Dict[str, float] = {}
        self.policy_weights: Dict[str, float] = {}
        self.pattern_database: List[Dict] = []
        
        # Initialize trigger conditions
        self.trigger_conditions = self._init_trigger_conditions()
        
        # Hook handlers
        self.hook_handlers: Dict[str, Callable] = {
            "BAYES-001": self._handle_bayes_001,
            "BAYES-002": self._handle_bayes_002,
            "BAYES-003": self._handle_bayes_003,
            "RL-001": self._handle_rl_001,
            "RL-002": self._handle_rl_002,
            "RL-003": self._handle_rl_003,
            "OPT-001": self._handle_opt_001,
        }
    
    def _init_trigger_conditions(self) -> Dict[str, List[HookTriggerCondition]]:
        """Initialize auto-trigger conditions for each hook"""
        return {
            "BAYES-001": [
                HookTriggerCondition(
                    event_type="session_start",
                    condition=lambda ctx: True,  # Always on session start
                    priority=10,
                    description="Initialize priors at session start"
                ),
                HookTriggerCondition(
                    event_type="new_domain",
                    condition=lambda ctx: ctx.get("domain") not in self.prior_beliefs,
                    priority=8,
                    description="Initialize priors for new domain"
                ),
            ],
            "BAYES-002": [
                HookTriggerCondition(
                    event_type="data_update",
                    condition=lambda ctx: ctx.get("change_magnitude", 0) > 0.1,
                    priority=7,
                    description="Detect significant data changes"
                ),
                HookTriggerCondition(
                    event_type="unexpected_result",
                    condition=lambda ctx: ctx.get("deviation", 0) > 2.0,  # 2 std devs
                    priority=9,
                    description="Flag unexpected results for investigation"
                ),
            ],
            "BAYES-003": [
                HookTriggerCondition(
                    event_type="task_complete",
                    condition=lambda ctx: ctx.get("success", False),
                    priority=6,
                    description="Extract patterns from successful tasks"
                ),
                HookTriggerCondition(
                    event_type="hypothesis_available",
                    condition=lambda ctx: len(ctx.get("hypotheses", [])) > 1,
                    priority=8,
                    description="Test competing hypotheses"
                ),
            ],
            "RL-001": [
                HookTriggerCondition(
                    event_type="session_start",
                    condition=lambda ctx: True,
                    priority=10,
                    description="Restore state continuity"
                ),
                HookTriggerCondition(
                    event_type="context_switch",
                    condition=lambda ctx: ctx.get("new_context") != ctx.get("old_context"),
                    priority=9,
                    description="Preserve state across context switches"
                ),
            ],
            "RL-002": [
                HookTriggerCondition(
                    event_type="action_complete",
                    condition=lambda ctx: "outcome" in ctx,
                    priority=7,
                    description="Record action outcomes"
                ),
                HookTriggerCondition(
                    event_type="error_occurred",
                    condition=lambda ctx: ctx.get("error") is not None,
                    priority=9,
                    description="Record negative outcomes for learning"
                ),
            ],
            "RL-003": [
                HookTriggerCondition(
                    event_type="batch_complete",
                    condition=lambda ctx: ctx.get("outcome_count", 0) >= 5,
                    priority=6,
                    description="Update policy after batch of outcomes"
                ),
                HookTriggerCondition(
                    event_type="session_end",
                    condition=lambda ctx: True,
                    priority=10,
                    description="Final policy update before session end"
                ),
            ],
            "OPT-001": [
                HookTriggerCondition(
                    event_type="optimization_needed",
                    condition=lambda ctx: ctx.get("optimize", False),
                    priority=8,
                    description="Trigger optimization when requested"
                ),
                HookTriggerCondition(
                    event_type="resource_selection",
                    condition=lambda ctx: len(ctx.get("options", [])) > 2,
                    priority=7,
                    description="Optimize selection from multiple options"
                ),
            ],
        }
    
    # === HOOK HANDLERS ===
    
    def _handle_bayes_001(self, data: Dict) -> Dict:
        """BAYES-001: Initialize prior beliefs"""
        domain = data.get("domain", "general")
        
        # Default priors by domain
        default_priors = {
            "materials": {"accuracy": 0.8, "coverage": 0.7, "confidence": 0.75},
            "machining": {"safety": 0.9, "efficiency": 0.7, "quality": 0.8},
            "code": {"correctness": 0.85, "performance": 0.7, "maintainability": 0.75},
            "general": {"success": 0.7, "quality": 0.7, "safety": 0.8},
        }
        
        priors = data.get("custom_priors", default_priors.get(domain, default_priors["general"]))
        self.prior_beliefs[domain] = priors
        
        return {
            "domain": domain,
            "priors_initialized": priors,
            "timestamp": datetime.now().isoformat()
        }
    
    def _handle_bayes_002(self, data: Dict) -> Dict:
        """BAYES-002: Detect changes and update beliefs"""
        observation = data.get("observation", {})
        domain = data.get("domain", "general")
        
        current_priors = self.prior_beliefs.get(domain, {"default": 0.5})
        
        # Simple Bayesian update (simplified for demo)
        changes_detected = []
        for key, observed_value in observation.items():
            if key in current_priors:
                prior = current_priors[key]
                # Likelihood ratio based on deviation
                deviation = abs(observed_value - prior)
                if deviation > 0.1:
                    changes_detected.append({
                        "metric": key,
                        "prior": prior,
                        "observed": observed_value,
                        "deviation": deviation,
                        "significant": deviation > 0.2
                    })
                    # Update belief (simple weighted average)
                    current_priors[key] = 0.7 * prior + 0.3 * observed_value
        
        self.prior_beliefs[domain] = current_priors
        
        return {
            "changes_detected": changes_detected,
            "updated_beliefs": current_priors,
            "significant_changes": len([c for c in changes_detected if c["significant"]])
        }
    
    def _handle_bayes_003(self, data: Dict) -> Dict:
        """BAYES-003: Test hypotheses and extract patterns"""
        hypotheses = data.get("hypotheses", [])
        evidence = data.get("evidence", {})
        
        if not hypotheses:
            # Pattern extraction mode
            pattern = {
                "context": data.get("context", {}),
                "action": data.get("action", ""),
                "outcome": data.get("outcome", {}),
                "success": data.get("success", False),
                "timestamp": datetime.now().isoformat()
            }
            self.pattern_database.append(pattern)
            return {"pattern_extracted": pattern, "total_patterns": len(self.pattern_database)}
        
        # Hypothesis testing mode
        scored_hypotheses = []
        for h in hypotheses:
            # Score based on evidence alignment (simplified)
            score = 0.5  # Base score
            for key, value in evidence.items():
                if key in h.get("predictions", {}):
                    predicted = h["predictions"][key]
                    if abs(predicted - value) < 0.1:
                        score += 0.1
                    elif abs(predicted - value) < 0.2:
                        score += 0.05
            scored_hypotheses.append({"hypothesis": h, "score": min(score, 1.0)})
        
        scored_hypotheses.sort(key=lambda x: x["score"], reverse=True)
        
        return {
            "ranked_hypotheses": scored_hypotheses,
            "best_hypothesis": scored_hypotheses[0] if scored_hypotheses else None
        }
    
    def _handle_rl_001(self, data: Dict) -> Dict:
        """RL-001: State continuity - restore and maintain state"""
        state_file = self.state_path / "CURRENT_STATE.json"
        
        restored_state = {}
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    restored_state = json.load(f)
            except Exception as e:
                restored_state = {"error": str(e)}
        
        # Merge with provided state
        merged_state = {**restored_state, **data.get("current_state", {})}
        
        return {
            "state_restored": True,
            "state": merged_state,
            "prior_beliefs_active": list(self.prior_beliefs.keys()),
            "patterns_available": len(self.pattern_database)
        }
    
    def _handle_rl_002(self, data: Dict) -> Dict:
        """RL-002: Record outcomes for learning"""
        outcome = {
            "action": data.get("action", ""),
            "state_before": data.get("state_before", {}),
            "state_after": data.get("state_after", {}),
            "reward": data.get("reward", 0),
            "success": data.get("success", False),
            "timestamp": datetime.now().isoformat()
        }
        
        # Update policy weights based on outcome
        action_type = data.get("action_type", "default")
        current_weight = self.policy_weights.get(action_type, 0.5)
        
        # Simple Q-learning update
        learning_rate = 0.1
        reward = outcome["reward"]
        new_weight = current_weight + learning_rate * (reward - current_weight)
        self.policy_weights[action_type] = new_weight
        
        return {
            "outcome_recorded": outcome,
            "policy_weight_update": {
                "action_type": action_type,
                "old_weight": current_weight,
                "new_weight": new_weight
            }
        }
    
    def _handle_rl_003(self, data: Dict) -> Dict:
        """RL-003: Update policy based on accumulated outcomes"""
        # Aggregate recent outcomes
        recent_outcomes = data.get("outcomes", [])
        
        policy_updates = {}
        for action_type, weight in self.policy_weights.items():
            relevant_outcomes = [o for o in recent_outcomes if o.get("action_type") == action_type]
            if relevant_outcomes:
                avg_reward = sum(o.get("reward", 0) for o in relevant_outcomes) / len(relevant_outcomes)
                new_weight = 0.8 * weight + 0.2 * avg_reward
                policy_updates[action_type] = {"old": weight, "new": new_weight}
                self.policy_weights[action_type] = new_weight
        
        return {
            "policy_updated": True,
            "updates": policy_updates,
            "current_policy": self.policy_weights
        }
    
    def _handle_opt_001(self, data: Dict) -> Dict:
        """OPT-001: Optimization trigger for resource selection"""
        options = data.get("options", [])
        criteria = data.get("criteria", ["score"])
        weights = data.get("weights", {c: 1.0 for c in criteria})
        
        if not options:
            return {"error": "No options provided"}
        
        # Score each option
        scored_options = []
        for opt in options:
            total_score = 0
            for criterion in criteria:
                value = opt.get(criterion, 0.5)
                weight = weights.get(criterion, 1.0)
                total_score += value * weight
            scored_options.append({**opt, "_total_score": total_score})
        
        scored_options.sort(key=lambda x: x["_total_score"], reverse=True)
        
        return {
            "ranked_options": scored_options,
            "best_option": scored_options[0] if scored_options else None,
            "criteria_used": criteria,
            "weights_applied": weights
        }
    
    # === PUBLIC API ===
    
    def fire_hook(self, hook_id: str, data: Dict) -> Dict:
        """Fire a specific cognitive hook with data"""
        start_time = time.time()
        
        if hook_id not in self.hook_handlers:
            return {"error": f"Unknown hook: {hook_id}"}
        
        try:
            result = self.hook_handlers[hook_id](data)
            success = True
            error = None
        except Exception as e:
            result = {"error": str(e)}
            success = False
            error = str(e)
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Record execution
        execution = HookExecution(
            hook_id=hook_id,
            timestamp=datetime.now().isoformat(),
            input_data=data,
            output_data=result,
            duration_ms=duration_ms,
            success=success,
            error=error
        )
        self.execution_history.append(execution)
        
        return {
            "hook_id": hook_id,
            "result": result,
            "duration_ms": duration_ms,
            "success": success
        }
    
    def check_triggers(self, event_type: str, context: Dict) -> List[str]:
        """Check which hooks should be triggered for an event"""
        triggered_hooks = []
        
        for hook_id, conditions in self.trigger_conditions.items():
            for condition in conditions:
                if condition.event_type == event_type:
                    try:
                        if condition.condition(context):
                            triggered_hooks.append({
                                "hook_id": hook_id,
                                "priority": condition.priority,
                                "description": condition.description
                            })
                    except Exception:
                        pass
        
        # Sort by priority (highest first)
        triggered_hooks.sort(key=lambda x: x["priority"], reverse=True)
        return triggered_hooks
    
    def auto_fire(self, event_type: str, context: Dict) -> List[Dict]:
        """Auto-fire all hooks triggered by an event"""
        triggered = self.check_triggers(event_type, context)
        results = []
        
        for hook_info in triggered:
            result = self.fire_hook(hook_info["hook_id"], context)
            results.append({
                "hook": hook_info,
                "result": result
            })
        
        return results
    
    def get_execution_history(self, limit: int = 50) -> List[Dict]:
        """Get recent hook execution history"""
        return [
            {
                "hook_id": ex.hook_id,
                "timestamp": ex.timestamp,
                "success": ex.success,
                "duration_ms": ex.duration_ms
            }
            for ex in self.execution_history[-limit:]
        ]
    
    def get_status(self) -> Dict:
        """Get current cognitive system status"""
        return {
            "hooks_available": list(self.hook_handlers.keys()),
            "active_priors": self.prior_beliefs,
            "policy_weights": self.policy_weights,
            "patterns_stored": len(self.pattern_database),
            "executions_total": len(self.execution_history),
            "recent_success_rate": self._calculate_success_rate()
        }
    
    def _calculate_success_rate(self) -> float:
        """Calculate recent success rate"""
        recent = self.execution_history[-20:]
        if not recent:
            return 1.0
        return sum(1 for ex in recent if ex.success) / len(recent)


# === SINGLETON INSTANCE ===
_engine: Optional[CognitiveWiringEngine] = None

def get_engine() -> CognitiveWiringEngine:
    """Get or create the cognitive wiring engine singleton"""
    global _engine
    if _engine is None:
        _engine = CognitiveWiringEngine()
    return _engine


# === CONVENIENCE FUNCTIONS ===

def fire(hook_id: str, data: Dict) -> Dict:
    """Fire a cognitive hook"""
    return get_engine().fire_hook(hook_id, data)

def auto_fire(event_type: str, context: Dict) -> List[Dict]:
    """Auto-fire hooks for an event"""
    return get_engine().auto_fire(event_type, context)

def status() -> Dict:
    """Get cognitive system status"""
    return get_engine().get_status()


if __name__ == "__main__":
    # Demo usage
    engine = CognitiveWiringEngine()
    
    # Initialize priors for materials domain
    result = engine.fire_hook("BAYES-001", {"domain": "materials"})
    print(f"BAYES-001 Result: {json.dumps(result, indent=2)}")
    
    # Record an outcome
    result = engine.fire_hook("RL-002", {
        "action": "calculate_cutting_force",
        "action_type": "physics_calc",
        "reward": 0.9,
        "success": True
    })
    print(f"RL-002 Result: {json.dumps(result, indent=2)}")
    
    # Check status
    print(f"Status: {json.dumps(engine.get_status(), indent=2)}")
