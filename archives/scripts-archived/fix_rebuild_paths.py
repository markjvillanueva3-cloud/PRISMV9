#!/usr/bin/env python3
"""Fix all PRISM REBUILD paths to C:\PRISM"""
import os
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# Patterns to replace
PATTERNS = [
    # Full path variations
    (r'C:\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', r'C:\\PRISM'),
    (r'C:/PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', r'C:/PRISM'),
    (r'C:\\\\PRISM REBUILD \(UPLOAD TO BOX OCCASSIONALLY\)', r'C:\\\\PRISM'),
    (r'C:\\\\PRISM REBUILD\.\.\.', r'C:\\\\PRISM'),
    (r'C:\\PRISM REBUILD\.\.\.', r'C:\\PRISM'),
    (r'C:/PRISM REBUILD\.\.\.', r'C:/PRISM'),
    (r'"PRISM REBUILD"', r'"PRISM"'),
    # Box path
    (r'C:\\Users\\Mark Villanueva\\Box\\PRISM REBUILD', r'C:\\PRISM'),
]

def fix_file(filepath):
    """Fix paths in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in PATTERNS:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return filepath, True
        return filepath, False
    except Exception as e:
        return filepath, f"ERROR: {e}"

def main():
    root = r"C:\PRISM\skills-consolidated"
    print(f"Scanning {root}...")
    
    files = []
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if fn.endswith('.md'):
                files.append(os.path.join(dirpath, fn))
    
    print(f"Found {len(files)} markdown files")
    
    updated = 0
    errors = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        results = executor.map(fix_file, files)
        for filepath, result in results:
            if result is True:
                print(f"  [OK] {filepath}")
                updated += 1
            elif result is not False:
                print(f"  [ERR] {filepath}: {result}")
                errors += 1
    
    print(f"\nDone: {updated} files updated, {errors} errors")

if __name__ == "__main__":
    main()
