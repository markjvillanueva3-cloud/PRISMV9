#!/usr/bin/env python3
"""PRISM Session Start Protocol - Read state and announce session start."""

import json
import os
from datetime import datetime
from pathlib import Path

# PRISM paths
LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")
SESSION_LOGS = os.path.join(LOCAL_ROOT, "SESSION_LOGS")

def read_state():
    """Read CURRENT_STATE.json and return parsed data."""
    try:
        with open(STATE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return create_initial_state()
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in state file: {e}")
        return None

def create_initial_state():
    """Create initial state file if none exists."""
    initial = {
        "meta": {
            "lastUpdated": datetime.now().isoformat(),
            "lastSessionId": None,
            "nextSessionId": "1.A.1"
        },
        "currentWork": {
            "phase": "EXTRACTION",
            "stage": 1,
            "focus": "Extract Materials Databases",
            "status": "NOT_STARTED",
            "nextSteps": ["Extract 6 material databases from monolith"],
            "blockers": []
        },
        "extractionProgress": {
            "databases": {"total": 62, "extracted": 0, "categories": {}},
            "engines": {"total": 213, "extracted": 0, "categories": {}},
            "other": {"total": 556, "extracted": 0}
        },
        "completedSessions": [],
        "quickResume": {
            "lastAction": "Initial state created",
            "continueFrom": "Begin extraction phase"
        }
    }
    save_state(initial)
    return initial

def save_state(state):
    """Save state to CURRENT_STATE.json."""
    state["meta"]["lastUpdated"] = datetime.now().isoformat()
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

def get_latest_session_log():
    """Find and read the most recent session log."""
    if not os.path.exists(SESSION_LOGS):
        return None
    logs = sorted(Path(SESSION_LOGS).glob("SESSION_*.md"), reverse=True)
    if logs:
        return logs[0].read_text(encoding='utf-8')[:2000]  # First 2000 chars
    return None

def announce_session_start(state):
    """Print session start announcement."""
    session_id = state["meta"].get("nextSessionId", "UNKNOWN")
    last_session = state["meta"].get("lastSessionId", "None")
    focus = state["currentWork"].get("focus", "Not specified")
    next_steps = state["currentWork"].get("nextSteps", [])
    
    print("=" * 70)
    print(f"STARTING SESSION {session_id}: {focus}")
    print(f"Previous: {last_session} - {state['currentWork'].get('status', 'N/A')}")
    print(f"Focus: {focus}")
    print(f"Next Steps: {', '.join(next_steps[:3])}")
    print("=" * 70)
    
    # Update state to IN_PROGRESS
    state["currentWork"]["status"] = "IN_PROGRESS"
    state["meta"]["lastSessionId"] = session_id
    save_state(state)
    
    return session_id

def main():
    print("\n[PRISM STATE MANAGER] Starting session protocol...\n")
    
    # Step 1: Read state
    state = read_state()
    if state is None:
        print("FATAL: Could not read or create state file")
        return 1
    
    # Step 2: Check folder access
    if not os.path.exists(LOCAL_ROOT):
        print(f"WARNING: Local root not accessible: {LOCAL_ROOT}")
        print("Creating directory structure...")
        os.makedirs(LOCAL_ROOT, exist_ok=True)
        os.makedirs(SESSION_LOGS, exist_ok=True)
    
    # Step 3: Read latest session log
    last_log = get_latest_session_log()
    if last_log:
        print(f"[Previous session log preview]\n{last_log[:500]}...\n")
    
    # Step 4: Announce session start
    session_id = announce_session_start(state)
    
    print(f"\n✓ Session {session_id} started")
    print(f"✓ State file updated: {STATE_FILE}")
    print("\nRemember to update state every 3-5 tool calls!")
    
    return 0

if __name__ == "__main__":
    exit(main())
