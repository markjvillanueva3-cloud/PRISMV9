"""
PRISM Google Drive Sync v1.0
============================
Syncs PRISM data to Google Drive for backup and sharing.
Uses Google Drive desktop app's sync folder.

Usage:
    py -3 C:\PRISM\scripts\integration\sync_to_drive.py
    py -3 C:\PRISM\scripts\integration\sync_to_drive.py --full
    py -3 C:\PRISM\scripts\integration\sync_to_drive.py --dry-run

Requirements:
    - Google Drive desktop app installed and syncing
    - Drive folder accessible at configured path
"""

import json
import shutil
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Paths
PRISM_ROOT = Path(r"C:\PRISM")

# Common Google Drive paths (will auto-detect)
DRIVE_CANDIDATES = [
    Path(r"G:\My Drive"),
    Path(r"G:\Shared drives"),
    Path.home() / "Google Drive",
    Path.home() / "My Drive",
    Path(r"C:\Users") / "*" / "Google Drive",
    Path(r"C:\Users") / "*" / "My Drive"
]

# What to sync
SYNC_CONFIG = {
    "state": {
        "source": PRISM_ROOT / "state",
        "dest_folder": "PRISM_Backup/state",
        "patterns": ["*.json", "*.md"],
        "priority": "HIGH"
    },
    "databases": {
        "source": PRISM_ROOT / "data" / "databases",
        "dest_folder": "PRISM_Backup/databases",
        "patterns": ["*.json", "*.xlsx", "*.duckdb"],
        "priority": "HIGH"
    },
    "extracted": {
        "source": PRISM_ROOT / "extracted",
        "dest_folder": "PRISM_Backup/extracted",
        "patterns": ["*.json", "*.js"],
        "priority": "MEDIUM"
    },
    "skills": {
        "source": PRISM_ROOT / "skills",
        "dest_folder": "PRISM_Backup/skills",
        "patterns": ["*.md"],
        "priority": "MEDIUM"
    },
    "docs": {
        "source": PRISM_ROOT / "docs",
        "dest_folder": "PRISM_Backup/docs",
        "patterns": ["*.md", "*.pdf"],
        "priority": "LOW"
    },
    "knowledge": {
        "source": PRISM_ROOT / "knowledge",
        "dest_folder": "PRISM_Backup/knowledge",
        "patterns": ["*.md"],
        "priority": "LOW"
    }
}


def find_drive_path() -> Optional[Path]:
    """Auto-detect Google Drive sync folder."""
    
    # Check environment variable first
    env_path = Path(r"C:\Users\Admin.DIGITALSTORM-PC\Box")
    if env_path.exists():
        return env_path
    
    # Try common paths
    for candidate in DRIVE_CANDIDATES:
        if "*" in str(candidate):
            # Glob pattern
            parent = candidate.parent
            pattern = candidate.name
            if parent.exists():
                for match in parent.glob(pattern):
                    if match.is_dir():
                        return match
        elif candidate.exists():
            return candidate
    
    return None


def sync_folder(
    source: Path,
    dest: Path,
    patterns: List[str],
    dry_run: bool = False
) -> Dict[str, int]:
    """Sync a folder to destination."""
    
    result = {
        "files_copied": 0,
        "files_skipped": 0,
        "bytes_copied": 0,
        "errors": []
    }
    
    if not source.exists():
        result["errors"].append(f"Source not found: {source}")
        return result
    
    # Create destination
    if not dry_run:
        dest.mkdir(parents=True, exist_ok=True)
    
    # Find files matching patterns
    files_to_sync = []
    for pattern in patterns:
        files_to_sync.extend(source.glob(f"**/{pattern}"))
    
    for src_file in files_to_sync:
        # Determine relative path and destination
        rel_path = src_file.relative_to(source)
        dest_file = dest / rel_path
        
        # Check if needs sync (newer or doesn't exist)
        needs_sync = True
        if dest_file.exists():
            src_mtime = src_file.stat().st_mtime
            dest_mtime = dest_file.stat().st_mtime
            if src_mtime <= dest_mtime:
                needs_sync = False
                result["files_skipped"] += 1
        
        if needs_sync:
            if dry_run:
                print(f"  [DRY RUN] Would copy: {rel_path}")
            else:
                try:
                    dest_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src_file, dest_file)
                    result["bytes_copied"] += src_file.stat().st_size
                except Exception as e:
                    result["errors"].append(f"Failed to copy {rel_path}: {e}")
                    continue
            
            result["files_copied"] += 1
    
    return result


def sync_all(full_sync: bool = False, dry_run: bool = False) -> Dict[str, any]:
    """Sync all configured folders to Google Drive."""
    
    print("=" * 60)
    print("PRISM Google Drive Sync")
    print("=" * 60)
    
    # Find Drive path
    drive_path = find_drive_path()
    
    if drive_path is None:
        print("\nâŒ Google Drive folder not found!")
        print("Please ensure Google Drive desktop app is installed and syncing.")
        print("\nChecked locations:")
        for candidate in DRIVE_CANDIDATES:
            print(f"  - {candidate}")
        return {"success": False, "error": "Drive not found"}
    
    print(f"\nâœ“ Found Drive at: {drive_path}")
    
    if dry_run:
        print("\n[DRY RUN MODE - No files will be copied]")
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "drive_path": str(drive_path),
        "dry_run": dry_run,
        "folders": {},
        "summary": {
            "total_copied": 0,
            "total_skipped": 0,
            "total_bytes": 0,
            "errors": 0
        }
    }
    
    # Determine what to sync based on priority
    folders_to_sync = SYNC_CONFIG
    if not full_sync:
        # Only HIGH priority for quick sync
        folders_to_sync = {k: v for k, v in SYNC_CONFIG.items() if v["priority"] == "HIGH"}
        print(f"\n[Quick sync - HIGH priority only. Use --full for all folders]")
    
    for name, config in folders_to_sync.items():
        source = config["source"]
        dest = drive_path / config["dest_folder"]
        
        print(f"\n[{name.upper()}] {source} â†’ {dest}")
        
        result = sync_folder(
            source,
            dest,
            config["patterns"],
            dry_run
        )
        
        results["folders"][name] = result
        results["summary"]["total_copied"] += result["files_copied"]
        results["summary"]["total_skipped"] += result["files_skipped"]
        results["summary"]["total_bytes"] += result["bytes_copied"]
        results["summary"]["errors"] += len(result["errors"])
        
        status = "âœ“" if not result["errors"] else "âš "
        print(f"  {status} Copied: {result['files_copied']}, Skipped: {result['files_skipped']}")
        
        for error in result["errors"]:
            print(f"  âŒ {error}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Files copied: {results['summary']['total_copied']}")
    print(f"Files skipped (up-to-date): {results['summary']['total_skipped']}")
    print(f"Data transferred: {results['summary']['total_bytes'] / 1024:.1f} KB")
    print(f"Errors: {results['summary']['errors']}")
    
    # Write sync log
    if not dry_run:
        log_path = PRISM_ROOT / "state" / "logs" / "drive_sync.json"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with open(log_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nSync log: {log_path}")
    
    return results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync PRISM data to Google Drive")
    parser.add_argument("--full", "-f", action="store_true", help="Full sync (all folders)")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Show what would be copied")
    parser.add_argument("--drive-path", "-d", help="Override Drive path")
    
    args = parser.parse_args()
    
    sync_all(full_sync=args.full, dry_run=args.dry_run)


if __name__ == "__main__":
    main()


