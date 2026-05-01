#!/usr/bin/env python3
"""PRISM Quick Analysis - Instant data insights"""

import json
import sys
from pathlib import Path
from collections import Counter

def analyze_json(filepath: str):
    """Analyze any PRISM JSON file."""
    print(f"\n{'='*60}")
    print(f"PRISM Quick Analysis: {filepath}")
    print(f"{'='*60}\n")
    
    with open(filepath) as f:
        data = json.load(f)
    
    if isinstance(data, list):
        records = data
    elif isinstance(data, dict):
        if 'materials' in data:
            records = data['materials']
        elif all(isinstance(v, dict) for v in data.values()):
            records = list(data.values())
        else:
            records = [data]
    else:
        print("Unknown data structure")
        return
    
    if not records:
        print("No records found")
        return
    
    all_fields = set()
    field_counts = Counter()
    
    for record in records:
        if isinstance(record, dict):
            for key in record.keys():
                all_fields.add(key)
                if record[key] is not None and record[key] != '':
                    field_counts[key] += 1
    
    print(f"Total Fields: {len(all_fields)}")
    print(f"Total Records: {len(records)}")
    
    print(f"\n{'Field':<35} {'Present':>8} {'Missing':>8} {'%':>6}")
    print(f"{'-'*35} {'-'*8} {'-'*8} {'-'*6}")
    
    for field in sorted(all_fields, key=lambda x: -field_counts.get(x, 0))[:20]:
        present = field_counts.get(field, 0)
        missing = len(records) - present
        pct = (present / len(records)) * 100
        status = "OK" if pct >= 90 else "WARN" if pct >= 50 else "BAD"
        print(f"{field:<35} {present:>8} {missing:>8} {pct:>5.1f}% {status}")
    
    # Critical machining fields
    critical = ['kc1_1', 'mc', 'density', 'hardness', 'tensile_strength']
    critical_present = [f for f in critical if f in all_fields]
    
    if critical_present:
        print(f"\nCRITICAL MACHINING FIELDS:")
        for field in critical:
            if field in all_fields:
                present = field_counts.get(field, 0)
                pct = (present / len(records)) * 100
                print(f"  {field}: {present}/{len(records)} ({pct:.1f}%)")
    
    # Overall completeness
    total_cells = len(records) * len(all_fields)
    filled_cells = sum(field_counts.values())
    overall_pct = (filled_cells / total_cells) * 100 if total_cells > 0 else 0
    
    print(f"\n{'='*60}")
    print(f"OVERALL COMPLETENESS: {overall_pct:.1f}%")
    print(f"{'='*60}")

def compare_files(file1: str, file2: str):
    """Compare two JSON files."""
    print(f"\nComparing: {file1} vs {file2}")
    
    with open(file1) as f:
        data1 = json.load(f)
    with open(file2) as f:
        data2 = json.load(f)
    
    def to_list(data):
        if isinstance(data, list): return data
        if 'materials' in data: return data['materials']
        return list(data.values())
    
    list1, list2 = to_list(data1), to_list(data2)
    
    print(f"File 1: {len(list1)} records")
    print(f"File 2: {len(list2)} records")
    print(f"Difference: {len(list2) - len(list1):+d}")
    
    ids1 = set(r.get('id', r.get('name')) for r in list1 if isinstance(r, dict))
    ids2 = set(r.get('id', r.get('name')) for r in list2 if isinstance(r, dict))
    
    print(f"Added: {len(ids2 - ids1)}, Removed: {len(ids1 - ids2)}, Common: {len(ids1 & ids2)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python quick_analysis.py <file.json>")
        print("       python quick_analysis.py compare <f1> <f2>")
        sys.exit(1)
    
    if sys.argv[1] == "compare" and len(sys.argv) >= 4:
        compare_files(sys.argv[2], sys.argv[3])
    elif Path(sys.argv[1]).exists():
        analyze_json(sys.argv[1])
    else:
        print(f"File not found: {sys.argv[1]}")
