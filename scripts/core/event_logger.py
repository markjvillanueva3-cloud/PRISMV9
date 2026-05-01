#!/usr/bin/env python3
"""
EVENT_LOGGER.py - Append-Only Event Logging System
Core component of PRISM state persistence.

Events are NEVER deleted or modified - only appended.
State is rebuilt by replaying events from last checkpoint.

Usage:
    python event_logger.py append STATE_UPDATE --path "currentSession.status" --value "COMPLETE"
    python event_logger.py list --since "2026-02-01" --type STATE_UPDATE
    python event_logger.py replay --from-checkpoint CP-20260201-120000
    python event_logger.py verify --check-integrity

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import copy

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
EVENT_LOG_FILE = STATE_DIR / "event_log.jsonl"
EVENT_INDEX_FILE = STATE_DIR / "event_index.json"
LOCK_FILE = STATE_DIR / ".event_lock"


class EventType(Enum):
    """All valid event types."""
    STATE_INIT = "STATE_INIT"
    STATE_UPDATE = "STATE_UPDATE"
    STATE_PATCH = "STATE_PATCH"
    CHECKPOINT_CREATE = "CHECKPOINT_CREATE"
    CHECKPOINT_RESTORE = "CHECKPOINT_RESTORE"
    SESSION_START = "SESSION_START"
    SESSION_END = "SESSION_END"
    TASK_START = "TASK_START"
    TASK_COMPLETE = "TASK_COMPLETE"
    TASK_FAIL = "TASK_FAIL"
    PROGRESS_UPDATE = "PROGRESS_UPDATE"
    DECISION_RECORD = "DECISION_RECORD"
    ERROR_LOG = "ERROR_LOG"
    ROLLBACK = "ROLLBACK"
    COMPACT = "COMPACT"


@dataclass
class Event:
    """Immutable event record."""
    id: str
    type: str
    timestamp: str
    sequence: int
    data: Dict[str, Any]
    session_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    checksum: str = ""
    
    def __post_init__(self):
        if not self.checksum:
            self.checksum = self._compute_checksum()
    
    def _compute_checksum(self) -> str:
        """Compute SHA-256 checksum for integrity verification."""
        content = f"{self.id}|{self.type}|{self.timestamp}|{json.dumps(self.data, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def verify(self) -> bool:
        """Verify event integrity."""
        return self.checksum == self._compute_checksum()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "type": self.type,
            "timestamp": self.timestamp,
            "sequence": self.sequence,
            "sessionId": self.session_id,
            "parentEventId": self.parent_event_id,
            "data": self.data,
            "checksum": self.checksum
        }
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'Event':
        """Create Event from dictionary."""
        return cls(
            id=d["id"],
            type=d["type"],
            timestamp=d["timestamp"],
            sequence=d["sequence"],
            data=d["data"],
            session_id=d.get("sessionId"),
            parent_event_id=d.get("parentEventId"),
            checksum=d.get("checksum", "")
        )


@dataclass
class EventIndex:
    """Index for fast event lookups."""
    last_sequence: int = 0
    last_event_id: str = ""
    event_count: int = 0
    events_by_type: Dict[str, int] = field(default_factory=dict)
    checkpoints: List[Dict] = field(default_factory=list)
    first_event_time: Optional[str] = None
    last_event_time: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'EventIndex':
        return cls(**d)


class EventLogger:
    """
    Append-only event logger with integrity guarantees.
    
    Design principles:
    - Events are NEVER modified or deleted
    - Every event has a checksum for integrity
    - Events form a chain via parent_event_id
    - Index provides fast lookups without scanning log
    """
    
    _lock = threading.Lock()
    _sequence_counter = 0
    
    def __init__(self, event_log_path: Path = None, index_path: Path = None):
        self.event_log_path = event_log_path or EVENT_LOG_FILE
        self.index_path = index_path or EVENT_INDEX_FILE
        self.index = self._load_index()
        EventLogger._sequence_counter = self.index.last_sequence
    
    def _load_index(self) -> EventIndex:
        """Load or create event index."""
        if self.index_path.exists():
            try:
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    return EventIndex.from_dict(json.load(f))
            except (json.JSONDecodeError, KeyError):
                pass
        return EventIndex()
    
    def _save_index(self):
        """Persist event index."""
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.index_path, 'w', encoding='utf-8') as f:
            json.dump(self.index.to_dict(), f, indent=2)
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID."""
        now = datetime.now()
        return f"EVT-{now.strftime('%Y%m%d-%H%M%S')}-{EventLogger._sequence_counter:04d}"
    
    def _next_sequence(self) -> int:
        """Get next sequence number (thread-safe)."""
        with EventLogger._lock:
            EventLogger._sequence_counter += 1
            return EventLogger._sequence_counter
    
    def append(self, event_type: EventType, data: Dict[str, Any], 
               session_id: str = None) -> Event:
        """
        Append a new event to the log.
        
        Args:
            event_type: Type of event
            data: Event payload
            session_id: Optional session identifier
            
        Returns:
            The created Event
        """
        sequence = self._next_sequence()
        event_id = self._generate_event_id()
        
        event = Event(
            id=event_id,
            type=event_type.value,
            timestamp=datetime.now().isoformat(),
            sequence=sequence,
            data=data,
            session_id=session_id,
            parent_event_id=self.index.last_event_id or None
        )
        
        # Append to log file (atomic append)
        self.event_log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.event_log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(event.to_dict()) + '\n')
        
        # Update index
        self.index.last_sequence = sequence
        self.index.last_event_id = event_id
        self.index.event_count += 1
        self.index.events_by_type[event_type.value] = \
            self.index.events_by_type.get(event_type.value, 0) + 1
        self.index.last_event_time = event.timestamp
        if not self.index.first_event_time:
            self.index.first_event_time = event.timestamp
        
        self._save_index()
        
        return event
    
    def read_events(self, since_sequence: int = 0, 
                    event_type: EventType = None,
                    limit: int = None) -> List[Event]:
        """
        Read events from log.
        
        Args:
            since_sequence: Only events after this sequence
            event_type: Filter by event type
            limit: Maximum events to return
            
        Returns:
            List of matching events
        """
        events = []
        
        if not self.event_log_path.exists():
            return events
        
        with open(self.event_log_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    event = Event.from_dict(json.loads(line))
                    
                    if event.sequence <= since_sequence:
                        continue
                    
                    if event_type and event.type != event_type.value:
                        continue
                    
                    events.append(event)
                    
                    if limit and len(events) >= limit:
                        break
                        
                except (json.JSONDecodeError, KeyError):
                    continue
        
        return events
    
    def read_since_checkpoint(self, checkpoint_sequence: int) -> List[Event]:
        """Read all events since a checkpoint."""
        return self.read_events(since_sequence=checkpoint_sequence)
    
    def get_event(self, event_id: str) -> Optional[Event]:
        """Get a specific event by ID."""
        if not self.event_log_path.exists():
            return None
        
        with open(self.event_log_path, 'r', encoding='utf-8') as f:
            for line in f:
                if event_id in line:  # Quick filter
                    try:
                        event = Event.from_dict(json.loads(line))
                        if event.id == event_id:
                            return event
                    except (json.JSONDecodeError, KeyError):
                        continue
        return None
    
    def verify_integrity(self) -> Tuple[bool, List[str]]:
        """
        Verify integrity of entire event log.
        
        Returns:
            (is_valid, list_of_issues)
        """
        issues = []
        last_sequence = 0
        last_event_id = None
        
        if not self.event_log_path.exists():
            return True, []
        
        with open(self.event_log_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                
                try:
                    event = Event.from_dict(json.loads(line))
                    
                    # Verify checksum
                    if not event.verify():
                        issues.append(f"Line {line_num}: Checksum mismatch for {event.id}")
                    
                    # Verify sequence
                    if event.sequence <= last_sequence:
                        issues.append(f"Line {line_num}: Sequence {event.sequence} <= {last_sequence}")
                    
                    # Verify chain
                    if last_event_id and event.parent_event_id != last_event_id:
                        issues.append(f"Line {line_num}: Chain broken - expected parent {last_event_id}")
                    
                    last_sequence = event.sequence
                    last_event_id = event.id
                    
                except (json.JSONDecodeError, KeyError) as e:
                    issues.append(f"Line {line_num}: Parse error - {e}")
        
        return len(issues) == 0, issues
    
    def get_stats(self) -> Dict:
        """Get event log statistics."""
        return {
            "event_count": self.index.event_count,
            "last_sequence": self.index.last_sequence,
            "last_event_id": self.index.last_event_id,
            "events_by_type": self.index.events_by_type,
            "first_event": self.index.first_event_time,
            "last_event": self.index.last_event_time,
            "checkpoint_count": len(self.index.checkpoints)
        }


# Convenience functions for common event types
def log_state_update(path: str, value: Any, previous_value: Any = None, 
                     session_id: str = None) -> Event:
    """Log a state update event."""
    logger = EventLogger()
    data = {"path": path, "value": value}
    if previous_value is not None:
        data["previousValue"] = previous_value
    return logger.append(EventType.STATE_UPDATE, data, session_id)


def log_state_patch(patch: Dict, session_id: str = None) -> Event:
    """Log a state patch (merge) event."""
    logger = EventLogger()
    return logger.append(EventType.STATE_PATCH, {"patch": patch}, session_id)


def log_progress(completed: int, total: int, current_item: str = None,
                 session_id: str = None) -> Event:
    """Log progress update."""
    logger = EventLogger()
    data = {
        "completed": completed,
        "total": total,
        "percentage": round(completed / total * 100, 1) if total > 0 else 0
    }
    if current_item:
        data["currentItem"] = current_item
    return logger.append(EventType.PROGRESS_UPDATE, data, session_id)


def log_session_start(session_id: str, task: str = None) -> Event:
    """Log session start."""
    logger = EventLogger()
    return logger.append(EventType.SESSION_START, 
                        {"task": task}, session_id)


def log_session_end(session_id: str, status: str = "COMPLETE") -> Event:
    """Log session end."""
    logger = EventLogger()
    return logger.append(EventType.SESSION_END,
                        {"status": status}, session_id)


def log_checkpoint(checkpoint_id: str, sequence: int, reason: str = None) -> Event:
    """Log checkpoint creation."""
    logger = EventLogger()
    return logger.append(EventType.CHECKPOINT_CREATE,
                        {"checkpointId": checkpoint_id, 
                         "sequence": sequence,
                         "reason": reason})


def main():
    parser = argparse.ArgumentParser(description="PRISM Event Logger")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Append command
    append_parser = subparsers.add_parser("append", help="Append an event")
    append_parser.add_argument("type", choices=[e.value for e in EventType])
    append_parser.add_argument("--path", help="JSON path for STATE_UPDATE")
    append_parser.add_argument("--value", help="Value for STATE_UPDATE")
    append_parser.add_argument("--data", help="JSON data payload")
    append_parser.add_argument("--session", help="Session ID")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List events")
    list_parser.add_argument("--since", type=int, default=0, help="Since sequence")
    list_parser.add_argument("--type", choices=[e.value for e in EventType])
    list_parser.add_argument("--limit", type=int, default=20)
    list_parser.add_argument("--json", action="store_true")
    
    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Verify integrity")
    verify_parser.add_argument("--json", action="store_true")
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show statistics")
    stats_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    logger = EventLogger()
    
    if args.command == "append":
        event_type = EventType(args.type)
        
        if args.data:
            data = json.loads(args.data)
        elif args.path and args.value:
            try:
                value = json.loads(args.value)
            except json.JSONDecodeError:
                value = args.value
            data = {"path": args.path, "value": value}
        else:
            data = {}
        
        event = logger.append(event_type, data, args.session)
        print(json.dumps(event.to_dict(), indent=2))
    
    elif args.command == "list":
        event_type = EventType(args.type) if args.type else None
        events = logger.read_events(args.since, event_type, args.limit)
        
        if args.json:
            print(json.dumps([e.to_dict() for e in events], indent=2))
        else:
            for e in events:
                print(f"[{e.sequence:05d}] {e.timestamp[:19]} {e.type:20s} {e.id}")
    
    elif args.command == "verify":
        is_valid, issues = logger.verify_integrity()
        
        if args.json:
            print(json.dumps({"valid": is_valid, "issues": issues}, indent=2))
        else:
            if is_valid:
                print("[+] Event log integrity verified")
            else:
                print(f"[X] Found {len(issues)} issues:")
                for issue in issues[:10]:
                    print(f"  - {issue}")
    
    elif args.command == "stats":
        stats = logger.get_stats()
        if args.json:
            print(json.dumps(stats, indent=2))
        else:
            print(f"Events: {stats['event_count']}")
            print(f"Sequence: {stats['last_sequence']}")
            print(f"Types: {stats['events_by_type']}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
