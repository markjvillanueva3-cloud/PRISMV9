#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Test Quality Checker (replaces prompt hook)
Fires on PostToolUse for Write|Edit.

Checks if file is a test file. If not, silently continues.
If yes, checks for anti-patterns and BLOCKS.
"""
import json
import sys
import os
import re

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # NOT a test file → silent continue
    if "src/__tests__/" not in file_path and "tests/" not in file_path:
        print(json.dumps({"continue": True}))
        return
    if ".test." not in file_path:
        print(json.dumps({"continue": True}))
        return

    # IS a test file — check for anti-patterns
    real_path = file_path if os.path.exists(file_path) else file_path.replace("/", "\\")
    if not os.path.exists(real_path):
        print(json.dumps({"continue": True}))
        return

    try:
        with open(real_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception:
        print(json.dumps({"continue": True}))
        return

    violations = []

    # Check for || true (always-pass assertions)
    or_true = re.findall(r'\|\|\s*true', content)
    if or_true:
        violations.append(f"{len(or_true)} '|| true' pattern(s) — assertions always pass")

    # Check for expect(true) or expect(1).toBe(1)
    trivial = re.findall(r'expect\s*\(\s*true\s*\)|expect\s*\(\s*1\s*\)\s*\.\s*toBe\s*\(\s*1\s*\)', content)
    if trivial:
        violations.append(f"{len(trivial)} trivially-passing assertion(s)")

    # Check for skip/pending/todo in test descriptions
    skips = re.findall(r'(?:it|test|describe)\s*\.\s*(?:skip|todo)\s*\(', content)
    if skips:
        violations.append(f"{len(skips)} skipped/todo test(s)")

    if violations:
        viol_text = "; ".join(violations)
        print(json.dumps({
            "decision": "block",
            "reason": f"TEST QUALITY VIOLATION in {os.path.basename(file_path)}: {viol_text}. Fix assertions."
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
