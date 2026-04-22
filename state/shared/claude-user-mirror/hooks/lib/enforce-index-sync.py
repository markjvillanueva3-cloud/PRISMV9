#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Index Sync Enforcer
Fires on PreCompact.

Checks if any engines were created this session but MASTER_INDEX was NOT updated.
BLOCKS compaction until the index is current.

Also maintains a persistent "built but unwired" ledger at C:/PRISM/state/unwired-engines-ledger.json
that survives compaction. This ledger is THE permanent record of engines that exist
but aren't fully integrated.

EVERY session start should check this ledger and address stagnant engines.
"""
import json
import sys
import os
import glob
from datetime import datetime

WIRING_STATE = "C:/PRISM/state/session-wiring-tracker.json"
LEDGER_FILE = "C:/PRISM/state/unwired-engines-ledger.json"
ENGINE_DIR = "C:/PRISM/mcp-server/src/engines"
DISPATCHER_DIR = "C:/PRISM/mcp-server/src/tools/dispatchers"
MASTER_INDEX = "C:/PRISM/mcp-server/data/docs/MASTER_INDEX_COMPACT.md"
ENGINE_DIGEST = "C:/PRISM/mcp-server/data/docs/ENGINE_DIGEST.md"

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def check_engine_in_index(engine_name, index_path):
    """Check if engine name appears in the index file."""
    base = engine_name.replace(".ts", "")
    if not os.path.exists(index_path):
        return False
    try:
        with open(index_path, 'r', encoding='utf-8', errors='ignore') as f:
            return base in f.read()
    except Exception:
        return False

def check_engine_wired(engine_name):
    """Check if engine is referenced by a dispatcher or another engine."""
    base = engine_name.replace(".ts", "")

    # Check dispatchers
    if os.path.isdir(DISPATCHER_DIR):
        for dp in glob.glob(os.path.join(DISPATCHER_DIR, "*.ts")):
            try:
                with open(dp, 'r', encoding='utf-8', errors='ignore') as f:
                    if base in f.read():
                        return True
            except Exception:
                continue

    # Check other engines
    if os.path.isdir(ENGINE_DIR):
        for eng in glob.glob(os.path.join(ENGINE_DIR, "*.ts")):
            if os.path.basename(eng) == engine_name:
                continue
            try:
                with open(eng, 'r', encoding='utf-8', errors='ignore') as f:
                    if base in f.read():
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

    # Load session wiring tracker
    session_state = load_json(WIRING_STATE)
    engines_written = session_state.get("engines_written", [])

    # Load persistent ledger
    ledger = load_json(LEDGER_FILE)
    if "engines" not in ledger:
        ledger = {"engines": {}, "last_updated": ""}

    issues = []

    # Check engines written THIS session
    for eng in engines_written:
        # Check if wired
        if not check_engine_wired(eng):
            # Add to persistent ledger
            if eng not in ledger["engines"]:
                ledger["engines"][eng] = {
                    "created": datetime.now().isoformat(),
                    "status": "unwired",
                    "sessions_stagnant": 0
                }
            ledger["engines"][eng]["sessions_stagnant"] = ledger["engines"][eng].get("sessions_stagnant", 0) + 1
            issues.append(f"UNWIRED: {eng} — not referenced by any dispatcher or engine")

        # Check if in ENGINE_DIGEST
        if not check_engine_in_index(eng, ENGINE_DIGEST):
            issues.append(f"NOT IN INDEX: {eng} — missing from ENGINE_DIGEST.md")

        # Check if in MASTER_INDEX
        if not check_engine_in_index(eng, MASTER_INDEX):
            issues.append(f"NOT IN MASTER_INDEX: {eng} — missing from MASTER_INDEX_COMPACT.md")

    # Check persistent ledger for STAGNANT engines from previous sessions
    stagnant = []
    for eng_name, info in ledger.get("engines", {}).items():
        if info.get("status") == "unwired":
            sessions = info.get("sessions_stagnant", 0)
            if sessions >= 2:
                stagnant.append(f"{eng_name} (stagnant for {sessions} sessions since {info.get('created', 'unknown')})")
            # Update wiring status — maybe it was wired since last check
            if check_engine_wired(eng_name):
                info["status"] = "wired"

    # Save updated ledger
    ledger["last_updated"] = datetime.now().isoformat()
    save_json(LEDGER_FILE, ledger)

    # Report
    all_issues = []
    if issues:
        all_issues.append(f"THIS SESSION: {len(issues)} issue(s):\\n  " + "\\n  ".join(issues))
    if stagnant:
        all_issues.append(f"STAGNANT ENGINES (from previous sessions): {len(stagnant)} engine(s):\\n  " + "\\n  ".join(stagnant))

    if issues:
        # Current session has unwired/unindexed engines — BLOCK compaction
        msg = (
            f"INDEX SYNC BLOCKED: {len(issues)} issue(s) from this session. "
            + "; ".join(issues)
            + ". Fix: wire engines to dispatchers, update ENGINE_DIGEST.md and MASTER_INDEX_COMPACT.md."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
    elif stagnant:
        # Only stagnant engines from prior sessions — warn but allow
        msg = (
            f"STAGNANT ENGINES from prior sessions: {len(stagnant)} engine(s): "
            + "; ".join(stagnant)
        )
        # PreCompact hooks can't use hookSpecificOutput — use systemMessage
        print(json.dumps({
            "systemMessage": msg,
            "continue": True
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
