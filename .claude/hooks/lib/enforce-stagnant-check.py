#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Stagnant Engine Check at Session Start
Fires on PreToolUse for Read (first tool call of session reads HANDOFF/digest).

Checks the persistent unwired-engines-ledger.json for engines that have been
sitting unwired across multiple sessions. Warns with the full list so they
get addressed instead of forgotten.

This is THE permanent fix for: build → forget to wire → rebuild months later.
The ledger survives compaction, session changes, everything.
"""
import json
import sys
import os

LEDGER_FILE = "H:/prism/state/unwired-engines-ledger.json"
STATE_FILE = "H:/prism/state/stagnant-check-done.json"

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    # Only fire ONCE per session (check state file)
    today = __import__('datetime').datetime.now().strftime("%Y-%m-%d")
    try:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
            if state.get("date") == today and state.get("checked"):
                print(json.dumps({"continue": True}))
                return
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    # Mark as checked for today
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump({"date": today, "checked": True}, f)

    # Load ledger
    if not os.path.exists(LEDGER_FILE):
        print(json.dumps({"continue": True}))
        return

    try:
        with open(LEDGER_FILE, 'r', encoding='utf-8') as f:
            ledger = json.load(f)
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    unwired = []
    for eng_name, info in ledger.get("engines", {}).items():
        if info.get("status") == "unwired":
            sessions = info.get("sessions_stagnant", 0)
            created = info.get("created", "unknown")
            unwired.append(f"  {eng_name} — stagnant {sessions} session(s), created {created[:10]}")

    if unwired:
        engine_list = "\\n".join(unwired)
        msg = (
            f"STAGNANT ENGINE ALERT: {len(unwired)} engine(s) built but NEVER WIRED:\\n"
            f"{engine_list}\\n"
            f"These engines exist in the codebase but no dispatcher or pipeline calls them. "
            f"Options: (1) wire them now, (2) mark as intentionally standalone, (3) remove if obsolete. "
            f"Check with /trace [engine] or /forge-wiring to verify status."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
