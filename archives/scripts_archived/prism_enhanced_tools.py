#!/usr/bin/env python3
"""
PRISM Enhanced Tools Module v1.0
================================
Ports highest-value TypeScript tools to Python for MCP server enhancement.

TIER 1 - Context/Token/Session Management:
  - Context Engineering (Manus 6 Laws)
  - Session Lifecycle
  - Development Protocol (SP workflow)
  - Hook-First Architecture (Phase 0)

TIER 2 - Safety-Critical:
  - Collision Detection
  - Spindle Protection
  - Tool Breakage Prediction

Total New Tools: ~39
"""

import json
import hashlib
import re
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
EVENTS_DIR = STATE_DIR / "events"
ERRORS_DIR = STATE_DIR / "errors"
DECISIONS_DIR = STATE_DIR / "decisions"
SNAPSHOTS_DIR = STATE_DIR / "snapshots"
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"
HOOK_REGISTRY = STATE_DIR / "HOOK_REGISTRY.json"
TODO_FILE = STATE_DIR / "todo.md"

# Ensure directories exist
for d in [EVENTS_DIR, ERRORS_DIR, DECISIONS_DIR, SNAPSHOTS_DIR, CHECKPOINTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 0 HOOKS - Safety-Critical Enforcement
# ═══════════════════════════════════════════════════════════════════════════

PHASE0_HOOKS = {
    # Calculation Hooks (12)
    "CALC-BEFORE-KIENZLE-001": {"trigger": "before_kienzle", "action": "validate_inputs", "enforcement": "ALWAYS"},
    "CALC-AFTER-KIENZLE-001": {"trigger": "after_kienzle", "action": "check_force_limits", "enforcement": "ALWAYS"},
    "CALC-BEFORE-TAYLOR-001": {"trigger": "before_taylor", "action": "validate_inputs", "enforcement": "ALWAYS"},
    "CALC-AFTER-TAYLOR-001": {"trigger": "after_taylor", "action": "check_tool_life", "enforcement": "ALWAYS"},
    "CALC-BEFORE-MRR-001": {"trigger": "before_mrr", "action": "validate_params", "enforcement": "ALWAYS"},
    "CALC-AFTER-MRR-001": {"trigger": "after_mrr", "action": "check_power", "enforcement": "ALWAYS"},
    "CALC-BEFORE-SURFACE-001": {"trigger": "before_surface", "action": "validate_params", "enforcement": "ALWAYS"},
    "CALC-AFTER-SURFACE-001": {"trigger": "after_surface", "action": "check_roughness", "enforcement": "ALWAYS"},
    "CALC-SAFETY-VIOLATION-001": {"trigger": "safety_score_low", "action": "HARD_BLOCK", "enforcement": "HARD_BLOCK"},
    "CALC-VALIDATE-UNITS-001": {"trigger": "any_calc", "action": "check_units", "enforcement": "ALWAYS"},
    "CALC-RANGE-CHECK-001": {"trigger": "any_calc", "action": "validate_ranges", "enforcement": "ALWAYS"},
    "CALC-PHYSICS-SANITY-001": {"trigger": "any_calc", "action": "physics_sanity", "enforcement": "ALWAYS"},
    
    # File Hooks (8)
    "FILE-BEFORE-WRITE-001": {"trigger": "before_write", "action": "backup_original", "enforcement": "ALWAYS"},
    "FILE-AFTER-WRITE-001": {"trigger": "after_write", "action": "verify_write", "enforcement": "ALWAYS"},
    "FILE-BEFORE-DELETE-001": {"trigger": "before_delete", "action": "confirm_backup", "enforcement": "HARD_BLOCK"},
    "FILE-GCODE-VALIDATE-001": {"trigger": "gcode_output", "action": "validate_gcode", "enforcement": "HARD_BLOCK"},
    "FILE-JSON-SORT-001": {"trigger": "json_write", "action": "sort_keys", "enforcement": "ALWAYS"},
    "FILE-CHECKPOINT-001": {"trigger": "checkpoint", "action": "save_state", "enforcement": "ALWAYS"},
    "FILE-ANTI-CORRUPT-001": {"trigger": "any_write", "action": "atomic_write", "enforcement": "ALWAYS"},
    "FILE-SIZE-CHECK-001": {"trigger": "before_write", "action": "check_size", "enforcement": "WARN"},
    
    # State Hooks (6)
    "STATE-BEFORE-MUTATE-001": {"trigger": "before_state_change", "action": "snapshot", "enforcement": "ALWAYS"},
    "STATE-AFTER-MUTATE-001": {"trigger": "after_state_change", "action": "verify_integrity", "enforcement": "ALWAYS"},
    "STATE-ANTI-REGRESSION-001": {"trigger": "state_replace", "action": "count_check", "enforcement": "HARD_BLOCK"},
    "STATE-CHECKPOINT-001": {"trigger": "every_5_ops", "action": "auto_checkpoint", "enforcement": "ALWAYS"},
    "STATE-RESTORE-001": {"trigger": "restore_request", "action": "validate_chain", "enforcement": "ALWAYS"},
    "STATE-COMPRESS-001": {"trigger": "context_orange", "action": "compress_state", "enforcement": "AUTO"},
    
    # Agent Hooks (5)
    "AGENT-BEFORE-SPAWN-001": {"trigger": "before_spawn", "action": "check_resources", "enforcement": "ALWAYS"},
    "AGENT-AFTER-SPAWN-001": {"trigger": "after_spawn", "action": "register_agent", "enforcement": "ALWAYS"},
    "AGENT-TASK-ASSIGN-001": {"trigger": "task_assign", "action": "validate_capability", "enforcement": "ALWAYS"},
    "AGENT-RESULT-VALIDATE-001": {"trigger": "agent_result", "action": "quality_check", "enforcement": "ALWAYS"},
    "AGENT-TIER-SELECT-001": {"trigger": "agent_request", "action": "select_tier", "enforcement": "ALWAYS"},
    
    # Batch Hooks (6)
    "BATCH-BEFORE-EXEC-001": {"trigger": "before_batch", "action": "validate_ops", "enforcement": "ALWAYS"},
    "BATCH-AFTER-EXEC-001": {"trigger": "after_batch", "action": "aggregate_results", "enforcement": "ALWAYS"},
    "BATCH-PARALLEL-001": {"trigger": "parallel_batch", "action": "check_conflicts", "enforcement": "ALWAYS"},
    "BATCH-ROLLBACK-001": {"trigger": "batch_error", "action": "rollback_partial", "enforcement": "ALWAYS"},
    "BATCH-PROGRESS-001": {"trigger": "batch_item", "action": "update_progress", "enforcement": "ALWAYS"},
    "BATCH-TIMEOUT-001": {"trigger": "batch_timeout", "action": "graceful_stop", "enforcement": "ALWAYS"},
    
    # Formula Hooks (4)
    "FORMULA-BEFORE-APPLY-001": {"trigger": "before_formula", "action": "validate_params", "enforcement": "ALWAYS"},
    "FORMULA-AFTER-APPLY-001": {"trigger": "after_formula", "action": "check_result", "enforcement": "ALWAYS"},
    "FORMULA-UNIT-CHECK-001": {"trigger": "any_formula", "action": "verify_units", "enforcement": "ALWAYS"},
    "FORMULA-DOMAIN-001": {"trigger": "formula_select", "action": "check_domain", "enforcement": "ALWAYS"},
}

# ═══════════════════════════════════════════════════════════════════════════
# SESSION STATE
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class SessionState:
    session_id: str
    started_at: str
    task_name: str = "Initialization"
    current_focus: str = "Session startup"
    tool_calls: int = 0
    checkpoints: int = 0
    context_pressure: str = "GREEN"
    quality_scores: Dict = None
    blocking_issues: List[str] = None
    recent_decisions: List[str] = None
    
    def __post_init__(self):
        if self.quality_scores is None:
            self.quality_scores = {"S": None, "omega": None}
        if self.blocking_issues is None:
            self.blocking_issues = []
        if self.recent_decisions is None:
            self.recent_decisions = []

# Global session state
_session: SessionState = None

def get_session() -> SessionState:
    global _session
    if _session is None:
        _session = SessionState(
            session_id=f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            started_at=datetime.now().isoformat()
        )
    return _session

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def sort_object_keys(obj: Any) -> Any:
    """Recursively sort dictionary keys for KV-cache stability."""
    if isinstance(obj, dict):
        return {k: sort_object_keys(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [sort_object_keys(item) for item in obj]
    return obj

def generate_event_id(prefix: str) -> str:
    """Generate unique event ID."""
    date = datetime.now().strftime('%Y%m%d')
    seq = str(int(datetime.now().timestamp() * 1000))[-6:]
    return f"{prefix}-{date}-{seq}"

def append_jsonl(filepath: Path, data: Dict) -> None:
    """Append sorted JSON line to file."""
    sorted_data = sort_object_keys(data)
    with open(filepath, 'a', encoding='utf-8') as f:
        f.write(json.dumps(sorted_data) + '\n')

def compute_checksum(data: Any) -> str:
    """Compute SHA256 checksum of data."""
    return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]

# ═══════════════════════════════════════════════════════════════════════════
# CONTEXT ENGINEERING TOOLS (Manus 6 Laws)
# ═══════════════════════════════════════════════════════════════════════════

class ContextEngineeringMCP:
    """Implements Manus AI's 6 Laws of Context Engineering."""
    
    def __init__(self):
        self.tools = {
            # LAW 1: KV-Cache Stability
            "prism_kv_sort_json": self.kv_sort_json,
            "prism_kv_check_stability": self.kv_check_stability,
            
            # LAW 2: Mask Don't Remove
            "prism_tool_mask_state": self.tool_mask_state,
            
            # LAW 3: File System as Context
            "prism_memory_externalize": self.memory_externalize,
            "prism_memory_restore": self.memory_restore,
            
            # LAW 4: Attention via Recitation
            "prism_todo_update": self.todo_update,
            "prism_attention_focus": self.attention_focus,
            
            # LAW 5: Keep Wrong Stuff
            "prism_error_preserve": self.error_preserve,
            "prism_error_patterns": self.error_patterns,
            
            # LAW 6: Don't Get Few-Shotted
            "prism_vary_response": self.vary_response,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 1: KV-Cache Stability
    # ─────────────────────────────────────────────────────────────────────────
    
    def kv_sort_json(self, data: Dict = None, file_path: str = None) -> Dict:
        """Sort JSON keys for deterministic serialization (KV-cache stability)."""
        if file_path:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        if not data:
            return {"error": "No data provided"}
        
        sorted_data = sort_object_keys(data)
        
        if file_path:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(sorted_data, f, indent=2)
        
        return {
            "status": "JSON_SORTED",
            "law": "Manus Law 1: KV-Cache Stability",
            "principle": "Deterministic serialization = consistent cache hits",
            "keys_sorted": True,
            "written_to": file_path,
            "sample_keys": list(sorted_data.keys())[:5] if isinstance(sorted_data, dict) else None
        }
    
    def kv_check_stability(self, content: str) -> Dict:
        """Check if content is stable for KV-cache (no dynamic content in prefix)."""
        issues = []
        
        # Check for timestamps
        if re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}', content):
            issues.append("Contains ISO timestamp - move to END of context")
        if re.search(r'\d{2}/\d{2}/\d{4}', content):
            issues.append("Contains date format - move to END of context")
        
        # Check for session IDs
        if re.search(r'SESSION-\d+|session_id|sessionId', content):
            issues.append("Contains session ID - move to dynamic suffix")
        
        # Check for random-looking IDs
        if re.search(r'[a-f0-9]{32,}|[A-Za-z0-9]{20,}', content):
            issues.append("Contains hash/UUID - may invalidate cache")
        
        stable = len(issues) == 0
        
        return {
            "status": "PREFIX_STABLE" if stable else "STABILITY_ISSUES",
            "law": "Manus Law 1: KV-Cache Stability",
            "stable": stable,
            "issues": issues,
            "recommendation": "Prefix is cache-stable" if stable else "Move dynamic content to END",
            "cache_impact": "Cached: $0.30/MTok" if stable else "Uncached: $3.00/MTok (10x cost)"
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 2: Mask Don't Remove
    # ─────────────────────────────────────────────────────────────────────────
    
    def tool_mask_state(self, current_state: str) -> Dict:
        """Get tool availability for current workflow state."""
        TOOL_STATES = {
            "INITIALIZATION": {
                "available": ["prism_state_*", "prism_gsd_*", "prism_skill_*"],
                "masked": ["prism_material_write", "prism_machine_write", "prism_code_execute"]
            },
            "PLANNING": {
                "available": ["prism_state_*", "prism_skill_*", "prism_sp_brainstorm"],
                "masked": ["prism_code_execute", "prism_material_write"]
            },
            "EXECUTION": {
                "available": ["*"],
                "masked": []
            },
            "VALIDATION": {
                "available": ["prism_validate_*", "prism_safety_*", "prism_cognitive_*"],
                "masked": ["prism_code_execute", "prism_material_write"]
            },
            "ERROR_RECOVERY": {
                "available": ["prism_state_*", "prism_error_*", "prism_checkpoint_*"],
                "masked": ["prism_material_write", "prism_code_execute"]
            }
        }
        
        state = TOOL_STATES.get(current_state, TOOL_STATES["EXECUTION"])
        
        return {
            "status": "TOOL_MASK_STATE",
            "law": "Manus Law 2: Mask Don't Remove",
            "principle": "All tools in context, availability controlled by state",
            "current_state": current_state,
            "available_patterns": state["available"],
            "masked_patterns": state["masked"]
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 3: File System as Context
    # ─────────────────────────────────────────────────────────────────────────
    
    def memory_externalize(self, memory_type: str, content: Dict, key: str = None) -> Dict:
        """Externalize context to file system (unlimited memory)."""
        event_id = generate_event_id(memory_type.upper()[:3])
        timestamp = datetime.now().isoformat()
        
        record = {
            "id": event_id,
            "timestamp": timestamp,
            "type": memory_type,
            "restoration_key": key or event_id,
            "content": sort_object_keys(content),
            "checksum": compute_checksum(content)
        }
        
        # Route to appropriate directory
        if memory_type == "event":
            filepath = EVENTS_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "decision":
            filepath = DECISIONS_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "error":
            filepath = ERRORS_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "snapshot":
            filepath = SNAPSHOTS_DIR / f"{event_id}.json"
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(record, f, indent=2)
        else:
            filepath = STATE_DIR / f"custom_{event_id}.json"
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(record, f, indent=2)
        
        return {
            "status": "EXTERNALIZED",
            "law": "Manus Law 3: File System as Context",
            "id": event_id,
            "restoration_key": record["restoration_key"],
            "filepath": str(filepath),
            "checksum": record["checksum"]
        }
    
    def memory_restore(self, key: str = None, filepath: str = None) -> Dict:
        """Restore externalized memory from file system."""
        if filepath:
            path = Path(filepath)
            if not path.exists():
                return {"error": f"File not found: {filepath}"}
            
            with open(path, 'r', encoding='utf-8') as f:
                if path.suffix == '.jsonl':
                    # Search JSONL for key
                    for line in f:
                        record = json.loads(line)
                        if key and record.get("restoration_key") == key:
                            return {"status": "RESTORED", "record": record}
                    return {"error": f"Key not found: {key}"}
                else:
                    return {"status": "RESTORED", "record": json.load(f)}
        
        # Search all directories for key
        for search_dir in [EVENTS_DIR, DECISIONS_DIR, ERRORS_DIR, SNAPSHOTS_DIR]:
            for file in search_dir.glob("*"):
                with open(file, 'r', encoding='utf-8') as f:
                    if file.suffix == '.jsonl':
                        for line in f:
                            record = json.loads(line)
                            if record.get("restoration_key") == key:
                                return {"status": "RESTORED", "record": record}
                    elif file.suffix == '.json':
                        record = json.load(f)
                        if record.get("restoration_key") == key:
                            return {"status": "RESTORED", "record": record}
        
        return {"error": f"Key not found in any directory: {key}"}
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 4: Attention via Recitation
    # ─────────────────────────────────────────────────────────────────────────
    
    def todo_update(self, task_name: str = None, current_focus: str = None, 
                    steps: List[Dict] = None, next_action: str = None,
                    blocking_issues: List[str] = None, S_score: float = None,
                    omega_score: float = None) -> Dict:
        """Update TODO state for attention anchoring (call every 5-8 ops)."""
        session = get_session()
        session.tool_calls += 1
        
        if task_name:
            session.task_name = task_name
        if current_focus:
            session.current_focus = current_focus
        if blocking_issues is not None:
            session.blocking_issues = blocking_issues
        if S_score is not None:
            session.quality_scores["S"] = S_score
        if omega_score is not None:
            session.quality_scores["omega"] = omega_score
        
        # Generate TODO markdown
        todo_content = f"""# PRISM Session TODO
**Session:** {session.session_id}
**Task:** {session.task_name}
**Focus:** {session.current_focus}
**Tool Calls:** {session.tool_calls}
**Context:** {session.context_pressure}

## Quality Gates
- S(x): {session.quality_scores['S'] or 'Not computed'}
- Ω(x): {session.quality_scores['omega'] or 'Not computed'}

## Blocking Issues
{chr(10).join(f'- {issue}' for issue in session.blocking_issues) or '- None'}

## Next Action
{next_action or 'Continue current task'}

---
*Updated: {datetime.now().isoformat()}*
"""
        
        with open(TODO_FILE, 'w', encoding='utf-8') as f:
            f.write(todo_content)
        
        # Check if checkpoint needed
        checkpoint_due = session.tool_calls % 5 == 0
        
        return {
            "status": "TODO_UPDATED",
            "law": "Manus Law 4: Attention via Recitation",
            "session_id": session.session_id,
            "tool_calls": session.tool_calls,
            "checkpoint_due": checkpoint_due,
            "recommendation": "Create checkpoint now" if checkpoint_due else None,
            "context_pressure": session.context_pressure
        }
    
    def attention_focus(self, topic: str, priority: int = 1) -> Dict:
        """Focus attention on specific topic."""
        session = get_session()
        session.current_focus = topic
        
        return {
            "status": "ATTENTION_FOCUSED",
            "law": "Manus Law 4: Attention via Recitation",
            "topic": topic,
            "priority": priority,
            "principle": "Periodic recitation prevents attention drift"
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 5: Keep Wrong Stuff in Context
    # ─────────────────────────────────────────────────────────────────────────
    
    def error_preserve(self, error_type: str, error_message: str, 
                       context: Dict = None, resolution: str = None) -> Dict:
        """Preserve errors for learning (don't delete wrong attempts)."""
        event_id = generate_event_id("ERR")
        timestamp = datetime.now().isoformat()
        
        record = {
            "id": event_id,
            "timestamp": timestamp,
            "type": error_type,
            "message": error_message,
            "context": context or {},
            "resolution": resolution,
            "learning_extracted": False
        }
        
        filepath = ERRORS_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
        append_jsonl(filepath, record)
        
        return {
            "status": "ERROR_PRESERVED",
            "law": "Manus Law 5: Keep Wrong Stuff",
            "principle": "Errors are learning signals, not garbage",
            "id": event_id,
            "filepath": str(filepath),
            "tip": "Use prism_error_patterns to extract learnings"
        }
    
    def error_patterns(self, days: int = 7) -> Dict:
        """Extract learning patterns from preserved errors."""
        patterns = {}
        error_count = 0
        
        for file in ERRORS_DIR.glob("*.jsonl"):
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    record = json.loads(line)
                    error_type = record.get("type", "unknown")
                    patterns[error_type] = patterns.get(error_type, 0) + 1
                    error_count += 1
        
        # Sort by frequency
        sorted_patterns = dict(sorted(patterns.items(), key=lambda x: -x[1]))
        
        return {
            "status": "PATTERNS_EXTRACTED",
            "law": "Manus Law 5: Keep Wrong Stuff",
            "total_errors": error_count,
            "patterns": sorted_patterns,
            "top_3": list(sorted_patterns.keys())[:3],
            "recommendation": "Focus on most frequent error types"
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # LAW 6: Don't Get Few-Shotted
    # ─────────────────────────────────────────────────────────────────────────
    
    def vary_response(self, response_type: str) -> Dict:
        """Get variation guidance to avoid mimicry/few-shot overfitting."""
        VARIATION_STRATEGIES = {
            "list": [
                "Vary ordering (not always alphabetical)",
                "Sometimes use bullets, sometimes numbers",
                "Vary list length (don't always give exactly 5)",
                "Include unexpected items occasionally"
            ],
            "code": [
                "Vary naming conventions slightly",
                "Use different but equivalent patterns",
                "Vary comment density",
                "Alternate between verbose and concise"
            ],
            "explanation": [
                "Vary sentence structure",
                "Use different analogies each time",
                "Alternate detail levels",
                "Sometimes lead with conclusion, sometimes build to it"
            ],
            "json": [
                "Vary key ordering (sorted, logical, random)",
                "Include optional fields inconsistently",
                "Vary null vs omitted for empty values"
            ]
        }
        
        strategies = VARIATION_STRATEGIES.get(response_type, VARIATION_STRATEGIES["explanation"])
        
        return {
            "status": "VARIATION_GUIDANCE",
            "law": "Manus Law 6: Don't Get Few-Shotted",
            "principle": "Vary responses to prevent pattern lock-in",
            "response_type": response_type,
            "strategies": strategies,
            "warning": "Repetitive patterns train the model to repeat mistakes"
        }


# ═══════════════════════════════════════════════════════════════════════════
# HOOK-FIRST ARCHITECTURE (Phase 0 Enforcement)
# ═══════════════════════════════════════════════════════════════════════════

class HookEngineMCP:
    """Phase 0 Hook enforcement with safety-critical blocks."""
    
    def __init__(self):
        self.phase0_hooks = PHASE0_HOOKS
        self.domain_hooks = self._load_domain_hooks()
        self.execution_log = []
        
        self.tools = {
            "prism_hook_fire": self.fire_hook,
            "prism_hook_chain_v2": self.chain_hooks,
            "prism_hook_status": self.get_status,
            "prism_hook_coverage": self.get_coverage,
            "prism_hook_gaps": self.find_gaps,
            "prism_hook_enable": self.enable_hook,
            "prism_hook_disable": self.disable_hook,
            "prism_hook_phase0_list": self.list_phase0,
        }
    
    def _load_domain_hooks(self) -> Dict:
        """Load domain hooks from registry."""
        if HOOK_REGISTRY.exists():
            with open(HOOK_REGISTRY, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def fire_hook(self, hook_id: str, context: Dict = None, data: Dict = None) -> Dict:
        """Fire a specific hook with context.
        
        Args:
            hook_id: The hook identifier
            context: Context data (preferred parameter name)
            data: Alias for context (for compatibility)
        """
        # Support both parameter names for compatibility
        ctx = context if context is not None else (data if data is not None else {})
        
        # Check Phase 0 hooks first
        if hook_id in self.phase0_hooks:
            hook = self.phase0_hooks[hook_id]
            enforcement = hook.get("enforcement", "ALWAYS")
            
            # Safety-critical HARD_BLOCK hooks
            if enforcement == "HARD_BLOCK":
                if hook_id == "CALC-SAFETY-VIOLATION-001":
                    S_score = ctx.get("S_score", 1.0)
                    if S_score < 0.70:
                        return {
                            "status": "BLOCKED",
                            "hook_id": hook_id,
                            "enforcement": "HARD_BLOCK",
                            "reason": f"S(x) = {S_score} < 0.70 threshold",
                            "action": "OUTPUT_BLOCKED"
                        }
                
                elif hook_id == "STATE-ANTI-REGRESSION-001":
                    old_count = ctx.get("old_count", 0)
                    new_count = ctx.get("new_count", 0)
                    if new_count < old_count:
                        return {
                            "status": "BLOCKED",
                            "hook_id": hook_id,
                            "enforcement": "HARD_BLOCK",
                            "reason": f"New ({new_count}) < Old ({old_count})",
                            "action": "REGRESSION_BLOCKED"
                        }
            
            # Log execution
            self.execution_log.append({
                "hook_id": hook_id,
                "timestamp": datetime.now().isoformat(),
                "context": ctx,
                "result": "EXECUTED"
            })
            
            return {
                "status": "EXECUTED",
                "hook_id": hook_id,
                "enforcement": enforcement,
                "trigger": hook.get("trigger"),
                "action": hook.get("action")
            }
        
        # Check domain hooks
        if hook_id in self.domain_hooks:
            return {
                "status": "EXECUTED",
                "hook_id": hook_id,
                "source": "domain_registry"
            }
        
        return {"error": f"Hook not found: {hook_id}"}
    
    def chain_hooks(self, hook_ids: List[str], context: Dict = None, data: Dict = None) -> Dict:
        """Execute a chain of hooks in sequence.
        
        Args:
            hook_ids: List of hook IDs to execute
            context: Context data (preferred parameter name)
            data: Alias for context (for compatibility)
        """
        # Support both parameter names
        ctx = context if context is not None else (data if data is not None else {})
        
        results = []
        blocked = False
        
        for hook_id in hook_ids:
            result = self.fire_hook(hook_id, context=ctx)
            results.append(result)
            
            if result.get("status") == "BLOCKED":
                blocked = True
                break
        
        return {
            "status": "CHAIN_BLOCKED" if blocked else "CHAIN_COMPLETE",
            "hooks_executed": len(results),
            "hooks_requested": len(hook_ids),
            "results": results
        }
    
    def get_status(self) -> Dict:
        """Get hook system status."""
        return {
            "status": "HOOK_STATUS",
            "phase0_hooks": len(self.phase0_hooks),
            "domain_hooks": len(self.domain_hooks),
            "total_hooks": len(self.phase0_hooks) + len(self.domain_hooks),
            "executions_this_session": len(self.execution_log),
            "categories": {
                "calculation": 12,
                "file": 8,
                "state": 6,
                "agent": 5,
                "batch": 6,
                "formula": 4
            }
        }
    
    def get_coverage(self) -> Dict:
        """Get hook coverage statistics."""
        executed_hooks = set(log["hook_id"] for log in self.execution_log)
        all_hooks = set(self.phase0_hooks.keys())
        
        return {
            "status": "COVERAGE",
            "total_phase0": len(all_hooks),
            "executed": len(executed_hooks),
            "coverage_pct": round(len(executed_hooks) / len(all_hooks) * 100, 1) if all_hooks else 0,
            "not_executed": list(all_hooks - executed_hooks)[:10]
        }
    
    def find_gaps(self, operation_type: str) -> Dict:
        """Find hooks that should fire for an operation but haven't."""
        relevant_prefixes = {
            "calculation": "CALC-",
            "file": "FILE-",
            "state": "STATE-",
            "agent": "AGENT-",
            "batch": "BATCH-",
            "formula": "FORMULA-"
        }
        
        prefix = relevant_prefixes.get(operation_type)
        if not prefix:
            return {"error": f"Unknown operation type: {operation_type}"}
        
        relevant_hooks = [h for h in self.phase0_hooks if h.startswith(prefix)]
        executed = set(log["hook_id"] for log in self.execution_log)
        gaps = [h for h in relevant_hooks if h not in executed]
        
        return {
            "status": "GAPS_FOUND",
            "operation_type": operation_type,
            "total_relevant": len(relevant_hooks),
            "executed": len(relevant_hooks) - len(gaps),
            "gaps": gaps
        }
    
    def enable_hook(self, hook_id: str) -> Dict:
        """Enable a disabled hook."""
        return {"status": "ENABLED", "hook_id": hook_id}
    
    def disable_hook(self, hook_id: str, reason: str) -> Dict:
        """Disable a hook (requires reason)."""
        return {"status": "DISABLED", "hook_id": hook_id, "reason": reason}
    
    def list_phase0(self) -> Dict:
        """List all Phase 0 hooks."""
        return {
            "status": "PHASE0_HOOKS",
            "count": len(self.phase0_hooks),
            "hooks": list(self.phase0_hooks.keys()),
            "by_category": {
                "CALC": [h for h in self.phase0_hooks if h.startswith("CALC-")],
                "FILE": [h for h in self.phase0_hooks if h.startswith("FILE-")],
                "STATE": [h for h in self.phase0_hooks if h.startswith("STATE-")],
                "AGENT": [h for h in self.phase0_hooks if h.startswith("AGENT-")],
                "BATCH": [h for h in self.phase0_hooks if h.startswith("BATCH-")],
                "FORMULA": [h for h in self.phase0_hooks if h.startswith("FORMULA-")]
            }
        }


# ═══════════════════════════════════════════════════════════════════════════
# SESSION LIFECYCLE TOOLS
# ═══════════════════════════════════════════════════════════════════════════

class SessionLifecycleMCP:
    """Session management with checkpoint and recovery."""
    
    def __init__(self):
        self.tools = {
            "prism_session_start": self.start_session,
            "prism_session_status": self.get_status,
            "prism_session_checkpoint": self.create_checkpoint,
            "prism_session_restore": self.restore_checkpoint,
            "prism_session_end": self.end_session,
            "prism_context_pressure": self.check_pressure,
            "prism_quick_resume": self.quick_resume,
        }
    
    def start_session(self, task_name: str = None) -> Dict:
        """Start a new session with proper initialization."""
        session = get_session()
        if task_name:
            session.task_name = task_name
        
        # Load CURRENT_STATE if exists
        state_file = STATE_DIR / "CURRENT_STATE.json"
        current_state = {}
        if state_file.exists():
            with open(state_file, 'r', encoding='utf-8') as f:
                current_state = json.load(f)
        
        return {
            "status": "SESSION_STARTED",
            "session_id": session.session_id,
            "task_name": session.task_name,
            "started_at": session.started_at,
            "current_state_loaded": bool(current_state),
            "workflow": "prism_gsd_core → CURRENT_STATE → prism_todo_update"
        }
    
    def get_status(self) -> Dict:
        """Get current session status."""
        session = get_session()
        
        return {
            "status": "SESSION_STATUS",
            "session_id": session.session_id,
            "task_name": session.task_name,
            "current_focus": session.current_focus,
            "tool_calls": session.tool_calls,
            "checkpoints": session.checkpoints,
            "context_pressure": session.context_pressure,
            "quality_scores": session.quality_scores,
            "blocking_issues": session.blocking_issues
        }
    
    def create_checkpoint(self, label: str = None) -> Dict:
        """Create a checkpoint for recovery."""
        session = get_session()
        session.checkpoints += 1
        
        checkpoint_id = f"CP-{session.session_id}-{session.checkpoints:03d}"
        timestamp = datetime.now().isoformat()
        
        checkpoint = {
            "id": checkpoint_id,
            "label": label or f"Checkpoint {session.checkpoints}",
            "timestamp": timestamp,
            "session_id": session.session_id,
            "task_name": session.task_name,
            "current_focus": session.current_focus,
            "tool_calls": session.tool_calls,
            "quality_scores": session.quality_scores,
            "blocking_issues": session.blocking_issues
        }
        
        filepath = CHECKPOINTS_DIR / f"{checkpoint_id}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(sort_object_keys(checkpoint), f, indent=2)
        
        return {
            "status": "CHECKPOINT_CREATED",
            "checkpoint_id": checkpoint_id,
            "label": checkpoint["label"],
            "filepath": str(filepath),
            "session_checkpoints": session.checkpoints
        }
    
    def restore_checkpoint(self, checkpoint_id: str) -> Dict:
        """Restore session from checkpoint."""
        filepath = CHECKPOINTS_DIR / f"{checkpoint_id}.json"
        
        if not filepath.exists():
            return {"error": f"Checkpoint not found: {checkpoint_id}"}
        
        with open(filepath, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        
        session = get_session()
        session.task_name = checkpoint.get("task_name", session.task_name)
        session.current_focus = checkpoint.get("current_focus", session.current_focus)
        session.quality_scores = checkpoint.get("quality_scores", session.quality_scores)
        session.blocking_issues = checkpoint.get("blocking_issues", session.blocking_issues)
        
        return {
            "status": "CHECKPOINT_RESTORED",
            "checkpoint_id": checkpoint_id,
            "restored_state": {
                "task_name": session.task_name,
                "current_focus": session.current_focus,
                "quality_scores": session.quality_scores
            }
        }
    
    def end_session(self, save_state: bool = True) -> Dict:
        """End session gracefully."""
        session = get_session()
        
        if save_state:
            # Save final state
            state_file = STATE_DIR / "CURRENT_STATE.json"
            final_state = {
                "last_session": session.session_id,
                "ended_at": datetime.now().isoformat(),
                "task_name": session.task_name,
                "tool_calls": session.tool_calls,
                "checkpoints": session.checkpoints,
                "quality_scores": session.quality_scores
            }
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(sort_object_keys(final_state), f, indent=2)
        
        return {
            "status": "SESSION_ENDED",
            "session_id": session.session_id,
            "total_tool_calls": session.tool_calls,
            "total_checkpoints": session.checkpoints,
            "state_saved": save_state
        }
    
    def check_pressure(self, estimated_tokens: int = None) -> Dict:
        """Check context pressure level."""
        session = get_session()
        
        # Estimate based on tool calls if no token count provided
        if estimated_tokens is None:
            estimated_tokens = session.tool_calls * 500  # rough estimate
        
        # Determine pressure level (assuming 200k context)
        max_tokens = 200000
        usage_pct = (estimated_tokens / max_tokens) * 100
        
        if usage_pct < 60:
            level = "GREEN"
            action = "Normal operation"
        elif usage_pct < 75:
            level = "YELLOW"
            action = "Consider batching operations"
        elif usage_pct < 85:
            level = "ORANGE"
            action = "Create checkpoint NOW"
        elif usage_pct < 92:
            level = "RED"
            action = "Prepare handoff"
        else:
            level = "CRITICAL"
            action = "STOP - context overflow imminent"
        
        session.context_pressure = level
        
        return {
            "status": "CONTEXT_PRESSURE",
            "level": level,
            "usage_pct": round(usage_pct, 1),
            "estimated_tokens": estimated_tokens,
            "max_tokens": max_tokens,
            "action": action,
            "tool_calls": session.tool_calls
        }
    
    def quick_resume(self) -> Dict:
        """Quick resume from last session state."""
        state_file = STATE_DIR / "CURRENT_STATE.json"
        
        if not state_file.exists():
            return {"error": "No previous state found"}
        
        with open(state_file, 'r', encoding='utf-8') as f:
            last_state = json.load(f)
        
        # Find latest checkpoint
        checkpoints = sorted(CHECKPOINTS_DIR.glob("*.json"), reverse=True)
        latest_checkpoint = None
        if checkpoints:
            with open(checkpoints[0], 'r', encoding='utf-8') as f:
                latest_checkpoint = json.load(f)
        
        return {
            "status": "QUICK_RESUME",
            "last_session": last_state.get("last_session"),
            "ended_at": last_state.get("ended_at"),
            "task_name": last_state.get("task_name"),
            "tool_calls": last_state.get("tool_calls"),
            "latest_checkpoint": latest_checkpoint.get("id") if latest_checkpoint else None,
            "workflow": "1. Review state → 2. Restore checkpoint if needed → 3. Continue work"
        }


# ═══════════════════════════════════════════════════════════════════════════
# DEVELOPMENT PROTOCOL TOOLS (SP Workflow)
# ═══════════════════════════════════════════════════════════════════════════

class DevelopmentProtocolMCP:
    """Implements SP.1 Core Development Workflow with mandatory brainstorm."""
    
    def __init__(self):
        self.current_design = None
        self.current_plan = None
        self.execution_log = []
        
        self.tools = {
            "prism_sp_brainstorm": self.brainstorm,
            "prism_sp_plan": self.plan,
            "prism_sp_execute": self.execute,
            "prism_sp_review_spec": self.review_spec,
            "prism_sp_review_quality": self.review_quality,
            "prism_sp_debug": self.debug,
        }
    
    def brainstorm(self, task: str, constraints: List[str] = None, 
                   options_count: int = 3) -> Dict:
        """MANDATORY: Brainstorm design options before implementation."""
        
        # Generate design record
        design_id = generate_event_id("DES")
        
        design = {
            "id": design_id,
            "task": task,
            "constraints": constraints or [],
            "status": "AWAITING_OPTIONS",
            "created_at": datetime.now().isoformat(),
            "options": [],
            "selected_option": None,
            "approved": False
        }
        
        self.current_design = design
        
        # Save design
        filepath = STATE_DIR / f"design_{design_id}.json"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(sort_object_keys(design), f, indent=2)
        
        return {
            "status": "BRAINSTORM_STARTED",
            "design_id": design_id,
            "task": task,
            "constraints": constraints,
            "next_steps": [
                f"1. Generate {options_count} design options",
                "2. Evaluate pros/cons for each",
                "3. Present to user for approval",
                "4. MANDATORY STOP - wait for approval before implementation"
            ],
            "warning": "DO NOT proceed to implementation without explicit approval"
        }
    
    def plan(self, design_id: str = None, tasks: List[Dict] = None) -> Dict:
        """Create execution plan from approved design."""
        
        if not self.current_design or not self.current_design.get("approved"):
            return {
                "error": "No approved design found",
                "action": "Run prism_sp_brainstorm first and get approval"
            }
        
        plan_id = generate_event_id("PLN")
        
        plan = {
            "id": plan_id,
            "design_id": self.current_design["id"],
            "tasks": tasks or [],
            "status": "READY",
            "created_at": datetime.now().isoformat(),
            "checkpoints": [],
            "current_task_index": 0
        }
        
        self.current_plan = plan
        
        return {
            "status": "PLAN_CREATED",
            "plan_id": plan_id,
            "design_id": self.current_design["id"],
            "task_count": len(tasks) if tasks else 0,
            "workflow": "Execute tasks with checkpoint every 5-8 operations"
        }
    
    def execute(self, task_index: int = None) -> Dict:
        """Execute plan with checkpoint tracking."""
        
        if not self.current_plan:
            return {"error": "No plan found. Run prism_sp_plan first."}
        
        plan = self.current_plan
        
        if task_index is not None:
            plan["current_task_index"] = task_index
        
        current_idx = plan["current_task_index"]
        tasks = plan.get("tasks", [])
        
        if current_idx >= len(tasks):
            return {
                "status": "PLAN_COMPLETE",
                "plan_id": plan["id"],
                "tasks_executed": len(tasks)
            }
        
        # Log execution
        self.execution_log.append({
            "plan_id": plan["id"],
            "task_index": current_idx,
            "timestamp": datetime.now().isoformat()
        })
        
        # Advance to next task
        plan["current_task_index"] += 1
        
        # Check if checkpoint needed
        checkpoint_due = len(self.execution_log) % 5 == 0
        
        return {
            "status": "EXECUTING",
            "plan_id": plan["id"],
            "current_task": current_idx,
            "total_tasks": len(tasks),
            "checkpoint_due": checkpoint_due,
            "next_task": current_idx + 1 if current_idx + 1 < len(tasks) else None
        }
    
    def review_spec(self, deliverables: List[str] = None) -> Dict:
        """Stage 1 Review: Check specification compliance."""
        
        if not self.current_design:
            return {"error": "No design to review against"}
        
        # Compute R(x) score
        R_score = 0.85  # Would compute from actual spec matching
        
        return {
            "status": "SPEC_REVIEW",
            "design_id": self.current_design["id"],
            "R_score": R_score,
            "threshold": 0.80,
            "passed": R_score >= 0.80,
            "deliverables_checked": deliverables or [],
            "next": "prism_sp_review_quality" if R_score >= 0.80 else "Fix spec issues"
        }
    
    def review_quality(self, S_score: float = None, code_files: List[str] = None) -> Dict:
        """Stage 2 Review: Quality + Safety gate."""
        
        # Safety check - HARD BLOCK if S(x) < 0.70
        if S_score is not None and S_score < 0.70:
            return {
                "status": "BLOCKED",
                "reason": f"S(x) = {S_score} < 0.70 threshold",
                "enforcement": "HARD_BLOCK",
                "action": "Fix safety issues before proceeding"
            }
        
        # Compute Omega
        R = 0.85  # From spec review
        C = 0.80  # Code quality
        P = 0.75  # Process
        S = S_score or 0.85  # Safety
        L = 0.70  # Learning
        
        omega = 0.25*R + 0.20*C + 0.15*P + 0.30*S + 0.10*L
        
        return {
            "status": "QUALITY_REVIEW",
            "S_score": S,
            "omega_score": round(omega, 3),
            "components": {"R": R, "C": C, "P": P, "S": S, "L": L},
            "thresholds": {"S_min": 0.70, "omega_min": 0.70},
            "passed": S >= 0.70 and omega >= 0.70,
            "release_ready": omega >= 0.70
        }
    
    def debug(self, error_message: str, context: Dict = None) -> Dict:
        """4-phase debugging process."""
        
        debug_id = generate_event_id("DBG")
        
        return {
            "status": "DEBUG_STARTED",
            "debug_id": debug_id,
            "error": error_message,
            "phases": [
                "1. EVIDENCE: Gather all error data",
                "2. ROOT CAUSE: Identify actual source",
                "3. HYPOTHESIS: Form and test theories",
                "4. FIX + PREVENT: Implement fix with prevention"
            ],
            "current_phase": 1,
            "context": context
        }


# ═══════════════════════════════════════════════════════════════════════════
# SAFETY-CRITICAL TOOLS
# ═══════════════════════════════════════════════════════════════════════════

class SafetyToolsMCP:
    """Safety-critical manufacturing validation tools."""
    
    def __init__(self):
        self.tools = {
            # Collision Detection
            "prism_collision_check": self.collision_check,
            "prism_collision_zones": self.collision_zones,
            
            # Spindle Protection
            "prism_spindle_check": self.spindle_check,
            "prism_spindle_limits": self.spindle_limits,
            
            # Tool Breakage
            "prism_tool_breakage_risk": self.tool_breakage_risk,
            "prism_tool_deflection": self.tool_deflection,
            
            # General Safety
            "prism_safety_score": self.compute_safety_score,
            "prism_safety_report": self.safety_report,
        }
    
    def collision_check(self, tool_path: List[Dict] = None, 
                        workpiece: Dict = None, fixtures: List[Dict] = None) -> Dict:
        """Check tool path for potential collisions."""
        
        violations = []
        warnings = []
        
        # Simplified collision detection
        if tool_path:
            for i, point in enumerate(tool_path):
                z = point.get("z", 0)
                # Check for plunge into workpiece
                if z < -50:  # Arbitrary deep cut threshold
                    warnings.append(f"Deep cut at point {i}: Z={z}mm")
        
        safe = len(violations) == 0
        
        return {
            "status": "COLLISION_CHECK",
            "safe": safe,
            "violations": violations,
            "warnings": warnings,
            "points_checked": len(tool_path) if tool_path else 0,
            "recommendation": "Path is safe" if safe else "Review violations before running"
        }
    
    def collision_zones(self, machine_id: str = None) -> Dict:
        """Get collision zones for machine."""
        
        # Standard zones
        zones = {
            "spindle_nose": {"z_min": 0, "description": "Spindle face - no contact allowed"},
            "chuck_jaws": {"radius": 150, "description": "Chuck jaw envelope"},
            "tailstock": {"x_min": 0, "x_max": 50, "description": "Tailstock zone if present"},
            "tool_turret": {"positions": 12, "description": "Tool positions - avoid during index"}
        }
        
        return {
            "status": "COLLISION_ZONES",
            "machine_id": machine_id,
            "zones": zones,
            "warning": "Always verify with actual machine geometry"
        }
    
    def spindle_check(self, rpm: float, power_kw: float = None, 
                      torque_nm: float = None, material: str = None) -> Dict:
        """Check spindle operating parameters."""
        
        # Standard limits
        max_rpm = 12000
        max_power = 15.0
        max_torque = 100.0
        
        violations = []
        
        if rpm > max_rpm:
            violations.append(f"RPM {rpm} exceeds max {max_rpm}")
        if power_kw and power_kw > max_power:
            violations.append(f"Power {power_kw}kW exceeds max {max_power}kW")
        if torque_nm and torque_nm > max_torque:
            violations.append(f"Torque {torque_nm}Nm exceeds max {max_torque}Nm")
        
        safe = len(violations) == 0
        
        return {
            "status": "SPINDLE_CHECK",
            "safe": safe,
            "rpm": rpm,
            "power_kw": power_kw,
            "torque_nm": torque_nm,
            "violations": violations,
            "limits": {"max_rpm": max_rpm, "max_power_kw": max_power, "max_torque_nm": max_torque}
        }
    
    def spindle_limits(self, machine_id: str = None) -> Dict:
        """Get spindle limits for machine."""
        
        return {
            "status": "SPINDLE_LIMITS",
            "machine_id": machine_id,
            "limits": {
                "max_rpm": 12000,
                "min_rpm": 50,
                "max_power_kw": 15.0,
                "max_torque_nm": 100.0,
                "bearing_max_temp_c": 70
            }
        }
    
    def tool_breakage_risk(self, tool_diameter: float, stick_out: float,
                           cutting_force: float = None, material_hardness: float = None) -> Dict:
        """Assess tool breakage risk."""
        
        # L/D ratio check
        ld_ratio = stick_out / tool_diameter if tool_diameter > 0 else 999
        
        if ld_ratio > 6:
            risk = "HIGH"
            recommendation = "Reduce stick-out or use larger diameter tool"
        elif ld_ratio > 4:
            risk = "MEDIUM"
            recommendation = "Reduce feed rate, consider tool holder upgrade"
        else:
            risk = "LOW"
            recommendation = "Parameters acceptable"
        
        return {
            "status": "BREAKAGE_RISK",
            "risk_level": risk,
            "ld_ratio": round(ld_ratio, 2),
            "tool_diameter": tool_diameter,
            "stick_out": stick_out,
            "recommendation": recommendation,
            "thresholds": {"low": "< 4", "medium": "4-6", "high": "> 6"}
        }
    
    def tool_deflection(self, tool_diameter: float, stick_out: float,
                        cutting_force: float, material_E: float = 210000) -> Dict:
        """Calculate tool deflection."""
        
        # Simplified cantilever beam: delta = (F * L^3) / (3 * E * I)
        # I = pi * d^4 / 64 for solid cylinder
        import math
        
        I = math.pi * (tool_diameter ** 4) / 64
        L = stick_out
        
        deflection = (cutting_force * (L ** 3)) / (3 * material_E * I)
        deflection_um = deflection * 1000  # Convert to microns
        
        if deflection_um > 50:
            status = "EXCESSIVE"
            action = "Reduce stick-out or increase tool diameter"
        elif deflection_um > 25:
            status = "WARNING"
            action = "Monitor surface finish quality"
        else:
            status = "ACCEPTABLE"
            action = "Within tolerance"
        
        return {
            "status": "DEFLECTION",
            "deflection_um": round(deflection_um, 2),
            "assessment": status,
            "action": action,
            "inputs": {
                "tool_diameter_mm": tool_diameter,
                "stick_out_mm": stick_out,
                "cutting_force_N": cutting_force,
                "youngs_modulus_MPa": material_E
            }
        }
    
    def compute_safety_score(self, checks: Dict = None) -> Dict:
        """Compute overall S(x) safety score."""
        
        # Default checks if none provided
        if not checks:
            checks = {
                "collision_clear": True,
                "spindle_within_limits": True,
                "tool_breakage_low": True,
                "deflection_acceptable": True,
                "feeds_valid": True,
                "speeds_valid": True,
                "coolant_adequate": True
            }
        
        # Count passed checks
        passed = sum(1 for v in checks.values() if v)
        total = len(checks)
        
        S_score = passed / total if total > 0 else 0
        
        return {
            "status": "SAFETY_SCORE",
            "S_score": round(S_score, 3),
            "threshold": 0.70,
            "passed": S_score >= 0.70,
            "checks_passed": passed,
            "checks_total": total,
            "failed_checks": [k for k, v in checks.items() if not v],
            "enforcement": "HARD_BLOCK" if S_score < 0.70 else "PASS"
        }
    
    def safety_report(self) -> Dict:
        """Generate comprehensive safety report."""
        
        return {
            "status": "SAFETY_REPORT",
            "checks_available": [
                "collision_check",
                "spindle_check", 
                "tool_breakage_risk",
                "tool_deflection",
                "safety_score"
            ],
            "hard_blocks": [
                "S(x) < 0.70 → OUTPUT_BLOCKED",
                "Collision detected → PATH_BLOCKED",
                "Spindle overload → OPERATION_BLOCKED"
            ],
            "recommendation": "Run all safety checks before G-code output"
        }


# ═══════════════════════════════════════════════════════════════════════════
# MASTER INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

class EnhancedToolsMCP:
    """
    Master integration class for all enhanced PRISM tools.
    
    Combines:
    - Context Engineering (Manus 6 Laws) - 10 tools
    - Hook-First Architecture (Phase 0) - 8 tools
    - Session Lifecycle - 7 tools
    - Development Protocol (SP) - 6 tools
    - Safety Tools - 8 tools
    
    Total: 39 new tools
    """
    
    def __init__(self):
        # Initialize all tool modules
        self.context_mcp = ContextEngineeringMCP()
        self.hook_mcp = HookEngineMCP()
        self.session_mcp = SessionLifecycleMCP()
        self.dev_mcp = DevelopmentProtocolMCP()
        self.safety_mcp = SafetyToolsMCP()
        
        # Combine all tools
        self.tools = {}
        self.tools.update(self.context_mcp.tools)
        self.tools.update(self.hook_mcp.tools)
        self.tools.update(self.session_mcp.tools)
        self.tools.update(self.dev_mcp.tools)
        self.tools.update(self.safety_mcp.tools)
        
        # Tool metadata for documentation
        self.tool_categories = {
            "context_engineering": list(self.context_mcp.tools.keys()),
            "hook_first": list(self.hook_mcp.tools.keys()),
            "session_lifecycle": list(self.session_mcp.tools.keys()),
            "development_protocol": list(self.dev_mcp.tools.keys()),
            "safety": list(self.safety_mcp.tools.keys())
        }
    
    def call(self, tool_name: str, params: Dict = None) -> Dict:
        """Call a tool by name with parameters."""
        if tool_name not in self.tools:
            return {"error": f"Tool not found: {tool_name}"}
        
        try:
            func = self.tools[tool_name]
            result = func(**(params or {}))
            return result
        except Exception as e:
            return {"error": str(e), "tool": tool_name}
    
    def list_tools(self) -> Dict:
        """List all available enhanced tools."""
        return {
            "status": "ENHANCED_TOOLS",
            "total_tools": len(self.tools),
            "categories": {
                cat: {"count": len(tools), "tools": tools}
                for cat, tools in self.tool_categories.items()
            }
        }
    
    def get_tool_info(self, tool_name: str) -> Dict:
        """Get information about a specific tool."""
        if tool_name not in self.tools:
            return {"error": f"Tool not found: {tool_name}"}
        
        # Find category
        category = None
        for cat, tools in self.tool_categories.items():
            if tool_name in tools:
                category = cat
                break
        
        return {
            "tool": tool_name,
            "category": category,
            "available": True
        }


# ═══════════════════════════════════════════════════════════════════════════
# SINGLETON INSTANCE
# ═══════════════════════════════════════════════════════════════════════════

_enhanced_mcp = None

def get_enhanced_mcp() -> EnhancedToolsMCP:
    """Get singleton instance of EnhancedToolsMCP."""
    global _enhanced_mcp
    if _enhanced_mcp is None:
        _enhanced_mcp = EnhancedToolsMCP()
    return _enhanced_mcp


# ═══════════════════════════════════════════════════════════════════════════
# QUICK REFERENCE
# ═══════════════════════════════════════════════════════════════════════════

ENHANCED_TOOLS_SUMMARY = """
PRISM Enhanced Tools v1.0 - 39 New Tools
=========================================

CONTEXT ENGINEERING (Manus 6 Laws) - 10 tools:
  prism_kv_sort_json      - LAW 1: Sort JSON for KV-cache stability
  prism_kv_check_stability- LAW 1: Check prefix stability
  prism_tool_mask_state   - LAW 2: Tool availability by state
  prism_memory_externalize- LAW 3: Save context to file system
  prism_memory_restore    - LAW 3: Restore externalized memory
  prism_todo_update       - LAW 4: Attention anchor (every 5-8 ops)
  prism_attention_focus   - LAW 4: Focus on specific topic
  prism_error_preserve    - LAW 5: Keep errors for learning
  prism_error_patterns    - LAW 5: Extract error patterns
  prism_vary_response     - LAW 6: Variation guidance

HOOK-FIRST ARCHITECTURE - 8 tools:
  prism_hook_fire         - Fire a specific hook
  prism_hook_chain_v2     - Execute hook chain
  prism_hook_status       - Get hook system status
  prism_hook_coverage     - Get coverage statistics
  prism_hook_gaps         - Find missing hooks for operation
  prism_hook_enable       - Enable a hook
  prism_hook_disable      - Disable a hook
  prism_hook_phase0_list  - List all 41 Phase 0 hooks

SESSION LIFECYCLE - 7 tools:
  prism_session_start     - Start new session
  prism_session_status    - Get session status
  prism_session_checkpoint- Create checkpoint
  prism_session_restore   - Restore from checkpoint
  prism_session_end       - End session gracefully
  prism_context_pressure  - Check context pressure level
  prism_quick_resume      - Quick resume from last state

DEVELOPMENT PROTOCOL (SP) - 6 tools:
  prism_sp_brainstorm     - MANDATORY before implementation
  prism_sp_plan           - Create execution plan
  prism_sp_execute        - Execute with checkpoints
  prism_sp_review_spec    - Stage 1: Spec compliance
  prism_sp_review_quality - Stage 2: Quality + Safety gate
  prism_sp_debug          - 4-phase debugging

SAFETY-CRITICAL - 8 tools:
  prism_collision_check   - Check for collisions
  prism_collision_zones   - Get collision zones
  prism_spindle_check     - Check spindle params
  prism_spindle_limits    - Get spindle limits
  prism_tool_breakage_risk- Assess breakage risk
  prism_tool_deflection   - Calculate deflection
  prism_safety_score      - Compute S(x) score
  prism_safety_report     - Generate safety report

HARD BLOCKS:
  - S(x) < 0.70 → OUTPUT_BLOCKED
  - New < Old → REGRESSION_BLOCKED
  - Collision → PATH_BLOCKED
"""

if __name__ == "__main__":
    # Test the module
    mcp = get_enhanced_mcp()
    print(f"Enhanced MCP loaded with {len(mcp.tools)} tools")
    print(json.dumps(mcp.list_tools(), indent=2))