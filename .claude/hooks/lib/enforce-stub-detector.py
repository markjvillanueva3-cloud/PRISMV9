#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Engine Stub Detector (replaces prompt hook)
Fires on PostToolUse for Write|Edit.

Checks if file is an engine file. If not, silently continues.
If yes, checks for stub patterns and BLOCKS.
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

    # NOT an engine file → silent continue
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    # IS an engine file — check for stubs
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

    stubs = []

    # Check for stub return patterns in method bodies
    stub_returns = re.findall(r'(?:compute|calculate|run|execute|process|analyze|generate)\s*\([^)]*\)[^{]*\{[^}]*return\s+(?:\{\}|null|undefined|\[\]|0|"")\s*;', content, re.DOTALL)
    if stub_returns:
        stubs.append(f"{len(stub_returns)} stub return(s) found (return {{}}/null/undefined/[]/0)")

    # Check for TODO/FIXME/PLACEHOLDER/STUB comments
    todos = re.findall(r'//\s*(?:TODO|FIXME|PLACEHOLDER|STUB|HACK)\b', content, re.IGNORECASE)
    if todos:
        stubs.append(f"{len(todos)} TODO/FIXME/STUB comment(s)")

    # Check for NotImplementedError or throw-only methods
    not_impl = re.findall(r'throw\s+new\s+Error\s*\(\s*["\'](?:not implemented|todo|stub)', content, re.IGNORECASE)
    if not_impl:
        stubs.append(f"{len(not_impl)} 'not implemented' throw(s)")

    if stubs:
        stub_text = "; ".join(stubs)
        print(json.dumps({
            "decision": "block",
            "reason": f"STUB DETECTED in {os.path.basename(file_path)}: {stub_text}. Engines must contain real logic."
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
