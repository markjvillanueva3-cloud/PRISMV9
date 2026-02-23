#!/usr/bin/env python3
"""
PRISM Session Lifecycle Module v1.0
===================================

Handles session continuity, compaction detection, and quick resume.

CRITICAL FOR:
- Detecting context compaction mid-session
- Quick resume after Claude Desktop restart
- Session state preservation
- Graceful handoffs between sessions

Tools:
  - prism_session_start: Initialize session with state loading
  - prism_session_quick_resume: Fast resume from compaction/restart
  - prism_compaction_detect: Detect if context was compacted
  - prism_state_reconstruct: Rebuild state from transcript
  - prism_session_checkpoint: Create session checkpoint
  - prism_session_end_full: Graceful session shutdown
  - prism_context_dna: Generate context fingerprint
  - prism_transcript_read: Read transcript file
"""

import os
import re
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

# ============================================================================
# DIRECTORIES
# ============================================================================

STATE_DIR = Path("C:/PRISM/state")
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"
TRANSCRIPTS_DIR = Path("/mnt/transcripts")
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
QUICK_RESUME_FILE = STATE_DIR / "QUICK_RESUME.json"
SESSION_LOG_FILE = STATE_DIR / "session_log.jsonl"

# Ensure directories exist
CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================================
# SESSION STATE
# ============================================================================

class SessionState:
    """Tracks current session state."""
    
    def __init__(self):
        self.session_id = f"S-{int(datetime.now().timestamp())}"
        self.started_at = datetime.now().isoformat()
        self.tool_calls = 0
        self.checkpoints = []
        self.context_dna = None
        self.last_checkpoint = None
        self.compaction_detected = False
        self.work_items = []
        self.quality_scores = {"S": None, "omega": None}
        self._load()
    
    def _load(self):
        """Load state from CURRENT_STATE.json if exists."""
        if CURRENT_STATE_FILE.exists():
            try:
                data = json.loads(CURRENT_STATE_FILE.read_text(encoding="utf-8"))
                self.session_id = data.get("session_id", self.session_id)
                self.tool_calls = data.get("tool_calls", 0)
                self.checkpoints = data.get("checkpoints", [])
                self.context_dna = data.get("context_dna")
                self.work_items = data.get("work_items", [])
                self.quality_scores = data.get("quality_scores", {"S": None, "omega": None})
            except:
                pass
    
    def save(self):
        """Save state to CURRENT_STATE.json — MERGE with existing, never overwrite."""
        # Load existing state first to preserve quickResume, phase, currentSession etc.
        existing = {}
        if CURRENT_STATE_FILE.exists():
            try:
                existing = json.loads(CURRENT_STATE_FILE.read_text(encoding="utf-8"))
            except:
                pass
        
        # Merge lifecycle fields INTO existing state (existing fields preserved)
        existing["session_id"] = self.session_id
        existing["started_at"] = existing.get("started_at", self.started_at)
        existing["updated_at"] = datetime.now().isoformat()
        existing["tool_calls"] = self.tool_calls
        existing["checkpoints"] = self.checkpoints
        existing["context_dna"] = self.context_dna
        existing["last_checkpoint"] = self.last_checkpoint
        existing["work_items"] = self.work_items
        existing["quality_scores"] = self.quality_scores
        
        # Sort keys for KV-cache stability
        sorted_data = self._sort_keys(existing)
        CURRENT_STATE_FILE.write_text(json.dumps(sorted_data, indent=2), encoding="utf-8")
    
    def _sort_keys(self, obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: self._sort_keys(v) for k, v in sorted(obj.items())}
        elif isinstance(obj, list):
            return [self._sort_keys(item) for item in obj]
        return obj
    
    def to_dict(self) -> Dict:
        return {
            "session_id": self.session_id,
            "started_at": self.started_at,
            "tool_calls": self.tool_calls,
            "checkpoints": self.checkpoints,
            "context_dna": self.context_dna,
            "work_items": self.work_items,
            "quality_scores": self.quality_scores
        }

# Global session state
_session = SessionState()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def generate_context_dna(content: str) -> str:
    """
    Generate a fingerprint of context for compaction detection.
    
    Context DNA is a short hash that changes if context is compacted.
    """
    # Extract key markers
    markers = []
    
    # Session ID
    session_match = re.search(r'SESSION-\d+|S-\d+', content)
    if session_match:
        markers.append(session_match.group())
    
    # Tool call patterns
    tool_calls = re.findall(r'prism_\w+', content)
    markers.append(f"tools:{len(tool_calls)}")
    
    # Checkpoint references
    checkpoints = re.findall(r'checkpoint|CHECKPOINT', content, re.IGNORECASE)
    markers.append(f"ckpt:{len(checkpoints)}")
    
    # Content length
    markers.append(f"len:{len(content)}")
    
    # Generate hash
    dna = hashlib.sha256("|".join(markers).encode()).hexdigest()[:16]
    return dna

def find_latest_transcript() -> Optional[Path]:
    """Find the most recent transcript file."""
    if not TRANSCRIPTS_DIR.exists():
        return None
    
    transcripts = list(TRANSCRIPTS_DIR.glob("*.txt"))
    if not transcripts:
        return None
    
    # Sort by modification time
    transcripts.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return transcripts[0]

def append_session_log(event: Dict):
    """Append event to session log."""
    event["timestamp"] = datetime.now().isoformat()
    with open(SESSION_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")

# ============================================================================
# SESSION LIFECYCLE CLASS
# ============================================================================

class SessionLifecycle:
    """Manages session lifecycle, compaction detection, and recovery."""
    
    def __init__(self):
        self.tools = self._build_tools()
    
    def _build_tools(self) -> Dict[str, callable]:
        return {
            # Session Management
            "prism_session_start": self.prism_session_start,
            "prism_session_quick_resume": self.prism_session_quick_resume,
            "prism_session_checkpoint": self.prism_session_checkpoint,
            "prism_session_end_full": self.prism_session_end_full,
            
            # Compaction & Recovery
            "prism_compaction_detect": self.prism_compaction_detect,
            "prism_state_reconstruct": self.prism_state_reconstruct,
            "prism_transcript_read": self.prism_transcript_read,
            
            # Context Analysis
            "prism_context_dna": self.prism_context_dna,
            "prism_state_get": self.prism_state_get,
            "prism_state_update": self.prism_state_update,
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
    # SESSION MANAGEMENT
    # =========================================================================
    
    def prism_session_start(
        self,
        task_name: str = None,
        continue_previous: bool = True
    ) -> Dict:
        """
        Initialize session with state loading.
        
        Call this at the start of every session to:
        1. Load previous state if continuing
        2. Generate context DNA for compaction detection
        3. Check for work in progress
        """
        global _session
        
        # Check if continuing previous session
        previous_state = None
        if continue_previous and CURRENT_STATE_FILE.exists():
            try:
                previous_state = json.loads(CURRENT_STATE_FILE.read_text(encoding="utf-8"))
            except:
                pass
        
        # Generate new session ID if not continuing
        if not previous_state:
            _session = SessionState()
        
        # Set task name
        if task_name:
            _session.work_items.append({
                "task": task_name,
                "started": datetime.now().isoformat(),
                "status": "IN_PROGRESS"
            })
        
        # Generate context DNA
        _session.context_dna = generate_context_dna(json.dumps(_session.to_dict()))
        _session.save()
        
        # Log session start
        append_session_log({
            "event": "SESSION_START",
            "session_id": _session.session_id,
            "continued": previous_state is not None,
            "task": task_name
        })
        
        # Build quick resume data
        quick_resume = {
            "session_id": _session.session_id,
            "task": task_name or (previous_state.get("work_items", [])[-1].get("task") if previous_state and previous_state.get("work_items") else None),
            "context_dna": _session.context_dna,
            "checkpoints": _session.checkpoints[-3:] if _session.checkpoints else [],
            "last_tool_calls": _session.tool_calls,
            "quick_commands": [
                "prism_gsd_core() - Load GSD instructions",
                "prism_state_get() - Check current state",
                "prism_todo_get() - Check attention anchor"
            ]
        }
        QUICK_RESUME_FILE.write_text(json.dumps(quick_resume, indent=2), encoding="utf-8")
        
        return {
            "status": "SESSION_STARTED",
            "session_id": _session.session_id,
            "continued_from": previous_state.get("session_id") if previous_state else None,
            "context_dna": _session.context_dna,
            "tool_calls_so_far": _session.tool_calls,
            "work_items": _session.work_items,
            "next_steps": [
                "1. Call prism_gsd_core() for instructions",
                "2. Call prism_todo_get() to check focus",
                "3. Resume work or start new task"
            ]
        }
    
    def prism_session_quick_resume(self) -> Dict:
        """
        Fast resume after compaction or restart.
        
        Reads QUICK_RESUME.json and provides immediate context.
        Call this FIRST when you detect you may have been compacted.
        """
        global _session
        
        if not QUICK_RESUME_FILE.exists():
            return {
                "status": "NO_QUICK_RESUME",
                "recommendation": "Call prism_session_start() instead"
            }
        
        try:
            quick_data = json.loads(QUICK_RESUME_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            return {"error": f"Failed to read quick resume: {e}"}
        
        # Reload session state
        _session._load()
        
        # Check for compaction
        current_dna = generate_context_dna(json.dumps(_session.to_dict()))
        compacted = current_dna != quick_data.get("context_dna")
        
        return {
            "status": "QUICK_RESUME",
            "session_id": quick_data.get("session_id"),
            "task": quick_data.get("task"),
            "compaction_detected": compacted,
            "previous_context_dna": quick_data.get("context_dna"),
            "current_context_dna": current_dna,
            "recent_checkpoints": quick_data.get("checkpoints", []),
            "tool_calls_before": quick_data.get("last_tool_calls"),
            "quick_commands": quick_data.get("quick_commands", []),
            "recovery_steps": [
                "1. State loaded from CURRENT_STATE.json",
                "2. If compacted, call prism_transcript_read() for full history",
                "3. Continue with prism_todo_get() to check focus"
            ] if compacted else ["Continue normally - no compaction detected"]
        }
    
    def prism_session_checkpoint(
        self,
        reason: str = "manual",
        include_context: bool = True
    ) -> Dict:
        """
        Create session checkpoint.
        
        Call every 5-8 tool calls to preserve progress.
        """
        global _session
        
        _session.tool_calls += 1
        
        checkpoint_id = f"CP-{int(datetime.now().timestamp())}"
        checkpoint = {
            "id": checkpoint_id,
            "timestamp": datetime.now().isoformat(),
            "reason": reason,
            "tool_calls": _session.tool_calls,
            "session_id": _session.session_id,
            "work_items": _session.work_items,
            "quality_scores": _session.quality_scores
        }
        
        # Save checkpoint file
        checkpoint_file = CHECKPOINTS_DIR / f"{checkpoint_id}.json"
        checkpoint_file.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")
        
        # Update session state
        _session.checkpoints.append(checkpoint_id)
        _session.checkpoints = _session.checkpoints[-10:]  # Keep last 10
        _session.last_checkpoint = checkpoint_id
        _session.context_dna = generate_context_dna(json.dumps(_session.to_dict()))
        _session.save()
        
        # Update quick resume
        quick_resume = {
            "session_id": _session.session_id,
            "task": _session.work_items[-1].get("task") if _session.work_items else None,
            "context_dna": _session.context_dna,
            "checkpoints": _session.checkpoints[-3:],
            "last_tool_calls": _session.tool_calls,
            "quick_commands": [
                "prism_gsd_core() - Load GSD instructions",
                "prism_state_get() - Check current state",
                "prism_todo_get() - Check attention anchor"
            ]
        }
        QUICK_RESUME_FILE.write_text(json.dumps(quick_resume, indent=2), encoding="utf-8")
        
        # Log checkpoint
        append_session_log({
            "event": "CHECKPOINT",
            "checkpoint_id": checkpoint_id,
            "reason": reason,
            "tool_calls": _session.tool_calls
        })
        
        return {
            "status": "CHECKPOINT_CREATED",
            "checkpoint_id": checkpoint_id,
            "tool_calls": _session.tool_calls,
            "context_dna": _session.context_dna,
            "checkpoints_total": len(_session.checkpoints),
            "filepath": str(checkpoint_file),
            "recommendation": f"Next checkpoint in {8 - (_session.tool_calls % 8)} calls"
        }
    
    def prism_session_end_full(
        self,
        summary: str = None,
        next_action: str = None,
        handoff_to: str = None
    ) -> Dict:
        """
        Graceful session shutdown.
        
        Saves all state, creates final checkpoint, and prepares for next session.
        """
        global _session
        
        # Create final checkpoint
        final_checkpoint = self.prism_session_checkpoint(reason="session_end")
        
        # Update work items status
        for item in _session.work_items:
            if item.get("status") == "IN_PROGRESS":
                item["status"] = "PAUSED"
                item["paused_at"] = datetime.now().isoformat()
        
        # Create handoff data
        handoff = {
            "from_session": _session.session_id,
            "ended_at": datetime.now().isoformat(),
            "summary": summary,
            "next_action": next_action,
            "handoff_to": handoff_to,
            "work_items": _session.work_items,
            "quality_scores": _session.quality_scores,
            "checkpoints": _session.checkpoints,
            "tool_calls_total": _session.tool_calls,
            "resume_instructions": [
                "1. Call prism_session_quick_resume()",
                "2. Call prism_gsd_core() for instructions",
                "3. Call prism_todo_get() to check focus",
                f"4. {next_action or 'Continue from last checkpoint'}"
            ]
        }
        
        # Save handoff file
        handoff_file = STATE_DIR / f"handoff_{_session.session_id}.json"
        handoff_file.write_text(json.dumps(handoff, indent=2), encoding="utf-8")
        
        # Update CURRENT_STATE for next session
        _session.save()
        
        # Log session end
        append_session_log({
            "event": "SESSION_END",
            "session_id": _session.session_id,
            "tool_calls": _session.tool_calls,
            "summary": summary
        })
        
        return {
            "status": "SESSION_ENDED",
            "session_id": _session.session_id,
            "final_checkpoint": final_checkpoint.get("checkpoint_id"),
            "tool_calls_total": _session.tool_calls,
            "handoff_file": str(handoff_file),
            "next_session_start": "Call prism_session_quick_resume() or prism_session_start()"
        }
    
    # =========================================================================
    # COMPACTION & RECOVERY
    # =========================================================================
    
    def prism_compaction_detect(self, context_sample: str = None) -> Dict:
        """
        Detect if context was compacted.
        
        Compaction happens when Claude's context window fills up and 
        the system removes earlier parts of the conversation.
        
        Signs of compaction:
        - Missing session ID
        - Tool call count reset
        - Context DNA mismatch
        """
        global _session
        
        indicators = []
        confidence = 0.0
        
        # Check 1: Quick resume file exists but DNA mismatch
        if QUICK_RESUME_FILE.exists():
            try:
                quick_data = json.loads(QUICK_RESUME_FILE.read_text(encoding="utf-8"))
                stored_dna = quick_data.get("context_dna")
                current_dna = generate_context_dna(json.dumps(_session.to_dict()))
                
                if stored_dna and stored_dna != current_dna:
                    indicators.append("Context DNA mismatch - likely compacted")
                    confidence += 0.4
            except:
                pass
        
        # Check 2: Session ID not in context sample
        if context_sample:
            if _session.session_id not in context_sample:
                indicators.append(f"Session ID {_session.session_id} not found in context")
                confidence += 0.3
            
            # Check for compaction markers
            if "[COMPACTED]" in context_sample or "summary of previous" in context_sample.lower():
                indicators.append("Compaction markers found in context")
                confidence += 0.5
        
        # Check 3: Tool call count seems low for work done
        if _session.checkpoints and _session.tool_calls < len(_session.checkpoints) * 5:
            indicators.append("Tool call count lower than expected for checkpoints")
            confidence += 0.2
        
        # Check 4: Transcript exists but context much shorter
        transcript = find_latest_transcript()
        if transcript:
            try:
                transcript_size = transcript.stat().st_size
                if transcript_size > 50000:  # Large transcript
                    indicators.append(f"Large transcript ({transcript_size} bytes) suggests rich history")
                    confidence += 0.1
            except:
                pass
        
        compacted = confidence >= 0.5
        
        recovery_steps = []
        if compacted:
            recovery_steps = [
                "1. Call prism_transcript_read() to get full history",
                "2. Call prism_state_reconstruct() to rebuild state",
                "3. Call prism_session_quick_resume() to continue"
            ]
        
        return {
            "status": "COMPACTION_DETECTED" if compacted else "NO_COMPACTION",
            "compacted": compacted,
            "confidence": round(confidence, 2),
            "indicators": indicators,
            "session_id": _session.session_id,
            "context_dna": _session.context_dna,
            "recovery_steps": recovery_steps,
            "transcript_available": transcript is not None,
            "transcript_path": str(transcript) if transcript else None
        }
    
    def prism_state_reconstruct(self, from_transcript: bool = True) -> Dict:
        """
        Rebuild state from transcript after compaction.
        
        Parses the transcript to extract:
        - Tool calls made
        - Checkpoints created
        - Work items
        - Decisions made
        """
        global _session
        
        if not from_transcript:
            # Just reload from files
            _session._load()
            return {
                "status": "STATE_RELOADED",
                "session_id": _session.session_id,
                "tool_calls": _session.tool_calls,
                "work_items": _session.work_items
            }
        
        # Find and parse transcript
        transcript = find_latest_transcript()
        if not transcript:
            return {"error": "No transcript found", "recommendation": "Try prism_state_reconstruct(from_transcript=False)"}
        
        try:
            content = transcript.read_text(encoding="utf-8")
        except Exception as e:
            return {"error": f"Failed to read transcript: {e}"}
        
        # Extract information from transcript
        reconstructed = {
            "tool_calls": [],
            "checkpoints": [],
            "decisions": [],
            "errors": [],
            "work_items": []
        }
        
        # Find tool calls
        tool_pattern = r'prism_\w+\([^)]*\)'
        reconstructed["tool_calls"] = re.findall(tool_pattern, content)
        
        # Find checkpoints
        checkpoint_pattern = r'CP-\d+'
        reconstructed["checkpoints"] = list(set(re.findall(checkpoint_pattern, content)))
        
        # Find session ID
        session_pattern = r'S-\d+|SESSION-\d+'
        sessions = re.findall(session_pattern, content)
        if sessions:
            _session.session_id = sessions[-1]  # Use most recent
        
        # Update session state
        _session.tool_calls = len(reconstructed["tool_calls"])
        _session.checkpoints = reconstructed["checkpoints"]
        _session.context_dna = generate_context_dna(content)
        _session.save()
        
        return {
            "status": "STATE_RECONSTRUCTED",
            "transcript": str(transcript),
            "transcript_size": len(content),
            "session_id": _session.session_id,
            "tool_calls_found": len(reconstructed["tool_calls"]),
            "checkpoints_found": len(reconstructed["checkpoints"]),
            "unique_tools": list(set(re.findall(r'prism_\w+', content)))[:20],
            "context_dna": _session.context_dna,
            "next_steps": [
                "State reconstructed from transcript",
                "Call prism_todo_update() to re-anchor attention",
                "Continue with previous task"
            ]
        }
    
    def prism_transcript_read(
        self,
        lines: int = 100,
        from_end: bool = True,
        search: str = None
    ) -> Dict:
        """
        Read transcript file for context recovery.
        
        Returns the last N lines by default, or searches for specific content.
        """
        transcript = find_latest_transcript()
        if not transcript:
            return {"error": "No transcript found"}
        
        try:
            content = transcript.read_text(encoding="utf-8")
            all_lines = content.split("\n")
        except Exception as e:
            return {"error": f"Failed to read transcript: {e}"}
        
        if search:
            # Search for specific content
            matching_lines = [
                (i, line) for i, line in enumerate(all_lines)
                if search.lower() in line.lower()
            ]
            return {
                "status": "SEARCH_RESULTS",
                "transcript": str(transcript),
                "search_term": search,
                "matches": len(matching_lines),
                "results": [
                    {"line": i, "content": line[:200]}
                    for i, line in matching_lines[:20]
                ]
            }
        
        # Return lines
        if from_end:
            selected_lines = all_lines[-lines:]
            line_range = f"last {len(selected_lines)} lines"
        else:
            selected_lines = all_lines[:lines]
            line_range = f"first {len(selected_lines)} lines"
        
        return {
            "status": "TRANSCRIPT_READ",
            "transcript": str(transcript),
            "total_lines": len(all_lines),
            "line_range": line_range,
            "content": "\n".join(selected_lines)
        }
    
    # =========================================================================
    # CONTEXT ANALYSIS
    # =========================================================================
    
    def prism_context_dna(self, content: str = None) -> Dict:
        """
        Generate context fingerprint for compaction detection.
        
        DNA changes when context is compacted, allowing detection.
        """
        global _session
        
        if content:
            dna = generate_context_dna(content)
        else:
            dna = generate_context_dna(json.dumps(_session.to_dict()))
        
        # Compare with stored DNA
        stored_dna = _session.context_dna
        match = dna == stored_dna if stored_dna else None
        
        # Update stored DNA
        _session.context_dna = dna
        _session.save()
        
        return {
            "status": "CONTEXT_DNA",
            "dna": dna,
            "previous_dna": stored_dna,
            "match": match,
            "interpretation": "Context unchanged" if match else ("Context changed - possible compaction" if stored_dna else "First DNA capture")
        }
    
    def prism_state_get(self) -> Dict:
        """Get current session state."""
        global _session
        return {
            "status": "STATE",
            "session": _session.to_dict(),
            "files": {
                "current_state": str(CURRENT_STATE_FILE),
                "quick_resume": str(QUICK_RESUME_FILE),
                "checkpoints_dir": str(CHECKPOINTS_DIR)
            }
        }
    
    def prism_state_update(
        self,
        work_item: str = None,
        work_status: str = None,
        quality_S: float = None,
        quality_omega: float = None
    ) -> Dict:
        """Update session state."""
        global _session
        
        if work_item:
            _session.work_items.append({
                "task": work_item,
                "started": datetime.now().isoformat(),
                "status": work_status or "IN_PROGRESS"
            })
        
        if quality_S is not None:
            _session.quality_scores["S"] = quality_S
        if quality_omega is not None:
            _session.quality_scores["omega"] = quality_omega
        
        _session.tool_calls += 1
        _session.save()
        
        return {
            "status": "STATE_UPDATED",
            "tool_calls": _session.tool_calls,
            "work_items": len(_session.work_items),
            "quality_scores": _session.quality_scores
        }


# ============================================================================
# MODULE INTERFACE
# ============================================================================

_lifecycle_instance = None

def get_session_lifecycle() -> SessionLifecycle:
    """Get singleton instance."""
    global _lifecycle_instance
    if _lifecycle_instance is None:
        _lifecycle_instance = SessionLifecycle()
    return _lifecycle_instance


# ============================================================================
# CLI INTERFACE — Called from MCP dispatchers via execSync
# ============================================================================

if __name__ == "__main__":
    import sys
    
    lifecycle = get_session_lifecycle()
    args = sys.argv[1:]
    command = args[0] if args else "status"
    use_json = "--json" in args
    
    try:
        if command == "start":
            task = None
            for i, a in enumerate(args):
                if a == "--task" and i + 1 < len(args):
                    task = args[i + 1]
            result = lifecycle.prism_session_start(task_name=task)
        elif command == "end":
            summary = next_action = None
            for i, a in enumerate(args):
                if a == "--summary" and i + 1 < len(args):
                    summary = args[i + 1]
                if a == "--next" and i + 1 < len(args):
                    next_action = args[i + 1]
            result = lifecycle.prism_session_end_full(
                summary=summary, next_action=next_action
            )
        elif command == "checkpoint":
            reason = "auto"
            for i, a in enumerate(args):
                if a == "--reason" and i + 1 < len(args):
                    reason = args[i + 1]
            result = lifecycle.prism_session_checkpoint(reason=reason)
        elif command == "compaction":
            result = lifecycle.prism_compaction_detect()
        elif command == "dna":
            content = " ".join(args[1:]) if len(args) > 1 else "session"
            result = {"context_dna": generate_context_dna(content)}
        elif command == "state":
            result = lifecycle.prism_state_get()
        elif command == "status":
            result = {
                "tools": list(lifecycle.tools.keys()),
                "total": len(lifecycle.tools),
                "session_id": _session.session_id if _session else None
            }
        else:
            result = {"error": f"Unknown command: {command}",
                      "available": ["start", "end", "checkpoint", "compaction", "dna", "state", "status"]}
        
        if use_json:
            print(json.dumps(result, default=str))
        else:
            for k, v in result.items():
                print(f"  {k}: {v}")
    except Exception as e:
        err = {"error": str(e), "command": command}
        if use_json:
            print(json.dumps(err))
        else:
            print(f"ERROR: {e}")
