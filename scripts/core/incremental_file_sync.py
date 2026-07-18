#!/usr/bin/env python3
"""
PRISM Incremental File Sync - CORE.6
Bidirectional sync between C: drive and Claude container with conflict detection.

Features:
- Track file hashes to detect changes
- Bidirectional sync (C: <-> container)
- Conflict detection when both sides modified
- Selective sync by path patterns
- Auto-sync triggers for session start/end

Usage:
    # Check sync status
    python incremental_file_sync.py --status
    
    # Pull from C: drive to working directory
    python incremental_file_sync.py --pull
    
    # Push changes to C: drive
    python incremental_file_sync.py --push
    
    # Resolve conflicts
    python incremental_file_sync.py --resolve FILE --keep local|remote|merge
    
    # Full bidirectional sync
    python incremental_file_sync.py --sync

Author: Claude (PRISM Developer)
Created: 2026-02-01
"""

import os
import sys
import json
import hashlib
import shutil
import sqlite3
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Set, Tuple
from datetime import datetime
from enum import Enum
import argparse
import fnmatch


# =============================================================================
# DATA MODELS
# =============================================================================

class FileStatus(Enum):
    """Status of a tracked file."""
    UNCHANGED = "unchanged"
    MODIFIED_LOCAL = "modified_local"
    MODIFIED_REMOTE = "modified_remote"
    CONFLICT = "conflict"
    NEW_LOCAL = "new_local"
    NEW_REMOTE = "new_remote"
    DELETED_LOCAL = "deleted_local"
    DELETED_REMOTE = "deleted_remote"


@dataclass
class TrackedFile:
    """A file being tracked for sync."""
    relative_path: str
    local_hash: Optional[str] = None
    remote_hash: Optional[str] = None
    base_hash: Optional[str] = None  # Last synced hash
    local_mtime: Optional[float] = None
    remote_mtime: Optional[float] = None
    status: FileStatus = FileStatus.UNCHANGED
    
    def to_dict(self) -> dict:
        return {
            "relative_path": self.relative_path,
            "local_hash": self.local_hash,
            "remote_hash": self.remote_hash,
            "base_hash": self.base_hash,
            "local_mtime": self.local_mtime,
            "remote_mtime": self.remote_mtime,
            "status": self.status.value
        }


@dataclass
class SyncStatus:
    """Overall sync status."""
    local_changes: List[TrackedFile] = field(default_factory=list)
    remote_changes: List[TrackedFile] = field(default_factory=list)
    conflicts: List[TrackedFile] = field(default_factory=list)
    up_to_date: int = 0
    
    def has_changes(self) -> bool:
        return bool(self.local_changes or self.remote_changes or self.conflicts)


@dataclass
class SyncResult:
    """Result of a sync operation."""
    files_pushed: int = 0
    files_pulled: int = 0
    conflicts_found: int = 0
    errors: List[str] = field(default_factory=list)
    
    def success(self) -> bool:
        return len(self.errors) == 0 and self.conflicts_found == 0


# =============================================================================
# SYNC ENGINE
# =============================================================================

class IncrementalFileSync:
    """
    Bidirectional file sync with conflict detection.
    
    Tracks file hashes to detect changes and provides:
    - Pull: Copy remote changes to local
    - Push: Copy local changes to remote
    - Status: Show what would sync
    - Resolve: Handle conflicts
    """
    
    # Default file patterns to sync
    DEFAULT_PATTERNS = [
        "*.py", "*.ts", "*.js", "*.json", "*.md",
        "*.yaml", "*.yml", "*.txt", "*.sql"
    ]
    
    # Patterns to exclude
    EXCLUDE_PATTERNS = [
        "__pycache__/*", "*.pyc", ".git/*", "node_modules/*",
        "*.egg-info/*", "dist/*", "build/*", ".tox/*",
        "*.log", "*.tmp", "*.bak"
    ]
    
    def __init__(
        self,
        local_root: str,
        remote_root: str,
        db_path: str = None
    ):
        """
        Initialize sync engine.
        
        Args:
            local_root: Local working directory (e.g., /home/claude/prism)
            remote_root: Remote directory (e.g., C:\PRISM)
            db_path: Path to sync database
        """
        self.local_root = Path(local_root)
        self.remote_root = Path(remote_root)
        
        if db_path is None:
            db_path = self.local_root / ".sync" / "sync.db"
        
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._init_db()
    
    def _init_db(self):
        """Initialize sync database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tracked_files (
                relative_path TEXT PRIMARY KEY,
                local_hash TEXT,
                remote_hash TEXT,
                base_hash TEXT,
                local_mtime REAL,
                remote_mtime REAL,
                last_sync TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sync_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                operation TEXT,
                file_path TEXT,
                direction TEXT,
                status TEXT,
                details TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _hash_file(self, file_path: Path) -> Optional[str]:
        """Calculate MD5 hash of a file."""
        if not file_path.exists():
            return None
        
        try:
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b''):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception as e:
            print(f"Error hashing {file_path}: {e}")
            return None
    
    def _get_mtime(self, file_path: Path) -> Optional[float]:
        """Get modification time of a file."""
        if not file_path.exists():
            return None
        try:
            return file_path.stat().st_mtime
        except:
            return None
    
    def _should_include(self, relative_path: str) -> bool:
        """Check if file should be included in sync."""
        # Check excludes first
        for pattern in self.EXCLUDE_PATTERNS:
            if fnmatch.fnmatch(relative_path, pattern):
                return False
        
        # Check includes
        for pattern in self.DEFAULT_PATTERNS:
            if fnmatch.fnmatch(relative_path, pattern):
                return True
        
        return False
    
    def _find_files(self, root: Path, patterns: List[str] = None) -> Set[str]:
        """Find all files matching patterns under root."""
        if patterns is None:
            patterns = self.DEFAULT_PATTERNS
        
        files = set()
        
        if not root.exists():
            return files
        
        for path in root.rglob('*'):
            if path.is_file():
                relative = str(path.relative_to(root))
                if self._should_include(relative):
                    files.add(relative)
        
        return files
    
    def _load_tracked(self, relative_path: str) -> Optional[TrackedFile]:
        """Load tracked file from database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT * FROM tracked_files WHERE relative_path = ?',
            (relative_path,)
        )
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return TrackedFile(
                relative_path=row[0],
                local_hash=row[1],
                remote_hash=row[2],
                base_hash=row[3],
                local_mtime=row[4],
                remote_mtime=row[5]
            )
        return None
    
    def _save_tracked(self, tracked: TrackedFile):
        """Save tracked file to database."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO tracked_files 
            (relative_path, local_hash, remote_hash, base_hash, local_mtime, remote_mtime, last_sync)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            tracked.relative_path,
            tracked.local_hash,
            tracked.remote_hash,
            tracked.base_hash,
            tracked.local_mtime,
            tracked.remote_mtime,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def _log_operation(self, operation: str, file_path: str, 
                       direction: str, status: str, details: str = ""):
        """Log a sync operation."""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO sync_log (operation, file_path, direction, status, details)
            VALUES (?, ?, ?, ?, ?)
        ''', (operation, file_path, direction, status, details))
        
        conn.commit()
        conn.close()
    
    def _determine_status(self, tracked: TrackedFile) -> FileStatus:
        """Determine the sync status of a tracked file."""
        local_path = self.local_root / tracked.relative_path
        remote_path = self.remote_root / tracked.relative_path
        
        local_exists = local_path.exists()
        remote_exists = remote_path.exists()
        
        # Get current hashes
        current_local_hash = self._hash_file(local_path) if local_exists else None
        current_remote_hash = self._hash_file(remote_path) if remote_exists else None
        
        tracked.local_hash = current_local_hash
        tracked.remote_hash = current_remote_hash
        tracked.local_mtime = self._get_mtime(local_path)
        tracked.remote_mtime = self._get_mtime(remote_path)
        
        # Determine status
        if not local_exists and not remote_exists:
            return FileStatus.UNCHANGED
        
        if not local_exists and remote_exists:
            if tracked.base_hash is None:
                return FileStatus.NEW_REMOTE
            else:
                return FileStatus.DELETED_LOCAL
        
        if local_exists and not remote_exists:
            if tracked.base_hash is None:
                return FileStatus.NEW_LOCAL
            else:
                return FileStatus.DELETED_REMOTE
        
        # Both exist
        if current_local_hash == current_remote_hash:
            return FileStatus.UNCHANGED
        
        local_changed = current_local_hash != tracked.base_hash
        remote_changed = current_remote_hash != tracked.base_hash
        
        if local_changed and remote_changed:
            return FileStatus.CONFLICT
        elif local_changed:
            return FileStatus.MODIFIED_LOCAL
        elif remote_changed:
            return FileStatus.MODIFIED_REMOTE
        else:
            return FileStatus.UNCHANGED
    
    def get_status(self) -> SyncStatus:
        """
        Get current sync status.
        
        Returns:
            SyncStatus with lists of changed files
        """
        status = SyncStatus()
        
        # Find all files on both sides
        local_files = self._find_files(self.local_root)
        remote_files = self._find_files(self.remote_root)
        all_files = local_files | remote_files
        
        for relative_path in all_files:
            tracked = self._load_tracked(relative_path) or TrackedFile(relative_path=relative_path)
            file_status = self._determine_status(tracked)
            tracked.status = file_status
            
            if file_status == FileStatus.UNCHANGED:
                status.up_to_date += 1
            elif file_status in (FileStatus.MODIFIED_LOCAL, FileStatus.NEW_LOCAL, FileStatus.DELETED_REMOTE):
                status.local_changes.append(tracked)
            elif file_status in (FileStatus.MODIFIED_REMOTE, FileStatus.NEW_REMOTE, FileStatus.DELETED_LOCAL):
                status.remote_changes.append(tracked)
            elif file_status == FileStatus.CONFLICT:
                status.conflicts.append(tracked)
        
        return status
    
    def pull(self, force: bool = False) -> SyncResult:
        """
        Pull remote changes to local.
        
        Args:
            force: If True, overwrite local conflicts
            
        Returns:
            SyncResult with operation summary
        """
        result = SyncResult()
        status = self.get_status()
        
        # Pull remote changes
        for tracked in status.remote_changes:
            try:
                self._copy_file(tracked, direction="pull")
                tracked.base_hash = tracked.remote_hash
                self._save_tracked(tracked)
                self._log_operation("pull", tracked.relative_path, "remote->local", "success")
                result.files_pulled += 1
            except Exception as e:
                result.errors.append(f"Pull {tracked.relative_path}: {e}")
                self._log_operation("pull", tracked.relative_path, "remote->local", "error", str(e))
        
        # Handle conflicts
        for tracked in status.conflicts:
            if force:
                try:
                    self._copy_file(tracked, direction="pull")
                    tracked.base_hash = tracked.remote_hash
                    self._save_tracked(tracked)
                    self._log_operation("pull", tracked.relative_path, "remote->local", "force")
                    result.files_pulled += 1
                except Exception as e:
                    result.errors.append(f"Pull conflict {tracked.relative_path}: {e}")
            else:
                result.conflicts_found += 1
        
        return result
    
    def push(self, force: bool = False) -> SyncResult:
        """
        Push local changes to remote.
        
        Args:
            force: If True, overwrite remote conflicts
            
        Returns:
            SyncResult with operation summary
        """
        result = SyncResult()
        status = self.get_status()
        
        # Push local changes
        for tracked in status.local_changes:
            try:
                self._copy_file(tracked, direction="push")
                tracked.base_hash = tracked.local_hash
                self._save_tracked(tracked)
                self._log_operation("push", tracked.relative_path, "local->remote", "success")
                result.files_pushed += 1
            except Exception as e:
                result.errors.append(f"Push {tracked.relative_path}: {e}")
                self._log_operation("push", tracked.relative_path, "local->remote", "error", str(e))
        
        # Handle conflicts
        for tracked in status.conflicts:
            if force:
                try:
                    self._copy_file(tracked, direction="push")
                    tracked.base_hash = tracked.local_hash
                    self._save_tracked(tracked)
                    self._log_operation("push", tracked.relative_path, "local->remote", "force")
                    result.files_pushed += 1
                except Exception as e:
                    result.errors.append(f"Push conflict {tracked.relative_path}: {e}")
            else:
                result.conflicts_found += 1
        
        return result
    
    def sync(self) -> SyncResult:
        """
        Bidirectional sync (pull then push, no conflict override).
        
        Returns:
            Combined SyncResult
        """
        result = SyncResult()
        
        # Pull first
        pull_result = self.pull(force=False)
        result.files_pulled = pull_result.files_pulled
        result.errors.extend(pull_result.errors)
        result.conflicts_found = pull_result.conflicts_found
        
        # Then push
        push_result = self.push(force=False)
        result.files_pushed = push_result.files_pushed
        result.errors.extend(push_result.errors)
        result.conflicts_found = max(result.conflicts_found, push_result.conflicts_found)
        
        return result
    
    def resolve_conflict(self, relative_path: str, resolution: str) -> bool:
        """
        Resolve a conflict.
        
        Args:
            relative_path: Path to conflicted file
            resolution: 'local', 'remote', or 'merge'
            
        Returns:
            True if resolved successfully
        """
        tracked = self._load_tracked(relative_path)
        if not tracked:
            print(f"File not tracked: {relative_path}")
            return False
        
        status = self._determine_status(tracked)
        if status != FileStatus.CONFLICT:
            print(f"File is not in conflict: {relative_path}")
            return False
        
        try:
            if resolution == "local":
                # Push local version
                self._copy_file(tracked, direction="push")
                tracked.base_hash = tracked.local_hash
                
            elif resolution == "remote":
                # Pull remote version
                self._copy_file(tracked, direction="pull")
                tracked.base_hash = tracked.remote_hash
                
            elif resolution == "merge":
                # Create merge file with both versions
                local_path = self.local_root / relative_path
                remote_path = self.remote_root / relative_path
                
                with open(local_path, 'r', encoding='utf-8', errors='replace') as f:
                    local_content = f.read()
                with open(remote_path, 'r', encoding='utf-8', errors='replace') as f:
                    remote_content = f.read()
                
                merged = f"""<<<<<<< LOCAL
{local_content}
=======
{remote_content}
>>>>>>> REMOTE
"""
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(merged)
                
                print(f"Merged file created. Edit {local_path} and run --push")
                return True
            
            else:
                print(f"Unknown resolution: {resolution}")
                return False
            
            self._save_tracked(tracked)
            self._log_operation("resolve", relative_path, resolution, "success")
            return True
            
        except Exception as e:
            print(f"Error resolving conflict: {e}")
            return False
    
    def _copy_file(self, tracked: TrackedFile, direction: str):
        """Copy file between local and remote."""
        local_path = self.local_root / tracked.relative_path
        remote_path = self.remote_root / tracked.relative_path
        
        if direction == "pull":
            source = remote_path
            dest = local_path
        else:  # push
            source = local_path
            dest = remote_path
        
        # Handle deletions
        if tracked.status == FileStatus.DELETED_LOCAL and direction == "push":
            if dest.exists():
                dest.unlink()
            return
        elif tracked.status == FileStatus.DELETED_REMOTE and direction == "pull":
            if dest.exists():
                dest.unlink()
            return
        
        # Copy file
        if source.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
    
    def initialize(self):
        """
        Initialize sync by recording current state as baseline.
        Should be called once when setting up sync.
        """
        print("Initializing sync baseline...")
        
        remote_files = self._find_files(self.remote_root)
        
        for relative_path in remote_files:
            remote_path = self.remote_root / relative_path
            remote_hash = self._hash_file(remote_path)
            
            tracked = TrackedFile(
                relative_path=relative_path,
                remote_hash=remote_hash,
                base_hash=remote_hash,
                remote_mtime=self._get_mtime(remote_path)
            )
            self._save_tracked(tracked)
        
        print(f"Initialized {len(remote_files)} files")


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """Command-line interface for file sync."""
    parser = argparse.ArgumentParser(
        description="PRISM Incremental File Sync - Bidirectional sync with conflict detection"
    )
    
    parser.add_argument(
        "--local", default="/home/claude/prism",
        help="Local working directory"
    )
    
    parser.add_argument(
        "--remote", default=r"C:\PRISM",
        help="Remote directory (C: drive)"
    )
    
    parser.add_argument(
        "--status", action="store_true",
        help="Show sync status"
    )
    
    parser.add_argument(
        "--pull", action="store_true",
        help="Pull remote changes to local"
    )
    
    parser.add_argument(
        "--push", action="store_true",
        help="Push local changes to remote"
    )
    
    parser.add_argument(
        "--sync", action="store_true",
        help="Bidirectional sync"
    )
    
    parser.add_argument(
        "--resolve", metavar="FILE",
        help="Resolve conflict for FILE"
    )
    
    parser.add_argument(
        "--keep", choices=["local", "remote", "merge"],
        help="Resolution strategy (with --resolve)"
    )
    
    parser.add_argument(
        "--force", action="store_true",
        help="Force overwrite conflicts"
    )
    
    parser.add_argument(
        "--init", action="store_true",
        help="Initialize sync baseline"
    )
    
    parser.add_argument(
        "--test", action="store_true",
        help="Run self-test"
    )
    
    args = parser.parse_args()
    
    if args.test:
        run_tests()
        return
    
    sync = IncrementalFileSync(args.local, args.remote)
    
    if args.init:
        sync.initialize()
        return
    
    if args.status:
        status = sync.get_status()
        print("\n=== Sync Status ===")
        print(f"Up to date: {status.up_to_date}")
        print(f"Local changes: {len(status.local_changes)}")
        print(f"Remote changes: {len(status.remote_changes)}")
        print(f"Conflicts: {len(status.conflicts)}")
        
        if status.local_changes:
            print("\n--- Local Changes (will push) ---")
            for f in status.local_changes[:10]:
                print(f"  {f.status.value}: {f.relative_path}")
            if len(status.local_changes) > 10:
                print(f"  ... and {len(status.local_changes) - 10} more")
        
        if status.remote_changes:
            print("\n--- Remote Changes (will pull) ---")
            for f in status.remote_changes[:10]:
                print(f"  {f.status.value}: {f.relative_path}")
            if len(status.remote_changes) > 10:
                print(f"  ... and {len(status.remote_changes) - 10} more")
        
        if status.conflicts:
            print("\n--- Conflicts (need resolution) ---")
            for f in status.conflicts:
                print(f"  CONFLICT: {f.relative_path}")
        
        return
    
    if args.pull:
        result = sync.pull(force=args.force)
        print(f"\nPull complete: {result.files_pulled} files")
        if result.conflicts_found:
            print(f"Conflicts skipped: {result.conflicts_found}")
        if result.errors:
            print(f"Errors: {len(result.errors)}")
            for e in result.errors[:5]:
                print(f"  {e}")
        return
    
    if args.push:
        result = sync.push(force=args.force)
        print(f"\nPush complete: {result.files_pushed} files")
        if result.conflicts_found:
            print(f"Conflicts skipped: {result.conflicts_found}")
        if result.errors:
            print(f"Errors: {len(result.errors)}")
            for e in result.errors[:5]:
                print(f"  {e}")
        return
    
    if args.sync:
        result = sync.sync()
        print(f"\nSync complete:")
        print(f"  Pulled: {result.files_pulled}")
        print(f"  Pushed: {result.files_pushed}")
        if result.conflicts_found:
            print(f"  Conflicts: {result.conflicts_found}")
        if result.errors:
            print(f"  Errors: {len(result.errors)}")
        return
    
    if args.resolve:
        if not args.keep:
            print("--resolve requires --keep (local|remote|merge)")
            return
        success = sync.resolve_conflict(args.resolve, args.keep)
        if success:
            print(f"Conflict resolved: {args.resolve}")
        return
    
    parser.print_help()


def run_tests():
    """Run self-tests."""
    print("=" * 60)
    print("PRISM Incremental File Sync - Self Test")
    print("=" * 60)
    
    import tempfile
    import shutil
    
    # Create temp directories
    local_dir = tempfile.mkdtemp(prefix="sync_local_")
    remote_dir = tempfile.mkdtemp(prefix="sync_remote_")
    
    try:
        # Create test files in remote
        remote_file1 = Path(remote_dir) / "test1.py"
        remote_file1.write_text("# Remote file 1\nprint('hello')\n")
        
        remote_file2 = Path(remote_dir) / "subdir" / "test2.json"
        remote_file2.parent.mkdir(parents=True, exist_ok=True)
        remote_file2.write_text('{"key": "value"}\n')
        
        print("\n1. Testing initialization...")
        sync = IncrementalFileSync(local_dir, remote_dir)
        sync.initialize()
        print("   ✓ Initialization complete")
        
        print("\n2. Testing status (after init)...")
        status = sync.get_status()
        print(f"   Remote changes: {len(status.remote_changes)}")
        assert len(status.remote_changes) == 2, "Expected 2 remote changes"
        print("   ✓ Status check working")
        
        print("\n3. Testing pull...")
        result = sync.pull()
        print(f"   Files pulled: {result.files_pulled}")
        assert result.files_pulled == 2, "Expected to pull 2 files"
        assert (Path(local_dir) / "test1.py").exists()
        print("   ✓ Pull working")
        
        print("\n4. Testing local modification...")
        local_file1 = Path(local_dir) / "test1.py"
        local_file1.write_text("# Modified local\nprint('modified')\n")
        
        status = sync.get_status()
        print(f"   Local changes: {len(status.local_changes)}")
        assert len(status.local_changes) == 1, "Expected 1 local change"
        print("   ✓ Local modification detected")
        
        print("\n5. Testing push...")
        result = sync.push()
        print(f"   Files pushed: {result.files_pushed}")
        assert result.files_pushed == 1
        print("   ✓ Push working")
        
        print("\n6. Testing conflict detection...")
        # Modify both sides
        local_file1.write_text("# Local version\n")
        remote_file1.write_text("# Remote version\n")
        
        status = sync.get_status()
        print(f"   Conflicts: {len(status.conflicts)}")
        assert len(status.conflicts) == 1, "Expected 1 conflict"
        print("   ✓ Conflict detection working")
        
        print("\n7. Testing conflict resolution...")
        success = sync.resolve_conflict("test1.py", "local")
        assert success
        print("   ✓ Conflict resolution working")
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED ✓")
        print("=" * 60)
        
    finally:
        shutil.rmtree(local_dir, ignore_errors=True)
        shutil.rmtree(remote_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
