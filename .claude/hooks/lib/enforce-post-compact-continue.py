#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Post-Compact Continuation Failsafe
Fires on PreToolUse for ALL tools (Read|Write|Edit|Grep|Glob).

Checks if a compaction JUST happened (state file set by compact process).
If yes, injects an advisory message urging /startup execution
before any other work happens (warn, not block — needs to allow HANDOFF reads).

The flow:
1. /compact runs → sets state/compact-just-happened.json
2. Next tool call (any) → THIS hook fires
3. Hook sees compact-just-happened → injects "RUN /startup NOW"
4. After /startup runs → clears the flag
5. Normal work resumes

This is the FAILSAFE for auto-continue. The PostCompact hook is the primary
mechanism, but if that gets ignored, THIS catches it on the next tool call.
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "H:/prism/state/compact-just-happened.json"

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    # Check if compaction just happened
    if not os.path.exists(STATE_FILE):
        print(json.dumps({"continue": True}))
        return

    try:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    if not state.get("compact_happened"):
        print(json.dumps({"continue": True}))
        return

    # Check flag age — auto-expire after 120 seconds (stale from previous session)
    try:
        flag_time = datetime.fromisoformat(state.get("timestamp", "2000-01-01"))
        age_seconds = (datetime.now() - flag_time).total_seconds()
        if age_seconds > 120:
            os.remove(STATE_FILE)
            print(json.dumps({"continue": True}))
            return
    except Exception:
        pass

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Allow: reading ANY state/config file (startup needs these)
    allowed_reads = ["HANDOFF", "CURRENT_POSITION", "COMPACTION_SURVIVAL", "MEMORY.md",
                     "roadmap-index", "settings.json", "CAMX-RESTRUCTURED-ROADMAP",
                     "build-queue", "CLAUDE.md", "scout"]
    if tool_name == "Read" and any(pattern in file_path for pattern in allowed_reads):
        os.remove(STATE_FILE)
        print(json.dumps({"continue": True}))
        return

    # Allow Glob/Grep (needed for orientation after compaction)
    if tool_name in ("Glob", "Grep"):
        print(json.dumps({"continue": True}))
        return

    # Allow Bash (needed for git status, builds, etc.)
    if tool_name == "Bash":
        print(json.dumps({"continue": True}))
        return

    # For Edit/Write: WARN but don't block. Clear flag so it only warns once.
    # Blocking edits caused repeated false positives in previous sessions.
    os.remove(STATE_FILE)
    print(json.dumps({
        "decision": "approve",
        "reason": (
            "POST-COMPACT REMINDER: Compaction just happened. "
            "If you haven't already, read H:/prism/state/HANDOFF.md for resume context."
        ),
    }))

if __name__ == "__main__":
    main()
