#!/usr/bin/env python3
"""
PRISM State Manager v2.0 - Append-Only with Compression
Implements Manus Law 3: Zero Work Loss on Compaction

Usage:
    from state_manager_v2 import StateManager
    sm = StateManager()
    sm.log_decision("choice", "reasoning")
    sm.create_checkpoint("task", 5, 10)
"""
import sys
import json
import os
import hashlib
import uuid

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

# Paths
PRISM_STATE = Path("C:/PRISM/state")
STATE_LOG = PRISM_STATE / "STATE_LOG.jsonl"
CURRENT_STATE = PRISM_STATE / "CURRENT_STATE.json"
ARCHIVES_DIR = PRISM_STATE / "archives"
INDEXES_DIR = PRISM_STATE / "indexes"

# Ensure directories exist
ARCHIVES_DIR.mkdir(parents=True, exist_ok=True)
INDEXES_DIR.mkdir(parents=True, exist_ok=True)


class StateEntry:
    """Single immutable state entry."""
    
    def __init__(self, entry_type: str, data: Dict[str, Any], session_id: str = None):
        self.id = str(uuid.uuid4())[:8]
        self.timestamp = datetime.now().isoformat()
        self.type = entry_type
        self.session_id = session_id or os.environ.get("PRISM_SESSION", "UNKNOWN")
        self.data = data
        self.hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        content = json.dumps(self.data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "type": self.type,
            "session_id": self.session_id,
            "data": self.data,
            "hash": self.hash
        }
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'StateEntry':
        entry = cls.__new__(cls)
        entry.id = d["id"]
        entry.timestamp = d["timestamp"]
        entry.type = d["type"]
        entry.session_id = d["session_id"]
        entry.data = d["data"]
        entry.hash = d["hash"]
        return entry


class StateManager:
    """Append-only state manager with compression."""
    
    def __init__(self):
        self.log_path = STATE_LOG
        self.current_session = None
        self.calls_since_checkpoint = 0
        self._ensure_log_exists()
    
    def _ensure_log_exists(self):
        if not self.log_path.exists():
            self.log_path.touch()
    
    # ─────────────────────────────────────────────────────────────
    # APPEND OPERATIONS (CTX-STATE-001)
    # ─────────────────────────────────────────────────────────────
    
    def _append_entry(self, entry: StateEntry):
        """Append entry to log (never overwrite)."""
        with open(self.log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry.to_dict(), sort_keys=True) + '\n')
        
        self.calls_since_checkpoint += 1
        
        # Auto-compress if too large
        if self._get_entry_count() > 1000:
            self.compress()
    
    def log_decision(self, choice: str, reasoning: str, 
                     question: str = None, alternatives: List[str] = None,
                     confidence: float = 0.8):
        """Log a decision entry."""
        entry = StateEntry("decision", {
            "question": question or f"Decision: {choice}",
            "choice": choice,
            "reasoning": reasoning,
            "alternatives": alternatives or [],
            "confidence": confidence
        }, self.current_session)
        self._append_entry(entry)
        return entry.id
    
    def log_file_change(self, path: str, action: str = "modify",
                        size_before: int = 0, size_after: int = 0,
                        lines_changed: int = 0, summary: str = ""):
        """Log a file change entry."""
        entry = StateEntry("file_change", {
            "path": str(path),
            "action": action,
            "size_before": size_before,
            "size_after": size_after,
            "lines_changed": lines_changed,
            "diff_summary": summary,
            "hash_after": self._file_hash(path) if action != "delete" else None
        }, self.current_session)
        self._append_entry(entry)
        return entry.id
    
    def log_error(self, error_type: str, message: str, 
                  context: str = "", resolution: str = "", prevention: str = ""):
        """Log an error entry (CTX-ERR integration)."""
        entry = StateEntry("error", {
            "error_type": error_type,
            "message": message,
            "context": context,
            "resolution": resolution,
            "prevention": prevention
        }, self.current_session)
        self._append_entry(entry)
        return entry.id
    
    def log_metric(self, name: str, value: float, threshold: float = None,
                   components: Dict[str, float] = None):
        """Log a metric entry."""
        passed = value >= threshold if threshold else True
        entry = StateEntry("metric", {
            "name": name,
            "value": value,
            "threshold": threshold,
            "passed": passed,
            "components": components or {}
        }, self.current_session)
        self._append_entry(entry)
        return entry.id
    
    # ─────────────────────────────────────────────────────────────
    # CHECKPOINT OPERATIONS (CTX-STATE-002)
    # ─────────────────────────────────────────────────────────────
    
    def create_checkpoint(self, task: str, completed: int, total: int,
                          files_created: List[str] = None,
                          files_modified: List[str] = None,
                          next_action: str = ""):
        """Create a checkpoint entry."""
        quick_resume = f"{task}: {completed}/{total} done. Next: {next_action}"
        
        entry = StateEntry("checkpoint", {
            "task": task,
            "completed": completed,
            "total": total,
            "files_created": files_created or [],
            "files_modified": files_modified or [],
            "decisions_made": self._count_decisions_since_checkpoint(),
            "next_action": next_action,
            "quick_resume": quick_resume
        }, self.current_session)
        self._append_entry(entry)
        self.calls_since_checkpoint = 0
        
        # Update CURRENT_STATE.json quick resume
        self._update_current_state(quick_resume)
        
        return entry.id
    
    def get_last_checkpoint(self) -> Optional[StateEntry]:
        """Get the most recent checkpoint."""
        entries = self._read_entries()
        for entry in reversed(entries):
            if entry.type == "checkpoint":
                return entry
        return None
    
    # ─────────────────────────────────────────────────────────────
    # COMPRESSION OPERATIONS (CTX-STATE-003)
    # ─────────────────────────────────────────────────────────────
    
    def compress(self, keep_recent: int = 100):
        """Compress old entries to archive."""
        entries = self._read_entries()
        
        if len(entries) <= keep_recent:
            return None  # Nothing to compress
        
        # Split entries
        to_archive = entries[:-keep_recent]
        to_keep = entries[-keep_recent:]
        
        # Create archive
        archive_name = f"archive_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jsonl"
        archive_path = ARCHIVES_DIR / archive_name
        
        with open(archive_path, 'w', encoding='utf-8') as f:
            for entry in to_archive:
                f.write(json.dumps(entry.to_dict(), sort_keys=True) + '\n')
        
        # Create compression summary
        sessions = list(set(e.session_id for e in to_archive))
        summary = {
            "total_decisions": sum(1 for e in to_archive if e.type == "decision"),
            "total_files_changed": sum(1 for e in to_archive if e.type == "file_change"),
            "total_errors": sum(1 for e in to_archive if e.type == "error"),
            "sessions_covered": sessions
        }
        
        # Create restore index
        restore_index = {}
        current_idx = 0
        for session_id in sessions:
            session_entries = [e for e in to_archive if e.session_id == session_id]
            restore_index[session_id] = {
                "start": current_idx,
                "end": current_idx + len(session_entries) - 1
            }
            current_idx += len(session_entries)
        
        # Log compression
        compression_entry = StateEntry("compression", {
            "entries_compressed": len(to_archive),
            "sessions_covered": sessions,
            "archive_path": str(archive_path),
            "summary": summary,
            "restore_index": restore_index
        }, self.current_session)
        
        # Rewrite log with only recent entries + compression marker
        with open(self.log_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(compression_entry.to_dict(), sort_keys=True) + '\n')
            for entry in to_keep:
                f.write(json.dumps(entry.to_dict(), sort_keys=True) + '\n')
        
        return archive_path
    
    # ─────────────────────────────────────────────────────────────
    # RESTORE OPERATIONS (CTX-STATE-004)
    # ─────────────────────────────────────────────────────────────
    
    def restore_session(self, session_id: str) -> List[StateEntry]:
        """Restore all entries for a session."""
        # Check current log
        entries = self._read_entries()
        session_entries = [e for e in entries if e.session_id == session_id]
        
        if session_entries:
            return session_entries
        
        # Check archives via compression entries
        for entry in entries:
            if entry.type == "compression":
                if session_id in entry.data.get("restore_index", {}):
                    archive_path = entry.data["archive_path"]
                    index = entry.data["restore_index"][session_id]
                    return self._read_archive_range(archive_path, index["start"], index["end"])
        
        return []
    
    def search_decisions(self, keyword: str) -> List[StateEntry]:
        """Search all decisions containing keyword."""
        results = []
        
        # Search current log
        for entry in self._read_entries():
            if entry.type == "decision":
                if keyword.lower() in json.dumps(entry.data).lower():
                    results.append(entry)
        
        # Search archives
        for archive in ARCHIVES_DIR.glob("*.jsonl"):
            for entry in self._read_archive(archive):
                if entry.type == "decision":
                    if keyword.lower() in json.dumps(entry.data).lower():
                        results.append(entry)
        
        return results
    
    # ─────────────────────────────────────────────────────────────
    # SESSION MANAGEMENT
    # ─────────────────────────────────────────────────────────────
    
    def start_session(self, session_id: str):
        """Start a new session."""
        self.current_session = session_id
        os.environ["PRISM_SESSION"] = session_id
        
        entry = StateEntry("session_start", {
            "session_id": session_id,
            "started_at": datetime.now().isoformat()
        }, session_id)
        self._append_entry(entry)
    
    def end_session(self, status: str = "COMPLETE", summary: str = ""):
        """End current session."""
        entry = StateEntry("session_end", {
            "session_id": self.current_session,
            "ended_at": datetime.now().isoformat(),
            "status": status,
            "summary": summary
        }, self.current_session)
        self._append_entry(entry)
        self.current_session = None
    
    # ─────────────────────────────────────────────────────────────
    # HELPER METHODS
    # ─────────────────────────────────────────────────────────────
    
    def _read_entries(self) -> List[StateEntry]:
        """Read all entries from current log."""
        entries = []
        if self.log_path.exists():
            with open(self.log_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        entries.append(StateEntry.from_dict(json.loads(line)))
        return entries
    
    def _read_archive(self, archive_path: Path) -> List[StateEntry]:
        """Read all entries from an archive."""
        entries = []
        with open(archive_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    entries.append(StateEntry.from_dict(json.loads(line)))
        return entries
    
    def _read_archive_range(self, archive_path: str, start: int, end: int) -> List[StateEntry]:
        """Read specific range from archive."""
        entries = []
        with open(archive_path, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if start <= i <= end:
                    entries.append(StateEntry.from_dict(json.loads(line)))
                if i > end:
                    break
        return entries
    
    def _get_entry_count(self) -> int:
        """Count entries in current log."""
        if not self.log_path.exists():
            return 0
        with open(self.log_path, 'r', encoding='utf-8') as f:
            return sum(1 for _ in f)
    
    def _count_decisions_since_checkpoint(self) -> int:
        """Count decisions since last checkpoint."""
        entries = self._read_entries()
        count = 0
        for entry in reversed(entries):
            if entry.type == "checkpoint":
                break
            if entry.type == "decision":
                count += 1
        return count
    
    def _file_hash(self, path: str) -> Optional[str]:
        """Compute hash of file."""
        try:
            with open(path, 'rb') as f:
                return hashlib.sha256(f.read()).hexdigest()[:16]
        except:
            return None
    
    def _update_current_state(self, quick_resume: str):
        """Update CURRENT_STATE.json with quick resume."""
        try:
            with open(CURRENT_STATE, 'r', encoding='utf-8') as f:
                state = json.load(f)
            state["quickResume"] = quick_resume
            state["lastUpdated"] = datetime.now().isoformat()
            with open(CURRENT_STATE, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, sort_keys=True)
        except Exception as e:
            print(f"Warning: Could not update CURRENT_STATE.json: {e}")
    
    # ─────────────────────────────────────────────────────────────
    # STATUS / REPORTING
    # ─────────────────────────────────────────────────────────────
    
    def status(self) -> Dict:
        """Get current state manager status."""
        entries = self._read_entries()
        archives = list(ARCHIVES_DIR.glob("*.jsonl"))
        
        return {
            "active_entries": len(entries),
            "archives": len(archives),
            "current_session": self.current_session,
            "calls_since_checkpoint": self.calls_since_checkpoint,
            "last_checkpoint": self.get_last_checkpoint().data if self.get_last_checkpoint() else None,
            "entry_types": {
                "decisions": sum(1 for e in entries if e.type == "decision"),
                "file_changes": sum(1 for e in entries if e.type == "file_change"),
                "checkpoints": sum(1 for e in entries if e.type == "checkpoint"),
                "errors": sum(1 for e in entries if e.type == "error")
            }
        }


# ─────────────────────────────────────────────────────────────────
# CLI INTERFACE
# ─────────────────────────────────────────────────────────────────

def main():
    import argparse
    parser = argparse.ArgumentParser(description="PRISM State Manager v2.0")
    parser.add_argument("command", choices=["status", "checkpoint", "compress", "search", "restore"])
    parser.add_argument("--task", help="Task name for checkpoint")
    parser.add_argument("--completed", type=int, help="Items completed")
    parser.add_argument("--total", type=int, help="Total items")
    parser.add_argument("--next", help="Next action")
    parser.add_argument("--keyword", help="Search keyword")
    parser.add_argument("--session", help="Session ID to restore")
    
    args = parser.parse_args()
    sm = StateManager()
    
    if args.command == "status":
        status = sm.status()
        print(json.dumps(status, indent=2, sort_keys=True))
    
    elif args.command == "checkpoint":
        if not all([args.task, args.completed, args.total]):
            print("Error: --task, --completed, --total required")
            return
        cp_id = sm.create_checkpoint(args.task, args.completed, args.total, 
                                      next_action=args.next or "")
        print(f"Checkpoint created: {cp_id}")
    
    elif args.command == "compress":
        archive = sm.compress()
        if archive:
            print(f"Compressed to: {archive}")
        else:
            print("Nothing to compress")
    
    elif args.command == "search":
        if not args.keyword:
            print("Error: --keyword required")
            return
        results = sm.search_decisions(args.keyword)
        for r in results:
            print(f"[{r.timestamp}] {r.data.get('choice', 'N/A')}: {r.data.get('reasoning', '')[:100]}")
    
    elif args.command == "restore":
        if not args.session:
            print("Error: --session required")
            return
        entries = sm.restore_session(args.session)
        print(f"Restored {len(entries)} entries for session {args.session}")
        for e in entries[:10]:
            print(f"  [{e.type}] {e.timestamp}")


if __name__ == "__main__":
    main()
