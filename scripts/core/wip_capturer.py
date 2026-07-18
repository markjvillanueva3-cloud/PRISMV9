#!/usr/bin/env python3
"""
WIP_CAPTURER.py - Work In Progress Capture System
Captures and saves work in progress for seamless session handoff.

Features:
- Detects incomplete work (partial files, pending tasks)
- Saves WIP state for recovery
- Tracks file modifications
- Records decision context

Usage:
    python wip_capturer.py capture                # Capture current WIP
    python wip_capturer.py list                   # List all WIP items
    python wip_capturer.py get WIP-001            # Get specific WIP
    python wip_capturer.py clear                  # Clear completed WIP
    python wip_capturer.py restore WIP-001        # Restore WIP to active

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
WIP_DIR = STATE_DIR / "wip"
WIP_INDEX_FILE = STATE_DIR / "wip_index.json"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROADMAP_FILE = STATE_DIR / "ROADMAP_TRACKER.json"


class WIPType(Enum):
    """Types of work in progress."""
    FILE = "FILE"           # Incomplete file
    TASK = "TASK"           # Incomplete task
    DECISION = "DECISION"   # Pending decision
    CODE = "CODE"           # Code being written
    RESEARCH = "RESEARCH"   # Research in progress


class WIPStatus(Enum):
    """Status of WIP item."""
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    REVIEW = "REVIEW"
    ALMOST_DONE = "ALMOST_DONE"
    PAUSED = "PAUSED"


@dataclass
class WIPItem:
    """Work in progress item."""
    id: str
    type: WIPType
    status: WIPStatus
    description: str
    created_at: str
    updated_at: str
    path: Optional[str] = None
    content: Optional[str] = None
    progress: Dict = field(default_factory=lambda: {"completed": 0, "total": 0})
    next_step: Optional[str] = None
    blocked_by: Optional[str] = None
    context: Dict = field(default_factory=dict)
    checksum: Optional[str] = None
    
    def to_dict(self) -> Dict:
        d = asdict(self)
        d["type"] = self.type.value
        d["status"] = self.status.value
        return d
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'WIPItem':
        d["type"] = WIPType(d["type"])
        d["status"] = WIPStatus(d["status"])
        return cls(**d)
    
    def get_percentage(self) -> float:
        """Get completion percentage."""
        if self.progress["total"] == 0:
            return 0.0
        return round(self.progress["completed"] / self.progress["total"] * 100, 1)


@dataclass
class WIPIndex:
    """Index of all WIP items."""
    items: List[str]  # WIP IDs
    last_updated: str
    total_count: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'WIPIndex':
        return cls(**d)


class WIPCapturer:
    """
    Captures and manages work in progress.
    
    WIP items are saved to individual files for easy recovery.
    The index provides quick lookup without loading all items.
    """
    
    MAX_CONTENT_SIZE = 50000  # Max content to capture (50KB)
    
    def __init__(self):
        self.wip_dir = WIP_DIR
        self.wip_dir.mkdir(parents=True, exist_ok=True)
        self.index = self._load_index()
    
    def _load_index(self) -> WIPIndex:
        """Load or create WIP index."""
        if WIP_INDEX_FILE.exists():
            try:
                with open(WIP_INDEX_FILE, 'r', encoding='utf-8') as f:
                    return WIPIndex.from_dict(json.load(f))
            except (json.JSONDecodeError, KeyError):
                pass
        return WIPIndex(
            items=[],
            last_updated=datetime.now().isoformat(),
            total_count=0,
            by_type={},
            by_status={}
        )
    
    def _save_index(self):
        """Save WIP index."""
        self.index.last_updated = datetime.now().isoformat()
        with open(WIP_INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.index.to_dict(), f, indent=2)
    
    def _generate_wip_id(self) -> str:
        """Generate unique WIP ID."""
        now = datetime.now()
        count = len(self.index.items) + 1
        return f"WIP-{now.strftime('%Y%m%d')}-{count:04d}"
    
    def _compute_checksum(self, content: str) -> str:
        """Compute content checksum."""
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _load_json(self, path: Path) -> Optional[Dict]:
        """Load JSON file safely."""
        if path.exists():
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def capture_file(self, path: str, description: str = None,
                     next_step: str = None) -> WIPItem:
        """
        Capture a file as WIP.
        
        Args:
            path: Path to the file
            description: What the file is for
            next_step: What to do next with it
            
        Returns:
            Created WIPItem
        """
        file_path = Path(path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")
        
        # Read content (truncate if too large)
        content = None
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if len(content) > self.MAX_CONTENT_SIZE:
                    content = content[:self.MAX_CONTENT_SIZE] + "\n...[truncated]"
        except (IOError, UnicodeDecodeError):
            pass
        
        # Get file info
        stat = file_path.stat()
        
        wip = WIPItem(
            id=self._generate_wip_id(),
            type=WIPType.FILE,
            status=WIPStatus.IN_PROGRESS,
            description=description or f"File: {file_path.name}",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            path=str(file_path),
            content=content,
            progress={"completed": 0, "total": 1},
            next_step=next_step,
            context={
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            },
            checksum=self._compute_checksum(content) if content else None
        )
        
        return self._save_wip(wip)
    
    def capture_task(self, description: str, completed: int = 0, total: int = 1,
                     next_step: str = None, blocked_by: str = None) -> WIPItem:
        """
        Capture a task as WIP.
        
        Args:
            description: Task description
            completed: Items completed
            total: Total items
            next_step: Next step for the task
            blocked_by: What's blocking (if anything)
            
        Returns:
            Created WIPItem
        """
        status = WIPStatus.BLOCKED if blocked_by else WIPStatus.IN_PROGRESS
        if completed > 0 and completed >= total * 0.8:
            status = WIPStatus.ALMOST_DONE
        
        wip = WIPItem(
            id=self._generate_wip_id(),
            type=WIPType.TASK,
            status=status,
            description=description,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            progress={"completed": completed, "total": total},
            next_step=next_step,
            blocked_by=blocked_by
        )
        
        return self._save_wip(wip)
    
    def capture_decision(self, decision: str, options: List[str] = None,
                         context: Dict = None) -> WIPItem:
        """
        Capture a pending decision as WIP.
        
        Args:
            decision: The decision to be made
            options: Possible options
            context: Additional context
            
        Returns:
            Created WIPItem
        """
        wip = WIPItem(
            id=self._generate_wip_id(),
            type=WIPType.DECISION,
            status=WIPStatus.IN_PROGRESS,
            description=decision,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            context={
                "options": options or [],
                **(context or {})
            }
        )
        
        return self._save_wip(wip)
    
    def capture_code(self, description: str, code: str = None, path: str = None,
                     lines_written: int = 0, lines_total: int = 0,
                     next_step: str = None) -> WIPItem:
        """
        Capture code being written as WIP.
        
        Args:
            description: What the code does
            code: Partial code content
            path: File path (if known)
            lines_written: Lines completed
            lines_total: Total lines expected
            next_step: What to write next
            
        Returns:
            Created WIPItem
        """
        status = WIPStatus.IN_PROGRESS
        if lines_written > 0 and lines_total > 0:
            if lines_written >= lines_total * 0.8:
                status = WIPStatus.ALMOST_DONE
        
        wip = WIPItem(
            id=self._generate_wip_id(),
            type=WIPType.CODE,
            status=status,
            description=description,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            path=path,
            content=code[:self.MAX_CONTENT_SIZE] if code else None,
            progress={"completed": lines_written, "total": lines_total},
            next_step=next_step,
            checksum=self._compute_checksum(code) if code else None
        )
        
        return self._save_wip(wip)
    
    def _save_wip(self, wip: WIPItem) -> WIPItem:
        """Save WIP item to file and update index."""
        # Save to file
        wip_file = self.wip_dir / f"{wip.id}.json"
        with open(wip_file, 'w', encoding='utf-8') as f:
            json.dump(wip.to_dict(), f, indent=2)
        
        # Update index
        if wip.id not in self.index.items:
            self.index.items.append(wip.id)
            self.index.total_count += 1
        
        # Update type counts
        type_key = wip.type.value
        self.index.by_type[type_key] = self.index.by_type.get(type_key, 0) + 1
        
        # Update status counts
        status_key = wip.status.value
        self.index.by_status[status_key] = self.index.by_status.get(status_key, 0) + 1
        
        self._save_index()
        
        return wip
    
    def get(self, wip_id: str) -> Optional[WIPItem]:
        """Get a specific WIP item."""
        wip_file = self.wip_dir / f"{wip_id}.json"
        if wip_file.exists():
            try:
                with open(wip_file, 'r', encoding='utf-8') as f:
                    return WIPItem.from_dict(json.load(f))
            except (json.JSONDecodeError, KeyError):
                pass
        return None
    
    def list_all(self, wip_type: WIPType = None, 
                 status: WIPStatus = None) -> List[WIPItem]:
        """List all WIP items with optional filters."""
        items = []
        
        for wip_id in self.index.items:
            wip = self.get(wip_id)
            if wip:
                if wip_type and wip.type != wip_type:
                    continue
                if status and wip.status != status:
                    continue
                items.append(wip)
        
        return items
    
    def update(self, wip_id: str, **kwargs) -> Optional[WIPItem]:
        """Update a WIP item."""
        wip = self.get(wip_id)
        if not wip:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(wip, key):
                if key == "type":
                    value = WIPType(value)
                elif key == "status":
                    value = WIPStatus(value)
                setattr(wip, key, value)
        
        wip.updated_at = datetime.now().isoformat()
        
        return self._save_wip(wip)
    
    def complete(self, wip_id: str) -> bool:
        """Mark a WIP item as complete and archive it."""
        wip = self.get(wip_id)
        if not wip:
            return False
        
        # Move to completed
        wip_file = self.wip_dir / f"{wip_id}.json"
        completed_dir = self.wip_dir / "completed"
        completed_dir.mkdir(exist_ok=True)
        
        completed_file = completed_dir / f"{wip_id}.json"
        wip_file.rename(completed_file)
        
        # Update index
        self.index.items.remove(wip_id)
        self.index.total_count -= 1
        self._save_index()
        
        return True
    
    def clear_completed(self) -> int:
        """Clear all completed WIP items."""
        completed_dir = self.wip_dir / "completed"
        if not completed_dir.exists():
            return 0
        
        count = 0
        for f in completed_dir.glob("WIP-*.json"):
            f.unlink()
            count += 1
        
        return count
    
    def auto_capture_from_state(self) -> List[WIPItem]:
        """
        Auto-capture WIP from current state.
        
        Looks at state files to find incomplete work.
        """
        captured = []
        
        # Load state
        state = self._load_json(CURRENT_STATE_FILE)
        roadmap = self._load_json(ROADMAP_FILE)
        
        if not state and not roadmap:
            return captured
        
        # Check current session
        if state:
            session = state.get("currentSession", {})
            if session.get("status") == "IN_PROGRESS":
                wip = self.capture_task(
                    description=f"Session: {session.get('sessionName', 'Unknown')}",
                    next_step=state.get("quickResume", "Continue work")
                )
                captured.append(wip)
        
        # Check roadmap for pending deliverables
        if roadmap:
            current_session = roadmap.get("current_session", "")
            sessions = roadmap.get("sessions", {})
            session_info = sessions.get(current_session, {})
            
            deliverables = session_info.get("deliverables", [])
            pending = [d for d in deliverables if not d.endswith("✓")]
            
            if pending:
                completed = len(deliverables) - len(pending)
                wip = self.capture_task(
                    description=f"Deliverables for session {current_session}",
                    completed=completed,
                    total=len(deliverables),
                    next_step=f"Complete: {pending[0]}" if pending else None
                )
                captured.append(wip)
        
        return captured
    
    def get_handoff_summary(self) -> Dict:
        """Get summary of all WIP for handoff."""
        items = self.list_all()
        
        return {
            "total": len(items),
            "by_type": self.index.by_type,
            "by_status": self.index.by_status,
            "items": [
                {
                    "id": item.id,
                    "type": item.type.value,
                    "status": item.status.value,
                    "description": item.description[:100],
                    "progress": item.get_percentage(),
                    "next_step": item.next_step
                }
                for item in items
            ]
        }


def main():
    parser = argparse.ArgumentParser(description="PRISM WIP Capturer")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Capture file
    capture_file_parser = subparsers.add_parser("capture-file", help="Capture file as WIP")
    capture_file_parser.add_argument("path", help="File path")
    capture_file_parser.add_argument("--desc", help="Description")
    capture_file_parser.add_argument("--next", help="Next step")
    capture_file_parser.add_argument("--json", action="store_true")
    
    # Capture task
    capture_task_parser = subparsers.add_parser("capture-task", help="Capture task as WIP")
    capture_task_parser.add_argument("description", help="Task description")
    capture_task_parser.add_argument("--completed", type=int, default=0)
    capture_task_parser.add_argument("--total", type=int, default=1)
    capture_task_parser.add_argument("--next", help="Next step")
    capture_task_parser.add_argument("--blocked", help="Blocked by")
    capture_task_parser.add_argument("--json", action="store_true")
    
    # Auto capture
    auto_parser = subparsers.add_parser("auto", help="Auto-capture from state")
    auto_parser.add_argument("--json", action="store_true")
    
    # List
    list_parser = subparsers.add_parser("list", help="List WIP items")
    list_parser.add_argument("--type", choices=[t.value for t in WIPType])
    list_parser.add_argument("--status", choices=[s.value for s in WIPStatus])
    list_parser.add_argument("--json", action="store_true")
    
    # Get
    get_parser = subparsers.add_parser("get", help="Get specific WIP")
    get_parser.add_argument("wip_id", help="WIP ID")
    get_parser.add_argument("--json", action="store_true")
    
    # Complete
    complete_parser = subparsers.add_parser("complete", help="Mark WIP as complete")
    complete_parser.add_argument("wip_id", help="WIP ID")
    
    # Summary
    summary_parser = subparsers.add_parser("summary", help="Get handoff summary")
    summary_parser.add_argument("--json", action="store_true")
    
    # Clear
    clear_parser = subparsers.add_parser("clear", help="Clear completed WIP")
    
    args = parser.parse_args()
    capturer = WIPCapturer()
    
    if args.command == "capture-file":
        wip = capturer.capture_file(args.path, args.desc, args.next)
        if args.json:
            print(json.dumps(wip.to_dict(), indent=2))
        else:
            print(f"[+] Captured: {wip.id}")
            print(f"    Type: {wip.type.value}")
            print(f"    Path: {wip.path}")
    
    elif args.command == "capture-task":
        wip = capturer.capture_task(
            args.description, args.completed, args.total,
            args.next, args.blocked
        )
        if args.json:
            print(json.dumps(wip.to_dict(), indent=2))
        else:
            print(f"[+] Captured: {wip.id}")
            print(f"    Status: {wip.status.value}")
            print(f"    Progress: {wip.get_percentage()}%")
    
    elif args.command == "auto":
        items = capturer.auto_capture_from_state()
        if args.json:
            print(json.dumps([i.to_dict() for i in items], indent=2))
        else:
            print(f"[+] Auto-captured {len(items)} WIP items")
            for item in items:
                print(f"    {item.id}: {item.description[:50]}")
    
    elif args.command == "list":
        wip_type = WIPType(args.type) if args.type else None
        status = WIPStatus(args.status) if args.status else None
        items = capturer.list_all(wip_type, status)
        
        if args.json:
            print(json.dumps([i.to_dict() for i in items], indent=2))
        else:
            print(f"WIP Items ({len(items)}):")
            for item in items:
                print(f"  [{item.status.value:12s}] {item.id}: {item.description[:40]}")
    
    elif args.command == "get":
        wip = capturer.get(args.wip_id)
        if wip:
            if args.json:
                print(json.dumps(wip.to_dict(), indent=2))
            else:
                print(f"WIP: {wip.id}")
                print(f"  Type: {wip.type.value}")
                print(f"  Status: {wip.status.value}")
                print(f"  Description: {wip.description}")
                print(f"  Progress: {wip.get_percentage()}%")
                if wip.next_step:
                    print(f"  Next: {wip.next_step}")
        else:
            print(f"WIP not found: {args.wip_id}")
    
    elif args.command == "complete":
        if capturer.complete(args.wip_id):
            print(f"[+] Completed: {args.wip_id}")
        else:
            print(f"[X] Not found: {args.wip_id}")
    
    elif args.command == "summary":
        summary = capturer.get_handoff_summary()
        if args.json:
            print(json.dumps(summary, indent=2))
        else:
            print(f"WIP Summary: {summary['total']} items")
            print(f"  By Type: {summary['by_type']}")
            print(f"  By Status: {summary['by_status']}")
    
    elif args.command == "clear":
        count = capturer.clear_completed()
        print(f"[+] Cleared {count} completed WIP items")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
