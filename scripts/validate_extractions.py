"""
PRISM Extraction Validator v1.0
Validates extracted modules against their index definitions and template requirements.

Usage:
    python validate_extractions.py                    # Validate all indexed extractions
    python validate_extractions.py --dir EXTRACTED/    # Validate all .js files in directory
    python validate_extractions.py --index <index.json> # Validate specific index
"""

import sys
import os
import json
import re
from pathlib import Path

PROJ_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACTED_DIR = os.path.join(PROJ_ROOT, "EXTRACTED")
SCRIPTS_DIR = os.path.join(PROJ_ROOT, "SCRIPTS")

class ValidationResult:
    def __init__(self, module_name):
        self.module_name = module_name
        self.errors = []
        self.warnings = []
        self.info = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def ok(self, msg):
        self.info.append(msg)

    @property
    def passed(self):
        return len(self.errors) == 0


def validate_module_file(filepath):
    """Validate a single extracted module file."""
    name = os.path.basename(filepath)
    result = ValidationResult(name)

    if not os.path.exists(filepath):
        result.error(f"File not found: {filepath}")
        return result

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
        lines = content.splitlines()

    # Check non-empty
    if len(lines) < 5:
        result.error(f"File too small ({len(lines)} lines)")
        return result
    result.ok(f"{len(lines)} lines")

    # Check for extraction header
    if "Extracted" in content[:500] or "PRISM MODULE" in content[:500]:
        result.ok("Has extraction header")
    else:
        result.warn("Missing extraction header")

    # Check for valid JS content (not empty/placeholder)
    code_lines = [l for l in lines if l.strip() and not l.strip().startswith("//") and not l.strip().startswith("*")]
    if len(code_lines) < 3:
        result.error(f"No substantive code ({len(code_lines)} non-comment lines)")
    else:
        result.ok(f"{len(code_lines)} code lines")

    # Check for PRISM naming convention
    if "PRISM_" in content or "prism" in content.lower():
        result.ok("Contains PRISM identifiers")
    else:
        result.warn("No PRISM identifiers found")

    # Check for exports
    has_exports = ("module.exports" in content or
                   "window." in content or
                   "export " in content)
    if has_exports:
        result.ok("Has exports")
    else:
        result.warn("No export statement found")

    # Check for syntax issues (basic)
    open_braces = content.count("{")
    close_braces = content.count("}")
    if abs(open_braces - close_braces) > 2:
        result.warn(f"Brace mismatch: {open_braces} open, {close_braces} close")

    open_parens = content.count("(")
    close_parens = content.count(")")
    if abs(open_parens - close_parens) > 2:
        result.warn(f"Paren mismatch: {open_parens} open, {close_parens} close")

    return result


def validate_index(index_path):
    """Validate all modules referenced in an extraction index."""
    with open(index_path, "r") as f:
        index = json.load(f)

    output_dir = index.get("outputDir", "EXTRACTED")
    results = []

    for module_name, info in index.get("modules", {}).items():
        filename = info.get("file", f"{module_name}.js")
        filepath = os.path.join(PROJ_ROOT, output_dir, filename)
        result = validate_module_file(filepath)

        # Check line count matches expected range
        expected_lines = info.get("lineEnd", 0) - info.get("lineStart", 0) + 1
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                actual_lines = len(f.readlines())
            # Allow some variance for headers
            if actual_lines < expected_lines - 10:
                result.warn(f"Fewer lines than expected ({actual_lines} vs ~{expected_lines})")
            elif actual_lines > expected_lines + 20:
                result.warn(f"More lines than expected ({actual_lines} vs ~{expected_lines})")
            else:
                result.ok(f"Line count matches expected (~{expected_lines})")

        # Check status
        if info.get("status") == "EXTRACTED":
            if not os.path.exists(filepath):
                result.error(f"Marked EXTRACTED but file missing: {filepath}")
        results.append(result)

    return results


def validate_directory(dirpath):
    """Validate all .js files in a directory tree."""
    results = []
    for root, _dirs, files in os.walk(dirpath):
        for f in sorted(files):
            if f.endswith(".js"):
                results.append(validate_module_file(os.path.join(root, f)))
    return results


def find_all_indexes():
    """Find all extraction_index_*.json files."""
    indexes = []
    for root, _dirs, files in os.walk(SCRIPTS_DIR):
        for f in files:
            if f.startswith("extraction_index") and f.endswith(".json"):
                indexes.append(os.path.join(root, f))
    return indexes


def print_results(results):
    """Print validation results summary."""
    total = len(results)
    passed = sum(1 for r in results if r.passed)
    failed = total - passed

    print(f"\n{'='*60}")
    print(f"PRISM Extraction Validation Report")
    print(f"{'='*60}")
    print(f"Total modules: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"{'='*60}\n")

    for r in results:
        icon = "PASS" if r.passed else "FAIL"
        print(f"[{icon}] {r.module_name}")
        for msg in r.info:
            print(f"       {msg}")
        for msg in r.warnings:
            print(f"  WARN {msg}")
        for msg in r.errors:
            print(f"  ERR  {msg}")
        print()

    return 0 if failed == 0 else 1


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--dir":
        dirpath = sys.argv[2] if len(sys.argv) > 2 else EXTRACTED_DIR
        results = validate_directory(dirpath)
    elif len(sys.argv) > 1 and sys.argv[1] == "--index":
        if len(sys.argv) < 3:
            print("Usage: validate_extractions.py --index <index.json>")
            sys.exit(1)
        results = validate_index(sys.argv[2])
    else:
        # Validate all known indexes
        indexes = find_all_indexes()
        if not indexes:
            print("No extraction index files found in SCRIPTS/")
            # Fall back to directory scan
            if os.path.isdir(EXTRACTED_DIR):
                results = validate_directory(EXTRACTED_DIR)
            else:
                print(f"EXTRACTED/ directory not found at {EXTRACTED_DIR}")
                print("Nothing to validate.")
                sys.exit(0)
        else:
            results = []
            for idx in indexes:
                print(f"Validating index: {os.path.basename(idx)}")
                results.extend(validate_index(idx))

    sys.exit(print_results(results))


if __name__ == "__main__":
    main()
