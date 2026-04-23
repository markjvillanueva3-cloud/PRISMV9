#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Pre-Compact Review Gate
Fires on PreCompact event.

Checks:
1. Were any engines written this session?
2. If yes, was /prism-review run? (tracked by prism-review skill updating state)
3. Were tests written/run for new engines?
4. Were new engines wired to dispatchers?

BLOCKS compaction if critical gates are missed.
"""
import json
import sys
import os
from datetime import datetime

EDIT_STATE = "H:/prism/state/session-edit-counter.json"
WIRING_STATE = "H:/prism/state/session-wiring-tracker.json"

def load_json(path):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    edit_state = load_json(EDIT_STATE)
    wiring_state = load_json(WIRING_STATE)

    issues = []

    # Check 1: Engines written without tests
    engines = edit_state.get("engines_written", [])
    tests = edit_state.get("test_files_written", [])

    if len(engines) > 0 and len(tests) == 0:
        issues.append(
            f"TEST GAP: {len(engines)} engines written ({', '.join(engines[:5])}) "
            f"but 0 test files created. Write tests before compacting."
        )

    # Check 2: Engine edits without review
    edits_since_review = edit_state.get("engine_edits_since_review", 0)
    if edits_since_review >= 3:
        issues.append(
            f"REVIEW SKIPPED: {edits_since_review} engine edits without /prism-review. "
            f"Run /prism-review (3 parallel agents: physics, wiring, test) before compacting."
        )

    # Check 3: Unwired engines (from wiring tracker)
    unwired_engines = []
    for eng in wiring_state.get("engines_written", []):
        if eng not in wiring_state.get("engines_verified_wired", []):
            unwired_engines.append(eng)

    if unwired_engines:
        issues.append(
            f"WIRING GAP: {len(unwired_engines)} engine(s) not verified as wired: "
            f"{', '.join(unwired_engines[:5])}. Use /trace to verify wiring chains."
        )

    if issues:
        combined = "\n".join(issues)
        msg = (
            f"PRE-COMPACT QUALITY GATE BLOCKED — {len(issues)} issue(s) found:\n{combined}\n"
            f"Fix these before compacting. Compaction REJECTED until gates pass."
        )
        print(json.dumps({
            "decision": "block",
            "reason": msg,
        }))
    else:
        # All clear — report clean
        summary = (
            f"Pre-compact gate PASSED: {len(engines)} engines written, "
            f"{len(tests)} test files, wiring verified."
        )
        print(json.dumps({
            "systemMessage": summary,
            "continue": True
        }))

if __name__ == "__main__":
    main()
