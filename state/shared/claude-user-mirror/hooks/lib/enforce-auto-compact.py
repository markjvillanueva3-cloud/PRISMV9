#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Auto-Compact Trigger
Fires on PostToolUse for Write|Edit.

Tracks source file edits. When thresholds are reached, injects a
system message telling Claude to run /compact NOW — not asking,
TELLING. This makes compaction automatic during autopilot execution.

Thresholds:
  - 20 edits: inject "Run /compact soon after current unit"
  - 40 edits: inject "Run /compact NOW — context quality degrading"
  - 55 edits: inject "MANDATORY /compact — quality at risk, stop and compact"

Also checks if we're past a roadmap compaction marker by counting
engines written (proxy for units completed — each unit typically
writes 1-2 engine files).
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "C:/PRISM/state/auto-compact-tracker.json"

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "session_date": "",
            "src_edits": 0,
            "engines_written": 0,
            "last_compact_at_edit": 0,
            "compact_reminders_sent": 0,
        }

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_input = input_data.get("tool_input", {})
    tool_response = input_data.get("tool_response", {})
    file_path = (tool_input.get("file_path", "") or
                 (tool_response.get("filePath", "") if isinstance(tool_response, dict) else ""))
    file_path = file_path.replace("\\", "/")

    # Track src/, tests/, AND hook edits (all represent real work)
    if "/src/" not in file_path and "/tests/" not in file_path and "/hooks/" not in file_path:
        print(json.dumps({"continue": True}))
        return

    state = load_state()
    today = datetime.now().strftime("%Y-%m-%d")

    if state.get("session_date") != today:
        state = {
            "session_date": today,
            "src_edits": 0,
            "engines_written": 0,
            "last_compact_at_edit": 0,
            "compact_reminders_sent": 0,
        }

    state["src_edits"] += 1
    edits = state["src_edits"]
    edits_since_compact = edits - state.get("last_compact_at_edit", 0)

    # Track engine writes as proxy for units completed
    if "src/engines/" in file_path and file_path.endswith(".ts") and ".test." not in file_path:
        state["engines_written"] = state.get("engines_written", 0) + 1

    save_state(state)

    # Auto-compact triggers based on edits since last compact
    # Tier 1: WARN at 15 edits (once)
    # Tier 2: WARN at 25 edits (once)
    # Tier 3: BLOCK at 35+ edits — no more edits until /compact runs
    if edits_since_compact >= 35:
        msg = (
            "COMPACTION BLOCKED: 35+ source edits since last compaction. "
            "This edit is REJECTED. Run /compact NOW, then /startup to continue. "
            "Roadmap design principle #1: micro-sessions of 2-3 units, then compact."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
    elif edits_since_compact >= 25:
        if state.get("compact_reminders_sent", 0) < 2:
            state["compact_reminders_sent"] = 2
            save_state(state)
        msg = (
            "COMPACT NOW: 25+ source edits since last compaction. "
            "Finish the current unit and run /compact IMMEDIATELY. "
            "Next edit threshold (35) will BLOCK all further edits."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": msg
            }
        }))
    elif edits_since_compact >= 15:
        if state.get("compact_reminders_sent", 0) < 1:
            state["compact_reminders_sent"] = 1
            save_state(state)
            msg = (
                "Compact reminder: 15+ edits since last compaction. "
                "Plan to /compact after completing the current unit."
            )
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": msg
                }
            }))
        else:
            print(json.dumps({"continue": True}))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
