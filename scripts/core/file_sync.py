"""
PRISM Incremental File Sync - CORE.6
Enhancement Roadmap v4.0 | 5 hours estimated

Bidirectional sync between C: drive and container.

Features:
- Track file changes via hash
- Detect conflicts (both modified)
- Auto-sync on session start/end
- Manual sync commands

Prevents:
- Lost work from container resets
- Overwriting newer versions
- Desync between environments

@version 1.0.0
@author PRISM Development Team
"""

import os
import sys
import json
import hashlib
import shutil
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
import threading


# ============================================================================
# CONFIGURATION
# ============================================================================

@dataclass
class SyncConfig:
    """Configuration for File Sync."""
    local_base: str = r"C:\\PRISM"
    remote_base: str = "/home/claude/prism"
    state_file: str = r"C:\PRISM\state\sync_state.json"
    sync_patterns: List[str] = field(default_factory=lambda: [
        "*.json", "*.md", "*.py", "*.ts", "*.js"
    ])
    exclude_patterns: List[str] = field(default_factory=lambda: [
        "node_modules/*", "__pycache__/*", "*.pyc", ".git/*"
    ])
    max_file_size_mb: int = 50


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class FileState:
    """State of a tracked file."""
    path: str
    local_hash: Optional[str] = None
    remote_hash: Optional[str] = None
    local_mtime: Optional[str] = None
    remote_mtime: Optional[str] = None
    last_synced: Optional[str] = None
    status: str = "unknown"  # synced, local_changed, remote_changed, conflict, new_local, new_remote


@dataclass
class SyncResult:
    """Result of a sync operation."""
    success: bool
    files_synced: int
    files_skipped: int
    conflicts: List[str]
    errors: List[str]
    timestamp: str


# ============================================================================
# FILE SYNC
# ============================================================================

class PRISMFileSync:
    """
    Bidirectional file synchronization for PRISM.
    
    Tracks file states, detects changes, handles conflicts.
    """
    
    def __init__(self, config: Optional[SyncConfig] = None):
        self.config = config or SyncConfig()
        self.file_states: Dict[str, FileState] = {}
        self._lock = threading.Lock()
        
        # Load state
        self._load_state()
    
    def _load_state(self):
        """Load sync state from disk."""
        if os.path.exists(self.config.state_file):
            try:
                with open(self.config.state_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for path, state_dict in data.get('files', {}).items():
                        self.file_states[path] = FileState(**state_dict)
            except Exception as e:
                print(f"Warning: Could not load sync state: {e}")
    
    def _save_state(self):
        """Save sync state to disk."""
        os.makedirs(os.path.dirname(self.config.state_file), exist_ok=True)
        data = {
            "version": "1.0.0",
            "updated_at": datetime.now().isoformat(),
            "files": {path: asdict(state) for path, state in self.file_states.items()}
        }
        with open(self.config.state_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    
    def _compute_hash(self, file_path: str) -> Optional[str]:
        """Compute MD5 hash of a file."""
        if not os.path.exists(file_path):
            return None
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception:
            return None
    
    def _should_track(self, file_path: str) -> bool:
        """Check if a file should be tracked based on patterns."""
        # Check excludes
        for pattern in self.config.exclude_patterns:
            if Path(file_path).match(pattern):
                return False
        
        # Check includes
        for pattern in self.config.sync_patterns:
            if Path(file_path).match(pattern):
                return True
        
        return False
    
    def _get_local_path(self, relative_path: str) -> str:
        """Get full local path."""
        return os.path.join(self.config.local_base, relative_path)
    
    def _get_remote_path(self, relative_path: str) -> str:
        """Get full remote path."""
        return os.path.join(self.config.remote_base, relative_path)
    
    def scan_local(self) -> Dict[str, str]:
        """Scan local directory for files and hashes."""
        files = {}
        for root, _, filenames in os.walk(self.config.local_base):
            for fn in filenames:
                full_path = os.path.join(root, fn)
                rel_path = os.path.relpath(full_path, self.config.local_base)
                
                if self._should_track(rel_path):
                    file_hash = self._compute_hash(full_path)
                    if file_hash:
                        files[rel_path] = file_hash
        
        return files
    
    def scan_remote(self) -> Dict[str, str]:
        """Scan remote directory for files and hashes."""
        files = {}
        if not os.path.exists(self.config.remote_base):
            return files
        
        for root, _, filenames in os.walk(self.config.remote_base):
            for fn in filenames:
                full_path = os.path.join(root, fn)
                rel_path = os.path.relpath(full_path, self.config.remote_base)
                
                if self._should_track(rel_path):
                    file_hash = self._compute_hash(full_path)
                    if file_hash:
                        files[rel_path] = file_hash
        
        return files
    
    def get_status(self) -> Dict[str, Any]:
        """Get sync status."""
        with self._lock:
            local_files = self.scan_local()
            remote_files = self.scan_remote()
            
            all_paths = set(local_files.keys()) | set(remote_files.keys())
            
            status = {
                "synced": [],
                "local_changed": [],
                "remote_changed": [],
                "conflict": [],
                "new_local": [],
                "new_remote": []
            }
            
            for path in all_paths:
                local_hash = local_files.get(path)
                remote_hash = remote_files.get(path)
                
                state = self.file_states.get(path)
                last_synced_hash = state.local_hash if state else None
                
                if local_hash and remote_hash:
                    if local_hash == remote_hash:
                        status["synced"].append(path)
                    elif last_synced_hash:
                        if local_hash != last_synced_hash and remote_hash != last_synced_hash:
                            status["conflict"].append(path)
                        elif local_hash != last_synced_hash:
                            status["local_changed"].append(path)
                        else:
                            status["remote_changed"].append(path)
                    else:
                        status["conflict"].append(path)
                elif local_hash:
                    status["new_local"].append(path)
                elif remote_hash:
                    status["new_remote"].append(path)
            
            return {
                "total_files": len(all_paths),
                "synced": len(status["synced"]),
                "local_changes": len(status["local_changed"]) + len(status["new_local"]),
                "remote_changes": len(status["remote_changed"]) + len(status["new_remote"]),
                "conflicts": len(status["conflict"]),
                "details": status
            }
    
    def sync_to_local(self) -> SyncResult:
        """Push remote changes to local."""
        with self._lock:
            remote_files = self.scan_remote()
            synced = 0
            skipped = 0
            conflicts = []
            errors = []
            
            for rel_path, remote_hash in remote_files.items():
                local_path = self._get_local_path(rel_path)
                remote_path = self._get_remote_path(rel_path)
                local_hash = self._compute_hash(local_path)
                
                state = self.file_states.get(rel_path)
                
                # Check for conflict
                if local_hash and state and local_hash != state.local_hash:
                    conflicts.append(rel_path)
                    skipped += 1
                    continue
                
                try:
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    shutil.copy2(remote_path, local_path)
                    
                    # Update state
                    self.file_states[rel_path] = FileState(
                        path=rel_path,
                        local_hash=remote_hash,
                        remote_hash=remote_hash,
                        last_synced=datetime.now().isoformat(),
                        status="synced"
                    )
                    synced += 1
                except Exception as e:
                    errors.append(f"{rel_path}: {e}")
                    skipped += 1
            
            self._save_state()
            
            return SyncResult(
                success=len(errors) == 0,
                files_synced=synced,
                files_skipped=skipped,
                conflicts=conflicts,
                errors=errors,
                timestamp=datetime.now().isoformat()
            )
    
    def sync_from_local(self) -> SyncResult:
        """Pull local changes to remote."""
        with self._lock:
            local_files = self.scan_local()
            synced = 0
            skipped = 0
            conflicts = []
            errors = []
            
            for rel_path, local_hash in local_files.items():
                local_path = self._get_local_path(rel_path)
                remote_path = self._get_remote_path(rel_path)
                remote_hash = self._compute_hash(remote_path)
                
                state = self.file_states.get(rel_path)
                
                # Check for conflict
                if remote_hash and state and remote_hash != state.remote_hash:
                    conflicts.append(rel_path)
                    skipped += 1
                    continue
                
                try:
                    os.makedirs(os.path.dirname(remote_path), exist_ok=True)
                    shutil.copy2(local_path, remote_path)
                    
                    # Update state
                    self.file_states[rel_path] = FileState(
                        path=rel_path,
                        local_hash=local_hash,
                        remote_hash=local_hash,
                        last_synced=datetime.now().isoformat(),
                        status="synced"
                    )
                    synced += 1
                except Exception as e:
                    errors.append(f"{rel_path}: {e}")
                    skipped += 1
            
            self._save_state()
            
            return SyncResult(
                success=len(errors) == 0,
                files_synced=synced,
                files_skipped=skipped,
                conflicts=conflicts,
                errors=errors,
                timestamp=datetime.now().isoformat()
            )
    
    def resolve_conflict(self, file_path: str, resolution: str) -> Dict[str, Any]:
        """
        Resolve a sync conflict.
        
        Args:
            file_path: Relative path of conflicted file
            resolution: 'keep_local', 'keep_remote', or 'keep_both'
        
        Returns:
            Resolution result
        """
        with self._lock:
            local_path = self._get_local_path(file_path)
            remote_path = self._get_remote_path(file_path)
            
            if resolution == "keep_local":
                shutil.copy2(local_path, remote_path)
                new_hash = self._compute_hash(local_path)
            elif resolution == "keep_remote":
                shutil.copy2(remote_path, local_path)
                new_hash = self._compute_hash(remote_path)
            elif resolution == "keep_both":
                # Rename remote with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = f"{local_path}.conflict_{timestamp}"
                shutil.copy2(remote_path, backup_path)
                new_hash = self._compute_hash(local_path)
            else:
                return {"error": f"Unknown resolution: {resolution}"}
            
            # Update state
            self.file_states[file_path] = FileState(
                path=file_path,
                local_hash=new_hash,
                remote_hash=new_hash,
                last_synced=datetime.now().isoformat(),
                status="synced"
            )
            
            self._save_state()
            
            return {
                "success": True,
                "file": file_path,
                "resolution": resolution,
                "new_hash": new_hash
            }


# ============================================================================
# CLI
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM File Sync")
    parser.add_argument("--status", action="store_true", help="Show sync status")
    parser.add_argument("--to-local", action="store_true", help="Sync remote to local")
    parser.add_argument("--from-local", action="store_true", help="Sync local to remote")
    parser.add_argument("--resolve", help="Resolve conflict (path:resolution)")
    
    args = parser.parse_args()
    
    sync = PRISMFileSync()
    
    if args.status:
        status = sync.get_status()
        print(json.dumps(status, indent=2))
        return
    
    if args.to_local:
        result = sync.sync_to_local()
        print(f"Synced {result.files_synced} files to local")
        if result.conflicts:
            print(f"Conflicts: {result.conflicts}")
        return
    
    if args.from_local:
        result = sync.sync_from_local()
        print(f"Synced {result.files_synced} files from local")
        if result.conflicts:
            print(f"Conflicts: {result.conflicts}")
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
