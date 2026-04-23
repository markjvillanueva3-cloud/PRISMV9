#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Regression Test Gate
Fires on PostToolUse for Edit to src/engines/*.ts (editing EXISTING engine).

When an existing engine is MODIFIED, checks if test files exist for that engine
and WARNS to run them before continuing. Prevents regressions from going unnoticed.

Also tracks which engines were edited without their tests being run,
Regression blocking at compact time is handled by enforce-review-gate.py (PreCompact).
"""
import json
import sys
import os
import glob

ENGINE_DIR = "H:/prism/mcp-server/src/engines"
TEST_DIRS = [
    "H:/prism/mcp-server/src/__tests__",
    "H:/prism/mcp-server/tests"
]
STATE_FILE = "H:/prism/state/regression-pending.json"

def find_tests_for_engine(engine_name):
    """Find test files that likely test this engine."""
    base = engine_name.replace(".ts", "").replace("Engine", "")
    # Convert CamelCase to kebab and variations
    kebab = ""
    for i, ch in enumerate(base):
        if ch.isupper() and i > 0:
            kebab += "-"
        kebab += ch.lower()

    matches = []
    for test_dir in TEST_DIRS:
        if not os.path.isdir(test_dir):
            continue
        for test_file in glob.glob(os.path.join(test_dir, "**/*.test.ts"), recursive=True):
            test_name = os.path.basename(test_file).lower()
            if kebab in test_name or base.lower() in test_name:
                matches.append(test_file)

        # Also check test file CONTENTS for engine import
        for test_file in glob.glob(os.path.join(test_dir, "**/*.test.ts"), recursive=True):
            try:
                with open(test_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(5000)  # First 5KB
                    if engine_name.replace(".ts", "") in content:
                        if test_file not in matches:
                            matches.append(test_file)
            except Exception:
                continue

    return matches[:5]

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only check EDITS to existing engines (not new Write)
    if tool_name != "Edit":
        print(json.dumps({"continue": True}))
        return
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    engine_name = os.path.basename(file_path)
    tests = find_tests_for_engine(engine_name)

    if tests:
        # Track as pending regression check
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            state = {"pending": {}}

        state["pending"][engine_name] = {
            "tests": [os.path.basename(t) for t in tests],
            "edited_at": __import__('datetime').datetime.now().isoformat()
        }

        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)

        test_list = ", ".join(os.path.basename(t) for t in tests[:3])
        msg = (
            f"REGRESSION CHECK: {engine_name} was modified. "
            f"Existing tests found: {test_list}. "
            f"Run: npx vitest run {' '.join(os.path.basename(t) for t in tests[:3])} "
            f"to verify no regressions before continuing."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
