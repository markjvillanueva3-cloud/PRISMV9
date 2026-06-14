"""
PRISM Extraction Index Generator v1.0
Scans the monolith for module boundaries and generates extraction index JSON files.

Usage:
    python generate_extraction_index.py <monolith_path> <category>
    python generate_extraction_index.py <monolith_path> databases
    python generate_extraction_index.py <monolith_path> engines --pattern "ENGINE_"

Categories: databases, engines, knowledgeBases, systems, materials, tools, learning, business
"""

import sys
import os
import json
import re
from datetime import datetime

CATEGORY_PATTERNS = {
    "databases": [
        r"(?:const|var|let)\s+(PRISM_\w*(?:DATABASE|DB|DATA)\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*_LOOKUP\w*)\s*=",
    ],
    "engines": [
        r"(?:const|var|let)\s+(PRISM_\w*ENGINE\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*CALCULATOR\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*OPTIMIZER\w*)\s*=",
    ],
    "knowledgeBases": [
        r"(?:const|var|let)\s+(PRISM_\w*KNOWLEDGE\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*RULES\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*EXPERT\w*)\s*=",
    ],
    "systems": [
        r"(?:const|var|let)\s+(PRISM_\w*SYSTEM\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*MANAGER\w*)\s*=",
    ],
    "materials": [
        r"(?:const|var|let)\s+(PRISM_\w*MATERIAL\w*)\s*=",
    ],
    "tools": [
        r"(?:const|var|let)\s+(PRISM_\w*TOOL\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*CUTTING\w*)\s*=",
    ],
    "learning": [
        r"(?:const|var|let)\s+(PRISM_\w*LEARN\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*ADAPT\w*)\s*=",
    ],
    "business": [
        r"(?:const|var|let)\s+(PRISM_\w*QUOTE\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*COST\w*)\s*=",
        r"(?:const|var|let)\s+(PRISM_\w*PRICING\w*)\s*=",
    ],
}


def scan_monolith(filepath, patterns, custom_pattern=None):
    """Scan monolith for module boundaries matching patterns."""
    if custom_pattern:
        compiled = [re.compile(custom_pattern)]
    else:
        compiled = [re.compile(p) for p in patterns]

    found = []
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line_num, line in enumerate(f, 1):
            for pat in compiled:
                match = pat.search(line)
                if match:
                    found.append({
                        "name": match.group(1),
                        "lineStart": line_num,
                        "lineContent": line.strip()[:120],
                    })
                    break

    return found


def estimate_module_end(filepath, start_line, max_lines=5000):
    """Estimate where a module ends by looking for the next module boundary or closing brace."""
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    brace_depth = 0
    started = False
    for i in range(start_line - 1, min(start_line - 1 + max_lines, len(lines))):
        line = lines[i]
        brace_depth += line.count("{") - line.count("}")
        if brace_depth > 0:
            started = True
        if started and brace_depth <= 0:
            return i + 1  # 1-indexed

    # Fallback: return start + estimated size
    return min(start_line + 500, len(lines))


def generate_index(monolith_path, category, custom_pattern=None):
    """Generate extraction index for a category."""
    patterns = CATEGORY_PATTERNS.get(category, [])
    if not patterns and not custom_pattern:
        print(f"Unknown category: {category}")
        print(f"Available: {', '.join(CATEGORY_PATTERNS.keys())}")
        sys.exit(1)

    modules = scan_monolith(monolith_path, patterns, custom_pattern)
    print(f"Found {len(modules)} module boundaries for '{category}'")

    # Estimate end lines
    for mod in modules:
        mod["lineEnd"] = estimate_module_end(monolith_path, mod["lineStart"])
        mod["estimatedLines"] = mod["lineEnd"] - mod["lineStart"] + 1

    # Build index
    index = {
        "name": f"PRISM {category.title()} Extraction Index",
        "version": "1.0.0",
        "generatedAt": datetime.now().isoformat(),
        "sourceMonolith": os.path.basename(monolith_path),
        "category": category,
        "outputDir": f"EXTRACTED/{category}",
        "modules": {},
    }

    for mod in modules:
        index["modules"][mod["name"]] = {
            "file": f"{mod['name']}.js",
            "lineStart": mod["lineStart"],
            "lineEnd": mod["lineEnd"],
            "estimatedLines": mod["estimatedLines"],
            "description": mod["lineContent"],
            "status": "PENDING",
        }

    output_file = f"extraction_index_{category}.json"
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), output_file)
    with open(output_path, "w") as f:
        json.dump(index, f, indent=2)

    print(f"Index written to: {output_path}")
    print(f"Modules found: {len(modules)}")
    for mod in modules:
        print(f"  {mod['name']} (lines {mod['lineStart']}-{mod['lineEnd']}, ~{mod['estimatedLines']} lines)")

    return index


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    monolith = sys.argv[1]
    category = sys.argv[2]
    custom = None
    if "--pattern" in sys.argv:
        idx = sys.argv.index("--pattern")
        custom = sys.argv[idx + 1]

    generate_index(monolith, category, custom)
