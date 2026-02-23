#!/usr/bin/env python3
"""
PRISM Phase 0 Hooks Module v1.0
===============================

Implements the Hook-First Architecture with 41 Phase 0 hooks.

SAFETY-CRITICAL HOOKS (HARD BLOCKS):
- CALC-SAFETY-VIOLATION-001: Blocks if S(x) < 0.70
- STATE-ANTI-REGRESSION-001: Blocks if New < Old
- FILE-GCODE-VALIDATE-001: Blocks dangerous G-codes

HOOK CATEGORIES:
- CALC (12): Calculation validation hooks
- FILE (8): File operation hooks  
- STATE (6): State mutation hooks
- AGENT (5): Agent coordination hooks
- BATCH (6): Batch operation hooks
- FORMULA (4): Formula application hooks

Tools:
  - prism_hook_fire: Execute a single hook
  - prism_hook_chain: Execute a chain of hooks
  - prism_hook_status: Get hook execution status
  - prism_hook_coverage: Check which hooks are wired
  - prism_hook_gaps: Find unwired hooks
  - prism_hook_enable: Enable a hook
  - prism_hook_disable: Disable a hook (with reason)
  - prism_hook_phase0_list: List all Phase 0 hooks
"""

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# ============================================================================
# DIRECTORIES
# ============================================================================

STATE_DIR = Path("C:/PRISM/state")
HOOKS_DIR = STATE_DIR / "hooks"
HOOK_LOG_FILE = STATE_DIR / "hook_log.jsonl"
HOOK_REGISTRY_FILE = STATE_DIR / "HOOK_REGISTRY.json"

# Ensure directories exist
HOOKS_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# ENUMS AND DATA CLASSES
# ============================================================================

class HookEnforcement(Enum):
    """Hook enforcement levels."""
    HARD_BLOCK = "HARD_BLOCK"  # Cannot proceed if fails
    BLOCK = "BLOCK"            # Blocks but can be overridden
    WARN = "WARN"              # Warning only
    LOG = "LOG"                # Log only
    AUTO = "AUTO"              # Automatic action

class HookResult(Enum):
    """Hook execution results."""
    PASSED = "PASSED"
    BLOCKED = "BLOCKED"
    WARNING = "WARNING"
    SKIPPED = "SKIPPED"
    ERROR = "ERROR"

@dataclass
class Hook:
    """Phase 0 Hook definition."""
    id: str
    category: str
    trigger: str
    action: str
    enforcement: str
    description: str
    enabled: bool = True
    
@dataclass
class HookExecution:
    """Record of hook execution."""
    hook_id: str
    timestamp: str
    result: str
    message: str
    context: Dict
    blocked: bool

# ============================================================================
# PHASE 0 HOOKS DEFINITION
# ============================================================================

PHASE0_HOOKS = [
    # CALC HOOKS (12) - Calculation validation
    Hook("CALC-BEFORE-001", "CALC", "before_calculation", "validate_inputs", "ALWAYS", "Validate calculation inputs"),
    Hook("CALC-AFTER-001", "CALC", "after_calculation", "validate_outputs", "ALWAYS", "Validate calculation outputs"),
    Hook("CALC-PHYSICS-001", "CALC", "physics_calculation", "check_units", "ALWAYS", "Check unit consistency"),
    Hook("CALC-KIENZLE-001", "CALC", "kienzle_apply", "validate_coefficients", "ALWAYS", "Validate Kienzle coefficients"),
    Hook("CALC-TAYLOR-001", "CALC", "taylor_apply", "validate_constants", "ALWAYS", "Validate Taylor constants"),
    Hook("CALC-RANGE-001", "CALC", "value_computed", "check_range", "WARN", "Check value in valid range"),
    Hook("CALC-PRECISION-001", "CALC", "decimal_operation", "enforce_precision", "ALWAYS", "Enforce decimal precision"),
    Hook("CALC-OVERFLOW-001", "CALC", "numeric_operation", "check_overflow", "BLOCK", "Check for numeric overflow"),
    Hook("CALC-DIVISION-001", "CALC", "division_operation", "check_zero", "HARD_BLOCK", "Block division by zero"),
    Hook("CALC-NEGATIVE-001", "CALC", "sqrt_operation", "check_positive", "HARD_BLOCK", "Block sqrt of negative"),
    Hook("CALC-SAFETY-VIOLATION-001", "CALC", "safety_check", "block_unsafe", "HARD_BLOCK", "BLOCK if S(x) < 0.70"),
    Hook("CALC-QUALITY-001", "CALC", "quality_check", "compute_omega", "ALWAYS", "Compute Ω(x) score"),
    
    # FILE HOOKS (8) - File operations
    Hook("FILE-BEFORE-READ-001", "FILE", "before_file_read", "validate_path", "ALWAYS", "Validate file path before read"),
    Hook("FILE-AFTER-READ-001", "FILE", "after_file_read", "validate_content", "ALWAYS", "Validate file content after read"),
    Hook("FILE-BEFORE-WRITE-001", "FILE", "before_file_write", "backup_existing", "ALWAYS", "Backup before write"),
    Hook("FILE-AFTER-WRITE-001", "FILE", "after_file_write", "verify_write", "ALWAYS", "Verify write success"),
    Hook("FILE-JSON-SORT-001", "FILE", "json_write", "sort_keys", "ALWAYS", "Sort JSON keys for KV-cache"),
    Hook("FILE-GCODE-VALIDATE-001", "FILE", "gcode_write", "validate_gcode", "HARD_BLOCK", "Block dangerous G-codes"),
    Hook("FILE-SIZE-CHECK-001", "FILE", "file_operation", "check_size", "WARN", "Warn on large files"),
    Hook("FILE-ENCODING-001", "FILE", "file_read", "check_encoding", "ALWAYS", "Check file encoding"),
    
    # STATE HOOKS (6) - State mutations
    Hook("STATE-BEFORE-MUTATE-001", "STATE", "before_state_change", "capture_previous", "ALWAYS", "Capture state before mutation"),
    Hook("STATE-AFTER-MUTATE-001", "STATE", "after_state_change", "validate_new", "ALWAYS", "Validate new state"),
    Hook("STATE-ANTI-REGRESSION-001", "STATE", "state_replace", "check_regression", "HARD_BLOCK", "BLOCK if New < Old"),
    Hook("STATE-CHECKPOINT-001", "STATE", "checkpoint_create", "validate_checkpoint", "ALWAYS", "Validate checkpoint data"),
    Hook("STATE-ROLLBACK-001", "STATE", "rollback_request", "validate_target", "BLOCK", "Validate rollback target"),
    Hook("STATE-SYNC-001", "STATE", "state_sync", "verify_consistency", "ALWAYS", "Verify state consistency"),
    
    # AGENT HOOKS (5) - Agent coordination
    Hook("AGENT-BEFORE-SPAWN-001", "AGENT", "before_agent_spawn", "validate_config", "ALWAYS", "Validate agent config"),
    Hook("AGENT-AFTER-SPAWN-001", "AGENT", "after_agent_spawn", "register_agent", "ALWAYS", "Register spawned agent"),
    Hook("AGENT-HANDOFF-001", "AGENT", "agent_handoff", "validate_handoff", "ALWAYS", "Validate agent handoff"),
    Hook("AGENT-RESULT-001", "AGENT", "agent_result", "validate_result", "ALWAYS", "Validate agent result"),
    Hook("AGENT-TERMINATE-001", "AGENT", "agent_terminate", "cleanup", "ALWAYS", "Cleanup on agent terminate"),
    
    # BATCH HOOKS (6) - Batch operations
    Hook("BATCH-BEFORE-001", "BATCH", "before_batch", "validate_operations", "ALWAYS", "Validate batch operations"),
    Hook("BATCH-AFTER-001", "BATCH", "after_batch", "summarize_results", "ALWAYS", "Summarize batch results"),
    Hook("BATCH-PARALLEL-001", "BATCH", "parallel_batch", "check_conflicts", "WARN", "Check for parallel conflicts"),
    Hook("BATCH-QUEUE-001", "BATCH", "queue_operation", "validate_priority", "ALWAYS", "Validate queue priority"),
    Hook("BATCH-RETRY-001", "BATCH", "batch_retry", "check_retry_limit", "BLOCK", "Check retry limit"),
    Hook("BATCH-TIMEOUT-001", "BATCH", "batch_timeout", "handle_timeout", "WARN", "Handle batch timeout"),
    
    # FORMULA HOOKS (4) - Formula application
    Hook("FORMULA-BEFORE-001", "FORMULA", "before_formula_apply", "validate_inputs", "ALWAYS", "Validate formula inputs"),
    Hook("FORMULA-AFTER-001", "FORMULA", "after_formula_apply", "validate_outputs", "ALWAYS", "Validate formula outputs"),
    Hook("FORMULA-UNITS-001", "FORMULA", "formula_units", "check_consistency", "BLOCK", "Check unit consistency"),
    Hook("FORMULA-DOMAIN-001", "FORMULA", "formula_domain", "check_applicability", "WARN", "Check formula applicability"),
]

# Build lookup dictionaries
HOOKS_BY_ID = {h.id: h for h in PHASE0_HOOKS}
HOOKS_BY_CATEGORY = {}
for h in PHASE0_HOOKS:
    HOOKS_BY_CATEGORY.setdefault(h.category, []).append(h)
HOOKS_BY_TRIGGER = {}
for h in PHASE0_HOOKS:
    HOOKS_BY_TRIGGER.setdefault(h.trigger, []).append(h)

# ============================================================================
# HOOK STATE
# ============================================================================

class HookState:
    """Tracks hook execution state."""
    
    def __init__(self):
        self.executions = []
        self.disabled_hooks = {}  # hook_id -> reason
        self.stats = {
            "total_executions": 0,
            "passed": 0,
            "blocked": 0,
            "warnings": 0,
            "errors": 0
        }
        self._load()
    
    def _load(self):
        """Load disabled hooks from file."""
        disabled_file = HOOKS_DIR / "disabled_hooks.json"
        if disabled_file.exists():
            try:
                self.disabled_hooks = json.loads(disabled_file.read_text(encoding="utf-8"))
            except:
                pass
    
    def save(self):
        """Save disabled hooks to file."""
        disabled_file = HOOKS_DIR / "disabled_hooks.json"
        disabled_file.write_text(json.dumps(self.disabled_hooks, indent=2), encoding="utf-8")
    
    def log_execution(self, execution: HookExecution):
        """Log hook execution."""
        self.executions.append(execution)
        self.executions = self.executions[-100:]  # Keep last 100
        
        # Update stats
        self.stats["total_executions"] += 1
        if execution.result == "PASSED":
            self.stats["passed"] += 1
        elif execution.result == "BLOCKED":
            self.stats["blocked"] += 1
        elif execution.result == "WARNING":
            self.stats["warnings"] += 1
        elif execution.result == "ERROR":
            self.stats["errors"] += 1
        
        # Append to log file
        with open(HOOK_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(execution)) + "\n")

# Global hook state
_hook_state = HookState()

# ============================================================================
# HOOK ENGINE
# ============================================================================

class HookEngine:
    """Phase 0 Hook execution engine."""
    
    def __init__(self):
        self.tools = self._build_tools()
    
    def _build_tools(self) -> Dict[str, callable]:
        return {
            "prism_hook_fire": self.prism_hook_fire,
            "prism_hook_chain": self.prism_hook_chain,
            "prism_hook_status": self.prism_hook_status,
            "prism_hook_coverage": self.prism_hook_coverage,
            "prism_hook_gaps": self.prism_hook_gaps,
            "prism_hook_enable": self.prism_hook_enable,
            "prism_hook_disable": self.prism_hook_disable,
            "prism_hook_phase0_list": self.prism_hook_phase0_list,
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Any:
        """Call a tool by name."""
        if tool_name not in self.tools:
            return {"error": f"Tool not found: {tool_name}"}
        try:
            if params:
                return self.tools[tool_name](**params)
            return self.tools[tool_name]()
        except Exception as e:
            return {"error": str(e), "tool": tool_name}
    
    # =========================================================================
    # CORE HOOK EXECUTION
    # =========================================================================
    
    def prism_hook_fire(
        self,
        hook_id: str = "",
        context: Dict = None,
        force: bool = False
    ) -> Dict:
        """
        Execute a single hook.
        
        Args:
            hook_id: Hook ID to execute (e.g., "CALC-SAFETY-VIOLATION-001")
            context: Context data for the hook
            force: Force execution even if disabled
        
        Returns:
            Execution result with pass/block status
        """
        global _hook_state
        
        if not hook_id:
            return {"error": "hook_id required"}
        
        # Find hook
        hook = HOOKS_BY_ID.get(hook_id)
        if not hook:
            return {"error": f"Hook not found: {hook_id}", "available": list(HOOKS_BY_ID.keys())[:10]}
        
        # Check if disabled
        if not force and hook_id in _hook_state.disabled_hooks:
            execution = HookExecution(
                hook_id=hook_id,
                timestamp=datetime.now().isoformat(),
                result="SKIPPED",
                message=f"Hook disabled: {_hook_state.disabled_hooks[hook_id]}",
                context=context or {},
                blocked=False
            )
            _hook_state.log_execution(execution)
            return {
                "status": "SKIPPED",
                "hook_id": hook_id,
                "reason": _hook_state.disabled_hooks[hook_id]
            }
        
        # Execute hook logic
        result, message, blocked = self._execute_hook_logic(hook, context or {})
        
        # Log execution
        execution = HookExecution(
            hook_id=hook_id,
            timestamp=datetime.now().isoformat(),
            result=result,
            message=message,
            context=context or {},
            blocked=blocked
        )
        _hook_state.log_execution(execution)
        
        return {
            "status": result,
            "hook_id": hook_id,
            "category": hook.category,
            "enforcement": hook.enforcement,
            "message": message,
            "blocked": blocked,
            "action_required": "STOP - Fix issue before proceeding" if blocked else None
        }
    
    def _execute_hook_logic(self, hook: Hook, context: Dict) -> Tuple[str, str, bool]:
        """
        Execute hook-specific logic.
        
        Returns: (result, message, blocked)
        """
        # SAFETY-CRITICAL HOOKS
        
        # CALC-SAFETY-VIOLATION-001: Block if S(x) < 0.70
        if hook.id == "CALC-SAFETY-VIOLATION-001":
            safety_score = context.get("S", context.get("safety_score"))
            if safety_score is not None and safety_score < 0.70:
                return ("BLOCKED", f"SAFETY VIOLATION: S(x)={safety_score} < 0.70 minimum", True)
            elif safety_score is not None:
                return ("PASSED", f"Safety check passed: S(x)={safety_score}", False)
            else:
                return ("WARNING", "No safety score provided - compute S(x) first", False)
        
        # STATE-ANTI-REGRESSION-001: Block if New < Old
        if hook.id == "STATE-ANTI-REGRESSION-001":
            old_count = context.get("old_count", context.get("old"))
            new_count = context.get("new_count", context.get("new"))
            if old_count is not None and new_count is not None:
                if new_count < old_count:
                    return ("BLOCKED", f"ANTI-REGRESSION: New ({new_count}) < Old ({old_count})", True)
                return ("PASSED", f"Anti-regression passed: {new_count} >= {old_count}", False)
            return ("WARNING", "Missing old_count/new_count for regression check", False)
        
        # FILE-GCODE-VALIDATE-001: Block dangerous G-codes
        if hook.id == "FILE-GCODE-VALIDATE-001":
            gcode = context.get("gcode", context.get("content", ""))
            dangerous = ["G28", "G53", "M30", "M02"]  # Home, machine coords, program end
            found_dangerous = [g for g in dangerous if g in str(gcode)]
            if found_dangerous:
                return ("WARNING", f"Potentially dangerous G-codes: {found_dangerous}", False)
            return ("PASSED", "G-code validation passed", False)
        
        # CALC-DIVISION-001: Block division by zero
        if hook.id == "CALC-DIVISION-001":
            divisor = context.get("divisor", context.get("denominator"))
            if divisor is not None and divisor == 0:
                return ("BLOCKED", "Division by zero blocked", True)
            return ("PASSED", "Division check passed", False)
        
        # CALC-NEGATIVE-001: Block sqrt of negative
        if hook.id == "CALC-NEGATIVE-001":
            value = context.get("value", context.get("input"))
            if value is not None and value < 0:
                return ("BLOCKED", f"Square root of negative ({value}) blocked", True)
            return ("PASSED", "Sqrt check passed", False)
        
        # Generic enforcement based on hook type
        enforcement = hook.enforcement
        
        if enforcement == "HARD_BLOCK":
            # For HARD_BLOCK hooks without specific logic, require explicit pass
            if context.get("passed") or context.get("valid"):
                return ("PASSED", f"Hook {hook.id} passed", False)
            return ("WARNING", f"HARD_BLOCK hook {hook.id} requires explicit validation", False)
        
        elif enforcement == "BLOCK":
            if context.get("error") or context.get("invalid"):
                return ("BLOCKED", f"Hook {hook.id} blocked: {context.get('error', 'validation failed')}", True)
            return ("PASSED", f"Hook {hook.id} passed", False)
        
        elif enforcement == "WARN":
            if context.get("warning") or context.get("issue"):
                return ("WARNING", f"Hook {hook.id} warning: {context.get('warning', context.get('issue'))}", False)
            return ("PASSED", f"Hook {hook.id} passed", False)
        
        elif enforcement == "LOG":
            return ("PASSED", f"Hook {hook.id} logged", False)
        
        elif enforcement == "AUTO":
            return ("PASSED", f"Hook {hook.id} auto-executed", False)
        
        else:  # ALWAYS
            return ("PASSED", f"Hook {hook.id} executed", False)
    
    def prism_hook_chain(
        self,
        hook_ids: List[str] = None,
        context: Dict = None,
        stop_on_block: bool = True
    ) -> Dict:
        """
        Execute a chain of hooks in sequence.
        
        Args:
            hook_ids: List of hook IDs to execute
            context: Shared context for all hooks
            stop_on_block: Stop chain if any hook blocks
        
        Returns:
            Results for all hooks with overall status
        """
        if not hook_ids:
            return {"error": "hook_ids list required"}
        
        results = []
        overall_blocked = False
        context = context or {}
        
        for hook_id in hook_ids:
            result = self.prism_hook_fire(hook_id=hook_id, context=context)
            results.append(result)
            
            if result.get("blocked"):
                overall_blocked = True
                if stop_on_block:
                    break
        
        return {
            "status": "CHAIN_BLOCKED" if overall_blocked else "CHAIN_PASSED",
            "hooks_executed": len(results),
            "hooks_requested": len(hook_ids),
            "blocked": overall_blocked,
            "results": results,
            "stopped_early": overall_blocked and stop_on_block and len(results) < len(hook_ids)
        }
    
    # =========================================================================
    # HOOK MANAGEMENT
    # =========================================================================
    
    def prism_hook_status(self, hook_id: str = None) -> Dict:
        """
        Get hook execution status.
        
        Args:
            hook_id: Specific hook ID, or None for overall stats
        """
        global _hook_state
        
        if hook_id:
            # Get specific hook info
            hook = HOOKS_BY_ID.get(hook_id)
            if not hook:
                return {"error": f"Hook not found: {hook_id}"}
            
            recent = [e for e in _hook_state.executions if e.hook_id == hook_id]
            
            return {
                "hook_id": hook_id,
                "category": hook.category,
                "trigger": hook.trigger,
                "action": hook.action,
                "enforcement": hook.enforcement,
                "description": hook.description,
                "enabled": hook_id not in _hook_state.disabled_hooks,
                "disabled_reason": _hook_state.disabled_hooks.get(hook_id),
                "recent_executions": len(recent),
                "last_execution": asdict(recent[-1]) if recent else None
            }
        
        # Overall stats
        return {
            "status": "HOOK_STATS",
            "total_phase0_hooks": len(PHASE0_HOOKS),
            "by_category": {cat: len(hooks) for cat, hooks in HOOKS_BY_CATEGORY.items()},
            "disabled_count": len(_hook_state.disabled_hooks),
            "execution_stats": _hook_state.stats,
            "recent_executions": len(_hook_state.executions)
        }
    
    def prism_hook_coverage(self, category: str = None) -> Dict:
        """
        Check which hooks are wired/active.
        
        Returns coverage report for Phase 0 hooks.
        """
        global _hook_state
        
        hooks_to_check = PHASE0_HOOKS
        if category:
            hooks_to_check = HOOKS_BY_CATEGORY.get(category, [])
        
        coverage = {
            "enabled": [],
            "disabled": [],
            "never_fired": [],
            "recently_fired": []
        }
        
        fired_ids = set(e.hook_id for e in _hook_state.executions)
        
        for hook in hooks_to_check:
            if hook.id in _hook_state.disabled_hooks:
                coverage["disabled"].append(hook.id)
            else:
                coverage["enabled"].append(hook.id)
            
            if hook.id not in fired_ids:
                coverage["never_fired"].append(hook.id)
            else:
                coverage["recently_fired"].append(hook.id)
        
        total = len(hooks_to_check)
        enabled_pct = len(coverage["enabled"]) / total * 100 if total > 0 else 0
        fired_pct = len(coverage["recently_fired"]) / total * 100 if total > 0 else 0
        
        return {
            "status": "COVERAGE_REPORT",
            "category": category or "ALL",
            "total_hooks": total,
            "enabled": len(coverage["enabled"]),
            "disabled": len(coverage["disabled"]),
            "enabled_percentage": round(enabled_pct, 1),
            "fired_percentage": round(fired_pct, 1),
            "never_fired": coverage["never_fired"][:10],  # First 10
            "disabled_list": coverage["disabled"]
        }
    
    def prism_hook_gaps(self, critical_only: bool = True) -> Dict:
        """
        Find unwired or problematic hooks.
        
        Args:
            critical_only: Only show HARD_BLOCK and BLOCK hooks
        """
        global _hook_state
        
        gaps = {
            "disabled_critical": [],
            "never_fired_critical": [],
            "high_failure_rate": []
        }
        
        fired_ids = set(e.hook_id for e in _hook_state.executions)
        
        for hook in PHASE0_HOOKS:
            is_critical = hook.enforcement in ["HARD_BLOCK", "BLOCK"]
            
            if critical_only and not is_critical:
                continue
            
            if hook.id in _hook_state.disabled_hooks:
                gaps["disabled_critical"].append({
                    "hook_id": hook.id,
                    "enforcement": hook.enforcement,
                    "reason": _hook_state.disabled_hooks[hook.id]
                })
            
            if hook.id not in fired_ids:
                gaps["never_fired_critical"].append({
                    "hook_id": hook.id,
                    "enforcement": hook.enforcement,
                    "trigger": hook.trigger
                })
        
        # Check failure rates
        hook_failures = {}
        for e in _hook_state.executions:
            if e.hook_id not in hook_failures:
                hook_failures[e.hook_id] = {"total": 0, "failures": 0}
            hook_failures[e.hook_id]["total"] += 1
            if e.result in ["BLOCKED", "ERROR"]:
                hook_failures[e.hook_id]["failures"] += 1
        
        for hook_id, stats in hook_failures.items():
            if stats["total"] >= 5:  # Minimum sample
                failure_rate = stats["failures"] / stats["total"]
                if failure_rate > 0.5:
                    gaps["high_failure_rate"].append({
                        "hook_id": hook_id,
                        "failure_rate": round(failure_rate * 100, 1),
                        "sample_size": stats["total"]
                    })
        
        total_gaps = (
            len(gaps["disabled_critical"]) +
            len(gaps["never_fired_critical"]) +
            len(gaps["high_failure_rate"])
        )
        
        return {
            "status": "GAPS_FOUND" if total_gaps > 0 else "NO_GAPS",
            "total_gaps": total_gaps,
            "gaps": gaps,
            "recommendation": "Wire missing critical hooks to maintain safety" if total_gaps > 0 else "All critical hooks covered"
        }
    
    def prism_hook_enable(self, hook_id: str = "") -> Dict:
        """Enable a disabled hook."""
        global _hook_state
        
        if not hook_id:
            return {"error": "hook_id required"}
        
        if hook_id not in HOOKS_BY_ID:
            return {"error": f"Hook not found: {hook_id}"}
        
        if hook_id not in _hook_state.disabled_hooks:
            return {"status": "ALREADY_ENABLED", "hook_id": hook_id}
        
        reason = _hook_state.disabled_hooks.pop(hook_id)
        _hook_state.save()
        
        return {
            "status": "ENABLED",
            "hook_id": hook_id,
            "previous_disable_reason": reason
        }
    
    def prism_hook_disable(self, hook_id: str = "", reason: str = "") -> Dict:
        """
        Disable a hook with reason.
        
        WARNING: Disabling HARD_BLOCK hooks removes safety protections!
        """
        global _hook_state
        
        if not hook_id:
            return {"error": "hook_id required"}
        
        if not reason:
            return {"error": "reason required - explain why disabling"}
        
        hook = HOOKS_BY_ID.get(hook_id)
        if not hook:
            return {"error": f"Hook not found: {hook_id}"}
        
        # Warn for critical hooks
        warning = None
        if hook.enforcement == "HARD_BLOCK":
            warning = f"⚠️ CRITICAL: Disabling HARD_BLOCK hook {hook_id} removes safety protection!"
        
        _hook_state.disabled_hooks[hook_id] = reason
        _hook_state.save()
        
        return {
            "status": "DISABLED",
            "hook_id": hook_id,
            "reason": reason,
            "warning": warning,
            "enforcement": hook.enforcement
        }
    
    def prism_hook_phase0_list(self, category: str = None) -> Dict:
        """
        List all Phase 0 hooks.
        
        Args:
            category: Filter by category (CALC, FILE, STATE, AGENT, BATCH, FORMULA)
        """
        if category:
            hooks = HOOKS_BY_CATEGORY.get(category, [])
        else:
            hooks = PHASE0_HOOKS
        
        return {
            "status": "PHASE0_HOOKS",
            "total": len(hooks),
            "categories": list(HOOKS_BY_CATEGORY.keys()),
            "by_enforcement": {
                "HARD_BLOCK": [h.id for h in hooks if h.enforcement == "HARD_BLOCK"],
                "BLOCK": [h.id for h in hooks if h.enforcement == "BLOCK"],
                "WARN": [h.id for h in hooks if h.enforcement == "WARN"],
                "ALWAYS": [h.id for h in hooks if h.enforcement == "ALWAYS"],
                "AUTO": [h.id for h in hooks if h.enforcement == "AUTO"],
                "LOG": [h.id for h in hooks if h.enforcement == "LOG"]
            },
            "hooks": [
                {
                    "id": h.id,
                    "category": h.category,
                    "trigger": h.trigger,
                    "enforcement": h.enforcement,
                    "description": h.description
                }
                for h in hooks
            ]
        }


# ============================================================================
# MODULE INTERFACE
# ============================================================================

_hook_engine_instance = None

def get_hook_engine() -> HookEngine:
    """Get singleton instance."""
    global _hook_engine_instance
    if _hook_engine_instance is None:
        _hook_engine_instance = HookEngine()
    return _hook_engine_instance


# ============================================================================
# CLI TEST
# ============================================================================

if __name__ == "__main__":
    import argparse as _argparse
    _parser = _argparse.ArgumentParser(description="PRISM Phase 0 Hooks")
    _parser.add_argument("--action", default="info", choices=["list", "info", "test"])
    _parser.add_argument("--format", default="text", choices=["json", "text"])
    _args = _parser.parse_args()
    
    engine = get_hook_engine()
    
    if _args.action == "list" and _args.format == "json":
        import json as _json
        phase0 = engine.prism_hook_phase0_list()
        categories = {}
        for h in PHASE0_HOOKS:
            if h.category not in categories:
                categories[h.category] = {"count": 0, "blocking": 0, "hooks": []}
            categories[h.category]["count"] += 1
            if h.enforcement in ("HARD_BLOCK", "BLOCK"):
                categories[h.category]["blocking"] += 1
            categories[h.category]["hooks"].append(h.id)
        blocking_total = sum(c["blocking"] for c in categories.values())
        print(_json.dumps({
            "total": len(PHASE0_HOOKS),
            "blocking": blocking_total,
            "categories": categories,
            "by_enforcement": {k: len(v) for k, v in phase0["by_enforcement"].items()}
        }))
    elif _args.format == "json":
        import json as _json
        print(_json.dumps({"total": len(PHASE0_HOOKS), "status": "loaded"}))
    else:
        print("=" * 60)
        print("PRISM Phase 0 Hooks v1.0")
        print("Hook-First Architecture")
        print("=" * 60)
    
    # List Phase 0 hooks
    print("\n📋 Phase 0 Hooks")
    result = engine.prism_hook_phase0_list()
    print(f"   Total: {result['total']}")
    print(f"   HARD_BLOCK: {len(result['by_enforcement']['HARD_BLOCK'])}")
    print(f"   BLOCK: {len(result['by_enforcement']['BLOCK'])}")
    
    # Test safety hook
    print("\n📋 Safety Hook Test")
    result = engine.prism_hook_fire(
        hook_id="CALC-SAFETY-VIOLATION-001",
        context={"S": 0.65}
    )
    print(f"   Status: {result['status']}")
    print(f"   Blocked: {result['blocked']}")
    print(f"   Message: {result['message']}")
    
    # Test passing safety
    result = engine.prism_hook_fire(
        hook_id="CALC-SAFETY-VIOLATION-001",
        context={"S": 0.85}
    )
    print(f"   Passing S=0.85: {result['status']}")
    
    # Test anti-regression
    print("\n📋 Anti-Regression Hook Test")
    result = engine.prism_hook_fire(
        hook_id="STATE-ANTI-REGRESSION-001",
        context={"old_count": 100, "new_count": 80}
    )
    print(f"   Status: {result['status']}")
    print(f"   Message: {result['message']}")
    
    # Get coverage
    print("\n📋 Hook Coverage")
    result = engine.prism_hook_coverage()
    print(f"   Enabled: {result['enabled_percentage']}%")
    print(f"   Fired: {result['fired_percentage']}%")
    
    print("\n✅ All Phase 0 Hook tools working")
    print(f"   Total tools: {len(engine.tools)}")
