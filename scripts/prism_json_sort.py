#!/usr/bin/env python3
"""
PRISM JSON Sort Utility v1.0
Ensures consistent JSON key ordering for KV-cache stability.

Usage:
    py -3 prism_json_sort.py <file.json>           # Sort in place
    py -3 prism_json_sort.py <file.json> --check   # Check only, don't modify
    py -3 prism_json_sort.py <directory> --all     # Sort all JSON files
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple
import argparse


def sort_json_keys(obj: Any) -> Any:
    """Recursively sort all keys in a JSON object."""
    if isinstance(obj, dict):
        return {k: sort_json_keys(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [sort_json_keys(item) for item in obj]
    else:
        return obj


def is_sorted(obj: Any) -> bool:
    """Check if all keys in a JSON object are sorted."""
    if isinstance(obj, dict):
        keys = list(obj.keys())
        if keys != sorted(keys):
            return False
        return all(is_sorted(v) for v in obj.values())
    elif isinstance(obj, list):
        return all(is_sorted(item) for item in obj)
    return True


def find_unsorted_keys(obj: Any, path: str = "") -> List[str]:
    """Find all paths with unsorted keys."""
    issues = []
    if isinstance(obj, dict):
        keys = list(obj.keys())
        sorted_keys = sorted(keys)
        if keys != sorted_keys:
            issues.append(f"{path or 'root'}: keys not sorted ({keys} vs {sorted_keys})")
        for k, v in obj.items():
            issues.extend(find_unsorted_keys(v, f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            issues.extend(find_unsorted_keys(item, f"{path}[{i}]"))
    return issues


def process_file(filepath: Path, check_only: bool = False) -> Tuple[bool, str]:
    """Process a single JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            data = json.loads(content)
    except json.JSONDecodeError as e:
        return False, f"Invalid JSON: {e}"
    except Exception as e:
        return False, f"Error reading file: {e}"
    
    # Check if already sorted
    if is_sorted(data):
        return True, "Already sorted"
    
    if check_only:
        issues = find_unsorted_keys(data)
        return False, f"Unsorted keys found:\n  " + "\n  ".join(issues[:10])
    
    # Sort and write
    sorted_data = sort_json_keys(data)
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(sorted_data, f, indent=2, ensure_ascii=False)
        return True, "Sorted successfully"
    except Exception as e:
        return False, f"Error writing file: {e}"


def process_directory(dirpath: Path, check_only: bool = False) -> Dict[str, Tuple[bool, str]]:
    """Process all JSON files in a directory recursively."""
    results = {}
    for filepath in dirpath.rglob("*.json"):
        results[str(filepath)] = process_file(filepath, check_only)
    return results


def main():
    parser = argparse.ArgumentParser(description="Sort JSON keys for KV-cache stability")
    parser.add_argument("path", help="JSON file or directory to process")
    parser.add_argument("--check", action="store_true", help="Check only, don't modify")
    parser.add_argument("--all", action="store_true", help="Process all JSON files in directory")
    args = parser.parse_args()
    
    path = Path(args.path)
    
    if not path.exists():
        print(f"Error: Path not found: {path}")
        sys.exit(1)
    
    if path.is_file():
        success, message = process_file(path, args.check)
        status = "OK" if success else "ISSUE"
        print(f"[{status}] {path}: {message}")
        sys.exit(0 if success else 1)
    
    elif path.is_dir() and args.all:
        results = process_directory(path, args.check)
        
        sorted_count = sum(1 for s, _ in results.values() if s)
        unsorted_count = len(results) - sorted_count
        
        print(f"\n{'='*60}")
        print(f"JSON Sort Report: {path}")
        print(f"{'='*60}")
        print(f"Total files: {len(results)}")
        print(f"Sorted: {sorted_count}")
        print(f"Unsorted: {unsorted_count}")
        print()
        
        if unsorted_count > 0:
            print("Unsorted files:")
            for filepath, (success, message) in results.items():
                if not success:
                    print(f"  - {filepath}")
                    if args.check:
                        print(f"    {message}")
        
        sys.exit(0 if unsorted_count == 0 else 1)
    
    else:
        print("Error: For directories, use --all flag")
        sys.exit(1)


if __name__ == "__main__":
    main()
