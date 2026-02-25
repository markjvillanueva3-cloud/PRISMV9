#!/usr/bin/env python3
"""
PRISM Checkpoint Mapper v1.0
Maps and manages checkpoints across sessions for recovery.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System

Features:
1. Checkpoint creation and tracking
2. Checkpoint chain validation
3. Checkpoint search and retrieval
4. Session checkpoint summary

Usage:
    from checkpoint_mapper import CheckpointMapper
    mapper = CheckpointMapper()
    cp_id = mapper.create("session_0.1", {"step": 3, "deliverables": [...]})
    chain = mapper.get_chain("session_0.1")
"""
import os
import sys
import json
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
STATE_DIR = PRISM_ROOT / "state"
CHECKPOINTS_DIR = STATE_DIR / "checkpoints"
CHECKPOINT_INDEX = CHECKPOINTS_DIR / "index.json"
MAX_CHECKPOINTS_PER_SESSION = 50


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

class CheckpointType(Enum):
    """Types of checkpoints."""
    MICRO = "micro"        # Quick progress update
    STANDARD = "standard"  # Normal checkpoint
    FULL = "full"          # Complete state save
    EMERGENCY = "emergency"  # Emergency save before context limit


@dataclass
class Checkpoint:
    """Single checkpoint entry."""
    id: str
    session_id: str
    type: CheckpointType
    timestamp: str
    data: Dict[str, Any]
    parent_id: Optional[str] = None
    hash: str = ""
    
    def __post_init__(self):
        if not self.hash:
            self.hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        content = json.dumps({
            'session': self.session_id,
            'type': self.type.value,
            'timestamp': self.timestamp,
            'data': self.data,
            'parent': self.parent_id
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:12]


@dataclass
class CheckpointChain:
    """Chain of checkpoints for a session."""
    session_id: str
    checkpoints: List[Checkpoint]
    head_id: str
    created_at: str
    last_updated: str
    
    @property
    def length(self) -> int:
        return len(self.checkpoints)
    
    @property
    def is_valid(self) -> bool:
        """Validate chain integrity."""
        if not self.checkpoints:
            return True
        
        # Check parent chain
        for i, cp in enumerate(self.checkpoints[1:], 1):
            if cp.parent_id != self.checkpoints[i-1].id:
                return False
        
        # Check head
        return self.head_id == self.checkpoints[-1].id


@dataclass
class CheckpointSummary:
    """Summary of checkpoints for display."""
    session_id: str
    total_checkpoints: int
    latest_timestamp: str
    types: Dict[str, int]
    chain_valid: bool


# ═══════════════════════════════════════════════════════════════════════════
# CHECKPOINT MAPPER
# ═══════════════════════════════════════════════════════════════════════════

class CheckpointMapper:
    """
    Maps and manages checkpoints.
    
    Storage Structure:
    C:/PRISM/state/checkpoints/
    ├── index.json          (session -> head checkpoint mapping)
    ├── session_0.1/
    │   ├── cp_001_micro_xxx.json
    │   ├── cp_002_standard_xxx.json
    │   └── chain.json
    ├── session_0.2/
    │   └── ...
    └── global_chain.json   (cross-session checkpoint order)
    """
    
    def __init__(self):
        CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
        self._index: Dict[str, str] = {}  # session_id -> head_id
        self._load_index()
    
    def _load_index(self) -> None:
        """Load checkpoint index."""
        if CHECKPOINT_INDEX.exists():
            try:
                with open(CHECKPOINT_INDEX, 'r', encoding='utf-8') as f:
                    self._index = json.load(f)
            except Exception:
                self._index = {}
    
    def _save_index(self) -> None:
        """Save checkpoint index."""
        with open(CHECKPOINT_INDEX, 'w', encoding='utf-8') as f:
            json.dump(self._index, f, indent=2)
    
    def _get_session_dir(self, session_id: str) -> Path:
        """Get directory for session checkpoints."""
        safe_id = "".join(c if c.isalnum() or c in '-_.' else '_' for c in session_id)
        session_dir = CHECKPOINTS_DIR / f"session_{safe_id}"
        session_dir.mkdir(parents=True, exist_ok=True)
        return session_dir
    
    def _generate_checkpoint_id(self, session_id: str, cp_type: CheckpointType) -> str:
        """Generate unique checkpoint ID."""
        session_dir = self._get_session_dir(session_id)
        existing = list(session_dir.glob("cp_*.json"))
        num = len(existing) + 1
        timestamp = datetime.now().strftime("%H%M%S")
        return f"cp_{num:03d}_{cp_type.value}_{timestamp}"
    
    def create(self, session_id: str, data: Dict[str, Any],
               cp_type: CheckpointType = CheckpointType.STANDARD) -> str:
        """
        Create a new checkpoint.
        
        Args:
            session_id: Session identifier
            data: Checkpoint data
            cp_type: Type of checkpoint
            
        Returns:
            Checkpoint ID
        """
        # Get parent (current head)
        parent_id = self._index.get(session_id)
        
        # Generate ID
        cp_id = self._generate_checkpoint_id(session_id, cp_type)
        
        # Create checkpoint
        checkpoint = Checkpoint(
            id=cp_id,
            session_id=session_id,
            type=cp_type,
            timestamp=datetime.now().isoformat(),
            data=data,
            parent_id=parent_id
        )
        
        # Save checkpoint
        session_dir = self._get_session_dir(session_id)
        cp_path = session_dir / f"{cp_id}.json"
        with open(cp_path, 'w', encoding='utf-8') as f:
            json.dump({
                'id': checkpoint.id,
                'session_id': checkpoint.session_id,
                'type': checkpoint.type.value,
                'timestamp': checkpoint.timestamp,
                'data': checkpoint.data,
                'parent_id': checkpoint.parent_id,
                'hash': checkpoint.hash
            }, f, indent=2)
        
        # Update index
        self._index[session_id] = cp_id
        self._save_index()
        
        # Update chain file
        self._update_chain(session_id)
        
        # Cleanup old checkpoints
        self._cleanup_old_checkpoints(session_id)
        
        return cp_id
    
    def get(self, checkpoint_id: str, session_id: str) -> Optional[Checkpoint]:
        """Get a specific checkpoint."""
        session_dir = self._get_session_dir(session_id)
        cp_path = session_dir / f"{checkpoint_id}.json"
        
        if not cp_path.exists():
            return None
        
        with open(cp_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return Checkpoint(
            id=data['id'],
            session_id=data['session_id'],
            type=CheckpointType(data['type']),
            timestamp=data['timestamp'],
            data=data['data'],
            parent_id=data.get('parent_id'),
            hash=data.get('hash', '')
        )
    
    def get_latest(self, session_id: str) -> Optional[Checkpoint]:
        """Get the latest checkpoint for a session."""
        head_id = self._index.get(session_id)
        if not head_id:
            return None
        return self.get(head_id, session_id)
    
    def get_chain(self, session_id: str) -> CheckpointChain:
        """Get the full checkpoint chain for a session."""
        session_dir = self._get_session_dir(session_id)
        checkpoints = []
        
        # Load all checkpoints
        for cp_path in sorted(session_dir.glob("cp_*.json")):
            with open(cp_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            checkpoints.append(Checkpoint(
                id=data['id'],
                session_id=data['session_id'],
                type=CheckpointType(data['type']),
                timestamp=data['timestamp'],
                data=data['data'],
                parent_id=data.get('parent_id'),
                hash=data.get('hash', '')
            ))
        
        # Sort by timestamp
        checkpoints.sort(key=lambda c: c.timestamp)
        
        head_id = self._index.get(session_id, '')
        
        return CheckpointChain(
            session_id=session_id,
            checkpoints=checkpoints,
            head_id=head_id,
            created_at=checkpoints[0].timestamp if checkpoints else '',
            last_updated=checkpoints[-1].timestamp if checkpoints else ''
        )
    
    def _update_chain(self, session_id: str) -> None:
        """Update chain file for session."""
        chain = self.get_chain(session_id)
        session_dir = self._get_session_dir(session_id)
        chain_path = session_dir / "chain.json"
        
        with open(chain_path, 'w', encoding='utf-8') as f:
            json.dump({
                'session_id': chain.session_id,
                'head_id': chain.head_id,
                'length': chain.length,
                'valid': chain.is_valid,
                'created_at': chain.created_at,
                'last_updated': chain.last_updated,
                'checkpoint_ids': [cp.id for cp in chain.checkpoints]
            }, f, indent=2)
    
    def _cleanup_old_checkpoints(self, session_id: str) -> int:
        """Remove old checkpoints beyond limit."""
        session_dir = self._get_session_dir(session_id)
        cp_files = sorted(
            session_dir.glob("cp_*.json"),
            key=lambda p: p.stat().st_mtime
        )
        
        removed = 0
        while len(cp_files) > MAX_CHECKPOINTS_PER_SESSION:
            oldest = cp_files.pop(0)
            oldest.unlink()
            removed += 1
        
        return removed
    
    def get_summary(self, session_id: str) -> CheckpointSummary:
        """Get summary of checkpoints for a session."""
        chain = self.get_chain(session_id)
        
        types: Dict[str, int] = {}
        for cp in chain.checkpoints:
            t = cp.type.value
            types[t] = types.get(t, 0) + 1
        
        return CheckpointSummary(
            session_id=session_id,
            total_checkpoints=chain.length,
            latest_timestamp=chain.last_updated,
            types=types,
            chain_valid=chain.is_valid
        )
    
    def list_sessions(self) -> List[str]:
        """List all sessions with checkpoints."""
        return list(self._index.keys())
    
    def search(self, session_id: str, 
               after: Optional[str] = None,
               before: Optional[str] = None,
               cp_type: Optional[CheckpointType] = None) -> List[Checkpoint]:
        """
        Search checkpoints with filters.
        
        Args:
            session_id: Session to search
            after: Only checkpoints after this timestamp
            before: Only checkpoints before this timestamp
            cp_type: Only checkpoints of this type
            
        Returns:
            List of matching checkpoints
        """
        chain = self.get_chain(session_id)
        results = []
        
        for cp in chain.checkpoints:
            # Type filter
            if cp_type and cp.type != cp_type:
                continue
            
            # Time filters
            if after and cp.timestamp <= after:
                continue
            if before and cp.timestamp >= before:
                continue
            
            results.append(cp)
        
        return results
    
    def rollback(self, session_id: str, checkpoint_id: str) -> bool:
        """
        Rollback to a specific checkpoint.
        
        Args:
            session_id: Session identifier
            checkpoint_id: Checkpoint to rollback to
            
        Returns:
            True if successful
        """
        checkpoint = self.get(checkpoint_id, session_id)
        if not checkpoint:
            return False
        
        # Update head
        self._index[session_id] = checkpoint_id
        self._save_index()
        
        # Note: We don't delete future checkpoints, just change head
        return True


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Checkpoint Mapper CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM Checkpoint Mapper - Manage session checkpoints"
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create checkpoint')
    create_parser.add_argument('session', help='Session ID')
    create_parser.add_argument('--data', help='JSON data')
    create_parser.add_argument('--type', choices=['micro', 'standard', 'full', 'emergency'],
                               default='standard', help='Checkpoint type')
    
    # Get command
    get_parser = subparsers.add_parser('get', help='Get checkpoint')
    get_parser.add_argument('session', help='Session ID')
    get_parser.add_argument('--id', help='Checkpoint ID (default: latest)')
    
    # Chain command
    chain_parser = subparsers.add_parser('chain', help='Get checkpoint chain')
    chain_parser.add_argument('session', help='Session ID')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List sessions')
    
    # Summary command
    summary_parser = subparsers.add_parser('summary', help='Get session summary')
    summary_parser.add_argument('session', help='Session ID')
    
    args = parser.parse_args()
    mapper = CheckpointMapper()
    
    if args.command == 'create':
        data = json.loads(args.data) if args.data else {'created_via': 'cli'}
        cp_type = CheckpointType(args.type)
        cp_id = mapper.create(args.session, data, cp_type)
        print(f"Created checkpoint: {cp_id}")
        
    elif args.command == 'get':
        if args.id:
            cp = mapper.get(args.id, args.session)
        else:
            cp = mapper.get_latest(args.session)
        
        if cp:
            print(json.dumps({
                'id': cp.id,
                'type': cp.type.value,
                'timestamp': cp.timestamp,
                'data': cp.data,
                'hash': cp.hash
            }, indent=2))
        else:
            print("Checkpoint not found")
            
    elif args.command == 'chain':
        chain = mapper.get_chain(args.session)
        print(f"Session: {chain.session_id}")
        print(f"Length: {chain.length}")
        print(f"Valid: {chain.is_valid}")
        print(f"Head: {chain.head_id}")
        print("\nCheckpoints:")
        for cp in chain.checkpoints:
            print(f"  [{cp.type.value}] {cp.id} @ {cp.timestamp}")
            
    elif args.command == 'list':
        sessions = mapper.list_sessions()
        print("Sessions with checkpoints:")
        for s in sessions:
            summary = mapper.get_summary(s)
            print(f"  {s}: {summary.total_checkpoints} checkpoints")
            
    elif args.command == 'summary':
        summary = mapper.get_summary(args.session)
        print(f"Session: {summary.session_id}")
        print(f"Total: {summary.total_checkpoints}")
        print(f"Latest: {summary.latest_timestamp}")
        print(f"Valid: {summary.chain_valid}")
        print("Types:", summary.types)
        
    else:
        parser.print_help()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
