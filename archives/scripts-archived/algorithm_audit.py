#!/usr/bin/env python3
"""
PRISM Algorithm Audit - Find all algorithm-related content
"""

import os
import re
import json
from collections import defaultdict

MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
EXTRACTED_PATH = r"C:\\PRISM\EXTRACTED"

def scan_monolith_algorithms():
    """Find all algorithm-related patterns in monolith"""
    print("Scanning monolith for ALGORITHM patterns...")
    
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    algorithms = defaultdict(int)
    
    # Pattern 1: PRISM_*ALGORITHM*
    for match in re.finditer(r'PRISM_[A-Z][A-Z0-9_]*ALGORITHM[A-Z0-9_]*', content):
        algorithms[match.group()] += 1
    
    # Pattern 2: ALGORITHM_* constants
    for match in re.finditer(r'ALGORITHM_[A-Z][A-Z0-9_]+', content):
        algorithms[match.group()] += 1
    
    # Pattern 3: *_ALGORITHM patterns
    for match in re.finditer(r'[A-Z][A-Z0-9_]*_ALGORITHM(?:S)?(?:_[A-Z0-9_]+)?', content):
        algorithms[match.group()] += 1
    
    # Pattern 4: AlgorithmEngine, AlgorithmManager etc
    for match in re.finditer(r'[A-Z][a-zA-Z0-9]*Algorithm[A-Za-z0-9]*', content):
        algorithms[match.group()] += 1
    
    # Pattern 5: PRISM_UNIVERSITY_* (educational content)
    for match in re.finditer(r'PRISM_UNIVERSITY[A-Z0-9_]*', content):
        algorithms[match.group()] += 1
    
    # Pattern 6: Specific algorithm types
    algo_keywords = [
        'PSO', 'GENETIC', 'NEURAL', 'BAYESIAN', 'MONTE_CARLO',
        'GRADIENT', 'NEWTON', 'BISECTION', 'SIMPLEX', 'ANNEALING',
        'ACO', 'FIREFLY', 'WHALE', 'GREY_WOLF', 'CUCKOO',
        'KMEANS', 'DBSCAN', 'RANDOM_FOREST', 'SVM', 'KNN',
        'DIJKSTRA', 'ASTAR', 'BFS', 'DFS', 'QUICKSORT', 'MERGESORT',
        'FFT', 'CONVOLUTION', 'INTERPOLATION', 'REGRESSION',
        'KIENZLE', 'TAYLOR', 'MERCHANT', 'JOHNSON_COOK'
    ]
    
    for kw in algo_keywords:
        for match in re.finditer(rf'PRISM_[A-Z0-9_]*{kw}[A-Z0-9_]*', content):
            algorithms[match.group()] += 1
    
    # Pattern 7: Knowledge bases
    for match in re.finditer(r'PRISM_[A-Z0-9_]*_KB', content):
        algorithms[match.group()] += 1
    
    for match in re.finditer(r'PRISM_[A-Z0-9_]*KNOWLEDGE[A-Z0-9_]*', content):
        algorithms[match.group()] += 1
    
    print(f"  Found {len(algorithms)} unique algorithm-related patterns")
    return dict(algorithms)

def scan_extracted():
    """Scan extracted files for algorithm content"""
    print("\nScanning extracted files...")
    
    extracted = {}
    
    for root, dirs, files in os.walk(EXTRACTED_PATH):
        if 'backup' in root.lower():
            continue
        
        for file in files:
            if file.endswith('.js'):
                name = file.replace('.js', '')
                
                # Check if algorithm-related
                is_algo = any(x in name.upper() for x in [
                    'ALGORITHM', 'UNIVERSITY', 'KB', 'KNOWLEDGE',
                    'PSO', 'GENETIC', 'NEURAL', 'BAYESIAN', 'MONTE',
                    'OPTIM', 'ML', 'AI', 'LEARN', 'PREDICT',
                    'KIENZLE', 'TAYLOR', 'MERCHANT', 'PHYSICS'
                ])
                
                if is_algo:
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, EXTRACTED_PATH)
                    
                    try:
                        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.read().split('\n'))
                        
                        extracted[name] = {
                            "path": rel_path,
                            "lines": lines
                        }
                    except:
                        pass
    
    print(f"  Found {len(extracted)} algorithm-related extracted files")
    return extracted

def main():
    print("=" * 70)
    print("PRISM ALGORITHM AUDIT")
    print("=" * 70)
    
    monolith_algos = scan_monolith_algorithms()
    extracted_algos = scan_extracted()
    
    # Filter to significant (>=5 refs)
    significant = {k: v for k, v in monolith_algos.items() if v >= 5}
    
    print("\n" + "=" * 70)
    print("MONOLITH ALGORITHM PATTERNS (>=5 refs)")
    print("=" * 70)
    
    # Categorize
    categories = defaultdict(list)
    
    for name, refs in sorted(significant.items(), key=lambda x: -x[1]):
        if 'UNIVERSITY' in name:
            categories['UNIVERSITY/EDUCATION'].append((name, refs))
        elif 'KB' in name or 'KNOWLEDGE' in name:
            categories['KNOWLEDGE_BASES'].append((name, refs))
        elif any(x in name for x in ['PSO', 'GENETIC', 'ACO', 'FIREFLY', 'WHALE', 'ANNEALING']):
            categories['METAHEURISTIC'].append((name, refs))
        elif any(x in name for x in ['NEURAL', 'DL', 'DEEP', 'CNN', 'RNN', 'LSTM']):
            categories['DEEP_LEARNING'].append((name, refs))
        elif any(x in name for x in ['BAYESIAN', 'MONTE_CARLO', 'PROBABILISTIC']):
            categories['PROBABILISTIC'].append((name, refs))
        elif any(x in name for x in ['KIENZLE', 'TAYLOR', 'MERCHANT', 'JOHNSON', 'CUTTING']):
            categories['PHYSICS_MODELS'].append((name, refs))
        elif any(x in name for x in ['OPTIM', 'GRADIENT', 'NEWTON', 'SIMPLEX']):
            categories['OPTIMIZATION'].append((name, refs))
        elif any(x in name for x in ['CLUSTER', 'KMEANS', 'DBSCAN', 'CLASSIFY']):
            categories['CLUSTERING/CLASSIFICATION'].append((name, refs))
        elif 'ALGORITHM' in name:
            categories['GENERAL_ALGORITHMS'].append((name, refs))
        else:
            categories['OTHER'].append((name, refs))
    
    total_refs = 0
    for cat, items in sorted(categories.items(), key=lambda x: -sum(r for _, r in x[1])):
        cat_refs = sum(r for _, r in items)
        total_refs += cat_refs
        print(f"\n{cat} ({len(items)} items, {cat_refs} total refs):")
        for name, refs in sorted(items, key=lambda x: -x[1])[:15]:
            # Check if extracted
            extracted = "[OK]" if any(name in k for k in extracted_algos.keys()) else "[--]"
            print(f"  {extracted} {refs:4d} refs: {name}")
        if len(items) > 15:
            print(f"  ... and {len(items) - 15} more")
    
    print(f"\n\nTOTAL: {len(significant)} patterns, {total_refs} references")
    
    # Check what's extracted
    print("\n" + "=" * 70)
    print("EXTRACTED ALGORITHM FILES")
    print("=" * 70)
    
    total_lines = 0
    for name, info in sorted(extracted_algos.items(), key=lambda x: -x[1]['lines']):
        print(f"  {info['lines']:5d} lines: {name}")
        total_lines += info['lines']
    
    print(f"\nTOTAL: {len(extracted_algos)} files, {total_lines:,} lines")
    
    # Save report
    report = {
        "monolith_patterns": significant,
        "extracted_files": extracted_algos,
        "categories": {cat: [(n, r) for n, r in items] for cat, items in categories.items()},
        "summary": {
            "monolith_patterns": len(significant),
            "extracted_files": len(extracted_algos),
            "extracted_lines": total_lines
        }
    }
    
    report_path = r"C:\PRISM\mcp-server\audits\algorithm_audit.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n\nReport: {report_path}")

if __name__ == "__main__":
    main()
