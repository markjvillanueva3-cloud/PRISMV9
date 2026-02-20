#!/usr/bin/env python3
"""
PRISM Path Consolidation Updater v1.0
=====================================
Parallel path updater using PRISM methodology.

Updates all references from:
  "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)" 
  → "C:\PRISM"

Categories:
  - CRITICAL: scripts, configs, skills (must update)
  - DOCS: documentation (should update)
  - HISTORICAL: logs, session files (optional)

Safety: Creates backups before modification.
"""

import os
import re
import json
import shutil
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Tuple, Set

# Configuration
PRISM_ROOT = Path(r"C:\PRISM")
BACKUP_DIR = PRISM_ROOT / "backups" / f"path_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

# Path patterns to replace (all variations)
OLD_PATTERNS = [
    r"C:\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)",
    r"C:/PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)",
    r"C:\\\\PRISM REBUILD \\(UPLOAD TO BOX OCCASSIONALLY\\)",  # Escaped
    r'C:\\PRISM REBUILD',  # Short form
    r'C:/PRISM REBUILD',   # Forward slash short
    r"PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)",  # Without drive
    r"PRISM REBUILD",      # Shortest form
]

NEW_PATH_WINDOWS = r"C:\PRISM"
NEW_PATH_UNIX = "C:/PRISM"

# File categories
EXTENSIONS_TO_PROCESS = {'.py', '.ts', '.js', '.json', '.md', '.ps1', '.bat', '.yaml', '.yml', '.sh'}
SKIP_DIRS = {'node_modules', '.git', '__pycache__', 'venv', '.venv', 'dist', 'build'}

# Results tracking
results = {
    'updated': [],
    'skipped': [],
    'errors': [],
    'backed_up': []
}

def should_process_file(filepath: Path) -> bool:
    """Check if file should be processed."""
    if filepath.suffix.lower() not in EXTENSIONS_TO_PROCESS:
        return False
    for skip in SKIP_DIRS:
        if skip in filepath.parts:
            return False
    return True

def create_backup(filepath: Path) -> bool:
    """Create backup of file before modification."""
    try:
        rel_path = filepath.relative_to(PRISM_ROOT)
        backup_path = BACKUP_DIR / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(filepath, backup_path)
        results['backed_up'].append(str(filepath))
        return True
    except Exception as e:
        print(f"  ⚠️ Backup failed for {filepath}: {e}")
        return False

def update_file_content(content: str, filepath: Path) -> Tuple[str, int]:
    """
    Update all path references in file content.
    Returns (new_content, replacement_count)
    """
    count = 0
    new_content = content
    
    # Determine replacement based on file type
    if filepath.suffix in {'.json', '.ts', '.js'}:
        # Use escaped backslashes for JSON/JS/TS
        new_path = NEW_PATH_WINDOWS.replace('\\', '\\\\')
    elif filepath.suffix in {'.py', '.sh'}:
        # Use raw strings or forward slashes for Python/shell
        new_path = NEW_PATH_UNIX
    else:
        # Default to Windows path for .md, .bat, .ps1
        new_path = NEW_PATH_WINDOWS
    
    # Apply replacements in order (longest first)
    for pattern in OLD_PATTERNS:
        # Count matches before replacement
        matches = len(re.findall(pattern, new_content, re.IGNORECASE))
        if matches > 0:
            # Replace with appropriate path format
            if '/' in pattern:
                new_content = re.sub(pattern, NEW_PATH_UNIX, new_content, flags=re.IGNORECASE)
            else:
                new_content = re.sub(pattern, new_path, new_content, flags=re.IGNORECASE)
            count += matches
    
    return new_content, count

def process_file(filepath: Path) -> Dict:
    """Process a single file for path updates."""
    result = {
        'path': str(filepath),
        'status': 'skipped',
        'replacements': 0,
        'error': None
    }
    
    try:
        # Read file
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            original_content = f.read()
        
        # Check if file contains old paths
        has_old_path = any(re.search(p, original_content, re.IGNORECASE) for p in OLD_PATTERNS)
        if not has_old_path:
            result['status'] = 'no_match'
            return result
        
        # Update content
        new_content, count = update_file_content(original_content, filepath)
        
        if count > 0:
            # Backup before modifying
            if not create_backup(filepath):
                result['status'] = 'backup_failed'
                return result
            
            # Write updated content
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            result['status'] = 'updated'
            result['replacements'] = count
            results['updated'].append(str(filepath))
        else:
            result['status'] = 'no_changes'
            
    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)
        results['errors'].append({'path': str(filepath), 'error': str(e)})
    
    return result

def find_files_to_process() -> List[Path]:
    """Find all files that need processing."""
    files = []
    for root, dirs, filenames in os.walk(PRISM_ROOT):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for filename in filenames:
            filepath = Path(root) / filename
            if should_process_file(filepath):
                files.append(filepath)
    
    return files

def run_parallel_update(max_workers: int = 8):
    """Run parallel file updates."""
    print("=" * 60)
    print("PRISM Path Consolidation Updater v1.0")
    print("=" * 60)
    print(f"\nOld path: C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)")
    print(f"New path: C:\\PRISM")
    print(f"\nBackup dir: {BACKUP_DIR}")
    
    # Find files
    print(f"\nScanning {PRISM_ROOT}...")
    files = find_files_to_process()
    print(f"Found {len(files)} files to check")
    
    # Create backup directory
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    
    # Process files in parallel
    print(f"\nProcessing with {max_workers} workers...")
    
    update_count = 0
    replacement_count = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_file, f): f for f in files}
        
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            if result['status'] == 'updated':
                update_count += 1
                replacement_count += result['replacements']
                print(f"  ✅ Updated: {result['path']} ({result['replacements']} replacements)")
            elif result['status'] == 'error':
                print(f"  ❌ Error: {result['path']} - {result['error']}")
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Files scanned:    {len(files)}")
    print(f"Files updated:    {update_count}")
    print(f"Total replacements: {replacement_count}")
    print(f"Backups created:  {len(results['backed_up'])}")
    print(f"Errors:           {len(results['errors'])}")
    
    # Save results
    results_file = BACKUP_DIR / "update_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'files_scanned': len(files),
            'files_updated': update_count,
            'total_replacements': replacement_count,
            'updated_files': results['updated'],
            'errors': results['errors']
        }, f, indent=2)
    
    print(f"\nResults saved to: {results_file}")
    
    return update_count, replacement_count

if __name__ == "__main__":
    import sys
    
    # Allow dry run with --dry-run flag
    if "--dry-run" in sys.argv:
        print("DRY RUN MODE - No changes will be made")
        # Just scan and report
        files = find_files_to_process()
        print(f"\nWould process {len(files)} files")
        
        # Check which have old paths
        count = 0
        for f in files:
            try:
                with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
                    content = fp.read()
                if any(re.search(p, content, re.IGNORECASE) for p in OLD_PATTERNS):
                    print(f"  Would update: {f}")
                    count += 1
            except:
                pass
        print(f"\nTotal files to update: {count}")
    else:
        run_parallel_update()
