#!/usr/bin/env python3
"""
PRISM Cache Stability Checker v1.0
Validates prompt prefixes for KV-cache optimization.

Usage:
    py -3 cache_checker.py --audit <file>      # Audit a prompt file for dynamic content
    py -3 cache_checker.py --compare <a> <b>   # Compare two prompts for prefix stability
    py -3 cache_checker.py --report            # Generate cache stability report
"""
import sys

# Only set encoding for direct execution
if __name__ == "__main__":
    import io
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import re
import json
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Any
import argparse

# Patterns that indicate dynamic content (should NOT be in prefix)
DYNAMIC_PATTERNS = [
    (r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', 'ISO timestamp'),
    (r'\d{4}-\d{2}-\d{2}', 'Date'),
    (r'SESSION-\w+-\d+', 'Session ID'),
    (r'SESSION-\d{8}-\d{6}', 'Session timestamp ID'),
    (r'v\d+\.\d+\.\d+', 'Version number'),
    (r'\d+ (skills|agents|hooks|formulas|resources)', 'Dynamic count'),
    (r'(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)', 'Day name'),
    (r'(January|February|March|April|May|June|July|August|September|October|November|December) \d+', 'Month date'),
    (r'Last updated:.*', 'Update timestamp'),
    (r'Created:.*\d{4}', 'Creation timestamp'),
    (r'"lastUpdated":\s*"[^"]+"', 'JSON timestamp field'),
    (r'"version":\s*"[^"]+"', 'JSON version field'),
    (r'"session_id":\s*"[^"]+"', 'JSON session ID'),
]

# Paths
PRISM_ROOT = Path("C:/PRISM")
CACHE_LOG_PATH = PRISM_ROOT / "state" / "CACHE_STABILITY_LOG.json"


def find_dynamic_content(text: str) -> List[Dict[str, Any]]:
    """Find all dynamic content in text that would break cache stability."""
    findings = []
    lines = text.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        for pattern, description in DYNAMIC_PATTERNS:
            matches = re.finditer(pattern, line, re.IGNORECASE)
            for match in matches:
                findings.append({
                    "line": line_num,
                    "column": match.start(),
                    "pattern": description,
                    "match": match.group(),
                    "context": line.strip()[:100]
                })
    
    return findings


def compute_prefix_hash(text: str, prefix_lines: int = 50) -> str:
    """Compute hash of first N lines (the stable prefix)."""
    lines = text.split('\n')[:prefix_lines]
    prefix = '\n'.join(lines)
    return hashlib.sha256(prefix.encode()).hexdigest()[:16]


def compute_stability_score(text: str) -> Tuple[float, Dict]:
    """
    Compute cache stability score (0.0 to 1.0).
    1.0 = perfectly stable (no dynamic content)
    0.0 = highly unstable (lots of dynamic content)
    """
    findings = find_dynamic_content(text)
    total_lines = len(text.split('\n'))
    
    # Score based on:
    # - Number of dynamic items found
    # - Position of dynamic items (earlier = worse)
    
    if not findings:
        return 1.0, {"dynamic_items": 0, "prefix_safe": True}
    
    # Penalize more for items in first 50 lines (the prefix)
    prefix_items = [f for f in findings if f["line"] <= 50]
    suffix_items = [f for f in findings if f["line"] > 50]
    
    # Prefix items are 10x worse
    penalty = (len(prefix_items) * 10 + len(suffix_items)) / max(total_lines, 1)
    score = max(0.0, 1.0 - penalty)
    
    return score, {
        "dynamic_items": len(findings),
        "prefix_items": len(prefix_items),
        "suffix_items": len(suffix_items),
        "prefix_safe": len(prefix_items) == 0
    }


def audit_file(filepath: Path) -> Dict:
    """Audit a file for cache stability."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return {"error": str(e)}
    
    findings = find_dynamic_content(content)
    score, details = compute_stability_score(content)
    prefix_hash = compute_prefix_hash(content)
    
    return {
        "file": str(filepath),
        "lines": len(content.split('\n')),
        "stability_score": score,
        "prefix_hash": prefix_hash,
        "prefix_safe": details["prefix_safe"],
        "dynamic_items_total": details["dynamic_items"],
        "dynamic_in_prefix": details["prefix_items"],
        "dynamic_in_suffix": details["suffix_items"],
        "findings": findings[:20]  # Limit to first 20
    }


def compare_prefixes(file_a: Path, file_b: Path, prefix_lines: int = 50) -> Dict:
    """Compare two files to check if prefixes are identical."""
    try:
        with open(file_a, 'r', encoding='utf-8') as f:
            content_a = f.read()
        with open(file_b, 'r', encoding='utf-8') as f:
            content_b = f.read()
    except Exception as e:
        return {"error": str(e)}
    
    lines_a = content_a.split('\n')[:prefix_lines]
    lines_b = content_b.split('\n')[:prefix_lines]
    
    hash_a = compute_prefix_hash(content_a, prefix_lines)
    hash_b = compute_prefix_hash(content_b, prefix_lines)
    
    identical = hash_a == hash_b
    
    differences = []
    if not identical:
        for i, (la, lb) in enumerate(zip(lines_a, lines_b)):
            if la != lb:
                differences.append({
                    "line": i + 1,
                    "file_a": la[:80],
                    "file_b": lb[:80]
                })
    
    return {
        "file_a": str(file_a),
        "file_b": str(file_b),
        "prefix_lines_compared": prefix_lines,
        "hash_a": hash_a,
        "hash_b": hash_b,
        "identical": identical,
        "cache_compatible": identical,
        "differences": differences[:10]
    }


def generate_report() -> Dict:
    """Generate overall cache stability report."""
    report = {
        "generated_at": datetime.now().isoformat(),
        "files_audited": [],
        "summary": {
            "total_files": 0,
            "stable_files": 0,
            "unstable_files": 0,
            "average_score": 0.0
        }
    }
    
    # Audit key prompt files
    prompt_files = [
        PRISM_ROOT / "docs" / "GSD_CORE.md",
        PRISM_ROOT / "docs" / "STABLE_PREFIX_TEMPLATE.md",
        PRISM_ROOT / "docs" / "RESOURCE_ACTIVATION_PROTOCOL.md",
    ]
    
    scores = []
    for pf in prompt_files:
        if pf.exists():
            audit = audit_file(pf)
            report["files_audited"].append(audit)
            if "stability_score" in audit:
                scores.append(audit["stability_score"])
    
    report["summary"]["total_files"] = len(report["files_audited"])
    report["summary"]["stable_files"] = sum(1 for a in report["files_audited"] 
                                            if a.get("prefix_safe", False))
    report["summary"]["unstable_files"] = report["summary"]["total_files"] - report["summary"]["stable_files"]
    report["summary"]["average_score"] = sum(scores) / len(scores) if scores else 0.0
    
    return report


def main():
    parser = argparse.ArgumentParser(description="Check cache stability of prompts")
    parser.add_argument("--audit", help="Audit a file for dynamic content")
    parser.add_argument("--compare", nargs=2, help="Compare two files for prefix stability")
    parser.add_argument("--report", action="store_true", help="Generate stability report")
    args = parser.parse_args()
    
    if args.audit:
        result = audit_file(Path(args.audit))
        print(json.dumps(result, indent=2))
        
        if result.get("prefix_safe"):
            print("\n[OK] Prefix is cache-stable")
        else:
            print(f"\n[WARN] {result.get('dynamic_in_prefix', 0)} dynamic items in prefix!")
            print("Consider moving these to the end of the file.")
    
    elif args.compare:
        result = compare_prefixes(Path(args.compare[0]), Path(args.compare[1]))
        print(json.dumps(result, indent=2))
        
        if result.get("identical"):
            print("\n[OK] Prefixes are identical - cache compatible!")
        else:
            print("\n[WARN] Prefixes differ - cache will miss!")
    
    elif args.report:
        result = generate_report()
        print(json.dumps(result, indent=2))
        
        print(f"\n{'='*60}")
        print("CACHE STABILITY SUMMARY")
        print(f"{'='*60}")
        print(f"Files audited: {result['summary']['total_files']}")
        print(f"Stable (prefix safe): {result['summary']['stable_files']}")
        print(f"Unstable: {result['summary']['unstable_files']}")
        print(f"Average score: {result['summary']['average_score']:.2f}")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
