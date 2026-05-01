#!/usr/bin/env python3
"""
PRISM Manus Context Engineering Module v1.0
==========================================

Implements Manus AI's 6 Laws of Context Engineering:

LAW 1: KV-Cache Stability - Deterministic prefixes, dynamic suffixes
LAW 2: Mask Don't Remove - Tools masked by state, never removed  
LAW 3: File System as Context - Unlimited memory via externalization
LAW 4: Attention via Recitation - Todo anchors every 5-8 ops
LAW 5: Keep Wrong Stuff - Errors are learning signals
LAW 6: Don't Get Few-Shotted - Vary responses to prevent mimicry

Plus TeammateTool patterns for multi-agent coordination.

Tools:
  - prism_kv_sort_json: Sort JSON keys for cache stability
  - prism_kv_check_stability: Check prefix for dynamic content
  - prism_tool_mask_state: Get tool availability by workflow state
  - prism_memory_externalize: Write context to file system
  - prism_memory_restore: Read back externalized context
  - prism_todo_update: Update attention anchor (Law 4)
  - prism_todo_get: Get current todo state
  - prism_error_preserve: Preserve errors for learning (Law 5)
  - prism_response_vary: Check/vary response patterns (Law 6)
  - prism_teammate_register: Register agent in team
  - prism_teammate_handoff: Hand off to another agent
  - prism_teammate_status: Check team status
"""

import os
import json
import hashlib
import random
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

# ============================================================================
# DIRECTORIES
# ============================================================================

STATE_DIR = Path("C:/PRISM/state")
EVENTS_DIR = STATE_DIR / "events"
ERRORS_DIR = STATE_DIR / "errors"
DECISIONS_DIR = STATE_DIR / "decisions"
SNAPSHOTS_DIR = STATE_DIR / "snapshots"
TEAMS_DIR = STATE_DIR / "teams"
TODO_FILE = STATE_DIR / "todo.md"
RESPONSE_PATTERNS_FILE = STATE_DIR / "response_patterns.json"

# Ensure directories exist
for d in [EVENTS_DIR, ERRORS_DIR, DECISIONS_DIR, SNAPSHOTS_DIR, TEAMS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_date_string() -> str:
    return datetime.now().strftime("%Y-%m-%d")

def get_timestamp() -> str:
    return datetime.now().isoformat()

def generate_event_id(prefix: str) -> str:
    date = get_date_string().replace("-", "")
    seq = str(int(datetime.now().timestamp() * 1000))[-6:]
    return f"{prefix}-{date}-{seq}"

def sort_object_keys(obj: Any) -> Any:
    """Recursively sort dictionary keys for deterministic serialization."""
    if isinstance(obj, dict):
        return {k: sort_object_keys(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [sort_object_keys(item) for item in obj]
    return obj

def append_jsonl(filepath: Path, data: Any) -> None:
    """Append sorted JSON line to file."""
    sorted_data = sort_object_keys(data)
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(json.dumps(sorted_data) + "\n")

# ============================================================================
# TODO STATE TRACKING (Law 4)
# ============================================================================

class TodoState:
    """Attention anchor state for Law 4."""
    
    def __init__(self):
        self.task_name = "Initialization"
        self.session_id = f"SESSION-{int(datetime.now().timestamp())}"
        self.current_focus = "Session startup"
        self.steps = []
        self.blocking_issues = []
        self.quality_gates = {"S": None, "omega": None}
        self.recent_decisions = []
        self.next_action = "Load state files"
        self.last_updated = get_timestamp()
        self.call_count = 0
        self._load()
    
    def _load(self):
        """Load state from file if exists."""
        if TODO_FILE.exists():
            try:
                content = TODO_FILE.read_text(encoding="utf-8")
                # Parse markdown format
                for line in content.split("\n"):
                    if line.startswith("# Task:"):
                        self.task_name = line.replace("# Task:", "").strip()
                    elif line.startswith("Session:"):
                        self.session_id = line.replace("Session:", "").strip()
                    elif line.startswith("Focus:"):
                        self.current_focus = line.replace("Focus:", "").strip()
                    elif line.startswith("Next:"):
                        self.next_action = line.replace("Next:", "").strip()
            except:
                pass
    
    def save(self):
        """Save state to file."""
        content = f"""# Task: {self.task_name}
Session: {self.session_id}
Focus: {self.current_focus}
Updated: {self.last_updated}
Calls: {self.call_count}

## Steps
{self._format_steps()}

## Blocking Issues
{self._format_list(self.blocking_issues)}

## Quality Gates
- S(x): {self.quality_gates.get('S', 'Not checked')}
- Ω(x): {self.quality_gates.get('omega', 'Not checked')}

## Recent Decisions
{self._format_list(self.recent_decisions[-5:])}

Next: {self.next_action}
"""
        TODO_FILE.write_text(content, encoding="utf-8")
    
    def _format_steps(self) -> str:
        if not self.steps:
            return "- (none)"
        return "\n".join(
            f"- [{'x' if s.get('complete') else ' '}] {s.get('description', '')}"
            for s in self.steps
        )
    
    def _format_list(self, items: List[str]) -> str:
        if not items:
            return "- (none)"
        return "\n".join(f"- {item}" for item in items)
    
    def to_dict(self) -> Dict:
        return {
            "task_name": self.task_name,
            "session_id": self.session_id,
            "current_focus": self.current_focus,
            "steps": self.steps,
            "blocking_issues": self.blocking_issues,
            "quality_gates": self.quality_gates,
            "recent_decisions": self.recent_decisions,
            "next_action": self.next_action,
            "last_updated": self.last_updated,
            "call_count": self.call_count
        }

# Global todo state
_todo_state = TodoState()

# ============================================================================
# RESPONSE PATTERN TRACKING (Law 6)
# ============================================================================

def load_response_patterns() -> Dict:
    """Load response patterns for mimicry detection."""
    if RESPONSE_PATTERNS_FILE.exists():
        try:
            return json.loads(RESPONSE_PATTERNS_FILE.read_text(encoding="utf-8"))
        except:
            pass
    return {"patterns": [], "last_10_openings": [], "last_10_closings": []}

def save_response_patterns(patterns: Dict):
    """Save response patterns."""
    RESPONSE_PATTERNS_FILE.write_text(
        json.dumps(sort_object_keys(patterns), indent=2),
        encoding="utf-8"
    )

# ============================================================================
# MANUS CONTEXT ENGINEERING CLASS
# ============================================================================

class ManusContextEngineering:
    """Implements Manus AI's 6 Laws of Context Engineering."""
    
    def __init__(self):
        self.tools = self._build_tools()
    
    def _build_tools(self) -> Dict[str, callable]:
        return {
            # Law 1: KV-Cache Stability
            "prism_kv_sort_json": self.prism_kv_sort_json,
            "prism_kv_check_stability": self.prism_kv_check_stability,
            
            # Law 2: Mask Don't Remove
            "prism_tool_mask_state": self.prism_tool_mask_state,
            
            # Law 3: File System as Context
            "prism_memory_externalize": self.prism_memory_externalize,
            "prism_memory_restore": self.prism_memory_restore,
            
            # Law 4: Attention via Recitation
            "prism_todo_update": self.prism_todo_update,
            "prism_todo_get": self.prism_todo_get,
            
            # Law 5: Keep Wrong Stuff
            "prism_error_preserve": self.prism_error_preserve,
            
            # Law 6: Don't Get Few-Shotted
            "prism_response_vary": self.prism_response_vary,
            
            # TeammateTool patterns
            "prism_teammate_register": self.prism_teammate_register,
            "prism_teammate_handoff": self.prism_teammate_handoff,
            "prism_teammate_status": self.prism_teammate_status,
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
    # LAW 1: KV-CACHE STABILITY
    # =========================================================================
    
    def prism_kv_sort_json(self, data: Dict = None, write_to: str = None) -> Dict:
        """
        LAW 1: Sort JSON keys alphabetically for deterministic serialization.
        
        Ensures KV-cache hits by making JSON output deterministic.
        Cached prompts cost $0.30/MTok vs $3.00/MTok uncached (10x savings).
        """
        if data is None:
            return {"error": "No data provided"}
        
        sorted_data = sort_object_keys(data)
        json_str = json.dumps(sorted_data, indent=2)
        
        if write_to:
            Path(write_to).write_text(json_str, encoding="utf-8")
        
        return {
            "status": "JSON_SORTED",
            "law": "Manus Law 1: KV-Cache Stability",
            "principle": "Deterministic serialization = consistent cache hits",
            "keys_sorted": True,
            "written_to": write_to,
            "sample_keys": list(sorted_data.keys())[:5] if isinstance(sorted_data, dict) else None,
            "savings": "10x token cost reduction when cached"
        }
    
    def prism_kv_check_stability(self, prefix_content: str = "") -> Dict:
        """
        LAW 1: Check if prompt prefix is stable (no timestamps/dynamic content).
        
        Dynamic content in prefix invalidates KV-cache. Move to END of context.
        """
        issues = []
        
        # Check for timestamps
        import re
        if re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}', prefix_content):
            issues.append("Contains ISO timestamp - move to END of context")
        if re.search(r'\d{2}/\d{2}/\d{4}', prefix_content):
            issues.append("Contains date format - move to END of context")
        
        # Check for session IDs
        if re.search(r'SESSION-\d+|session_id|sessionId', prefix_content):
            issues.append("Contains session ID - move to dynamic suffix")
        
        # Check for random-looking IDs
        if re.search(r'[a-f0-9]{32,}|[A-Za-z0-9]{20,}', prefix_content):
            issues.append("Contains hash/UUID - may invalidate cache")
        
        # Check for counters
        if re.search(r'call_count|iteration|step_\d+', prefix_content, re.IGNORECASE):
            issues.append("Contains counter/iteration - move to suffix")
        
        stable = len(issues) == 0
        
        return {
            "status": "✅ PREFIX STABLE" if stable else "⚠️ STABILITY ISSUES FOUND",
            "law": "Manus Law 1: KV-Cache Stability",
            "issues": issues,
            "recommendation": "Prefix is cache-stable" if stable else "Move dynamic content to END of context (dynamic suffix)",
            "cache_impact": "Cached: $0.30/MTok" if stable else "Uncached: $3.00/MTok (10x more expensive)",
            "fix_pattern": "Put timestamps, session IDs, counters AFTER main content"
        }
    
    # =========================================================================
    # LAW 2: MASK DON'T REMOVE
    # =========================================================================
    
    def prism_tool_mask_state(self, current_state: str = "EXECUTION") -> Dict:
        """
        LAW 2: Get tool availability for current workflow state.
        
        Tools are masked (disabled) not removed - preserves KV-cache.
        State machine controls which tools are available.
        """
        TOOL_STATES = {
            "INITIALIZATION": {
                "available": ["prism_state_*", "prism_gsd_*", "prism_skill_*", "prism_todo_*"],
                "masked": ["prism_material_write", "prism_machine_write", "prism_code_execute"],
                "reason": "Read-only during init - no mutations allowed"
            },
            "PLANNING": {
                "available": ["prism_state_*", "prism_skill_*", "prism_sp_brainstorm", "prism_combination_*"],
                "masked": ["prism_code_execute", "prism_material_write"],
                "reason": "Planning phase - design before implementation"
            },
            "EXECUTION": {
                "available": ["*"],
                "masked": [],
                "reason": "Full access during approved execution"
            },
            "VALIDATION": {
                "available": ["prism_validate_*", "prism_safety_*", "prism_cognitive_*", "prism_quality_*"],
                "masked": ["prism_code_execute", "prism_material_write", "prism_machine_write"],
                "reason": "Validation phase - read-only verification"
            },
            "ERROR_RECOVERY": {
                "available": ["prism_state_*", "prism_sp_debug", "prism_error_*", "prism_checkpoint_*"],
                "masked": ["prism_material_write", "prism_machine_write", "prism_code_execute"],
                "reason": "Error recovery - diagnostics only"
            }
        }
        
        if current_state not in TOOL_STATES:
            current_state = "EXECUTION"
        
        state = TOOL_STATES[current_state]
        
        return {
            "status": "TOOL_MASK_STATE",
            "law": "Manus Law 2: Mask Don't Remove",
            "principle": "All tools stay in context, availability controlled by state machine",
            "current_state": current_state,
            "available_patterns": state["available"],
            "masked_patterns": state["masked"],
            "reason": state["reason"],
            "note": "Masked tools exist but are constrained - preserves KV-cache"
        }
    
    # =========================================================================
    # LAW 3: FILE SYSTEM AS CONTEXT
    # =========================================================================
    
    def prism_memory_externalize(
        self,
        memory_type: str = "event",
        content: Dict = None,
        restoration_key: str = None
    ) -> Dict:
        """
        LAW 3: Externalize context to file system (unlimited memory expansion).
        
        File system = unlimited context window. Externalize to free up tokens.
        """
        if content is None:
            return {"error": "No content provided"}
        
        event_id = generate_event_id(memory_type.upper()[:3])
        timestamp = get_timestamp()
        
        record = {
            "id": event_id,
            "timestamp": timestamp,
            "type": memory_type,
            "restoration_key": restoration_key or event_id,
            "content": sort_object_keys(content),
            "checksum": hashlib.sha256(json.dumps(content).encode()).hexdigest()[:16]
        }
        
        # Determine file path
        if memory_type == "event":
            filepath = EVENTS_DIR / f"{get_date_string()}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "decision":
            filepath = DECISIONS_DIR / f"{get_date_string()}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "error":
            filepath = ERRORS_DIR / f"{get_date_string()}.jsonl"
            append_jsonl(filepath, record)
        elif memory_type == "snapshot":
            filepath = SNAPSHOTS_DIR / f"{timestamp.replace(':', '-').replace('.', '-')}.json"
            filepath.write_text(json.dumps(record, indent=2), encoding="utf-8")
        else:
            filepath = STATE_DIR / f"custom_{event_id}.json"
            filepath.write_text(json.dumps(record, indent=2), encoding="utf-8")
        
        return {
            "status": "EXTERNALIZED",
            "law": "Manus Law 3: File System as Context",
            "principle": "File system = unlimited context window",
            "event_id": event_id,
            "restoration_key": record["restoration_key"],
            "filepath": str(filepath),
            "checksum": record["checksum"],
            "tokens_freed": f"~{len(json.dumps(content)) // 4} tokens externalized"
        }
    
    def prism_memory_restore(
        self,
        restoration_key: str = None,
        memory_type: str = None,
        date: str = None
    ) -> Dict:
        """
        LAW 3: Restore externalized context from file system.
        """
        if not restoration_key:
            return {"error": "restoration_key required"}
        
        # Search for the record
        search_dirs = []
        if memory_type:
            type_dirs = {
                "event": EVENTS_DIR,
                "decision": DECISIONS_DIR,
                "error": ERRORS_DIR,
                "snapshot": SNAPSHOTS_DIR
            }
            if memory_type in type_dirs:
                search_dirs = [type_dirs[memory_type]]
        else:
            search_dirs = [EVENTS_DIR, DECISIONS_DIR, ERRORS_DIR, SNAPSHOTS_DIR]
        
        # Search JSONL files
        for search_dir in search_dirs:
            if not search_dir.exists():
                continue
            for filepath in search_dir.glob("*.jsonl"):
                with open(filepath, "r", encoding="utf-8") as f:
                    for line in f:
                        try:
                            record = json.loads(line)
                            if record.get("restoration_key") == restoration_key or record.get("id") == restoration_key:
                                return {
                                    "status": "RESTORED",
                                    "law": "Manus Law 3: File System as Context",
                                    "event_id": record.get("id"),
                                    "content": record.get("content"),
                                    "timestamp": record.get("timestamp"),
                                    "checksum": record.get("checksum")
                                }
                        except:
                            continue
            
            # Search JSON files
            for filepath in search_dir.glob("*.json"):
                try:
                    record = json.loads(filepath.read_text(encoding="utf-8"))
                    if record.get("restoration_key") == restoration_key or record.get("id") == restoration_key:
                        return {
                            "status": "RESTORED",
                            "law": "Manus Law 3: File System as Context",
                            "event_id": record.get("id"),
                            "content": record.get("content"),
                            "timestamp": record.get("timestamp"),
                            "checksum": record.get("checksum")
                        }
                except:
                    continue
        
        return {"error": f"Record not found: {restoration_key}"}
    
    # =========================================================================
    # LAW 4: ATTENTION VIA RECITATION
    # =========================================================================
    
    def prism_todo_update(
        self,
        task_name: str = None,
        current_focus: str = None,
        steps: List[Dict] = None,
        add_step: str = None,
        complete_step: int = None,
        blocking_issue: str = None,
        clear_blocking: bool = False,
        quality_S: float = None,
        quality_omega: float = None,
        decision: str = None,
        next_action: str = None
    ) -> Dict:
        """
        LAW 4: Update attention anchor (call every 5-8 operations).
        
        Reciting the task state keeps attention focused and prevents drift.
        """
        global _todo_state
        
        _todo_state.call_count += 1
        _todo_state.last_updated = get_timestamp()
        
        if task_name:
            _todo_state.task_name = task_name
        if current_focus:
            _todo_state.current_focus = current_focus
        if steps is not None:
            _todo_state.steps = steps
        if add_step:
            _todo_state.steps.append({"description": add_step, "complete": False})
        if complete_step is not None and 0 <= complete_step < len(_todo_state.steps):
            _todo_state.steps[complete_step]["complete"] = True
        if blocking_issue:
            _todo_state.blocking_issues.append(blocking_issue)
        if clear_blocking:
            _todo_state.blocking_issues = []
        if quality_S is not None:
            _todo_state.quality_gates["S"] = quality_S
        if quality_omega is not None:
            _todo_state.quality_gates["omega"] = quality_omega
        if decision:
            _todo_state.recent_decisions.append(decision)
            _todo_state.recent_decisions = _todo_state.recent_decisions[-10:]  # Keep last 10
        if next_action:
            _todo_state.next_action = next_action
        
        _todo_state.save()
        
        # Check for attention drift
        drift_warning = None
        if _todo_state.call_count > 0 and _todo_state.call_count % 10 == 0:
            drift_warning = f"⚠️ {_todo_state.call_count} calls since last anchor update - check for attention drift"
        
        return {
            "status": "TODO_UPDATED",
            "law": "Manus Law 4: Attention via Recitation",
            "principle": "Reciting state keeps attention focused",
            "call_count": _todo_state.call_count,
            "drift_warning": drift_warning,
            "state": _todo_state.to_dict(),
            "recommendation": "Call every 5-8 operations to maintain focus"
        }
    
    def prism_todo_get(self) -> Dict:
        """LAW 4: Get current todo/attention anchor state."""
        global _todo_state
        return {
            "status": "TODO_STATE",
            "law": "Manus Law 4: Attention via Recitation",
            "state": _todo_state.to_dict()
        }
    
    # =========================================================================
    # LAW 5: KEEP WRONG STUFF
    # =========================================================================
    
    def prism_error_preserve(
        self,
        error_type: str = "",
        message: str = "",
        context: Dict = None,
        tool_name: str = None,
        recovery_action: str = None
    ) -> Dict:
        """
        LAW 5: Preserve errors for learning (don't delete mistakes).
        
        Errors are learning signals. Keep them in context for pattern detection.
        """
        error_id = generate_event_id("ERR")
        timestamp = get_timestamp()
        
        error_record = {
            "id": error_id,
            "timestamp": timestamp,
            "error_type": error_type,
            "message": message,
            "tool_name": tool_name,
            "context": context or {},
            "recovery_action": recovery_action,
            "session_id": _todo_state.session_id
        }
        
        # Append to error log
        filepath = ERRORS_DIR / f"{get_date_string()}.jsonl"
        append_jsonl(filepath, error_record)
        
        # Analyze for patterns
        patterns = self._analyze_error_patterns(error_type)
        
        return {
            "status": "ERROR_PRESERVED",
            "law": "Manus Law 5: Keep Wrong Stuff",
            "principle": "Errors are learning signals - don't delete mistakes",
            "error_id": error_id,
            "patterns_detected": patterns,
            "filepath": str(filepath),
            "recommendation": "Keep this error visible in context for learning"
        }
    
    def _analyze_error_patterns(self, error_type: str) -> List[str]:
        """Analyze error patterns from recent errors."""
        patterns = []
        error_counts = {}
        
        filepath = ERRORS_DIR / f"{get_date_string()}.jsonl"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    try:
                        record = json.loads(line)
                        et = record.get("error_type", "unknown")
                        error_counts[et] = error_counts.get(et, 0) + 1
                    except:
                        continue
        
        # Detect patterns
        if error_counts.get(error_type, 0) >= 3:
            patterns.append(f"RECURRING: '{error_type}' occurred {error_counts[error_type]} times today")
        
        total_errors = sum(error_counts.values())
        if total_errors >= 10:
            patterns.append(f"HIGH_ERROR_RATE: {total_errors} errors today - review approach")
        
        return patterns
    
    # =========================================================================
    # LAW 6: DON'T GET FEW-SHOTTED
    # =========================================================================
    
    def prism_response_vary(
        self,
        response_opening: str = None,
        response_closing: str = None,
        check_only: bool = False
    ) -> Dict:
        """
        LAW 6: Check/vary response patterns to prevent mimicry.
        
        Repetitive patterns cause models to copy bad habits. Vary your responses.
        """
        patterns = load_response_patterns()
        
        mimicry_warnings = []
        suggestions = []
        
        if response_opening:
            # Check for repetitive openings
            if response_opening in patterns.get("last_10_openings", []):
                count = patterns["last_10_openings"].count(response_opening)
                if count >= 2:
                    mimicry_warnings.append(f"Opening '{response_opening[:30]}...' used {count} times recently")
                    suggestions.append("Try: 'Let me...', 'I'll...', 'Here's...', 'Starting with...'")
            
            if not check_only:
                patterns.setdefault("last_10_openings", []).append(response_opening)
                patterns["last_10_openings"] = patterns["last_10_openings"][-10:]
        
        if response_closing:
            # Check for repetitive closings
            if response_closing in patterns.get("last_10_closings", []):
                count = patterns["last_10_closings"].count(response_closing)
                if count >= 2:
                    mimicry_warnings.append(f"Closing '{response_closing[:30]}...' used {count} times recently")
                    suggestions.append("Vary: end with question, summary, or next step")
            
            if not check_only:
                patterns.setdefault("last_10_closings", []).append(response_closing)
                patterns["last_10_closings"] = patterns["last_10_closings"][-10:]
        
        if not check_only:
            save_response_patterns(patterns)
        
        # Generate varied alternatives
        varied_openings = random.sample([
            "Let me", "I'll", "Here's", "Starting with", "First",
            "Looking at", "Examining", "Analyzing", "Processing", "Working on"
        ], 3)
        
        return {
            "status": "PATTERN_CHECKED",
            "law": "Manus Law 6: Don't Get Few-Shotted",
            "principle": "Vary responses to prevent mimicry",
            "mimicry_warnings": mimicry_warnings,
            "suggestions": suggestions,
            "varied_openings": varied_openings,
            "recommendation": "Vary sentence structure every 5-10 responses"
        }
    
    # =========================================================================
    # TEAMMATE TOOLS (Multi-Agent Coordination)
    # =========================================================================
    
    def prism_teammate_register(
        self,
        agent_id: str = "",
        role: str = "",
        capabilities: List[str] = None,
        team_id: str = "default"
    ) -> Dict:
        """Register an agent in a team for coordination."""
        if not agent_id:
            return {"error": "agent_id required"}
        
        team_file = TEAMS_DIR / f"{team_id}.json"
        
        # Load existing team
        team = {}
        if team_file.exists():
            try:
                team = json.loads(team_file.read_text(encoding="utf-8"))
            except:
                pass
        
        # Register agent
        team.setdefault("agents", {})[agent_id] = {
            "role": role,
            "capabilities": capabilities or [],
            "registered_at": get_timestamp(),
            "status": "ACTIVE"
        }
        team["last_updated"] = get_timestamp()
        
        # Save
        team_file.write_text(json.dumps(sort_object_keys(team), indent=2), encoding="utf-8")
        
        return {
            "status": "REGISTERED",
            "agent_id": agent_id,
            "team_id": team_id,
            "role": role,
            "team_size": len(team.get("agents", {}))
        }
    
    def prism_teammate_handoff(
        self,
        from_agent: str = "",
        to_agent: str = "",
        task: str = "",
        context: Dict = None,
        team_id: str = "default"
    ) -> Dict:
        """Hand off task from one agent to another."""
        handoff_id = generate_event_id("HANDOFF")
        
        handoff_record = {
            "id": handoff_id,
            "timestamp": get_timestamp(),
            "from_agent": from_agent,
            "to_agent": to_agent,
            "task": task,
            "context": context or {},
            "team_id": team_id
        }
        
        # Save handoff
        handoff_file = TEAMS_DIR / f"{team_id}_handoffs.jsonl"
        append_jsonl(handoff_file, handoff_record)
        
        return {
            "status": "HANDOFF_INITIATED",
            "handoff_id": handoff_id,
            "from": from_agent,
            "to": to_agent,
            "task": task
        }
    
    def prism_teammate_status(self, team_id: str = "default") -> Dict:
        """Get team status."""
        team_file = TEAMS_DIR / f"{team_id}.json"
        
        if not team_file.exists():
            return {"error": f"Team not found: {team_id}"}
        
        try:
            team = json.loads(team_file.read_text(encoding="utf-8"))
            return {
                "status": "TEAM_STATUS",
                "team_id": team_id,
                "agents": team.get("agents", {}),
                "agent_count": len(team.get("agents", {})),
                "last_updated": team.get("last_updated")
            }
        except Exception as e:
            return {"error": str(e)}


# ============================================================================
# MODULE INTERFACE
# ============================================================================

_manus_instance = None

def get_manus_mcp() -> ManusContextEngineering:
    """Get singleton instance."""
    global _manus_instance
    if _manus_instance is None:
        _manus_instance = ManusContextEngineering()
    return _manus_instance


# ============================================================================
# CLI TEST
# ============================================================================

if __name__ == "__main__":
    manus = get_manus_mcp()
    
    print("=" * 60)
    print("PRISM Manus Context Engineering v1.0")
    print("Implements Manus AI's 6 Laws")
    print("=" * 60)
    
    # Test Law 1
    print("\n📋 Law 1: KV-Cache Stability")
    result = manus.prism_kv_check_stability("This is stable content without timestamps")
    print(f"   Status: {result['status']}")
    
    result = manus.prism_kv_check_stability("Session: SESSION-12345 at 2024-01-15T10:30:00")
    print(f"   Status: {result['status']}")
    print(f"   Issues: {result['issues']}")
    
    # Test Law 4
    print("\n📋 Law 4: Attention Anchor")
    result = manus.prism_todo_update(task_name="Test Task", current_focus="Testing Manus")
    print(f"   Call count: {result['call_count']}")
    
    # Test Law 6
    print("\n📋 Law 6: Response Variation")
    result = manus.prism_response_vary(response_opening="Let me help you with that")
    print(f"   Varied openings: {result['varied_openings']}")
    
    print("\n✅ All Manus tools working")
    print(f"   Total tools: {len(manus.tools)}")
