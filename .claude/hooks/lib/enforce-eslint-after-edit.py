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

    # Host-portable mcp-server dir: derive it from the edited file's OWN path
    # (always ".../mcp-server/src/...") instead of hardcoding a drive letter.
    # The pre-2026-06-08 hardcode "C:/PRISM/mcp-server" was wrong for this host
    # (live tree is H:/prism after the drive swap; C: holds only .claude config),
    # so the config-exists check below ALWAYS failed and the hook silently no-op'd
    # — i.e. ESLint-after-edit was dead fleet-wide. (HARDWARE-DRIVE-SYNC §eslint-hook)
    mcp_dir = file_path[: file_path.index("mcp-server/") + len("mcp-server")]

    # Real config is eslint.config.mjs (flat config). The old check looked for
    # eslint.config.js / .eslintrc.json — neither exists in this repo, another
    # reason the gate was inert. Accept any of the known flat/legacy config names.
    config_names = ("eslint.config.mjs", "eslint.config.js", "eslint.config.cjs", ".eslintrc.json", ".eslintrc.js")
    if not any(os.path.exists(os.path.join(mcp_dir, c)) for c in config_names):
        # No eslint config found next to the source tree — skip silently.
        print(json.dumps({"continue": True}))
        return

    try:
        result = subprocess.run(
            ["npx", "eslint", "--no-warn-ignored", "--format", "compact", file_path],
            capture_output=True,
            text=True,
            cwd=mcp_dir,
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
