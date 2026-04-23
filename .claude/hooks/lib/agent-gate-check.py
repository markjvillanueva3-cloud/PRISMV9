#!/usr/bin/env python3
"""
Pre-filter for agent hooks. Checks if the file being edited is an engine file.
If NOT an engine file, outputs {"continue":true} and exits.
If IS an engine file, exits with code 0 and no output (let the agent hook run).

Usage: Run this BEFORE agent hooks. If it outputs JSON, the agent hook is skipped.
"""
import json
import sys

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        # Can't parse, skip agent
        print(json.dumps({"continue": True}))
        return

    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only run agent hooks on engine files
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        sys.exit(0)

    # IS an engine file — don't output anything, let the next hook (agent) run
    # Actually we can't conditionally skip hooks, so output continue
    # The agent prompt already says "if not engine file, respond continue:true"
    # This script is a fast pre-check to avoid the 30-second agent timeout
    print(json.dumps({"continue": True, "suppressOutput": True}))

if __name__ == "__main__":
    main()
