#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Wiring Verification Gate
Fires on Stop/PreCompact events.

Checks if any engines were created/edited this session but NOT wired
to a dispatcher. Blocks compaction until wiring is verified.

Tracks: engine files written → dispatcher files with matching imports.
"""
import json
import sys
import os
import glob
from datetime import datetime

STATE_FILE = "H:/prism/state/session-wiring-tracker.json"
ENGINE_DIR = "H:/prism/mcp-server/src/engines"
DISPATCHER_DIR = "H:/prism/mcp-server/src/tools/dispatchers"

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"engines_written": [], "engines_verified_wired": [], "session_date": ""}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def check_engine_wired(engine_name):
    """Check if engine name appears in any dispatcher file."""
    # Strip .ts extension and Engine suffix for matching
    base_name = engine_name.replace(".ts", "")

    # Search dispatcher files for import/require of this engine
    if not os.path.isdir(DISPATCHER_DIR):
        return True  # Can't check, allow

    for dp_file in glob.glob(os.path.join(DISPATCHER_DIR, "*.ts")):
        try:
            with open(dp_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if base_name in content:
                    return True
        except Exception:
            continue

    # Also check if it's referenced by other engines (indirect wiring)
    for eng_file in glob.glob(os.path.join(ENGINE_DIR, "*.ts")):
        if os.path.basename(eng_file) == engine_name:
            continue
        try:
            with open(eng_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                if base_name in content:
                    return True
        except Exception:
            continue

    return False

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    state = load_state()
    today = datetime.now().strftime("%Y-%m-%d")

    # Reset tracker if new session day
    if state.get("session_date") != today:
        state = {"engines_written": [], "engines_verified_wired": [], "session_date": today}

    engines_written = state.get("engines_written", [])

    if not engines_written:
        save_state(state)
        print(json.dumps({"continue": True}))
        return

    # Check each written engine for wiring
    unwired = []
    for eng in engines_written:
        if eng not in state.get("engines_verified_wired", []):
            if not check_engine_wired(eng):
                unwired.append(eng)
            else:
                state.setdefault("engines_verified_wired", []).append(eng)

    save_state(state)

    if unwired:
        engine_list = ", ".join(unwired)
        msg = (
            f"WIRING GATE BLOCKED: {len(unwired)} engine(s) written this session are NOT wired to any "
            f"dispatcher or referenced by any other engine: [{engine_list}]. "
            f"An unwired engine is dead code. Wire each to a dispatcher action or reference it "
            f"from a pipeline engine BEFORE compacting. Use /trace to verify wiring chains."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
