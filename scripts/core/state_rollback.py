#!/usr/bin/env python3
"""
STATE_ROLLBACK.py - State Rollback System
Safely rolls back state to a previous checkpoint.

Rollback is an event itself - we don't delete history, we append a rollback
event that causes state to be rebuilt from a previous checkpoint.

Usage:
    python state_rollback.py to CP-20260201-120000         # Rollback to checkpoint
    python state_rollback.py to-sequence 500               # Rollback to sequence
    python state_rollback.py preview CP-20260201-120000    # Preview changes
    python state_rollback.py undo                          # Undo last rollback

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
from dataclasses import dataclass

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
ROLLBACK_HISTORY_FILE = STATE_DIR / "rollback_history.json"

# Import dependencies
import sys
sys.path.insert(0, str(PRISM_ROOT / "scripts" / "core"))
try:
    from event_logger import EventLogger, EventType
    from checkpoint_mgr import CheckpointManager, Checkpoint
    from state_version import StateVersionManager
except ImportError:
    EventLogger = None
    CheckpointManager = None
    StateVersionManager = None


@dataclass
class RollbackRecord:
    """Record of a rollback operation."""
    id: str
    timestamp: str
    target_checkpoint_id: Optional[str]
    target_sequence: int
    events_discarded: int
    reason: str
    pre_rollback_state_checksum: str
    post_rollback_state_checksum: str
    can_undo: bool
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "targetCheckpointId": self.target_checkpoint_id,
            "targetSequence": self.target_sequence,
            "eventsDiscarded": self.events_discarded,
            "reason": self.reason,
            "preRollbackStateChecksum": self.pre_rollback_state_checksum,
            "postRollbackStateChecksum": self.post_rollback_state_checksum,
            "canUndo": self.can_undo
        }
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'RollbackRecord':
        return cls(
            id=d["id"],
            timestamp=d["timestamp"],
            target_checkpoint_id=d.get("targetCheckpointId"),
            target_sequence=d["targetSequence"],
            events_discarded=d["eventsDiscarded"],
            reason=d["reason"],
            pre_rollback_state_checksum=d["preRollbackStateChecksum"],
            post_rollback_state_checksum=d["postRollbackStateChecksum"],
            can_undo=d.get("canUndo", False)
        )


class StateRollback:
    """
    Handles state rollback operations.
    
    Important: Rollback doesn't delete events - it logs a ROLLBACK event
    and rebuilds state from the target checkpoint. This preserves full history.
    """
    
    def __init__(self):
        self.event_logger = EventLogger() if EventLogger else None
        self.checkpoint_mgr = CheckpointManager() if CheckpointManager else None
        self.state_mgr = StateVersionManager() if StateVersionManager else None
        self.rollback_history = self._load_history()
    
    def _load_history(self) -> List[RollbackRecord]:
        """Load rollback history."""
        if ROLLBACK_HISTORY_FILE.exists():
            try:
                with open(ROLLBACK_HISTORY_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return [RollbackRecord.from_dict(r) for r in data.get("rollbacks", [])]
            except (json.JSONDecodeError, KeyError):
                pass
        return []
    
    def _save_history(self):
        """Save rollback history."""
        ROLLBACK_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ROLLBACK_HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "rollbacks": [r.to_dict() for r in self.rollback_history]
            }, f, indent=2)
    
    def _generate_rollback_id(self) -> str:
        """Generate rollback ID."""
        now = datetime.now()
        return f"RB-{now.strftime('%Y%m%d-%H%M%S')}"
    
    def _compute_checksum(self, state: Dict) -> str:
        """Compute state checksum."""
        content = json.dumps(state, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _load_current_state(self) -> Dict:
        """Load current state."""
        if CURRENT_STATE_FILE.exists():
            with open(CURRENT_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _save_state(self, state: Dict):
        """Save state to file."""
        with open(CURRENT_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
    
    def _get_current_sequence(self) -> int:
        """Get current event sequence."""
        if self.event_logger:
            return self.event_logger.get_stats()["last_sequence"]
        return 0
    
    def preview_rollback(self, target_checkpoint_id: str = None,
                         target_sequence: int = None) -> Dict:
        """
        Preview what a rollback would do without executing it.
        
        Args:
            target_checkpoint_id: Checkpoint to rollback to
            target_sequence: Or sequence number to rollback to
            
        Returns:
            Preview information
        """
        current_state = self._load_current_state()
        current_sequence = self._get_current_sequence()
        
        # Determine target
        if target_checkpoint_id:
            checkpoint = self.checkpoint_mgr.get(target_checkpoint_id) if self.checkpoint_mgr else None
            if not checkpoint:
                return {"error": f"Checkpoint not found: {target_checkpoint_id}"}
            target_state = checkpoint.state
            target_seq = checkpoint.sequence
        elif target_sequence is not None:
            if self.state_mgr:
                target_state = self.state_mgr.get_state_at_sequence(target_sequence)
            else:
                return {"error": "State manager not available"}
            target_seq = target_sequence
        else:
            return {"error": "Must specify checkpoint_id or sequence"}
        
        # Calculate diff
        events_discarded = current_sequence - target_seq
        
        diff = {
            "added_keys": [],
            "removed_keys": [],
            "changed_values": []
        }
        
        # Simple key comparison (not deep)
        current_keys = set(current_state.keys())
        target_keys = set(target_state.keys())
        
        diff["removed_keys"] = list(current_keys - target_keys)  # Will be lost
        diff["added_keys"] = list(target_keys - current_keys)    # Will appear
        
        for key in current_keys & target_keys:
            if current_state[key] != target_state[key]:
                diff["changed_values"].append(key)
        
        return {
            "target_checkpoint_id": target_checkpoint_id,
            "target_sequence": target_seq,
            "current_sequence": current_sequence,
            "events_discarded": events_discarded,
            "diff": diff,
            "current_state_checksum": self._compute_checksum(current_state),
            "target_state_checksum": self._compute_checksum(target_state)
        }
    
    def rollback_to_checkpoint(self, checkpoint_id: str, 
                               reason: str = None,
                               create_safety_checkpoint: bool = True) -> Dict:
        """
        Rollback state to a specific checkpoint.
        
        Args:
            checkpoint_id: Target checkpoint ID
            reason: Reason for rollback
            create_safety_checkpoint: Create checkpoint of current state first
            
        Returns:
            Rollback result
        """
        if not self.checkpoint_mgr:
            return {"success": False, "error": "Checkpoint manager not available"}
        
        # Get checkpoint
        checkpoint = self.checkpoint_mgr.get(checkpoint_id)
        if not checkpoint:
            return {"success": False, "error": f"Checkpoint not found: {checkpoint_id}"}
        
        return self._execute_rollback(
            target_state=checkpoint.state,
            target_sequence=checkpoint.sequence,
            target_checkpoint_id=checkpoint_id,
            reason=reason or f"Rollback to checkpoint {checkpoint_id}",
            create_safety_checkpoint=create_safety_checkpoint
        )
    
    def rollback_to_sequence(self, sequence: int, 
                             reason: str = None,
                             create_safety_checkpoint: bool = True) -> Dict:
        """
        Rollback state to a specific event sequence.
        
        Args:
            sequence: Target event sequence
            reason: Reason for rollback
            create_safety_checkpoint: Create checkpoint of current state first
            
        Returns:
            Rollback result
        """
        if not self.state_mgr:
            return {"success": False, "error": "State manager not available"}
        
        # Rebuild state at target sequence
        target_state = self.state_mgr.get_state_at_sequence(sequence)
        
        return self._execute_rollback(
            target_state=target_state,
            target_sequence=sequence,
            target_checkpoint_id=None,
            reason=reason or f"Rollback to sequence {sequence}",
            create_safety_checkpoint=create_safety_checkpoint
        )
    
    def _execute_rollback(self, target_state: Dict, target_sequence: int,
                          target_checkpoint_id: Optional[str],
                          reason: str,
                          create_safety_checkpoint: bool) -> Dict:
        """Execute the rollback operation."""
        current_state = self._load_current_state()
        current_sequence = self._get_current_sequence()
        
        # Safety check
        if target_sequence >= current_sequence:
            return {
                "success": False, 
                "error": f"Target sequence {target_sequence} >= current {current_sequence}"
            }
        
        # Create safety checkpoint before rollback
        safety_checkpoint_id = None
        if create_safety_checkpoint and self.checkpoint_mgr:
            from checkpoint_mgr import CheckpointType
            safety_cp = self.checkpoint_mgr.create(
                CheckpointType.EMERGENCY,
                f"Pre-rollback safety checkpoint (target: {target_checkpoint_id or target_sequence})"
            )
            safety_checkpoint_id = safety_cp.id
        
        # Log rollback event
        events_discarded = current_sequence - target_sequence
        if self.event_logger:
            self.event_logger.append(
                EventType.ROLLBACK,
                {
                    "targetCheckpointId": target_checkpoint_id,
                    "targetSequence": target_sequence,
                    "eventsDiscarded": events_discarded,
                    "reason": reason,
                    "safetyCheckpointId": safety_checkpoint_id
                }
            )
        
        # Apply rollback - save target state
        self._save_state(target_state)
        
        # Create rollback record
        rollback_record = RollbackRecord(
            id=self._generate_rollback_id(),
            timestamp=datetime.now().isoformat(),
            target_checkpoint_id=target_checkpoint_id,
            target_sequence=target_sequence,
            events_discarded=events_discarded,
            reason=reason,
            pre_rollback_state_checksum=self._compute_checksum(current_state),
            post_rollback_state_checksum=self._compute_checksum(target_state),
            can_undo=safety_checkpoint_id is not None
        )
        
        self.rollback_history.append(rollback_record)
        self._save_history()
        
        return {
            "success": True,
            "rollback_id": rollback_record.id,
            "target_sequence": target_sequence,
            "events_discarded": events_discarded,
            "safety_checkpoint_id": safety_checkpoint_id,
            "can_undo": rollback_record.can_undo
        }
    
    def undo_last_rollback(self) -> Dict:
        """
        Undo the last rollback by restoring from safety checkpoint.
        
        Returns:
            Undo result
        """
        if not self.rollback_history:
            return {"success": False, "error": "No rollback history"}
        
        last_rollback = self.rollback_history[-1]
        
        if not last_rollback.can_undo:
            return {"success": False, "error": "Last rollback cannot be undone (no safety checkpoint)"}
        
        # Find safety checkpoint (it was created just before the rollback)
        # We need to look for the emergency checkpoint created right before
        if self.checkpoint_mgr:
            checkpoints = self.checkpoint_mgr.list_checkpoints(limit=5)
            safety_cp = None
            for cp in checkpoints:
                if cp["type"] == "EMERGENCY" and cp["timestamp"] < last_rollback.timestamp:
                    safety_cp = self.checkpoint_mgr.get(cp["id"])
                    break
            
            if safety_cp:
                # Restore from safety checkpoint
                self._save_state(safety_cp.state)
                
                # Remove last rollback from history
                self.rollback_history.pop()
                self._save_history()
                
                return {
                    "success": True,
                    "restored_from": safety_cp.id,
                    "restored_sequence": safety_cp.sequence
                }
        
        return {"success": False, "error": "Could not find safety checkpoint"}
    
    def get_history(self, limit: int = 10) -> List[Dict]:
        """Get rollback history."""
        history = [r.to_dict() for r in self.rollback_history[-limit:]]
        history.reverse()  # Most recent first
        return history
    
    def rollback_n_events(self, n: int, reason: str = None) -> Dict:
        """Rollback by N events."""
        current_sequence = self._get_current_sequence()
        target_sequence = current_sequence - n
        
        if target_sequence < 0:
            return {"success": False, "error": f"Cannot rollback {n} events (only {current_sequence} exist)"}
        
        return self.rollback_to_sequence(
            target_sequence,
            reason or f"Rollback {n} events"
        )


def main():
    parser = argparse.ArgumentParser(description="PRISM State Rollback")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Rollback to checkpoint
    to_parser = subparsers.add_parser("to", help="Rollback to checkpoint")
    to_parser.add_argument("checkpoint_id", help="Checkpoint ID")
    to_parser.add_argument("--reason", help="Reason for rollback")
    to_parser.add_argument("--no-safety", action="store_true", help="Skip safety checkpoint")
    to_parser.add_argument("--json", action="store_true")
    
    # Rollback to sequence
    seq_parser = subparsers.add_parser("to-sequence", help="Rollback to sequence")
    seq_parser.add_argument("sequence", type=int, help="Target sequence")
    seq_parser.add_argument("--reason", help="Reason for rollback")
    seq_parser.add_argument("--no-safety", action="store_true")
    seq_parser.add_argument("--json", action="store_true")
    
    # Rollback N events
    back_parser = subparsers.add_parser("back", help="Rollback N events")
    back_parser.add_argument("n", type=int, help="Number of events")
    back_parser.add_argument("--reason", help="Reason for rollback")
    back_parser.add_argument("--json", action="store_true")
    
    # Preview
    preview_parser = subparsers.add_parser("preview", help="Preview rollback")
    preview_parser.add_argument("checkpoint_id", nargs="?", help="Checkpoint ID")
    preview_parser.add_argument("--sequence", type=int, help="Or sequence number")
    preview_parser.add_argument("--json", action="store_true")
    
    # Undo
    undo_parser = subparsers.add_parser("undo", help="Undo last rollback")
    undo_parser.add_argument("--json", action="store_true")
    
    # History
    history_parser = subparsers.add_parser("history", help="Show rollback history")
    history_parser.add_argument("--limit", type=int, default=10)
    history_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    rollback = StateRollback()
    
    if args.command == "to":
        result = rollback.rollback_to_checkpoint(
            args.checkpoint_id,
            args.reason,
            not args.no_safety
        )
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Rollback successful: {result['rollback_id']}")
                print(f"    Target: {args.checkpoint_id}")
                print(f"    Events discarded: {result['events_discarded']}")
                if result.get("safety_checkpoint_id"):
                    print(f"    Safety checkpoint: {result['safety_checkpoint_id']}")
            else:
                print(f"[X] Rollback failed: {result['error']}")
    
    elif args.command == "to-sequence":
        result = rollback.rollback_to_sequence(
            args.sequence,
            args.reason,
            not args.no_safety
        )
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Rollback to sequence {args.sequence} successful")
            else:
                print(f"[X] Rollback failed: {result['error']}")
    
    elif args.command == "back":
        result = rollback.rollback_n_events(args.n, args.reason)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Rolled back {args.n} events")
            else:
                print(f"[X] Rollback failed: {result['error']}")
    
    elif args.command == "preview":
        result = rollback.preview_rollback(
            args.checkpoint_id,
            args.sequence
        )
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if "error" in result:
                print(f"[X] {result['error']}")
            else:
                print(f"Rollback Preview:")
                print(f"  Target: {result.get('target_checkpoint_id') or f'Sequence {result['target_sequence']}'}")
                print(f"  Current sequence: {result['current_sequence']}")
                print(f"  Target sequence: {result['target_sequence']}")
                print(f"  Events to discard: {result['events_discarded']}")
                print(f"\n  Changes:")
                print(f"    Keys removed: {result['diff']['removed_keys']}")
                print(f"    Keys added: {result['diff']['added_keys']}")
                print(f"    Values changed: {result['diff']['changed_values']}")
    
    elif args.command == "undo":
        result = rollback.undo_last_rollback()
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            if result["success"]:
                print(f"[+] Undo successful - restored from {result['restored_from']}")
            else:
                print(f"[X] Undo failed: {result['error']}")
    
    elif args.command == "history":
        history = rollback.get_history(args.limit)
        if args.json:
            print(json.dumps(history, indent=2))
        else:
            print(f"Rollback History ({len(history)}):")
            for r in history:
                undo_mark = "[undoable]" if r["canUndo"] else ""
                print(f"  {r['id']} -> seq {r['targetSequence']} ({r['eventsDiscarded']} events) {undo_mark}")
                print(f"    Reason: {r['reason']}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
