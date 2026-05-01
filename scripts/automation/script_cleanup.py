"""
PRISM Script Cleanup v1.0
=========================
Archives old versioned scripts to reduce clutter.
Identifies *_v2.py, *_v3.py patterns and moves to archive.

Usage:
    py -3 C:\PRISM\scripts\automation\script_cleanup.py --scan
    py -3 C:\PRISM\scripts\automation\script_cleanup.py --archive
    py -3 C:\PRISM\scripts\automation\script_cleanup.py --dry-run

This helps keep the scripts folder organized by:
1. Finding versioned scripts (e.g., materials_audit_v1.py, materials_audit_v2.py)
2. Keeping only the latest version in the main folder
3. Moving older versions to _archive/
"""

import re
import shutil
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
from collections import defaultdict

# Paths
PRISM_ROOT = Path(r"C:\PRISM")
SCRIPTS_PATH = PRISM_ROOT / "scripts"
ARCHIVE_PATH = SCRIPTS_PATH / "_archive"

# Pattern to match versioned files
VERSION_PATTERN = re.compile(r'^(.+?)_v(\d+)(\.\w+)$')

# Exclude these folders from scanning
EXCLUDE_FOLDERS = [
    "_archive",
    "__pycache__",
    ".git",
    "node_modules",
    "venv"
]


def find_versioned_scripts(scan_path: Path = None) -> Dict[str, List[Tuple[Path, int]]]:
    """
    Find all versioned scripts and group by base name.
    
    Returns:
        Dict mapping base_name to list of (path, version) tuples
    """
    if scan_path is None:
        scan_path = SCRIPTS_PATH
    
    versioned = defaultdict(list)
    
    for file_path in scan_path.rglob("*"):
        # Skip directories and excluded folders
        if file_path.is_dir():
            continue
        
        # Check if in excluded folder
        if any(excl in file_path.parts for excl in EXCLUDE_FOLDERS):
            continue
        
        # Check for version pattern
        match = VERSION_PATTERN.match(file_path.name)
        if match:
            base_name = match.group(1)
            version = int(match.group(2))
            extension = match.group(3)
            
            # Create a key that includes the relative path (for nested folders)
            rel_path = file_path.parent.relative_to(scan_path) if file_path.parent != scan_path else Path("")
            key = str(rel_path / base_name) + extension
            
            versioned[key].append((file_path, version))
    
    # Sort each group by version
    for key in versioned:
        versioned[key].sort(key=lambda x: x[1])
    
    return dict(versioned)


def scan_scripts():
    """Scan and report versioned scripts."""
    print("=" * 60)
    print("PRISM Script Cleanup - Scan Report")
    print("=" * 60)
    
    versioned = find_versioned_scripts()
    
    total_files = 0
    can_archive = 0
    
    for base_name, versions in sorted(versioned.items()):
        if len(versions) > 1:
            print(f"\n{base_name}")
            for path, ver in versions:
                marker = "  [KEEP]" if ver == versions[-1][1] else "  [ARCHIVE]"
                print(f"  v{ver}: {path.name}{marker}")
                total_files += 1
                if ver != versions[-1][1]:
                    can_archive += 1
        else:
            # Single versioned file - still count it
            total_files += 1
    
    # Also check for non-versioned duplicates (like file.py and file (1).py)
    copy_pattern = re.compile(r'^(.+?) \((\d+)\)(\.\w+)$')
    copies = []
    
    for file_path in SCRIPTS_PATH.rglob("*"):
        if file_path.is_dir():
            continue
        match = copy_pattern.match(file_path.name)
        if match:
            copies.append(file_path)
    
    if copies:
        print(f"\n\nCopy files found (likely duplicates):")
        for path in copies:
            print(f"  [ARCHIVE] {path.relative_to(SCRIPTS_PATH)}")
            can_archive += 1
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Versioned file groups: {len(versioned)}")
    print(f"Total versioned files: {total_files}")
    print(f"Files to archive: {can_archive}")
    print(f"Copy files: {len(copies)}")
    
    if can_archive > 0:
        print(f"\nRun with --archive to move {can_archive} files to {ARCHIVE_PATH}")
    else:
        print("\nâœ“ No files need archiving")
    
    return versioned, copies


def archive_scripts(dry_run: bool = False):
    """Archive older versions of scripts."""
    print("=" * 60)
    print(f"PRISM Script Cleanup - {'DRY RUN' if dry_run else 'Archive'}")
    print("=" * 60)
    
    versioned = find_versioned_scripts()
    
    # Create archive folder
    if not dry_run:
        ARCHIVE_PATH.mkdir(parents=True, exist_ok=True)
    
    archived = 0
    kept = 0
    errors = []
    
    for base_name, versions in sorted(versioned.items()):
        if len(versions) <= 1:
            continue
        
        latest_version = versions[-1][1]
        
        for path, ver in versions:
            if ver == latest_version:
                kept += 1
                if not dry_run:
                    print(f"  âœ“ Keep: {path.name}")
            else:
                # Archive this older version
                archive_dest = ARCHIVE_PATH / path.relative_to(SCRIPTS_PATH)
                
                if dry_run:
                    print(f"  â†’ Would archive: {path.name}")
                else:
                    try:
                        archive_dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(path), str(archive_dest))
                        print(f"  â†’ Archived: {path.name}")
                        archived += 1
                    except Exception as e:
                        errors.append((path, str(e)))
                        print(f"  âœ— Failed: {path.name} - {e}")
    
    # Also archive copy files
    copy_pattern = re.compile(r'^(.+?) \((\d+)\)(\.\w+)$')
    
    for file_path in SCRIPTS_PATH.rglob("*"):
        if file_path.is_dir():
            continue
        if any(excl in file_path.parts for excl in EXCLUDE_FOLDERS):
            continue
        
        match = copy_pattern.match(file_path.name)
        if match:
            archive_dest = ARCHIVE_PATH / file_path.relative_to(SCRIPTS_PATH)
            
            if dry_run:
                print(f"  â†’ Would archive copy: {file_path.name}")
            else:
                try:
                    archive_dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.move(str(file_path), str(archive_dest))
                    print(f"  â†’ Archived copy: {file_path.name}")
                    archived += 1
                except Exception as e:
                    errors.append((file_path, str(e)))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if dry_run:
        print("[DRY RUN - No files were moved]")
    
    print(f"Files archived: {archived}")
    print(f"Files kept: {kept}")
    print(f"Errors: {len(errors)}")
    
    if not dry_run and archived > 0:
        print(f"\nArchived files location: {ARCHIVE_PATH}")
    
    # Create archive manifest
    if not dry_run and archived > 0:
        manifest_path = ARCHIVE_PATH / "MANIFEST.json"
        manifest = {
            "archived_at": datetime.now().isoformat(),
            "files_archived": archived,
            "reason": "Older versions of versioned scripts"
        }
        import json
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)
    
    return archived


def restore_script(filename: str):
    """Restore a script from archive."""
    archived_file = None
    
    # Search in archive
    for file_path in ARCHIVE_PATH.rglob("*"):
        if file_path.name == filename:
            archived_file = file_path
            break
    
    if archived_file is None:
        print(f"âŒ File not found in archive: {filename}")
        return False
    
    # Determine restore location
    rel_path = archived_file.relative_to(ARCHIVE_PATH)
    restore_path = SCRIPTS_PATH / rel_path
    
    if restore_path.exists():
        print(f"âŒ File already exists at restore location: {restore_path}")
        return False
    
    restore_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(archived_file), str(restore_path))
    print(f"âœ“ Restored: {filename} â†’ {restore_path}")
    
    return True


def list_archive():
    """List files in archive."""
    if not ARCHIVE_PATH.exists():
        print("Archive is empty")
        return
    
    print("=" * 60)
    print("PRISM Script Archive")
    print("=" * 60)
    
    files = list(ARCHIVE_PATH.rglob("*"))
    files = [f for f in files if f.is_file() and f.name != "MANIFEST.json"]
    
    if not files:
        print("\nArchive is empty")
        return
    
    print(f"\n{len(files)} archived files:\n")
    
    for f in sorted(files):
        rel_path = f.relative_to(ARCHIVE_PATH)
        size = f.stat().st_size
        print(f"  {rel_path} ({size:,} bytes)")
    
    print()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="PRISM Script Cleanup")
    parser.add_argument("--scan", "-s", action="store_true", help="Scan and report versioned scripts")
    parser.add_argument("--archive", "-a", action="store_true", help="Archive older versions")
    parser.add_argument("--dry-run", "-n", action="store_true", help="Show what would be archived")
    parser.add_argument("--list", "-l", action="store_true", help="List archived files")
    parser.add_argument("--restore", "-r", help="Restore a file from archive")
    
    args = parser.parse_args()
    
    if args.scan:
        scan_scripts()
    elif args.archive or args.dry_run:
        archive_scripts(dry_run=args.dry_run)
    elif args.list:
        list_archive()
    elif args.restore:
        restore_script(args.restore)
    else:
        # Default to scan
        scan_scripts()


if __name__ == "__main__":
    main()

