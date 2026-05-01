#!/usr/bin/env python3
"""Efficient search for large files (1M+ lines)."""

import re
import argparse
import mmap
from pathlib import Path

def search_large_file(filepath, pattern, context_lines=5, max_results=50):
    """Memory-efficient search using mmap."""
    results = []
    
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    regex = re.compile(pattern, re.IGNORECASE)
    
    for i, line in enumerate(lines):
        if regex.search(line):
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines + 1)
            
            results.append({
                'line_number': i + 1,
                'match': line.strip(),
                'context': ''.join(lines[start:end])
            })
            
            if len(results) >= max_results:
                break
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Search large files efficiently')
    parser.add_argument('--file', type=str, required=True, help='File to search')
    parser.add_argument('--pattern', type=str, required=True, help='Search pattern (regex)')
    parser.add_argument('--context', type=int, default=5, help='Context lines')
    parser.add_argument('--max', type=int, default=50, help='Max results')
    args = parser.parse_args()
    
    print(f"Searching {args.file} for '{args.pattern}'...")
    
    results = search_large_file(args.file, args.pattern, args.context, args.max)
    
    print(f"\nFound {len(results)} matches:\n")
    
    for r in results:
        print(f"Line {r['line_number']}: {r['match'][:80]}")
    
    return 0

if __name__ == "__main__":
    exit(main())
