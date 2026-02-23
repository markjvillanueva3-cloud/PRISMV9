#!/usr/bin/env python3
"""
CHECKPOINT_MGR.py - Checkpoint Management System
Creates and manages state checkpoints for fast recovery.

Checkpoints are full state snapshots at specific event sequences.
They allow fast state recovery without replaying all events.

Usage:
    python checkpoint_mgr.py create                    # Create checkpoint
    python checkpoint_mgr.py create --type EMERGENCY   # Emergency checkpoint
    python checkpoint_mgr.py list                      # List all checkpoints
    python checkpoint_mgr.py get CP-20260201-120000    # Get specific checkpoint
    python checkpoint_mgr.py cleanup --keep 10         # Keep only 10 most recent

Author: PRISM Manufacturing Intelligence
Version: 1.0.0
"""

import os
import json
import hashlib
import shutil
import argparse
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Paths
PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"
CURRENT_STATE_FILE = STATE_DIR / "CURRENT_STATE.json"
CHECKPOINT_INDEX_FILE = STATE_DIR / "checkpoint_index.json"

# Import dependencies
import sys
sys.path.insert(0, str(PRISM_ROOT / "scripts" / "core"))
try:
    from event_logger import EventLogger, log_checkpoint
except ImportError:
    EventLogger = None
    log_checkpoint = None


class CheckpointType(Enum):
    """Types of checkpoints."""
    AUTO = "AUTO"           # Automatic periodic checkpoint
    MANUAL = "MANUAL"       # User-requested checkpoint
    EMERGENCY = "EMERGENCY" # Before risky operation
    SESSION_END = "SESSION_END"  # At end of session
    MILESTONE = "MILESTONE" # At major milestone


@dataclass
class Checkpoint:
    """Checkpoint record."""
    id: str
    timestamp: str
    sequence: int
    event_id: str
    type: str
    state: Dict
    checksum: str
    size_bytes: int
    reason: Optional[str] = None
    parent_checkpoint_id: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'Checkpoint':
        return cls(**d)
    
    def verify(self) -> bool:
        """Verify checkpoint integrity."""
        computed = hashlib.sha256(
            json.dumps(self.state, sort_keys=True).encode()
        ).hexdigest()[:16]
        return computed == self.checksum


@dataclass
class CheckpointIndex:
    """Index of all checkpoints for fast lookup."""
    checkpoints: List[Dict]  # List of {id, timestamp, sequence, type}
    last_checkpoint_id: Optional[str]
    total_count: int
    total_size_bytes: int
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, d: Dict) -> 'CheckpointIndex':
        return cls(**d)


class CheckpointManager:
    """
    Manages state checkpoints for recovery.
    
    Features:
    - Create checkpoints at any point
    - Multiple checkpoint types
    - Automatic cleanup of old checkpoints
    - Chain linking for incremental recovery
    - Integrity verification
    """
    
    MAX_CHECKPOINTS = 50  # Maximum checkpoints to keep
    AUTO_CHECKPOINT_INTERVAL = 100  # Events between auto checkpoints
    
    def __init__(self):
        self.checkpoints_dir = CHECKPOINTS_DIR
        self.index_file = CHECKPOINT_INDEX_FILE
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        
        self.index = self._load_index()
        self.event_logger = EventLogger() if EventLogger else None
    
    def _load_index(self) -> CheckpointIndex:
        """Load or create checkpoint index."""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    return CheckpointIndex.from_dict(json.load(f))
            except (json.JSONDecodeError, KeyError):
                pass
        return CheckpointIndex(
            checkpoints=[],
            last_checkpoint_id=None,
            total_count=0,
            total_size_bytes=0
        )
    
    def _save_index(self):
        """Save checkpoint index."""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.index.to_dict(), f, indent=2)
    
    def _generate_checkpoint_id(self) -> str:
        """Generate unique checkpoint ID."""
        now = datetime.now()
        return f"CP-{now.strftime('%Y%m%d-%H%M%S')}"
    
    def _compute_checksum(self, state: Dict) -> str:
        """Compute state checksum."""
        content = json.dumps(state, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _load_current_state(self) -> Dict:
        """Load current state from file."""
        if CURRENT_STATE_FILE.exists():
            with open(CURRENT_STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _get_current_sequence(self) -> tuple:
        """Get current event sequence and ID."""
        if self.event_logger:
            stats = self.event_logger.get_stats()
            return stats["last_sequence"], stats["last_event_id"]
        return 0, ""
    
    def create(self, checkpoint_type: CheckpointType = CheckpointType.AUTO,
               reason: str = None, state: Dict = None) -> Checkpoint:
        """
        Create a new checkpoint.
        
        Args:
            checkpoint_type: Type of checkpoint
            reason: Optional reason for checkpoint
            state: Optional state (loads current if not provided)
            
        Returns:
            Created Checkpoint
        """
        checkpoint_id = self._generate_checkpoint_id()
        timestamp = datetime.now().isoformat()
        
        # Get state
        if state is None:
            state = self._load_current_state()
        
        # Get sequence info
        sequence, event_id = self._get_current_sequence()
        
        # Create checkpoint
        checkpoint = Checkpoint(
            id=checkpoint_id,
            timestamp=timestamp,
            sequence=sequence,
            event_id=event_id,
            type=checkpoint_type.value,
            state=state,
            checksum=self._compute_checksum(state),
            size_bytes=len(json.dumps(state)),
            reason=reason,
            parent_checkpoint_id=self.index.last_checkpoint_id
        )
        
        # Save checkpoint file
        cp_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        with open(cp_file, 'w', encoding='utf-8') as f:
            json.dump(checkpoint.to_dict(), f, indent=2)
        
        # Update index
        self.index.checkpoints.append({
            "id": checkpoint_id,
            "timestamp": timestamp,
            "sequence": sequence,
            "type": checkpoint_type.value
        })
        self.index.last_checkpoint_id = checkpoint_id
        self.index.total_count += 1
        self.index.total_size_bytes += checkpoint.size_bytes
        self._save_index()
        
        # Log checkpoint event
        if log_checkpoint:
            log_checkpoint(checkpoint_id, sequence, reason)
        
        return checkpoint
    
    def get(self, checkpoint_id: str) -> Optional[Checkpoint]:
        """Get a specific checkpoint."""
        cp_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        if cp_file.exists():
            with open(cp_file, 'r', encoding='utf-8') as f:
                return Checkpoint.from_dict(json.load(f))
        return None
    
    def get_latest(self) -> Optional[Checkpoint]:
        """Get the most recent checkpoint."""
        if self.index.last_checkpoint_id:
            return self.get(self.index.last_checkpoint_id)
        return None
    
    def get_at_or_before(self, sequence: int) -> Optional[Checkpoint]:
        """Get checkpoint at or before a specific sequence."""
        best = None
        for cp_info in self.index.checkpoints:
            if cp_info["sequence"] <= sequence:
                if best is None or cp_info["sequence"] > best["sequence"]:
                    best = cp_info
        
        if best:
            return self.get(best["id"])
        return None
    
    def list_checkpoints(self, limit: int = None, 
                         checkpoint_type: CheckpointType = None) -> List[Dict]:
        """List checkpoints with optional filters."""
        checkpoints = self.index.checkpoints.copy()
        
        if checkpoint_type:
            checkpoints = [cp for cp in checkpoints 
                          if cp["type"] == checkpoint_type.value]
        
        # Sort by timestamp descending
        checkpoints.sort(key=lambda x: x["timestamp"], reverse=True)
        
        if limit:
            checkpoints = checkpoints[:limit]
        
        return checkpoints
    
    def verify(self, checkpoint_id: str) -> tuple:
        """
        Verify checkpoint integrity.
        
        Returns:
            (is_valid, message)
        """
        checkpoint = self.get(checkpoint_id)
        if not checkpoint:
            return False, "Checkpoint not found"
        
        if checkpoint.verify():
            return True, "Checkpoint integrity verified"
        else:
            return False, "Checksum mismatch - checkpoint may be corrupted"
    
    def verify_all(self) -> tuple:
        """Verify all checkpoints."""
        results = []
        valid_count = 0
        
        for cp_info in self.index.checkpoints:
            is_valid, msg = self.verify(cp_info["id"])
            results.append({
                "id": cp_info["id"],
                "valid": is_valid,
                "message": msg
            })
            if is_valid:
                valid_count += 1
        
        return valid_count == len(results), results
    
    def cleanup(self, keep: int = None, max_age_days: int = None) -> Dict:
        """
        Clean up old checkpoints.
        
        Args:
            keep: Number of checkpoints to keep
            max_age_days: Delete checkpoints older than this
            
        Returns:
            Cleanup statistics
        """
        keep = keep or self.MAX_CHECKPOINTS
        deleted = []
        kept = []
        
        # Sort by timestamp descending
        sorted_cps = sorted(
            self.index.checkpoints,
            key=lambda x: x["timestamp"],
            reverse=True
        )
        
        cutoff_date = None
        if max_age_days:
            cutoff_date = datetime.now() - timedelta(days=max_age_days)
        
        for i, cp_info in enumerate(sorted_cps):
            should_delete = False
            
            # Check count limit
            if i >= keep:
                should_delete = True
            
            # Check age limit
            if cutoff_date:
                cp_time = datetime.fromisoformat(cp_info["timestamp"].replace("Z", ""))
                if cp_time < cutoff_date:
                    should_delete = True
            
            if should_delete:
                # Delete checkpoint file
                cp_file = self.checkpoints_dir / f"{cp_info['id']}.json"
                if cp_file.exists():
                    cp_file.unlink()
                deleted.append(cp_info["id"])
            else:
                kept.append(cp_info)
        
        # Update index
        self.index.checkpoints = kept
        self.index.total_count = len(kept)
        if kept:
            self.index.last_checkpoint_id = kept[0]["id"]
        else:
            self.index.last_checkpoint_id = None
        self._save_index()
        
        return {
            "deleted": len(deleted),
            "kept": len(kept),
            "deleted_ids": deleted
        }
    
    def get_chain(self, checkpoint_id: str) -> List[str]:
        """Get the chain of parent checkpoints."""
        chain = []
        current_id = checkpoint_id
        
        while current_id:
            chain.append(current_id)
            cp = self.get(current_id)
            if cp:
                current_id = cp.parent_checkpoint_id
            else:
                break
        
        return chain
    
    def should_auto_checkpoint(self) -> bool:
        """Check if an auto checkpoint is needed."""
        if not self.event_logger:
            return False
        
        current_seq, _ = self._get_current_sequence()
        
        # Get last checkpoint sequence
        if self.index.last_checkpoint_id:
            last_cp = self.get(self.index.last_checkpoint_id)
            if last_cp:
                events_since = current_seq - last_cp.sequence
                return events_since >= self.AUTO_CHECKPOINT_INTERVAL
        
        # No checkpoints yet, create one if we have events
        return current_seq > 0
    
    def get_stats(self) -> Dict:
        """Get checkpoint statistics."""
        return {
            "total_count": self.index.total_count,
            "total_size_bytes": self.index.total_size_bytes,
            "last_checkpoint_id": self.index.last_checkpoint_id,
            "checkpoints_by_type": self._count_by_type()
        }
    
    def _count_by_type(self) -> Dict[str, int]:
        """Count checkpoints by type."""
        counts = {}
        for cp in self.index.checkpoints:
            cp_type = cp["type"]
            counts[cp_type] = counts.get(cp_type, 0) + 1
        return counts


def main():
    parser = argparse.ArgumentParser(description="PRISM Checkpoint Manager")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Create command
    create_parser = subparsers.add_parser("create", help="Create checkpoint")
    create_parser.add_argument("--type", choices=[t.value for t in CheckpointType],
                               default="AUTO")
    create_parser.add_argument("--reason", help="Reason for checkpoint")
    create_parser.add_argument("--json", action="store_true")
    
    # Get command
    get_parser = subparsers.add_parser("get", help="Get checkpoint")
    get_parser.add_argument("checkpoint_id", help="Checkpoint ID")
    get_parser.add_argument("--json", action="store_true")
    get_parser.add_argument("--state-only", action="store_true")
    
    # List command
    list_parser = subparsers.add_parser("list", help="List checkpoints")
    list_parser.add_argument("--limit", type=int, default=10)
    list_parser.add_argument("--type", choices=[t.value for t in CheckpointType])
    list_parser.add_argument("--json", action="store_true")
    
    # Verify command
    verify_parser = subparsers.add_parser("verify", help="Verify checkpoint(s)")
    verify_parser.add_argument("checkpoint_id", nargs="?", help="Checkpoint ID (or --all)")
    verify_parser.add_argument("--all", action="store_true")
    verify_parser.add_argument("--json", action="store_true")
    
    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Cleanup old checkpoints")
    cleanup_parser.add_argument("--keep", type=int, default=20)
    cleanup_parser.add_argument("--max-age-days", type=int)
    cleanup_parser.add_argument("--json", action="store_true")
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show statistics")
    stats_parser.add_argument("--json", action="store_true")
    
    # Chain command
    chain_parser = subparsers.add_parser("chain", help="Show checkpoint chain")
    chain_parser.add_argument("checkpoint_id", help="Checkpoint ID")
    chain_parser.add_argument("--json", action="store_true")
    
    args = parser.parse_args()
    manager = CheckpointManager()
    
    if args.command == "create":
        cp_type = CheckpointType(args.type)
        checkpoint = manager.create(cp_type, args.reason)
        
        if args.json:
            print(json.dumps(checkpoint.to_dict(), indent=2))
        else:
            print(f"[+] Created checkpoint: {checkpoint.id}")
            print(f"    Sequence: {checkpoint.sequence}")
            print(f"    Checksum: {checkpoint.checksum}")
    
    elif args.command == "get":
        checkpoint = manager.get(args.checkpoint_id)
        if checkpoint:
            if args.state_only:
                print(json.dumps(checkpoint.state, indent=2))
            elif args.json:
                print(json.dumps(checkpoint.to_dict(), indent=2))
            else:
                print(f"Checkpoint: {checkpoint.id}")
                print(f"  Type: {checkpoint.type}")
                print(f"  Sequence: {checkpoint.sequence}")
                print(f"  Timestamp: {checkpoint.timestamp}")
                print(f"  Checksum: {checkpoint.checksum}")
                print(f"  Size: {checkpoint.size_bytes} bytes")
        else:
            print(f"Checkpoint not found: {args.checkpoint_id}")
    
    elif args.command == "list":
        cp_type = CheckpointType(args.type) if args.type else None
        checkpoints = manager.list_checkpoints(args.limit, cp_type)
        
        if args.json:
            print(json.dumps(checkpoints, indent=2))
        else:
            print(f"Checkpoints ({len(checkpoints)}):")
            for cp in checkpoints:
                print(f"  [{cp['sequence']:05d}] {cp['id']} ({cp['type']})")
    
    elif args.command == "verify":
        if args.all:
            is_valid, results = manager.verify_all()
            if args.json:
                print(json.dumps({"all_valid": is_valid, "results": results}, indent=2))
            else:
                print(f"Verified {len(results)} checkpoints: {'All valid' if is_valid else 'Issues found'}")
                for r in results:
                    status = "[+]" if r["valid"] else "[X]"
                    print(f"  {status} {r['id']}: {r['message']}")
        elif args.checkpoint_id:
            is_valid, msg = manager.verify(args.checkpoint_id)
            if args.json:
                print(json.dumps({"valid": is_valid, "message": msg}, indent=2))
            else:
                print(f"{'[+]' if is_valid else '[X]'} {args.checkpoint_id}: {msg}")
    
    elif args.command == "cleanup":
        result = manager.cleanup(args.keep, args.max_age_days)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"[+] Cleanup complete: {result['deleted']} deleted, {result['kept']} kept")
    
    elif args.command == "stats":
        stats = manager.get_stats()
        if args.json:
            print(json.dumps(stats, indent=2))
        else:
            print(f"Checkpoints: {stats['total_count']}")
            print(f"Total Size: {stats['total_size_bytes']} bytes")
            print(f"By Type: {stats['checkpoints_by_type']}")
    
    elif args.command == "chain":
        chain = manager.get_chain(args.checkpoint_id)
        if args.json:
            print(json.dumps({"chain": chain}, indent=2))
        else:
            print(f"Checkpoint chain ({len(chain)}):")
            for i, cp_id in enumerate(chain):
                indent = "  " * i
                print(f"{indent}-> {cp_id}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
