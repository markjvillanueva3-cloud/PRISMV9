"""
PRISM Hook System - Python Integration
======================================
Provides hook execution for Python scripts and orchestrators.

This module allows prism_unified_system_v5.py and other Python scripts
to participate in the PRISM hook system.

Usage:
    from prism_hooks import hooks
    
    # Execute a hook
    result = hooks.execute('agent:preExecute', payload, context)
    if result.blocked:
        print(f"BLOCKED: {result.reason}")
        return
    
    # ... do work ...
    
    hooks.execute('agent:postExecute', result_payload, context)

Version: 1.1.0
"""

import json
import os
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from enum import Enum

# =============================================================================
# CONFIGURATION
# =============================================================================

PRISM_ROOT = Path("C:/PRISM")
STATE_FILE = PRISM_ROOT / "state" / "CURRENT_STATE.json"
FORMULA_REGISTRY = PRISM_ROOT / "data" / "FORMULA_REGISTRY.json"
COEFFICIENT_DB = PRISM_ROOT / "data" / "COEFFICIENT_DATABASE.json"
PREDICTION_LOG = PRISM_ROOT / "state" / "learning" / "PREDICTION_LOG.json"
HOOK_LOG = PRISM_ROOT / "state" / "logs" / "HOOK_LOG.json"


# =============================================================================
# ENUMS
# =============================================================================

class HookPriority(Enum):
    """Hook priority levels (lower = higher priority)"""
    SAFETY_GATE = 0
    MATHPLAN_GATE = 5
    STATE_PERSISTENCE = 10
    ANTI_REGRESSION = 20
    LAW_ENFORCEMENT = 32
    VALIDATION = 60
    BUSINESS_RULES = 110
    LEARNING = 170
    METRICS = 200
    CALIBRATION = 220
    USER = 300
    PLUGIN = 400
    CLEANUP = 900


class AbortSeverity(Enum):
    """Severity levels for hook aborts"""
    WARN = "WARN"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    SAFETY = "SAFETY"


class BufferZone(Enum):
    """Buffer zone status"""
    GREEN = "GREEN"      # 0-8 calls
    YELLOW = "YELLOW"    # 9-14 calls
    ORANGE = "ORANGE"    # 15-18 calls
    RED = "RED"          # 19+ calls
    BLACK = "BLACK"      # Emergency


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class HookContext:
    """Context passed to every hook"""
    trace_id: str = ""
    session_id: str = ""
    task_id: str = ""
    microsession_index: int = 0
    tool_call_count: int = 0
    buffer_zone: BufferZone = BufferZone.GREEN
    triggered_by: str = "SYSTEM"
    agent_tier: str = "SONNET"
    quality_scores: Dict[str, float] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    learnings: List[Dict] = field(default_factory=list)
    custom: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_state(cls, state: Dict) -> 'HookContext':
        """Create context from CURRENT_STATE.json"""
        session = state.get('currentSession', {})
        task = state.get('currentTask', {})
        checkpoint = state.get('checkpoint', {})
        
        tool_calls = checkpoint.get('toolCallsSinceCheckpoint', 0)
        zone = BufferZone.GREEN
        if tool_calls >= 19:
            zone = BufferZone.RED
        elif tool_calls >= 15:
            zone = BufferZone.ORANGE
        elif tool_calls >= 9:
            zone = BufferZone.YELLOW
            
        return cls(
            trace_id=f"TRACE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            session_id=session.get('id', ''),
            task_id=task.get('id', ''),
            tool_call_count=tool_calls,
            buffer_zone=zone
        )


@dataclass
class HookResult:
    """Result returned by hook execution"""
    continue_execution: bool = True
    blocked: bool = False
    abort_reason: str = ""
    abort_severity: Optional[AbortSeverity] = None
    payload: Optional[Dict] = None
    warnings: List[str] = field(default_factory=list)
    learnings: List[Dict] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# SYSTEM HOOKS (CANNOT DISABLE)
# =============================================================================

def sys_law1_safety(payload: Dict, context: HookContext) -> HookResult:
    """LAW 1: Life-Safety - Block if S(x) < 0.70"""
    safety_score = context.quality_scores.get('S', 1.0)
    if safety_score < 0.70:
        return HookResult(
            continue_execution=False,
            blocked=True,
            abort_reason=f"SAFETY VIOLATION: S(x) = {safety_score:.2f} < 0.70",
            abort_severity=AbortSeverity.SAFETY
        )
    return HookResult()


def sys_law2_microsession(payload: Dict, context: HookContext) -> HookResult:
    """LAW 2: Microsessions - Require MATHPLAN"""
    if 'mathPlan' not in payload and payload.get('requires_mathplan', True):
        return HookResult(
            continue_execution=False,
            blocked=True,
            abort_reason="MATHPLAN required before task execution",
            abort_severity=AbortSeverity.ERROR
        )
    return HookResult()


def sys_law3_completeness(payload: Dict, context: HookContext) -> HookResult:
    """LAW 3: Completeness - Require C(T) = 1.0"""
    completeness = payload.get('completeness', 1.0)
    if completeness < 1.0 and payload.get('phase') == 'completion':
        return HookResult(
            continue_execution=False,
            blocked=True,
            abort_reason=f"INCOMPLETE: C(T) = {completeness:.2f} < 1.0",
            abort_severity=AbortSeverity.ERROR
        )
    return HookResult()


def sys_law4_regression(payload: Dict, context: HookContext) -> HookResult:
    """LAW 4: Anti-Regression - Block data loss"""
    if payload.get('operation') in ['replace', 'delete', 'overwrite']:
        old_count = payload.get('old_count', 0)
        new_count = payload.get('new_count', 0)
        if new_count < old_count:
            return HookResult(
                continue_execution=False,
                blocked=True,
                abort_reason=f"REGRESSION: {old_count} -> {new_count} (loss of {old_count - new_count})",
                abort_severity=AbortSeverity.CRITICAL
            )
    return HookResult()


def sys_law6_continuity(payload: Dict, context: HookContext) -> HookResult:
    """LAW 6: Continuity - Enforce state loading"""
    if not payload.get('state_loaded', False) and payload.get('phase') == 'start':
        return HookResult(
            warnings=["State not loaded - loading now recommended"]
        )
    return HookResult()


def sys_law7_verification(payload: Dict, context: HookContext) -> HookResult:
    """LAW 7: Verification - Require 95% confidence for safety-critical"""
    if payload.get('safety_critical', False):
        confidence = payload.get('confidence', 0)
        if confidence < 0.95:
            return HookResult(
                continue_execution=False,
                blocked=True,
                abort_reason=f"VERIFICATION FAILED: {confidence:.1%} < 95% confidence",
                abort_severity=AbortSeverity.ERROR
            )
    return HookResult()


def sys_law8_math_evolution(payload: Dict, context: HookContext) -> HookResult:
    """LAW 8: Mathematical Rigor - Require M(x) >= 0.60"""
    rigor_score = context.quality_scores.get('M', 1.0)
    if rigor_score < 0.60:
        return HookResult(
            continue_execution=False,
            blocked=True,
            abort_reason=f"RIGOR VIOLATION: M(x) = {rigor_score:.2f} < 0.60",
            abort_severity=AbortSeverity.ERROR
        )
    return HookResult()


def sys_cmd5_uncertainty(payload: Dict, context: HookContext) -> HookResult:
    """CMD 5: Uncertainty - Inject uncertainty bounds if missing"""
    result = HookResult()
    if 'value' in payload and 'uncertainty' not in payload:
        # Auto-inject default uncertainty (20%)
        value = payload['value']
        payload['uncertainty'] = abs(value) * 0.20
        payload['confidence'] = 0.68
        result.payload = payload
        result.warnings = [f"Auto-injected uncertainty: {payload['uncertainty']:.2f}"]
    return result


def sys_buffer_zone(payload: Dict, context: HookContext) -> HookResult:
    """Buffer Zone - Enforce microsession limits"""
    if context.buffer_zone == BufferZone.RED:
        return HookResult(
            continue_execution=False,
            blocked=True,
            abort_reason="RED ZONE: Tool call limit exceeded. Checkpoint required.",
            abort_severity=AbortSeverity.CRITICAL
        )
    elif context.buffer_zone == BufferZone.ORANGE:
        return HookResult(
            warnings=["ORANGE ZONE: Checkpoint NOW recommended"]
        )
    elif context.buffer_zone == BufferZone.YELLOW:
        return HookResult(
            warnings=["YELLOW ZONE: Approaching checkpoint threshold"]
        )
    return HookResult()


def sys_prediction_log(payload: Dict, context: HookContext) -> HookResult:
    """Log predictions for calibration"""
    if 'prediction' in payload:
        prediction = payload['prediction']
        log_entry = {
            "id": f"PRED-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "task_id": context.task_id,
            "predicted": prediction,
            "actual": None,
            "status": "PENDING_ACTUAL"
        }
        # Append to prediction log
        _append_to_log(PREDICTION_LOG, log_entry)
    return HookResult()


def sys_learning_extract(payload: Dict, context: HookContext) -> HookResult:
    """Extract learnings at task completion"""
    result = HookResult()
    if payload.get('phase') == 'completion':
        learnings = []
        # Extract patterns from result
        if 'result' in payload:
            learnings.append({
                "type": "TASK_COMPLETION",
                "task_id": context.task_id,
                "patterns": payload.get('patterns', []),
                "timestamp": datetime.now().isoformat()
            })
        result.learnings = learnings
    return result


# =============================================================================
# SYSTEM HOOKS REGISTRY
# =============================================================================

SYSTEM_HOOKS = {
    'SYS-LAW1-SAFETY': {
        'handler': sys_law1_safety,
        'priority': HookPriority.SAFETY_GATE,
        'hook_points': ['*'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW2-MICROSESSION': {
        'handler': sys_law2_microsession,
        'priority': HookPriority.LAW_ENFORCEMENT,
        'hook_points': ['task:prePlan', 'task:start'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW3-COMPLETENESS': {
        'handler': sys_law3_completeness,
        'priority': HookPriority.LAW_ENFORCEMENT,
        'hook_points': ['task:preComplete'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW4-REGRESSION': {
        'handler': sys_law4_regression,
        'priority': HookPriority.ANTI_REGRESSION,
        'hook_points': ['db:preWrite', 'db:preDelete', 'material:preSave'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW6-CONTINUITY': {
        'handler': sys_law6_continuity,
        'priority': HookPriority.STATE_PERSISTENCE,
        'hook_points': ['session:preStart'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW7-VERIFICATION': {
        'handler': sys_law7_verification,
        'priority': HookPriority.SAFETY_GATE,
        'hook_points': ['verification:chainComplete', 'calc:postExecute'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LAW8-MATH-EVOLUTION': {
        'handler': sys_law8_math_evolution,
        'priority': HookPriority.VALIDATION,
        'hook_points': ['task:preComplete', 'calc:postExecute'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-CMD5-UNCERTAINTY': {
        'handler': sys_cmd5_uncertainty,
        'priority': HookPriority.VALIDATION,
        'hook_points': ['calc:postExecute', 'prediction:create'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-BUFFER-ZONE': {
        'handler': sys_buffer_zone,
        'priority': HookPriority.SAFETY_GATE,
        'hook_points': ['*'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-PREDICTION-LOG': {
        'handler': sys_prediction_log,
        'priority': HookPriority.METRICS,
        'hook_points': ['task:postPlan', 'prediction:create'],
        'enabled': True,
        'cannot_disable': True
    },
    'SYS-LEARNING-EXTRACT': {
        'handler': sys_learning_extract,
        'priority': HookPriority.LEARNING,
        'hook_points': ['task:postComplete'],
        'enabled': True,
        'cannot_disable': True
    }
}


# =============================================================================
# HOOK MANAGER
# =============================================================================

class HookManager:
    """Python Hook Manager for PRISM orchestrators"""
    
    def __init__(self):
        self.hooks: Dict[str, List[Dict]] = {}
        self.context: Optional[HookContext] = None
        self.statistics = {
            'total_executions': 0,
            'blocked': 0,
            'warnings': 0,
            'by_hook_point': {}
        }
        self._register_system_hooks()
    
    def _register_system_hooks(self):
        """Register all system hooks"""
        for hook_id, config in SYSTEM_HOOKS.items():
            for hook_point in config['hook_points']:
                self.register(
                    hook_id=hook_id,
                    hook_point=hook_point,
                    handler=config['handler'],
                    priority=config['priority'],
                    cannot_disable=config['cannot_disable']
                )
    
    def register(
        self,
        hook_id: str,
        hook_point: str,
        handler: Callable,
        priority: HookPriority = HookPriority.USER,
        cannot_disable: bool = False
    ):
        """Register a hook handler"""
        if hook_point not in self.hooks:
            self.hooks[hook_point] = []
        
        self.hooks[hook_point].append({
            'id': hook_id,
            'handler': handler,
            'priority': priority.value if isinstance(priority, HookPriority) else priority,
            'cannot_disable': cannot_disable,
            'enabled': True
        })
        
        # Sort by priority
        self.hooks[hook_point].sort(key=lambda x: x['priority'])
    
    def load_context(self) -> HookContext:
        """Load context from CURRENT_STATE.json"""
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
            self.context = HookContext.from_state(state)
        except Exception as e:
            self.context = HookContext()
            self.context.warnings.append(f"Failed to load state: {e}")
        return self.context
    
    def execute(
        self,
        hook_point: str,
        payload: Dict,
        context: Optional[HookContext] = None
    ) -> HookResult:
        """Execute all hooks for a hook point"""
        if context is None:
            context = self.context or self.load_context()
        
        # Track statistics
        self.statistics['total_executions'] += 1
        if hook_point not in self.statistics['by_hook_point']:
            self.statistics['by_hook_point'][hook_point] = 0
        self.statistics['by_hook_point'][hook_point] += 1
        
        # Get handlers for this hook point + wildcard handlers
        handlers = []
        if hook_point in self.hooks:
            handlers.extend(self.hooks[hook_point])
        if '*' in self.hooks:
            handlers.extend(self.hooks['*'])
        
        # Sort combined handlers by priority
        handlers.sort(key=lambda x: x['priority'])
        
        # Execute handlers
        combined_result = HookResult()
        current_payload = payload.copy()
        
        for hook in handlers:
            if not hook['enabled']:
                continue
            
            try:
                result = hook['handler'](current_payload, context)
                
                # Merge results
                if result.warnings:
                    combined_result.warnings.extend(result.warnings)
                    self.statistics['warnings'] += len(result.warnings)
                
                if result.learnings:
                    combined_result.learnings.extend(result.learnings)
                
                if result.payload:
                    current_payload = result.payload
                
                if not result.continue_execution or result.blocked:
                    combined_result.continue_execution = False
                    combined_result.blocked = True
                    combined_result.abort_reason = result.abort_reason
                    combined_result.abort_severity = result.abort_severity
                    self.statistics['blocked'] += 1
                    
                    # Log the block
                    self._log_hook_execution(hook_point, hook['id'], result)
                    break
                    
            except Exception as e:
                combined_result.warnings.append(f"Hook {hook['id']} error: {e}")
        
        combined_result.payload = current_payload
        return combined_result
    
    def _log_hook_execution(self, hook_point: str, hook_id: str, result: HookResult):
        """Log hook execution to HOOK_LOG.json"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "hook_point": hook_point,
            "hook_id": hook_id,
            "blocked": result.blocked,
            "reason": result.abort_reason,
            "severity": result.abort_severity.value if result.abort_severity else None
        }
        _append_to_log(HOOK_LOG, entry)
    
    def get_statistics(self) -> Dict:
        """Get hook execution statistics"""
        return self.statistics


# =============================================================================
# UTILITIES
# =============================================================================

def _append_to_log(log_file: Path, entry: Dict):
    """Append entry to a JSON log file"""
    try:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        
        entries = []
        if log_file.exists():
            with open(log_file, 'r') as f:
                data = json.load(f)
                entries = data.get('entries', [])
        
        entries.append(entry)
        
        # Keep last 1000 entries
        if len(entries) > 1000:
            entries = entries[-1000:]
        
        with open(log_file, 'w') as f:
            json.dump({'entries': entries}, f, indent=2)
    except Exception:
        pass  # Silent fail for logging


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_hook_manager: Optional[HookManager] = None


def get_hook_manager() -> HookManager:
    """Get or create the singleton hook manager"""
    global _hook_manager
    if _hook_manager is None:
        _hook_manager = HookManager()
    return _hook_manager


def execute(hook_point: str, payload: Dict, context: Optional[HookContext] = None) -> HookResult:
    """Execute hooks (convenience function)"""
    return get_hook_manager().execute(hook_point, payload, context)


def register(hook_id: str, hook_point: str, handler: Callable, priority: HookPriority = HookPriority.USER):
    """Register a hook (convenience function)"""
    get_hook_manager().register(hook_id, hook_point, handler, priority)


# =============================================================================
# MODULE-LEVEL SHORTCUT
# =============================================================================

class HooksNamespace:
    """Namespace for hook operations"""
    execute = staticmethod(execute)
    register = staticmethod(register)
    get_manager = staticmethod(get_hook_manager)
    
    @staticmethod
    def load_context() -> HookContext:
        return get_hook_manager().load_context()
    
    @staticmethod
    def stats() -> Dict:
        return get_hook_manager().get_statistics()


hooks = HooksNamespace()


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    print("PRISM Hook System - Python Integration v1.1")
    print("=" * 50)
    
    # Initialize
    manager = get_hook_manager()
    context = manager.load_context()
    print(f"Context loaded: session={context.session_id}, zone={context.buffer_zone.value}")
    
    # Test hook execution
    result = hooks.execute('task:prePlan', {
        'task': 'Test task',
        'mathPlan': {'scope': 100}  # Has MATHPLAN, should pass
    })
    print(f"task:prePlan result: blocked={result.blocked}, warnings={result.warnings}")
    
    # Test without MATHPLAN
    result = hooks.execute('task:start', {
        'task': 'Test task'
        # No mathPlan - should be blocked
    })
    print(f"task:start (no MATHPLAN): blocked={result.blocked}, reason={result.abort_reason}")
    
    # Show statistics
    print(f"\nStatistics: {hooks.stats()}")
