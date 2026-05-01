#!/usr/bin/env python3
"""Fix stdout encoding pattern in all scripts."""
import os
from pathlib import Path

scripts = [
    'cache_checker.py',
    'tool_masking.py', 
    'error_preservation.py',
    'todo_manager.py',
    'pattern_variation.py',
    'peak_activator.py'
]

old_pattern = '''import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')'''

new_pattern = '''import sys

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass'''

for script in scripts:
    path = Path(f'C:/PRISM/scripts/{script}')
    if path.exists():
        content = path.read_text(encoding='utf-8')
        
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            path.write_text(content, encoding='utf-8')
            print(f'Fixed: {script}')
        else:
            print(f'Skipped: {script} (pattern not found)')
    else:
        print(f'Missing: {script}')
