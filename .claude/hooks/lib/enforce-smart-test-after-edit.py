#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Remind to run affected tests after engine edits.
Fires on PostToolUse for Write|Edit.

After N engine edits without a test run, injects a reminder.
Tracks state in session-test-tracker.json.
"""
import json
import sys
import os
from pathlib import Path

TRACKER = "H:/prism/state/session-test-tracker.json"


def load_tracker():
    try:
        with open(TRACKER, "r") as f:
            return json.load(f)
    except Exception:
        return {"engine_edits_since_test": 0, "edited_files": []}


def save_tracker(t):
    os.makedirs(os.path.dirname(TRACKER), exist_ok=True)
    with open(TRACKER, "w") as f:
        json.dump(t, f, indent=2)


def main():
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        print(json.dumps({"continue": True}))
        return

    tool_name = data.get("tool_name", "")
    file_path = data.get("tool_input", {}).get("file_path", "").replace("\\", "/")

    # Track engine edits
    if file_path.endswith(".ts") and "mcp-server/src/" in file_path and ".test." not in file_path:
        tracker = load_tracker()
        tracker["engine_edits_since_test"] = tracker.get("engine_edits_since_test", 0) + 1
        edited = tracker.get("edited_files", [])
        basename = os.path.basename(file_path)
        if basename not in edited:
            edited.append(basename)
        tracker["edited_files"] = edited[-10:]  # keep last 10
        save_tracker(tracker)

        count = tracker["engine_edits_since_test"]
        if count == 5:
            files = ", ".join(tracker["edited_files"][:5])
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": (
                        f"TEST REMINDER: {count} engine edits without running tests. "
                        f"Edited: {files}. Run affected tests now to catch regressions early."
                    )
                }
            }))
            return
        elif count == 10:
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": (
                        f"TEST WARNING: {count} engine edits without tests! "
                        "Quality is degrading. Run tests NOW before more edits."
                    )
                }
            }))
            return

    # If a test was just run (Bash with vitest/jest), reset counter
    if tool_name == "Bash":
        command = data.get("tool_input", {}).get("command", "")
        if "vitest" in command or "jest" in command or "npm test" in command:
            tracker = load_tracker()
            tracker["engine_edits_since_test"] = 0
            tracker["edited_files"] = []
            save_tracker(tracker)

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
