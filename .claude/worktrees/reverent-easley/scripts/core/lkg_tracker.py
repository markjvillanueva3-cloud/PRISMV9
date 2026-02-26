#!/usr/bin/env python3
"""
LKG_TRACKER.py - Last Known Good State Tracker
Tracks validated good states for safe recovery.

LKG (Last Known Good) is a validated checkpoint that we know works.
Used as safe fallback when current state is corrupted or invalid.

Usage:
    python lkg_tracker.py mark                    # Mark current state as LKG
    python lkg_tracker.py mark --checkpoint CP-X  # Mark specific checkpoint as LKG
    python lkg_tracker.py get                     # Get current LKG
    python lkg_tracker.py restore                 # Restore to LKG
    python lkg_tracker.py history                 # Show LKG history

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
LKG_FILE = STATE_DIR / "lkg_state.json"
LKG_HISTORY_FILE = STATE_DIR / "lkg_history.json"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"

# Import dependencies
import sys
sys.path.insert(0, str(PRISM_ROOT / "scripts" / "core"))
try:
    from checkpoint_mgr import CheckpointManager
    from state_rollback import StateRollback
except ImportError:
    CheckpointManager = None
    StateRollback = None


@dataclass
class LKGRecord:
    """Record of a Last Known Good state."""
    id: str
    checkpoint_id: str
    sequence: int
    marked_at: str
    marked_by: str  # "AUTO" or "MANUAL"
    state_checksum: str
    validation_result: Dict
    reason: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'LKGRecord':
        return cls(**d)


class LKGTracker:
    """
    Tracks Last Known Good states for safe recovery.
    
    LKG represents a state that has been validated and is known to work.
    It provides a safe fallback point when things go wrong.
    
    Validation criteria:
    - State file parses correctly
    - Required fields present
    - No corruption markers
    - Checkpoint exists and is valid
    """
    
    REQUIRED_STATE_FIELDS = ["version", "lastUpdated", "currentSession", "quickResume"]
    MAX_HISTORY = 20  # Keep last 20 LKG records
    
    def __init__(self):
        self.lkg: Optional[LKGRecord] = None
        self.history: List[LKGRecord] = []
        self.checkpoint_mgr = CheckpointManager() if CheckpointManager else None
        self.rollback = StateRollback() if StateRollback else None
        
        self._load()
    
    def _load(self):
        """Load LKG state and history."""
        if LKG_FILE.exists():
            try:
                with open(LKG_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if data.get("current"):
                        self.lkg = LKGRecord.from_dict(data["current"])
            except (json.JSONDecodeError, KeyError):
                pass
        
        if LKG_HISTORY_FILE.exists():
            try:
                with open(LKG_HISTORY_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.history = [LKGRecord.from_dict(r) for r in data.get("records", [])]
            except (json.JSONDecodeError, KeyError):
                pass
    
    def _save(self):
        """Save LKG state and history."""
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save current LKG
        with open(LKG_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "current": self.lkg.to_dict() if self.lkg else None,
                "lastUpdated": datetime.now().isoformat()
            }, f, indent=2)
        
        # Save history
        with open(LKG_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "records": [r.to_dict() for r in self.history[-self.MAX_HISTORY:]],
                "lastUpdated": datetime.now().isoformat()
            }, f, indent=2)
    
    def _generate_lkg_id(self) -> str:
        """Generate unique LKG ID."""
        now = datetime.now()
        return f"LKG-{now.strftime('%Y%m%d-%H%M%S')}"
    
    def _compute_checksum(self, state: Dict) -> str:
        """Compute state checksum."""
        content = json.dumps(state, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _load_current_state(self) -> Optional[Dict]:
        """Load current state file."""
        if CURRENT_STATE_FILE.exists():
            try:
                with open(CURRENT_STATE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        return None
    
    def validate_state(self, state: Dict = None) -> Dict:
        """
        Validate a state for LKG eligibility.
        
        Returns validation result with details.
        """
        if state is None:
            state = self._load_current_state()
        
        result = {
            "valid": True,
            "checks": [],
            "errors": [],
            "warnings": []
        }
        
        if not state:
            result["valid"] = False
            result["errors"].append("State is empty or could not be loaded")
            return result
        
        # Check required fields
        for field in self.REQUIRED_STATE_FIELDS:
            if field in state:
                result["checks"].append(f"Required field '{field}' present")
            else:
                result["valid"] = False
                result["errors"].append(f"Missing required field: {field}")
        
        # Check for corruption markers
        state_str = json.dumps(state)
        corruption_markers = ["undefined", "NaN", "null\n"]
        for marker in corruption_markers:
            if marker in state_str:
                result["warnings"].append(f"Potential corruption marker: {marker}")
        
        # Check version format
        version = state.get("version", "")
        if not version or not isinstance(version, str):
            result["warnings"].append("Version field is empty or invalid")
        
        # Check lastUpdated is valid ISO timestamp
        last_updated = state.get("lastUpdated", "")
        try:
            if last_updated:
                datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                result["checks"].append("lastUpdated is valid timestamp")
        except ValueError:
            result["warnings"].append("lastUpdated is not a valid timestamp")
        
        # Check quickResume has content
        quick_resume = state.get("quickResume", "")
        if quick_resume and len(quick_resume) > 10:
            result["checks"].append("quickResume has meaningful content")
        else:
            result["warnings"].append("quickResume is empty or too short")
        
        # Summary
        result["check_count"] = len(result["checks"])
        result["error_count"] = len(result["errors"])
        result["warning_count"] = len(result["warnings"])
        
        return result
    
    def mark_lkg(self, checkpoint_id: str = None, reason: str = None,
                 source: str = "MANUAL") -> Dict:
        """
        Mark a state as Last Known Good.
        
        Args:
            checkpoint_id: Specific checkpoint (uses latest if None)
            reason: Why this state is being marked
            source: "AUTO" or "MANUAL"
            
        Returns:
            Result with LKG info
        """
        # Get checkpoint
        if checkpoint_id:
            if self.checkpoint_mgr:
                checkpoint = self.checkpoint_mgr.get(checkpoint_id)
            else:
                return {"success": False, "error": "Checkpoint manager not available"}
        else:
            checkpoint = None
        
        # Always validate against current state (most complete)
        state = self._load_current_state()
        if checkpoint:
            cp_id = checkpoint.id
            sequence = checkpoint.sequence
        else:
            cp_id = "CURRENT"
            sequence = 0
        
        validation = self.validate_state(state)
        
        if not validation["valid"]:
            return {
                "success": False,
                "error": "State validation failed",
                "validation": validation
            }
        
        # Create LKG record
        lkg_record = LKGRecord(
            id=self._generate_lkg_id(),
            checkpoint_id=cp_id,
            sequence=sequence,
            marked_at=datetime.now().isoformat(),
            marked_by=source,
            state_checksum=self._compute_checksum(state),
            validation_result=validation,
            reason=reason
        )
        
        # Update current and history
        if self.lkg:
            self.history.append(self.lkg)
        self.lkg = lkg_record
        
        self._save()
        
        return {
            "success": True,
            "lkg_id": lkg_record.id,
            "checkpoint_id": cp_id,
            "sequence": sequence,
            "checksum": lkg_record.state_checksum,
            "validation": validation
        }
    
    def get_lkg(self) -> Optional[Dict]:
        """Get current LKG information."""
        if not self.lkg:
            return None
        return self.lkg.to_dict()
    
    def restore_lkg(self, reason: str = None) -> Dict:
        """
        Restore to Last Known Good state.
        
        Returns:
            Result of restore operation
        """
        if not self.lkg:
            return {"success": False, "error": "No LKG state available"}
        
        if not self.rollback:
            return {"success": False, "error": "Rollback system not available"}
        
        # Restore to LKG checkpoint
        if self.lkg.checkpoint_id != "CURRENT":
            result = self.rollback.rollback_to_checkpoint(
                self.lkg.checkpoint_id,
                reason or f"Restore to LKG {self.lkg.id}"
            )
        else:
            result = {"success": False, "error": "LKG was not from a checkpoint"}
        
        return result
    
    def auto_mark_if_valid(self) -> Optional[Dict]:
        """
        Automatically mark LKG if current state is valid.
        
        Called periodically to update LKG when things are working well.
        """
        state = self._load_current_state()
        validation = self.validate_state(state)
        
        if validation["valid"] and validation["warning_count"] == 0:
            # State is clean, mark as LKG
            return self.mark_lkg(source="AUTO", reason="Periodic auto-mark")
        
        return None
    
    def get_history(self, limit: int = 10) -> List[Dict]:
        """Get LKG history."""
        records = [r.to_dict() for r in self.history[-limit:]]
        records.reverse()  # Most recent first
        
        if self.lkg:
            records.insert(0, {**self.lkg.to_dict(), "current": True})
        
        return records
    
    def compare_with_current(self) -> Dict:
        """Compare LKG with current state."""
        if not self.lkg:
            return {"error": "No LKG available"}
        
        current_state = self._load_current_state()
        if not current_state:
            return {"error": "Could not load current state"}
        
        current_checksum = self._compute_checksum(current_state)
        
        return {
            "lkg_checksum": self.lkg.state_checksum,
            "current_checksum": current_checksum,
            "match": self.lkg.state_checksum == current_checksum,
            "lkg_sequence": self.lkg.sequence,
            "lkg_marked_at": self.lkg.marked_at
        }


def main():
    parser = argparse.ArgumentParser(description="PRISM LKG Tracker")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Mark command
    mark_parser = subparsers.add_parser("mark", help="Mark state as LKG")
    mark_parser.add_argument("--checkpoint", help="Specific checkpoint ID")
    mark_parser.add_argument("--reason", help="Reason for marking")
    mark_parser.add_argument("--json", action="store_true")
    
    # Get command
    get_parser = subparsers.add_parser("get", help="Get current LKG")
    get_parser.add_argument("--json", action="store_true")
    
    # Restore command
    restore_parser = subparsers.add_parser("restore", help="Restore to LKG")
    restore_parser.add_argument("--reason", help="Reason for restore")
    restore_parser.add_argument("--json", action="store_true")
    
    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate current state")
    validate_parser.add_argument("--json", action="store_true")
    
    # History command
    history_parser = subparsers.add_parser("history", help="Show LKG history")
    history_parser.add_argument("--limit", type=int, default=10)
    history_parser.add_argument("--json", action="store_true")
    
    # Compare command
    compare_parser = subparsers.add_parser("compare", help="Compare LKG with current")
    compare_parser.add_argument("--json", action="store_true")
    
    # Auto command
    auto_parser = subparsers.add_parser("auto", help="Auto-mark if valid")
    auto_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    tracker = LKGTracker()
    
    if args.command == "mark":
        result = tracker.mark_lkg(args.checkpoint, args.reason)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Marked LKG: {result['lkg_id']}")
                print(f"    Checkpoint: {result['checkpoint_id']}")
                print(f"    Checksum: {result['checksum']}")
            else:
                print(f"[X] Failed: {result['error']}")
    
    elif args.command == "get":
        lkg = tracker.get_lkg()
        if args.json:
            print(json.dumps(lkg, indent=2))
        else:
            if lkg:
                print(f"LKG: {lkg['id']}")
                print(f"  Checkpoint: {lkg['checkpoint_id']}")
                print(f"  Sequence: {lkg['sequence']}")
                print(f"  Marked: {lkg['marked_at']}")
                print(f"  By: {lkg['marked_by']}")
            else:
                print("No LKG state available")
    
    elif args.command == "restore":
        result = tracker.restore_lkg(args.reason)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Restored to LKG")
            else:
                print(f"[X] Restore failed: {result['error']}")
    
    elif args.command == "validate":
        result = tracker.validate_state()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            status = "[+] VALID" if result["valid"] else "[X] INVALID"
            print(f"{status}")
            print(f"  Checks passed: {result['check_count']}")
            print(f"  Errors: {result['error_count']}")
            print(f"  Warnings: {result['warning_count']}")
            if result["errors"]:
                for e in result["errors"]:
                    print(f"    [E] {e}")
            if result["warnings"]:
                for w in result["warnings"]:
                    print(f"    [W] {w}")
    
    elif args.command == "history":
        history = tracker.get_history(args.limit)
        if args.json:
            print(json.dumps(history, indent=2))
        else:
            print(f"LKG History ({len(history)} records):")
            for r in history:
                current = " [CURRENT]" if r.get("current") else ""
                print(f"  {r['id']} -> {r['checkpoint_id']} (seq {r['sequence']}){current}")
    
    elif args.command == "compare":
        result = tracker.compare_with_current()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if "error" in result:
                print(f"[X] {result['error']}")
            else:
                match = "[MATCH]" if result["match"] else "[DIFFERENT]"
                print(f"{match}")
                print(f"  LKG checksum: {result['lkg_checksum']}")
                print(f"  Current checksum: {result['current_checksum']}")
    
    elif args.command == "auto":
        result = tracker.auto_mark_if_valid()
        if args.json:
            print(json.dumps(result, indent=2) if result else '{"marked": false}')
        else:
            if result:
                print(f"[+] Auto-marked LKG: {result['lkg_id']}")
            else:
                print("[~] State not clean enough for auto-mark")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
