#!/usr/bin/env python3
"""PRISM Session End Protocol - Update state and write session log."""

import json
import os
import argparse
from datetime import datetime
from pathlib import Path

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")
SESSION_LOGS = os.path.join(LOCAL_ROOT, "SESSION_LOGS")

def read_state():
    with open(STATE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_state(state):
    state["meta"]["lastUpdated"] = datetime.now().isoformat()
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

def write_session_log(session_id, completed, files_created, issues, next_session, notes):
    """Write detailed session log."""
    os.makedirs(SESSION_LOGS, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    log_file = os.path.join(SESSION_LOGS, f"SESSION_{session_id.replace('.', '_')}_{timestamp}.md")
    
    content = f"""# SESSION {session_id} LOG
## Date: {datetime.now().strftime("%Y-%m-%d %H:%M")}

### Completed Tasks
{chr(10).join(f'- ✓ {task}' for task in completed)}

### Files Created/Modified
{chr(10).join(f'- {f}' for f in files_created) if files_created else '- None'}

### Issues Encountered
{chr(10).join(f'- ⚠ {issue}' for issue in issues) if issues else '- None'}

### Next Session
- ID: {next_session}
- Focus: See CURRENT_STATE.json

### Handoff Notes
{notes if notes else 'No additional notes.'}

---
State file: {STATE_FILE}
"""
    
    with open(log_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return log_file

def announce_completion(session_id, completed, files, next_session):
    """Print session completion announcement."""
    print("=" * 70)
    print(f"COMPLETING SESSION {session_id}")
    print(f"✓ Completed: {', '.join(completed[:5])}")
    if files:
        print(f"✓ Files saved: {len(files)} files to LOCAL")
    print(f"→ Next session: {next_session}")
    print(f"→ State saved to: CURRENT_STATE.json")
    print("=" * 70)
    print("\n📦 Consider uploading to Box for backup/multi-computer access")

def main():
    parser = argparse.ArgumentParser(description='End PRISM development session')
    parser.add_argument('--completed', type=str, required=True, help='Comma-separated completed tasks')
    parser.add_argument('--files', type=str, default='', help='Comma-separated files created')
    parser.add_argument('--issues', type=str, default='', help='Comma-separated issues')
    parser.add_argument('--next', type=str, required=True, help='Next session ID')
    parser.add_argument('--status', type=str, default='COMPLETE', choices=['COMPLETE', 'PAUSED', 'BLOCKED'])
    parser.add_argument('--notes', type=str, default='', help='Handoff notes')
    args = parser.parse_args()
    
    completed = [t.strip() for t in args.completed.split(',') if t.strip()]
    files = [f.strip() for f in args.files.split(',') if f.strip()]
    issues = [i.strip() for i in args.issues.split(',') if i.strip()]
    
    # Read current state
    state = read_state()
    session_id = state["meta"].get("lastSessionId", "UNKNOWN")
    
    # Update state
    state["currentWork"]["status"] = args.status
    state["currentWork"]["nextSteps"] = [f"Continue with session {args.next}"]
    state["meta"]["nextSessionId"] = args.next
    
    # Add to completed sessions
    state["completedSessions"].append({
        "id": session_id,
        "date": datetime.now().isoformat(),
        "status": args.status,
        "tasksCompleted": len(completed)
    })
    
    # Update quick resume
    state["quickResume"] = {
        "lastAction": completed[-1] if completed else "Session ended",
        "continueFrom": f"Start session {args.next}"
    }
    
    save_state(state)
    
    # Write session log
    log_file = write_session_log(session_id, completed, files, issues, args.next, args.notes)
    
    # Announce completion
    announce_completion(session_id, completed, files, args.next)
    
    print(f"\n✓ Session log written: {log_file}")
    return 0

if __name__ == "__main__":
    exit(main())
