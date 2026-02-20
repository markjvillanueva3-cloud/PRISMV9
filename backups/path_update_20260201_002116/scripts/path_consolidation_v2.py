#!/usr/bin/env python3
"""
PRISM Path Consolidation Script v2.0
=====================================
Updates all references from old REBUILD path to new C:\PRISM path.
Uses parallel processing for speed.

Author: PRISM Development Team
Date: 2026-02-01
"""

import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Optional
import threading

# Configuration
BASE_PATH = Path(r"C:\PRISM")
BACKUP_DIR = BASE_PATH / "backups" / f"path_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
NUM_WORKERS = 8

# Pattern definitions - all variations of the old path
OLD_PATTERNS = [
    # Full path with escaped backslashes (JSON)
    r'C:\\\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)',
    r'C:\\\\PRISM REBUILD',
    # Full path with single backslashes  
    r'C:\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)',
    r'C:\\PRISM REBUILD',
    # Forward slashes (Python/JS)
    r'C:/PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)',
    r'C:/PRISM REBUILD',
    # Just the folder name in context
    r'PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)',
]

# New path (will be formatted appropriately)
NEW_PATH_BACKSLASH = r"C:\PRISM"
NEW_PATH_ESCAPED = r"C:\\PRISM"
NEW_PATH_FORWARD = "C:/PRISM"

# File extensions to process
VALID_EXTENSIONS = {
    '.md', '.json', '.py', '.js', '.ts', '.jsx', '.tsx',
    '.txt', '.yaml', '.yml', '.ps1', '.bat', '.sh', '.cmd',
    '.html', '.css', '.xml', '.config', '.ini', '.env',
    '.gitignore', '.npmrc', '.editorconfig'
}

# Directories to skip
SKIP_DIRS = {
    'node_modules', '.git', '__pycache__', '.venv', 'venv',
    'dist', 'build', '.next', 'coverage', '.pytest_cache'
}

# Thread-safe counters
class Stats:
    def __init__(self):
        self.lock = threading.Lock()
        self.files_scanned = 0
        self.files_updated = 0
        self.files_skipped = 0
        self.total_replacements = 0
        self.errors = []
        
    def increment_scanned(self):
        with self.lock:
            self.files_scanned += 1
            
    def increment_updated(self, replacements: int):
        with self.lock:
            self.files_updated += 1
            self.total_replacements += replacements
            
    def increment_skipped(self):
        with self.lock:
            self.files_skipped += 1
            
    def add_error(self, file: str, error: str):
        with self.lock:
            self.errors.append({"file": file, "error": error})

stats = Stats()

def should_process_file(file_path: Path) -> bool:
    """Check if file should be processed."""
    # Check extension
    if file_path.suffix.lower() not in VALID_EXTENSIONS:
        # Also check files without extension but known names
        if file_path.name not in {'Makefile', 'Dockerfile', 'LICENSE', 'README'}:
            return False
    
    # Check file size
    try:
        if file_path.stat().st_size > MAX_FILE_SIZE:
            return False
    except OSError:
        return False
        
    return True

def get_replacement(content: str, file_ext: str) -> Tuple[str, int]:
    """
    Replace all old path patterns with new path.
    Returns (new_content, replacement_count)
    """
    replacement_count = 0
    new_content = content
    
    # Determine appropriate replacement format based on file type
    if file_ext == '.json':
        # JSON files use escaped backslashes
        new_content = re.sub(
            r'C:\\\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)',
            r'C:\\\\PRISM',
            new_content
        )
        count1 = len(re.findall(r'C:\\\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', content))
        
        new_content = re.sub(
            r'C:\\\\PRISM REBUILD(?!\s*\()',
            r'C:\\\\PRISM',
            new_content
        )
        count2 = len(re.findall(r'C:\\\\PRISM REBUILD(?!\s*\()', content))
        
        replacement_count = count1 + count2
        
    elif file_ext in {'.py', '.js', '.ts', '.jsx', '.tsx'}:
        # Code files might use forward slashes or raw strings
        patterns = [
            (r'C:/PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', 'C:/PRISM'),
            (r'C:/PRISM REBUILD(?!\s*\()', 'C:/PRISM'),
            (r'C:\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', r'C:\\PRISM'),
            (r'C:\\PRISM REBUILD(?!\s*\()', r'C:\\PRISM'),
            (r"C:\\\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)", r"C:\\\\PRISM"),
            (r"C:\\\\PRISM REBUILD(?!\s*\()", r"C:\\\\PRISM"),
        ]
        for pattern, replacement in patterns:
            count = len(re.findall(pattern, new_content))
            if count > 0:
                new_content = re.sub(pattern, replacement, new_content)
                replacement_count += count
    else:
        # Markdown and other text files
        patterns = [
            (r'C:\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', r'C:\\PRISM'),
            (r'C:\\PRISM REBUILD(?!\s*\()', r'C:\\PRISM'),
            (r'C:/PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', 'C:/PRISM'),
            (r'C:/PRISM REBUILD(?!\s*\()', 'C:/PRISM'),
        ]
        for pattern, replacement in patterns:
            count = len(re.findall(pattern, new_content))
            if count > 0:
                new_content = re.sub(pattern, replacement, new_content)
                replacement_count += count
    
    # Also catch just "PRISM REBUILD" (folder name only) in specific contexts
    # Be careful not to replace legitimate text
    folder_pattern = r'(?<=[/\\])PRISM REBUILD(?:\s*\(UPLOAD TO BOX OCCASSIONALLY\))?(?=[/\\])'
    count = len(re.findall(folder_pattern, new_content))
    if count > 0:
        new_content = re.sub(folder_pattern, 'PRISM', new_content)
        replacement_count += count
    
    return new_content, replacement_count

def process_file(file_path: Path, dry_run: bool = True) -> Optional[Dict]:
    """Process a single file."""
    stats.increment_scanned()
    
    if not should_process_file(file_path):
        stats.increment_skipped()
        return None
    
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Check if file contains old path
        if 'PRISM REBUILD' not in content:
            return None
        
        # Get replacement
        new_content, count = get_replacement(content, file_path.suffix.lower())
        
        if count == 0:
            return None
        
        result = {
            "file": str(file_path),
            "replacements": count,
            "size": len(content)
        }
        
        if not dry_run:
            # Create backup
            backup_path = BACKUP_DIR / file_path.relative_to(BASE_PATH)
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, backup_path)
            
            # Write updated content
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(new_content)
        
        stats.increment_updated(count)
        return result
        
    except Exception as e:
        stats.add_error(str(file_path), str(e))
        return None

def find_all_files() -> List[Path]:
    """Find all files to process."""
    files = []
    
    for root, dirs, filenames in os.walk(BASE_PATH):
        # Skip certain directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        root_path = Path(root)
        
        # Skip backup directories
        if 'backup' in root.lower():
            continue
        
        for filename in filenames:
            file_path = root_path / filename
            files.append(file_path)
    
    return files

def run_update(dry_run: bool = True):
    """Main update function."""
    print("=" * 70)
    print("PRISM PATH CONSOLIDATION v2.0")
    print("=" * 70)
    print(f"\nMode: {'DRY RUN' if dry_run else 'PRODUCTION'}")
    print(f"Workers: {NUM_WORKERS}")
    print(f"Base Path: {BASE_PATH}")
    
    if not dry_run:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        print(f"Backup Dir: {BACKUP_DIR}")
    
    print("\nScanning files...")
    files = find_all_files()
    print(f"Found {len(files)} files to scan")
    
    # Process files in parallel
    print("\nProcessing...")
    results = []
    
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        future_to_file = {
            executor.submit(process_file, f, dry_run): f 
            for f in files
        }
        
        for future in as_completed(future_to_file):
            result = future.result()
            if result:
                results.append(result)
                if len(results) % 10 == 0:
                    print(f"  Updated: {len(results)} files...")
    
    # Print summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Files scanned:     {stats.files_scanned}")
    print(f"Files updated:     {stats.files_updated}")
    print(f"Total replacements:{stats.total_replacements}")
    print(f"Errors:            {len(stats.errors)}")
    
    if results:
        print(f"\nUpdated files ({len(results)}):")
        for r in sorted(results, key=lambda x: -x['replacements'])[:30]:
            print(f"  {r['replacements']:3d} replacements: {r['file']}")
        if len(results) > 30:
            print(f"  ... and {len(results) - 30} more files")
    
    if stats.errors:
        print(f"\nErrors ({len(stats.errors)}):")
        for e in stats.errors[:10]:
            print(f"  {e['file']}: {e['error']}")
    
    # Save results
    if not dry_run:
        results_file = BACKUP_DIR / "update_results.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "mode": "production",
                "stats": {
                    "files_scanned": stats.files_scanned,
                    "files_updated": stats.files_updated,
                    "total_replacements": stats.total_replacements,
                    "errors": len(stats.errors)
                },
                "results": results,
                "errors": stats.errors
            }, f, indent=2)
        print(f"\nResults saved to: {results_file}")
    
    print("\n" + "=" * 70)
    if dry_run:
        print("DRY RUN COMPLETE - No files were modified")
        print("Run with --execute to apply changes")
    else:
        print("UPDATE COMPLETE")
    print("=" * 70)
    
    return results

if __name__ == "__main__":
    import sys
    
    dry_run = "--execute" not in sys.argv
    
    if not dry_run:
        print("\n[!] PRODUCTION MODE - Files will be modified!")
        print("    Backups will be created before changes.")
        # Auto-confirm for automated runs
        if "--auto" in sys.argv:
            print("    Auto-confirmed via --auto flag")
        else:
            response = input("\n    Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Aborted.")
                sys.exit(0)
    
    run_update(dry_run=dry_run)
