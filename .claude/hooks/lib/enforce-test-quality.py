#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Test Quality Checker (strengthened 2026-04-20)

Fires on PostToolUse for Write|Edit. Blocks test files that fail quality gates.

Rules enforced (any violation blocks):
  R1. `|| true` suppression (assertions always pass)
  R2. `expect(true).toBe(true)` or `expect(1).toBe(1)` (trivially passing)
  R3. `.skip` / `.todo` on ALL tests in the file (100% skipped)
  R4. Only bare `.toBeDefined()` assertions (no numeric tolerance or range checks)
  R5. No `describe` structure at all (corrupted or placeholder)
  R6. Zero test cases in a non-empty file

Signals that produce a warning (not a block) — printed to stderr but continue:
  - No `.toBeCloseTo()` for engine files that emit floats
  - Fewer than 3 test cases

Companion: TestQualityAuditEngine classifies existing files as
  REAL / SHALLOW / SYNTHETIC / CORRUPTED.
"""
import json
import sys
import os
import re


# ============================================================================
# DETECTION PATTERNS
# ============================================================================

# R1: || true suppression
RE_OR_TRUE = re.compile(r'\|\|\s*true\b')

# R2: trivially-passing
RE_TRIVIAL_TRUE = re.compile(r'expect\s*\(\s*true\s*\)\s*\.\s*toBe\s*\(\s*true\s*\)')
RE_TRIVIAL_ONE = re.compile(r'expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)')
RE_TRIVIAL_STR = re.compile(r'expect\s*\(\s*[\'"][^\'\"]*[\'"]\s*\)\s*\.\s*toBe\s*\(\s*[\'"][^\'\"]*[\'"]\s*\)')

# R3: skip/todo
RE_SKIP_TODO = re.compile(r'(?:it|test|describe)\s*\.\s*(?:skip|todo)\s*\(')

# Test-case counter — matches it(, it.skip(, test(, test.skip(
RE_IT_BLOCK = re.compile(r'\b(?:it|test)\s*(?:\.\s*(?:skip|todo|only|each))?\s*\(')

# Structure check
RE_DESCRIBE = re.compile(r'\bdescribe\s*\(')

# Assertion shape
RE_BARE_DEFINED = re.compile(r'\.\s*toBeDefined\s*\(\s*\)')
RE_TO_BE_CLOSE_TO = re.compile(r'\.\s*toBeCloseTo\s*\(')
RE_TO_BE_GREATER = re.compile(r'\.\s*toBeGreaterThan(?:OrEqual)?\s*\(')
RE_TO_BE_LESS = re.compile(r'\.\s*toBeLessThan(?:OrEqual)?\s*\(')
RE_TO_BE_EXACT_NUM = re.compile(r'\.\s*toBe\s*\(\s*-?\d+(?:\.\d+)?')
RE_TO_MATCH = re.compile(r'\.\s*to(?:Match|Equal)(?:Object)?\s*\(')
RE_TO_CONTAIN = re.compile(r'\.\s*toContain(?:Equal)?\s*\(')


def is_test_file(file_path):
    """Test files live under src/__tests__/ or tests/ and use .test. naming."""
    normalized = file_path.replace("\\", "/")
    if "src/__tests__/" not in normalized and "tests/" not in normalized:
        return False
    return ".test." in normalized


def load_source(file_path):
    """Read file content tolerating encoding errors."""
    real_path = file_path if os.path.exists(file_path) else file_path.replace("/", "\\")
    if not os.path.exists(real_path):
        return None
    try:
        with open(real_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception:
        return None


def count(pattern, text):
    return len(pattern.findall(text))


def evaluate(content):
    """Return (violations, warnings) tuples for the file."""
    violations = []
    warnings = []

    # Counts
    total_tests = count(RE_IT_BLOCK, content)
    skipped = count(RE_SKIP_TODO, content)
    has_describe = bool(RE_DESCRIBE.search(content))

    or_true = count(RE_OR_TRUE, content)
    trivial = count(RE_TRIVIAL_TRUE, content) + count(RE_TRIVIAL_ONE, content) + count(RE_TRIVIAL_STR, content)

    bare_defined = count(RE_BARE_DEFINED, content)
    numeric_asserts = (
        count(RE_TO_BE_CLOSE_TO, content)
        + count(RE_TO_BE_GREATER, content)
        + count(RE_TO_BE_LESS, content)
        + count(RE_TO_BE_EXACT_NUM, content)
    )
    structural_asserts = count(RE_TO_MATCH, content) + count(RE_TO_CONTAIN, content)

    # R1
    if or_true > 0:
        violations.append(f"{or_true}x '|| true' suppression (R1)")
    # R2
    if trivial > 0:
        violations.append(f"{trivial}x trivial assertion [expect(true).toBe(true) / expect(1).toBe(1)] (R2)")
    # R3
    if total_tests > 0 and skipped == total_tests:
        violations.append(f"all {total_tests} tests use .skip/.todo (R3)")
    # R5 — no describe at all in a file with body
    if not has_describe and len(content.strip()) > 100:
        violations.append("no describe() block (R5 — likely corrupted or placeholder)")
    # R6 — zero test cases
    if has_describe and total_tests == 0:
        violations.append("zero test cases (R6)")
    # R4 — only bare toBeDefined
    if bare_defined > 0 and numeric_asserts == 0 and structural_asserts == 0 and trivial == 0:
        # Only violation if the file has no other meaningful assertions
        violations.append(
            f"only bare toBeDefined() assertions — no numeric/structural checks (R4). "
            "Use .toBeCloseTo(), .toBeGreaterThan(), .toMatchObject() instead."
        )

    # Warnings (not blocking)
    if total_tests > 0 and total_tests < 3:
        warnings.append(f"only {total_tests} test case(s) — minimum 10 per engine per convention")

    return violations, warnings


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception:
        print(json.dumps({"continue": True}))
        return

    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    if not is_test_file(file_path):
        print(json.dumps({"continue": True}))
        return

    content = load_source(file_path)
    if content is None:
        print(json.dumps({"continue": True}))
        return

    violations, warnings = evaluate(content)

    if violations:
        reason_lines = [f"TEST QUALITY BLOCK: {os.path.basename(file_path)}"]
        for v in violations:
            reason_lines.append(f"  • {v}")
        if warnings:
            reason_lines.append("Warnings (non-blocking):")
            for w in warnings:
                reason_lines.append(f"  ~ {w}")
        reason_lines.append("Fix assertions so tests exercise the engine's actual behavior.")
        print(json.dumps({
            "decision": "block",
            "reason": "\n".join(reason_lines),
        }))
        return

    if warnings:
        # Emit to stderr for visibility but continue
        sys.stderr.write(f"[test-quality] {os.path.basename(file_path)}: " + "; ".join(warnings) + "\n")

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
