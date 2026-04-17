#!/usr/bin/env python3
"""
Engine Quality Triage Scanner — Phase 0-PRE-1
Scans ALL engine files and classifies: PRODUCTION / PARTIAL / STUB / EMPTY
Also cross-references against MASTER_INDEX categories.

Usage:
  python _audit_engine_quality.py [--json] [--category CATEGORY]

Output: per-engine verdict + per-category scorecard
"""

import os
import re
import json
import sys
from pathlib import Path
from collections import defaultdict

ENGINES_DIR = Path("C:/PRISM/mcp-server/src/engines")
MASTER_INDEX = Path("C:/PRISM/mcp-server/data/docs/MASTER_INDEX.md")
OUTPUT_DIR = Path("C:/PRISM/state/AUDIT")

# Stub detection patterns
STUB_PATTERNS = [
    r'return\s*\{\s*\}',                          # return {}
    r'return\s*\{\s*score:\s*0\.5\s*\}',           # return { score: 0.5 }
    r'return\s*\{\s*result:\s*null\s*\}',           # return { result: null }
    r'return\s*null',                              # return null
    r'throw\s+new\s+Error\(\s*["\']not\s+implemented', # throw new Error('not implemented
    r'TODO|FIXME|PLACEHOLDER|STUB|NOT_IMPLEMENTED',
    r'return\s*\[\s*\]',                           # return []
    r'return\s*["\']["\']',                        # return ''
    r'return\s*0\s*;',                             # return 0;
]

MAGIC_NUMBER_PATTERNS = [
    r'=\s*0\.(?:5|8|9)\s*[;,]',                   # = 0.5; or = 0.8; etc (hardcoded confidence)
    r'confidence:\s*0\.\d+',                       # confidence: 0.X without computation
]

PRODUCTION_INDICATORS = [
    r'Math\.',                                     # Real math operations
    r'kc1\.?1|KC11|kc_11',                        # Kienzle constants
    r'iso_group|ISO_GROUP|isoGroup',              # Material-aware
    r'import\s+.*constants',                       # Imports canonical constants
    r'import\s+.*physics',                         # Imports physics
    r'switch\s*\(',                                # Decision branching
    r'\.forEach|\.map|\.reduce|\.filter',         # Data processing
    r'for\s*\(|while\s*\(',                       # Loops (computation)
    r'interface\s+\w+Input',                      # Typed input interface
    r'interface\s+\w+Result',                     # Typed result interface
    r'reasoning|justification|formula',           # Self-documenting output
]


def parse_master_index():
    """Parse MASTER_INDEX.md to get engine→category mapping."""
    engine_to_category = {}
    category_engines = defaultdict(list)

    if not MASTER_INDEX.exists():
        return engine_to_category, category_engines

    current_category = "Uncategorized"
    in_engines_section = False

    with open(MASTER_INDEX, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("## 1. Engines"):
                in_engines_section = True
                continue
            if in_engines_section and line.startswith("## 2."):
                break
            if in_engines_section and line.startswith("### "):
                # Extract category name (remove count in parens)
                cat = re.sub(r'\s*\(\d+\)\s*$', '', line[4:]).strip()
                current_category = cat
            elif in_engines_section and line.startswith("- "):
                engine_name = line[2:].strip()
                engine_to_category[engine_name] = current_category
                category_engines[current_category].append(engine_name)

    return engine_to_category, category_engines


def analyze_engine(filepath):
    """Analyze a single engine file and return verdict + details."""
    try:
        content = filepath.read_text(encoding="utf-8")
    except Exception as e:
        return {"verdict": "ERROR", "reason": str(e), "loc": 0}

    lines = content.split("\n")
    loc = len([l for l in lines if l.strip() and not l.strip().startswith("/") and not l.strip().startswith("*")])

    # Check for class definition
    has_class = bool(re.search(r'export\s+class\s+\w+', content))

    # Check for compute/run/execute methods
    method_pattern = r'(?:compute|run|execute|calculate|analyze|process|generate|evaluate|predict|assess|diagnose|simulate|resolve|recommend|select|optimize|validate|verify|check|inspect|audit|match|find|search|lookup|get|build|create|assemble|format|transform|convert|parse|extract|classify|score|rank|compare|merge|aggregate|compile|render|emit|dispatch|route|orchestrate|coordinate|schedule|plan|estimate|forecast|interpolate|calibrate|compensate|correct|adjust|tune|adapt)\s*\('
    methods = re.findall(method_pattern, content)
    method_count = len(methods)

    # Count meaningful methods (not just getters/setters)
    has_compute = bool(re.search(r'\b(?:compute|calculate|run|execute|analyze|process|generate)\s*\(', content))

    # Check for stub patterns
    stub_hits = []
    for pat in STUB_PATTERNS:
        matches = re.findall(pat, content, re.IGNORECASE)
        if matches:
            stub_hits.extend(matches)

    # Check for production indicators
    prod_hits = []
    for pat in PRODUCTION_INDICATORS:
        matches = re.findall(pat, content)
        if matches:
            prod_hits.append(pat)

    # Check for magic numbers (hardcoded confidence/scores)
    magic_hits = []
    for pat in MAGIC_NUMBER_PATTERNS:
        matches = re.findall(pat, content)
        if matches:
            magic_hits.extend(matches)

    # Count conditional branches (complexity indicator)
    if_count = len(re.findall(r'\bif\s*\(', content))
    ternary_count = len(re.findall(r'\?.*:', content))
    branch_count = if_count + ternary_count

    # Check for imports (dependency richness)
    import_count = len(re.findall(r'^import\s+', content, re.MULTILINE))

    # Check for interface definitions (API richness)
    interface_count = len(re.findall(r'(?:export\s+)?interface\s+\w+', content))

    # Additional indicators missed by v1 (calibrated against human review of 42 engines)
    # v1 had 100% false negative rate on EMPTY — every "EMPTY" was actually PRODUCTION
    has_references = bool(re.search(r'Reference|ISO\s+\d|ASTM|DIN\s+\d|Altintas|Kienzle|Machinery.s Handbook|Sandvik', content, re.IGNORECASE))
    has_material_db = bool(re.search(r'Record<.*,.*>|DB:|DATABASE|MATERIAL_DB|material_db', content))
    has_typed_io = interface_count >= 2  # Input + Output interfaces = structured API
    has_docstring = bool(re.search(r'/\*\*[\s\S]{50,}?\*/', content))  # Substantial JSDoc
    has_exports = len(re.findall(r'export\s+(?:class|function|const|interface)', content))
    has_arithmetic = len(re.findall(r'[\+\-\*/]\s*(?:Math\.|[a-zA-Z_]\w*)', content))
    has_domain_methods = len(re.findall(r'(?:assess|diagnose|predict|simulate|model|analyze|optimize|calculate|compute|evaluate|classify|recommend|select|validate|verify|inspect|calibrate|compensate|estimate|interpolate|converge|iterate|solve|integrate|differentiate|transform|correlate|regress|infer|propagate|decompose|synthesize)\w*\s*\(', content))

    # Composite quality score (0-100)
    quality_score = 0
    quality_score += min(30, loc / 10)  # LOC: max 30 points at 300+ LOC
    quality_score += min(15, branch_count * 1.5)  # Branches: max 15 at 10+
    quality_score += min(10, len(prod_hits) * 2)  # Production indicators: max 10
    quality_score += min(10, interface_count * 2.5)  # Typed interfaces: max 10
    quality_score += min(10, has_arithmetic * 2)  # Arithmetic operations: max 10
    quality_score += 5 if has_references else 0  # Academic/industry references
    quality_score += 5 if has_material_db else 0  # Material database
    quality_score += 5 if has_typed_io else 0  # Structured Input/Output types
    quality_score += 5 if has_domain_methods >= 2 else 0  # Domain-specific methods
    quality_score += 5 if has_docstring else 0  # Substantial documentation

    # Determine verdict using composite score
    verdict = "UNKNOWN"
    reasons = []

    if not has_class and loc < 50 and not has_exports:
        verdict = "EMPTY"
        reasons.append("No class/exports, minimal code")
    elif loc < 60 and branch_count < 2 and interface_count < 2 and not has_references:
        verdict = "STUB"
        reasons.append(f"Minimal file ({loc} LOC, {branch_count} branches, no interfaces)")
    elif len(stub_hits) > 3 and quality_score < 25:
        verdict = "STUB"
        reasons.append(f"Heavy stub patterns ({len(stub_hits)}), low quality score ({quality_score:.0f})")
    elif quality_score >= 55:
        verdict = "PRODUCTION"
        reasons.append(f"High quality score ({quality_score:.0f}/100: {loc} LOC, {branch_count} br, {interface_count} ifaces, {len(prod_hits)} indicators)")
    elif quality_score >= 35:
        verdict = "PARTIAL"
        reasons.append(f"Medium quality score ({quality_score:.0f}/100: {loc} LOC, {branch_count} br, {interface_count} ifaces)")
        if len(magic_hits) > 0:
            reasons.append(f"Has magic numbers: {magic_hits[:3]}")
    elif quality_score >= 20:
        verdict = "PARTIAL"
        reasons.append(f"Low-medium quality ({quality_score:.0f}/100)")
    else:
        verdict = "STUB"
        reasons.append(f"Low quality score ({quality_score:.0f}/100)")

    return {
        "verdict": verdict,
        "loc": loc,
        "methods": method_count,
        "branches": branch_count,
        "imports": import_count,
        "interfaces": interface_count,
        "prod_indicators": len(prod_hits),
        "stub_hits": len(stub_hits),
        "magic_hits": len(magic_hits),
        "reasons": reasons,
    }


def run_triage():
    """Run full triage across all engines."""
    engine_to_cat, cat_engines = parse_master_index()

    # Find all engine files
    engine_files = sorted(ENGINES_DIR.glob("*.ts"))
    # Exclude index.ts
    engine_files = [f for f in engine_files if f.name != "index.ts"]

    results = {}
    category_scores = defaultdict(lambda: {"total": 0, "PRODUCTION": 0, "PARTIAL": 0, "STUB": 0, "EMPTY": 0, "ERROR": 0, "UNKNOWN": 0})

    for filepath in engine_files:
        engine_name = filepath.stem  # e.g., "AdaptiveClearingEngine"
        analysis = analyze_engine(filepath)

        # Get category from MASTER_INDEX
        category = engine_to_cat.get(engine_name, "Uncategorized")
        analysis["category"] = category
        analysis["file"] = filepath.name

        results[engine_name] = analysis

        v = analysis["verdict"]
        category_scores[category]["total"] += 1
        category_scores[category][v] += 1

    # Sort categories by % production (ascending = worst first)
    sorted_cats = sorted(
        category_scores.items(),
        key=lambda x: x[1]["PRODUCTION"] / max(x[1]["total"], 1)
    )

    # Summary
    total = len(results)
    verdicts = defaultdict(int)
    for r in results.values():
        verdicts[r["verdict"]] += 1

    summary = {
        "total_engines": total,
        "verdicts": dict(verdicts),
        "pct_production": round(verdicts["PRODUCTION"] / max(total, 1) * 100, 1),
        "pct_stub_empty": round((verdicts["STUB"] + verdicts["EMPTY"]) / max(total, 1) * 100, 1),
        "categories_scanned": len(category_scores),
    }

    return results, dict(category_scores), sorted_cats, summary


def print_scorecard(category_scores, sorted_cats, summary):
    """Print human-readable scorecard."""
    print("=" * 90)
    print(f"PRISM ENGINE QUALITY TRIAGE — {summary['total_engines']} engines across {summary['categories_scanned']} categories")
    print("=" * 90)
    print(f"\nOverall: {summary['verdicts'].get('PRODUCTION', 0)} PRODUCTION | "
          f"{summary['verdicts'].get('PARTIAL', 0)} PARTIAL | "
          f"{summary['verdicts'].get('STUB', 0)} STUB | "
          f"{summary['verdicts'].get('EMPTY', 0)} EMPTY")
    print(f"         {summary['pct_production']}% production quality | "
          f"{summary['pct_stub_empty']}% stub+empty")
    print()

    print(f"{'Category':<45} {'Total':>5} {'PROD':>5} {'PART':>5} {'STUB':>5} {'EMPT':>5} {'%Real':>6}")
    print("-" * 90)

    for cat, scores in sorted_cats:
        pct = round(scores["PRODUCTION"] / max(scores["total"], 1) * 100)
        print(f"{cat[:44]:<45} {scores['total']:>5} {scores['PRODUCTION']:>5} "
              f"{scores['PARTIAL']:>5} {scores['STUB']:>5} {scores['EMPTY']:>5} {pct:>5}%")

    print("-" * 90)
    print(f"\nPHASE 0-PRE GATE CHECK:")
    stub_pct = summary['pct_stub_empty']
    if stub_pct > 20:
        print(f"  FAIL: {stub_pct}% stub+empty (threshold: <20%)")
    else:
        print(f"  PASS: {stub_pct}% stub+empty (threshold: <20%)")


def save_results(results, category_scores, summary):
    """Save JSON results for downstream sessions."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Full results
    with open(OUTPUT_DIR / "triage-scorecard.json", "w", encoding="utf-8") as f:
        json.dump({
            "summary": summary,
            "category_scores": category_scores,
            "engines": {k: v for k, v in sorted(results.items())},
        }, f, indent=2)

    # Priority queue (categories sorted by quality, worst first)
    priority = []
    for cat, scores in sorted(category_scores.items(),
                               key=lambda x: x[1]["PRODUCTION"] / max(x[1]["total"], 1)):
        if scores["STUB"] + scores["EMPTY"] > 0:
            priority.append({
                "category": cat,
                "total": scores["total"],
                "needs_audit": scores["STUB"] + scores["EMPTY"] + scores["PARTIAL"],
                "stub_count": scores["STUB"],
                "empty_count": scores["EMPTY"],
            })

    with open(OUTPUT_DIR / "priority-queue.json", "w", encoding="utf-8") as f:
        json.dump(priority, f, indent=2)

    print(f"\nSaved: {OUTPUT_DIR / 'triage-scorecard.json'}")
    print(f"Saved: {OUTPUT_DIR / 'priority-queue.json'}")


if __name__ == "__main__":
    json_mode = "--json" in sys.argv

    results, category_scores, sorted_cats, summary = run_triage()

    if json_mode:
        print(json.dumps({"summary": summary, "category_scores": category_scores}, indent=2))
    else:
        print_scorecard(category_scores, sorted_cats, summary)

    save_results(results, category_scores, summary)
