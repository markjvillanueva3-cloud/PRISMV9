#!/usr/bin/env python3
"""
STATE_VERSION.py - State Versioning and Rebuild System
Manages state versions and rebuilds current state from event log.

Key concepts:
- State is COMPUTED from events, not stored directly
- Checkpoints are snapshots for fast rebuild
- Version tracks the event sequence that produced current state

Usage:
    python state_version.py rebuild                    # Rebuild from events
    python state_version.py rebuild --from-checkpoint  # Rebuild from last checkpoint
    python state_version.py version                    # Show current version
    python state_version.py diff --v1 100 --v2 150    # Diff between sequences

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import argparse
import copy
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
STATE_VERSION_FILE = STATE_DIR / "state_version.json"
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"

# Import event logger
import sys
sys.path.insert(0, str(PRISM_ROOT / "scripts" / "core"))
try:
    from event_logger import EventLogger, EventType, Event
except ImportError:
    EventLogger = None


@dataclass
class StateVersion:
    """Tracks state version information."""
    version: str  # Semantic version
    sequence: int  # Event sequence that produced this state
    last_event_id: str
    last_checkpoint_id: Optional[str]
    state_checksum: str  # SHA-256 of current state
    rebuilt_at: str
    event_count: int
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'StateVersion':
        return cls(**d)


class StateVersionManager:
    """
    Manages state versions and rebuilds state from events.
    
    The state is always the result of applying events in sequence.
    Checkpoints allow fast recovery without replaying all events.
    """
    
    def __init__(self):
        self.state_file = CURRENT_STATE_FILE
        self.version_file = STATE_VERSION_FILE
        self.checkpoints_dir = CHECKPOINTS_DIR
        self.event_logger = EventLogger() if EventLogger else None
        
        self.current_state: Dict = {}
        self.version: Optional[StateVersion] = None
        
        self._load_current()
    
    def _load_current(self):
        """Load current state and version."""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    self.current_state = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.current_state = {}
        
        if self.version_file.exists():
            try:
                with open(self.version_file, 'r', encoding='utf-8') as f:
                    self.version = StateVersion.from_dict(json.load(f))
            except (json.JSONDecodeError, IOError):
                self.version = None
    
    def _save_current(self):
        """Save current state and version."""
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(self.current_state, f, indent=2)
        
        if self.version:
            with open(self.version_file, 'w', encoding='utf-8') as f:
                json.dump(self.version.to_dict(), f, indent=2)
    
    def _compute_checksum(self, state: Dict) -> str:
        """Compute checksum of state."""
        content = json.dumps(state, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _apply_event(self, state: Dict, event: Event) -> Dict:
        """
        Apply a single event to state.
        
        Returns new state (does not modify input).
        """
        state = copy.deepcopy(state)
        
        if event.type == EventType.STATE_INIT.value:
            return event.data.get("initialState", {})
        
        elif event.type == EventType.STATE_UPDATE.value:
            path = event.data.get("path", "")
            value = event.data.get("value")
            self._set_path(state, path, value)
        
        elif event.type == EventType.STATE_PATCH.value:
            patch = event.data.get("patch", {})
            state = self._deep_merge(state, patch)
        
        elif event.type == EventType.SESSION_START.value:
            if "currentSession" not in state:
                state["currentSession"] = {}
            state["currentSession"]["id"] = event.session_id
            state["currentSession"]["status"] = "IN_PROGRESS"
            state["currentSession"]["startedAt"] = event.timestamp
            if event.data.get("task"):
                state["currentSession"]["task"] = event.data["task"]
        
        elif event.type == EventType.SESSION_END.value:
            if "currentSession" in state:
                state["currentSession"]["status"] = event.data.get("status", "COMPLETE")
                state["currentSession"]["endedAt"] = event.timestamp
            # Move to completed sessions
            if "completedSessions" not in state:
                state["completedSessions"] = {}
            if event.session_id and "currentSession" in state:
                state["completedSessions"][event.session_id] = state["currentSession"]
        
        elif event.type == EventType.PROGRESS_UPDATE.value:
            if "progress" not in state:
                state["progress"] = {}
            state["progress"]["completed"] = event.data.get("completed", 0)
            state["progress"]["total"] = event.data.get("total", 0)
            state["progress"]["percentage"] = event.data.get("percentage", 0)
            if event.data.get("currentItem"):
                state["progress"]["currentItem"] = event.data["currentItem"]
        
        elif event.type == EventType.TASK_COMPLETE.value:
            if "completedTasks" not in state:
                state["completedTasks"] = []
            state["completedTasks"].append({
                "task": event.data.get("task"),
                "completedAt": event.timestamp
            })
        
        elif event.type == EventType.DECISION_RECORD.value:
            if "decisions" not in state:
                state["decisions"] = []
            state["decisions"].append({
                "id": event.id,
                "decision": event.data.get("decision"),
                "rationale": event.data.get("rationale"),
                "timestamp": event.timestamp
            })
        
        elif event.type == EventType.ERROR_LOG.value:
            if "errors" not in state:
                state["errors"] = []
            state["errors"].append({
                "id": event.id,
                "error": event.data.get("error"),
                "context": event.data.get("context"),
                "timestamp": event.timestamp
            })
        
        # Always update lastUpdated
        state["lastUpdated"] = event.timestamp
        
        return state
    
    def _set_path(self, obj: Dict, path: str, value: Any):
        """Set value at JSON path (e.g., 'a.b.c')."""
        parts = path.split('.')
        for part in parts[:-1]:
            if part not in obj:
                obj[part] = {}
            obj = obj[part]
        if parts:
            obj[parts[-1]] = value
    
    def _get_path(self, obj: Dict, path: str) -> Any:
        """Get value at JSON path."""
        parts = path.split('.')
        for part in parts:
            if isinstance(obj, dict) and part in obj:
                obj = obj[part]
            else:
                return None
        return obj
    
    def _deep_merge(self, base: Dict, patch: Dict) -> Dict:
        """Deep merge patch into base."""
        result = copy.deepcopy(base)
        for key, value in patch.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    
    def rebuild_from_events(self, from_sequence: int = 0, 
                           to_sequence: int = None) -> Dict:
        """
        Rebuild state by replaying events.
        
        Args:
            from_sequence: Start from this sequence (0 = beginning)
            to_sequence: Stop at this sequence (None = all)
            
        Returns:
            Rebuilt state
        """
        if not self.event_logger:
            raise RuntimeError("Event logger not available")
        
        state = {}
        events = self.event_logger.read_events(since_sequence=from_sequence)
        
        last_event = None
        for event in events:
            if to_sequence and event.sequence > to_sequence:
                break
            state = self._apply_event(state, event)
            last_event = event
        
        if last_event:
            # Update version
            self.version = StateVersion(
                version=state.get("version", "1.0.0"),
                sequence=last_event.sequence,
                last_event_id=last_event.id,
                last_checkpoint_id=self.version.last_checkpoint_id if self.version else None,
                state_checksum=self._compute_checksum(state),
                rebuilt_at=datetime.now().isoformat(),
                event_count=len(events)
            )
        
        self.current_state = state
        return state
    
    def rebuild_from_checkpoint(self, checkpoint_id: str = None) -> Dict:
        """
        Rebuild state from checkpoint + subsequent events.
        
        Args:
            checkpoint_id: Specific checkpoint (None = latest)
            
        Returns:
            Rebuilt state
        """
        checkpoint = self._load_checkpoint(checkpoint_id)
        
        if not checkpoint:
            # No checkpoint, rebuild from scratch
            return self.rebuild_from_events()
        
        state = checkpoint["state"]
        checkpoint_sequence = checkpoint["sequence"]
        
        # Apply events since checkpoint
        if self.event_logger:
            events = self.event_logger.read_since_checkpoint(checkpoint_sequence)
            for event in events:
                state = self._apply_event(state, event)
            
            last_event = events[-1] if events else None
            self.version = StateVersion(
                version=state.get("version", "1.0.0"),
                sequence=last_event.sequence if last_event else checkpoint_sequence,
                last_event_id=last_event.id if last_event else checkpoint["eventId"],
                last_checkpoint_id=checkpoint["id"],
                state_checksum=self._compute_checksum(state),
                rebuilt_at=datetime.now().isoformat(),
                event_count=len(events)
            )
        
        self.current_state = state
        return state
    
    def _load_checkpoint(self, checkpoint_id: str = None) -> Optional[Dict]:
        """Load a checkpoint."""
        if not self.checkpoints_dir.exists():
            return None
        
        if checkpoint_id:
            # Load specific checkpoint
            cp_file = self.checkpoints_dir / f"{checkpoint_id}.json"
            if cp_file.exists():
                with open(cp_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        else:
            # Find latest checkpoint
            checkpoints = list(self.checkpoints_dir.glob("CP-*.json"))
            if checkpoints:
                latest = max(checkpoints, key=lambda p: p.stem)
                with open(latest, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        return None
    
    def get_state_at_sequence(self, sequence: int) -> Dict:
        """Get state as it was at a specific sequence."""
        # Find nearest checkpoint before sequence
        checkpoint = None
        if self.checkpoints_dir.exists():
            for cp_file in self.checkpoints_dir.glob("CP-*.json"):
                with open(cp_file, 'r', encoding='utf-8') as f:
                    cp = json.load(f)
                if cp["sequence"] <= sequence:
                    if not checkpoint or cp["sequence"] > checkpoint["sequence"]:
                        checkpoint = cp
        
        if checkpoint:
            state = checkpoint["state"]
            from_seq = checkpoint["sequence"]
        else:
            state = {}
            from_seq = 0
        
        # Apply events up to target sequence
        if self.event_logger:
            events = self.event_logger.read_events(since_sequence=from_seq)
            for event in events:
                if event.sequence > sequence:
                    break
                state = self._apply_event(state, event)
        
        return state
    
    def diff_sequences(self, seq1: int, seq2: int) -> Dict:
        """Get diff between two state sequences."""
        state1 = self.get_state_at_sequence(seq1)
        state2 = self.get_state_at_sequence(seq2)
        
        return {
            "sequence1": seq1,
            "sequence2": seq2,
            "added": self._dict_diff_added(state1, state2),
            "removed": self._dict_diff_removed(state1, state2),
            "changed": self._dict_diff_changed(state1, state2)
        }
    
    def _dict_diff_added(self, d1: Dict, d2: Dict, prefix: str = "") -> List[str]:
        """Find keys in d2 not in d1."""
        added = []
        for key in d2:
            path = f"{prefix}.{key}" if prefix else key
            if key not in d1:
                added.append(path)
            elif isinstance(d2[key], dict) and isinstance(d1.get(key), dict):
                added.extend(self._dict_diff_added(d1[key], d2[key], path))
        return added
    
    def _dict_diff_removed(self, d1: Dict, d2: Dict, prefix: str = "") -> List[str]:
        """Find keys in d1 not in d2."""
        return self._dict_diff_added(d2, d1, prefix)
    
    def _dict_diff_changed(self, d1: Dict, d2: Dict, prefix: str = "") -> List[Dict]:
        """Find keys with different values."""
        changed = []
        for key in d1:
            if key in d2:
                path = f"{prefix}.{key}" if prefix else key
                if isinstance(d1[key], dict) and isinstance(d2[key], dict):
                    changed.extend(self._dict_diff_changed(d1[key], d2[key], path))
                elif d1[key] != d2[key]:
                    changed.append({"path": path, "old": d1[key], "new": d2[key]})
        return changed
    
    def save(self):
        """Save current state and version."""
        self._save_current()
    
    def get_version_info(self) -> Dict:
        """Get current version information."""
        return {
            "version": self.version.to_dict() if self.version else None,
            "state_checksum": self._compute_checksum(self.current_state),
            "state_keys": list(self.current_state.keys())
        }


def main():
    parser = argparse.ArgumentParser(description="PRISM State Version Manager")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Rebuild command
    rebuild_parser = subparsers.add_parser("rebuild", help="Rebuild state from events")
    rebuild_parser.add_argument("--from-checkpoint", action="store_true")
    rebuild_parser.add_argument("--checkpoint-id", help="Specific checkpoint ID")
    rebuild_parser.add_argument("--to-sequence", type=int, help="Rebuild up to sequence")
    rebuild_parser.add_argument("--save", action="store_true", help="Save rebuilt state")
    rebuild_parser.add_argument("--json", action="store_true")
    
    # Version command
    version_parser = subparsers.add_parser("version", help="Show version info")
    version_parser.add_argument("--json", action="store_true")
    
    # Diff command
    diff_parser = subparsers.add_parser("diff", help="Diff between sequences")
    diff_parser.add_argument("--v1", type=int, required=True, help="First sequence")
    diff_parser.add_argument("--v2", type=int, required=True, help="Second sequence")
    diff_parser.add_argument("--json", action="store_true")
    
    # State-at command
    state_at_parser = subparsers.add_parser("state-at", help="Get state at sequence")
    state_at_parser.add_argument("sequence", type=int)
    state_at_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    manager = StateVersionManager()
    
    if args.command == "rebuild":
        if args.from_checkpoint:
            state = manager.rebuild_from_checkpoint(args.checkpoint_id)
        else:
            state = manager.rebuild_from_events(to_sequence=args.to_sequence)
        
        if args.save:
            manager.save()
            print("[+] State saved")
        
        if args.json:
            print(json.dumps(state, indent=2))
        else:
            print(f"[+] Rebuilt state with {len(state)} keys")
            if manager.version:
                print(f"    Sequence: {manager.version.sequence}")
                print(f"    Checksum: {manager.version.state_checksum}")
    
    elif args.command == "version":
        info = manager.get_version_info()
        if args.json:
            print(json.dumps(info, indent=2))
        else:
            if info["version"]:
                v = info["version"]
                print(f"Version: {v['version']}")
                print(f"Sequence: {v['sequence']}")
                print(f"Last Event: {v['last_event_id']}")
                print(f"Checksum: {v['state_checksum']}")
            else:
                print("No version info available")
    
    elif args.command == "diff":
        diff = manager.diff_sequences(args.v1, args.v2)
        if args.json:
            print(json.dumps(diff, indent=2))
        else:
            print(f"Diff: Sequence {args.v1} -> {args.v2}")
            print(f"  Added: {len(diff['added'])} keys")
            print(f"  Removed: {len(diff['removed'])} keys")
            print(f"  Changed: {len(diff['changed'])} values")
    
    elif args.command == "state-at":
        state = manager.get_state_at_sequence(args.sequence)
        if args.json:
            print(json.dumps(state, indent=2))
        else:
            print(f"State at sequence {args.sequence}: {len(state)} keys")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
