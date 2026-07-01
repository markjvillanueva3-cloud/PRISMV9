#!/usr/bin/env python3
"""
PRISM WIP (Work In Progress) Saver v1.0
Saves work-in-progress to prevent loss during compaction or interruption.

Part of Tier 0 (SURVIVAL) - Session 0.1: Compaction Recovery System

Features:
1. Auto-save WIP at configurable intervals
2. Incremental saves (only changes)
3. Quick restore from WIP
4. Cleanup of old WIP files

Usage:
    from wip_saver import WIPSaver
    saver = WIPSaver()
    saver.save("my_task", {"code": "...", "progress": 5})
    # Later:
    wip = saver.load("my_task")
"""
import os
import sys
import json
import hashlib
import gzip
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

PRISM_ROOT = Path("C:/PRISM")
WIP_DIR = PRISM_ROOT / "wip"
STATE_DIR = PRISM_ROOT / "state"
MAX_WIP_FILES = 20  # Per task
MAX_WIP_AGE_HOURS = 72  # 3 days
COMPRESS_THRESHOLD = 10000  # Bytes


# ═══════════════════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class WIPEntry:
    """Single WIP save entry."""
    task_id: str
    timestamp: str
    content: Dict[str, Any]
    content_hash: str
    size_bytes: int
    compressed: bool


@dataclass
class WIPSaveResult:
    """Result of save operation."""
    success: bool
    path: str
    size_bytes: int
    compressed: bool
    is_incremental: bool
    message: str


@dataclass
class WIPLoadResult:
    """Result of load operation."""
    success: bool
    entry: Optional[WIPEntry]
    path: Optional[str]
    message: str


# ═══════════════════════════════════════════════════════════════════════════
# WIP SAVER
# ═══════════════════════════════════════════════════════════════════════════

class WIPSaver:
    """
    Saves and restores work-in-progress.
    
    File Structure:
    C:/PRISM/wip/
    ├── task_001/
    │   ├── wip_20260201_120000.json
    │   ├── wip_20260201_121500.json.gz
    │   └── latest.json -> wip_20260201_121500.json.gz
    ├── task_002/
    │   └── ...
    └── index.json  (task -> latest WIP mapping)
    
    Save Strategy:
    1. Check if content changed (hash comparison)
    2. If unchanged, skip save (incremental)
    3. If changed, save new WIP
    4. Compress if over threshold
    5. Update latest pointer
    6. Cleanup old WIP files
    """
    
    def __init__(self, wip_dir: Path = WIP_DIR):
        self.wip_dir = wip_dir
        self.wip_dir.mkdir(parents=True, exist_ok=True)
        self._last_hashes: Dict[str, str] = {}
        self._load_index()
    
    def _load_index(self) -> None:
        """Load WIP index."""
        index_path = self.wip_dir / "index.json"
        if index_path.exists():
            try:
                with open(index_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._last_hashes = data.get('hashes', {})
            except Exception:
                self._last_hashes = {}
    
    def _save_index(self) -> None:
        """Save WIP index."""
        index_path = self.wip_dir / "index.json"
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump({
                'hashes': self._last_hashes,
                'updated': datetime.now().isoformat()
            }, f, indent=2)
    
    def _compute_hash(self, content: Dict[str, Any]) -> str:
        """Compute hash of content."""
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()[:16]
    
    def _get_task_dir(self, task_id: str) -> Path:
        """Get directory for task WIPs."""
        # Sanitize task_id for filesystem
        safe_id = "".join(c if c.isalnum() or c in '-_' else '_' for c in task_id)
        task_dir = self.wip_dir / safe_id
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir
    
    def save(self, task_id: str, content: Dict[str, Any], 
             force: bool = False) -> WIPSaveResult:
        """
        Save work-in-progress.
        
        Args:
            task_id: Unique task identifier
            content: Content to save
            force: Force save even if unchanged
            
        Returns:
            WIPSaveResult with save details
        """
        content_hash = self._compute_hash(content)
        
        # Check for incremental (no change)
        if not force and self._last_hashes.get(task_id) == content_hash:
            return WIPSaveResult(
                success=True,
                path="",
                size_bytes=0,
                compressed=False,
                is_incremental=True,
                message="Content unchanged, skipped save"
            )
        
        # Prepare save
        task_dir = self._get_task_dir(task_id)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Build WIP entry
        entry = WIPEntry(
            task_id=task_id,
            timestamp=datetime.now().isoformat(),
            content=content,
            content_hash=content_hash,
            size_bytes=0,
            compressed=False
        )
        
        # Serialize
        content_json = json.dumps(asdict(entry), indent=2)
        size_bytes = len(content_json.encode())
        entry.size_bytes = size_bytes
        
        # Determine if compression needed
        if size_bytes > COMPRESS_THRESHOLD:
            filename = f"wip_{timestamp}.json.gz"
            filepath = task_dir / filename
            compressed_data = gzip.compress(content_json.encode())
            with open(filepath, 'wb') as f:
                f.write(compressed_data)
            entry.compressed = True
            actual_size = len(compressed_data)
        else:
            filename = f"wip_{timestamp}.json"
            filepath = task_dir / filename
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content_json)
            actual_size = size_bytes
        
        # Update latest pointer
        latest_path = task_dir / "latest.json"
        with open(latest_path, 'w', encoding='utf-8') as f:
            json.dump({
                'task_id': task_id,
                'file': filename,
                'timestamp': entry.timestamp,
                'hash': content_hash
            }, f, indent=2)
        
        # Update index
        self._last_hashes[task_id] = content_hash
        self._save_index()
        
        # Cleanup old files
        self._cleanup_old_wips(task_dir)
        
        return WIPSaveResult(
            success=True,
            path=str(filepath),
            size_bytes=actual_size,
            compressed=entry.compressed,
            is_incremental=False,
            message=f"Saved WIP to {filename}"
        )
    
    def load(self, task_id: str, 
             specific_file: Optional[str] = None) -> WIPLoadResult:
        """
        Load work-in-progress.
        
        Args:
            task_id: Task identifier
            specific_file: Specific WIP file (default: latest)
            
        Returns:
            WIPLoadResult with loaded content
        """
        task_dir = self._get_task_dir(task_id)
        
        if specific_file:
            filepath = task_dir / specific_file
        else:
            # Load latest pointer
            latest_path = task_dir / "latest.json"
            if not latest_path.exists():
                return WIPLoadResult(
                    success=False,
                    entry=None,
                    path=None,
                    message=f"No WIP found for task: {task_id}"
                )
            
            with open(latest_path, 'r', encoding='utf-8') as f:
                latest = json.load(f)
            filepath = task_dir / latest['file']
        
        if not filepath.exists():
            return WIPLoadResult(
                success=False,
                entry=None,
                path=str(filepath),
                message=f"WIP file not found: {filepath}"
            )
        
        try:
            # Load content
            if str(filepath).endswith('.gz'):
                with gzip.open(filepath, 'rt', encoding='utf-8') as f:
                    data = json.load(f)
            else:
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
            entry = WIPEntry(
                task_id=data.get('task_id', task_id),
                timestamp=data.get('timestamp', ''),
                content=data.get('content', {}),
                content_hash=data.get('content_hash', ''),
                size_bytes=data.get('size_bytes', 0),
                compressed=data.get('compressed', False)
            )
            
            return WIPLoadResult(
                success=True,
                entry=entry,
                path=str(filepath),
                message=f"Loaded WIP from {filepath.name}"
            )
            
        except Exception as e:
            return WIPLoadResult(
                success=False,
                entry=None,
                path=str(filepath),
                message=f"Error loading WIP: {e}"
            )
    
    def list_wips(self, task_id: str) -> List[Dict[str, Any]]:
        """List all WIPs for a task."""
        task_dir = self._get_task_dir(task_id)
        wips = []
        
        for filepath in sorted(task_dir.glob("wip_*.json*"), reverse=True):
            wips.append({
                'file': filepath.name,
                'size': filepath.stat().st_size,
                'modified': datetime.fromtimestamp(filepath.stat().st_mtime).isoformat(),
                'compressed': filepath.suffix == '.gz'
            })
        
        return wips
    
    def list_all_tasks(self) -> List[Dict[str, Any]]:
        """List all tasks with WIPs."""
        tasks = []
        
        for task_dir in self.wip_dir.iterdir():
            if task_dir.is_dir() and (task_dir / "latest.json").exists():
                with open(task_dir / "latest.json", 'r', encoding='utf-8') as f:
                    latest = json.load(f)
                tasks.append({
                    'task_id': latest.get('task_id', task_dir.name),
                    'latest_file': latest.get('file'),
                    'timestamp': latest.get('timestamp'),
                    'wip_count': len(list(task_dir.glob("wip_*.json*")))
                })
        
        return sorted(tasks, key=lambda t: t.get('timestamp', ''), reverse=True)
    
    def _cleanup_old_wips(self, task_dir: Path) -> int:
        """Clean up old WIP files, keeping only recent ones."""
        wip_files = sorted(
            task_dir.glob("wip_*.json*"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        
        removed = 0
        cutoff = datetime.now() - timedelta(hours=MAX_WIP_AGE_HOURS)
        
        for i, filepath in enumerate(wip_files):
            # Keep first MAX_WIP_FILES
            if i < MAX_WIP_FILES:
                continue
            
            # Remove if too old
            file_time = datetime.fromtimestamp(filepath.stat().st_mtime)
            if file_time < cutoff:
                filepath.unlink()
                removed += 1
        
        return removed
    
    def delete_task_wips(self, task_id: str) -> int:
        """Delete all WIPs for a task."""
        task_dir = self._get_task_dir(task_id)
        
        removed = 0
        for filepath in task_dir.glob("*"):
            filepath.unlink()
            removed += 1
        
        task_dir.rmdir()
        
        if task_id in self._last_hashes:
            del self._last_hashes[task_id]
            self._save_index()
        
        return removed


# ═══════════════════════════════════════════════════════════════════════════
# CLI INTERFACE
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """WIP Saver CLI."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="PRISM WIP Saver - Save and restore work in progress"
    )
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Save command
    save_parser = subparsers.add_parser('save', help='Save WIP')
    save_parser.add_argument('task_id', help='Task identifier')
    save_parser.add_argument('--content', help='JSON content to save')
    save_parser.add_argument('--file', help='File containing content')
    save_parser.add_argument('--force', action='store_true', help='Force save')
    
    # Load command
    load_parser = subparsers.add_parser('load', help='Load WIP')
    load_parser.add_argument('task_id', help='Task identifier')
    load_parser.add_argument('--file', help='Specific WIP file')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List WIPs')
    list_parser.add_argument('--task', help='Task identifier (default: all)')
    
    # Delete command
    del_parser = subparsers.add_parser('delete', help='Delete WIPs')
    del_parser.add_argument('task_id', help='Task identifier')
    
    args = parser.parse_args()
    saver = WIPSaver()
    
    if args.command == 'save':
        if args.content:
            content = json.loads(args.content)
        elif args.file:
            with open(args.file, 'r', encoding='utf-8') as f:
                content = json.load(f)
        else:
            print("Error: Provide --content or --file")
            return 1
        
        result = saver.save(args.task_id, content, force=args.force)
        print(f"Success: {result.success}")
        print(f"Message: {result.message}")
        if result.path:
            print(f"Path: {result.path}")
            print(f"Size: {result.size_bytes} bytes")
            print(f"Compressed: {result.compressed}")
        
    elif args.command == 'load':
        result = saver.load(args.task_id, args.file)
        print(f"Success: {result.success}")
        print(f"Message: {result.message}")
        if result.entry:
            print(f"\nContent:\n{json.dumps(result.entry.content, indent=2)}")
        
    elif args.command == 'list':
        if args.task:
            wips = saver.list_wips(args.task)
            print(f"WIPs for {args.task}:")
            for wip in wips:
                print(f"  {wip['file']} - {wip['size']} bytes ({wip['modified']})")
        else:
            tasks = saver.list_all_tasks()
            print("All tasks with WIPs:")
            for task in tasks:
                print(f"  {task['task_id']}: {task['wip_count']} WIPs ({task['timestamp']})")
        
    elif args.command == 'delete':
        removed = saver.delete_task_wips(args.task_id)
        print(f"Removed {removed} files for task {args.task_id}")
        
    else:
        parser.print_help()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
