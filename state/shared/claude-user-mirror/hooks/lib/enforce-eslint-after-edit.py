#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Auto-run ESLint after TypeScript edits.
Fires on PostToolUse for Write|Edit.

Runs eslint on the edited file and surfaces errors as additionalContext.
Claude MUST see these errors and cannot skip them.
"""
import json
import sys
import subprocess
import os


def main():
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        print(json.dumps({"continue": True}))
        return

    file_path = data.get("tool_input", {}).get("file_path", "").replace("\\", "/")

    # Only lint TypeScript files in mcp-server/src/
    if not file_path.endswith(".ts") or "mcp-server/src/" not in file_path:
        print(json.dumps({"continue": True}))
        return

    # Skip test files — they have different rules
    if ".test." in file_path or "__tests__" in file_path:
        print(json.dumps({"continue": True}))
        return

    # Check if eslint config exists
    eslint_config = "C:/PRISM/mcp-server/eslint.config.js"
    eslint_rc = "C:/PRISM/mcp-server/.eslintrc.json"
    if not os.path.exists(eslint_config) and not os.path.exists(eslint_rc):
        # No eslint config — skip silently
        print(json.dumps({"continue": True}))
        return

    try:
        result = subprocess.run(
            ["npx", "eslint", "--no-warn-ignored", "--format", "compact", file_path],
            capture_output=True,
            text=True,
            cwd="C:/PRISM/mcp-server",
            timeout=20,
        )
        if result.returncode != 0:
            errors = (result.stdout + result.stderr).strip()[:400]
            if errors:
                print(json.dumps({
                    "hookSpecificOutput": {
                        "hookEventName": "PostToolUse",
                        "additionalContext": f"ESLINT ERRORS in {os.path.basename(file_path)}: {errors}"
                    }
                }))
                return
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
