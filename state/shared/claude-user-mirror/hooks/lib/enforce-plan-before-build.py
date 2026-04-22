#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Plan Before Build
Fires on PreToolUse for Write to src/engines/*.ts (new engine creation only).

Checks if a plan was documented before creating a new engine.
Plans are tracked in C:/PRISM/state/active-plan.json.

BLOCKS new engine creation if no plan exists.
ALLOWS edits to existing engines (bug fixes don't need plans).
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "C:/PRISM/state/active-plan.json"

def load_plan():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only enforce on NEW engine files (Write, not Edit)
    if tool_name != "Write":
        print(json.dumps({"continue": True}))
        return
    if "src/engines/" not in file_path:
        print(json.dumps({"continue": True}))
        return
    if not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    # Check if a plan exists
    plan = load_plan()
    engine_name = os.path.basename(file_path)

    if plan is None:
        msg = (
            f"PLAN REQUIRED before creating new engine {engine_name}. "
            f"Run /plan-build to enter plan mode first. Plan must outline: "
            f"(1) what to build (methods, interfaces), "
            f"(2) which knowledge sources to consult, "
            f"(3) what the machinist-facing output looks like, "
            f"(4) which edge cases and materials to handle, "
            f"(5) which existing engines to wire to. "
            f"After planning, the build proceeds with clear direction."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
        return

    # Plan exists — check if it's for this engine or at least this session
    plan_date = plan.get("date", "")
    today = datetime.now().strftime("%Y-%m-%d")

    if plan_date != today:
        msg = (
            f"STALE PLAN: Plan is from {plan_date}, not today ({today}). "
            f"Run /plan-build to create a fresh plan for {engine_name}."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": msg
            }
        }))
        return

    # Plan is current — allow
    print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
