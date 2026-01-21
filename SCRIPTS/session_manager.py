"""
PRISM Session Manager v1.0
Automates session setup, state tracking, and handoff generation

Usage:
    python session_manager.py start <session_id>    - Start new session
    python session_manager.py status                - Show current status
    python session_manager.py end                   - End session and generate handoff
    python session_manager.py verify                - Run verification checks
"""

import sys
import os
import json
from datetime import datetime
import shutil

# Paths
PRISM_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_FILE = os.path.join(PRISM_ROOT, "CURRENT_STATE.json")
SESSIONS_DIR = os.path.join(PRISM_ROOT, "SESSION_LOGS")
TEMPLATE_FILE = os.path.join(PRISM_ROOT, "SCRIPTS", "session_handoff_template.json")

def load_state():
    """Load current state or create default"""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    return create_default_state()

def save_state(state):
    """Save current state"""
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)
    print(f"✅ State saved to {STATE_FILE}")

def create_default_state():
    """Create default state file"""
    return {
        "version": "1.0.0",
        "lastUpdated": datetime.now().isoformat(),
        "currentSession": None,
        "prism": {
            "sourceVersion": "8.89.002",
            "targetVersion": "9.0.0",
            "monolithLines": 986000
        },
        "extraction": {
            "stage": "1",
            "phase": "A",
            "progress": {
                "databases": {"total": 62, "extracted": 7, "verified": 7},
                "engines": {"total": 213, "extracted": 0, "verified": 0},
                "knowledgeBases": {"total": 14, "extracted": 0, "verified": 0},
                "systems": {"total": 31, "extracted": 0, "verified": 0}
            }
        },
        "history": []
    }

def start_session(session_id):
    """Start a new session"""
    state = load_state()
    
    if state.get("currentSession"):
        print(f"⚠️  Session {state['currentSession']['id']} already in progress!")
        print("   Run 'python session_manager.py end' first.")
        return
    
    session = {
        "id": session_id,
        "startTime": datetime.now().isoformat(),
        "endTime": None,
        "completedItems": [],
        "filesCreated": [],
        "filesModified": [],
        "notes": []
    }
    
    state["currentSession"] = session
    state["lastUpdated"] = datetime.now().isoformat()
    save_state(state)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║            PRISM SESSION STARTED                              ║
╠══════════════════════════════════════════════════════════════╣
║  Session ID:  {session_id:<46} ║
║  Start Time:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<46} ║
╠══════════════════════════════════════════════════════════════╣
║  Current Stage: {state['extraction']['stage']}.{state['extraction']['phase']:<42} ║
║  Databases:     {state['extraction']['progress']['databases']['extracted']}/{state['extraction']['progress']['databases']['total']} extracted                                  ║
║  Engines:       {state['extraction']['progress']['engines']['extracted']}/{state['extraction']['progress']['engines']['total']} extracted                                  ║
╚══════════════════════════════════════════════════════════════╝
""")

def show_status():
    """Show current status"""
    state = load_state()
    
    session_info = "No active session"
    if state.get("currentSession"):
        s = state["currentSession"]
        session_info = f"{s['id']} (started {s['startTime'][:16]})"
    
    p = state["extraction"]["progress"]
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║            PRISM EXTRACTION STATUS                            ║
╠══════════════════════════════════════════════════════════════╣
║  Session:       {session_info:<44} ║
║  Last Updated:  {state['lastUpdated'][:19]:<44} ║
╠══════════════════════════════════════════════════════════════╣
║  EXTRACTION PROGRESS                                          ║
║  ────────────────────────────────────────────────────────────║
║  Databases:      {p['databases']['extracted']:3d} / {p['databases']['total']:3d}  ({p['databases']['extracted']/p['databases']['total']*100:5.1f}%)                       ║
║  Engines:        {p['engines']['extracted']:3d} / {p['engines']['total']:3d}  ({p['engines']['extracted']/p['engines']['total']*100:5.1f}%)                       ║
║  Knowledge:      {p['knowledgeBases']['extracted']:3d} / {p['knowledgeBases']['total']:3d}  ({p['knowledgeBases']['extracted']/p['knowledgeBases']['total']*100:5.1f}%)                       ║
║  Systems:        {p['systems']['extracted']:3d} / {p['systems']['total']:3d}  ({p['systems']['extracted']/p['systems']['total']*100:5.1f}%)                       ║
╚══════════════════════════════════════════════════════════════╝
""")

def end_session():
    """End session and generate handoff"""
    state = load_state()
    
    if not state.get("currentSession"):
        print("❌ No active session to end!")
        return
    
    session = state["currentSession"]
    session["endTime"] = datetime.now().isoformat()
    
    # Create session log
    os.makedirs(SESSIONS_DIR, exist_ok=True)
    log_file = os.path.join(SESSIONS_DIR, f"{session['id']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    
    with open(log_file, 'w') as f:
        json.dump(session, f, indent=2)
    
    # Add to history
    state["history"].append({
        "id": session["id"],
        "start": session["startTime"],
        "end": session["endTime"],
        "logFile": log_file
    })
    
    state["currentSession"] = None
    state["lastUpdated"] = datetime.now().isoformat()
    save_state(state)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║            SESSION ENDED                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Session ID:  {session['id']:<46} ║
║  Duration:    {calculate_duration(session['startTime'], session['endTime']):<46} ║
║  Log saved:   {os.path.basename(log_file):<46} ║
╚══════════════════════════════════════════════════════════════╝
""")

def calculate_duration(start, end):
    """Calculate session duration"""
    start_dt = datetime.fromisoformat(start)
    end_dt = datetime.fromisoformat(end)
    duration = end_dt - start_dt
    hours, remainder = divmod(duration.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours}h {minutes}m {seconds}s"

def run_verification():
    """Run verification checks"""
    print("Running verification checks...")
    
    checks = {
        "STATE_FILE_EXISTS": os.path.exists(STATE_FILE),
        "EXTRACTED_DIR_EXISTS": os.path.exists(os.path.join(PRISM_ROOT, "EXTRACTED")),
        "CORE_MACHINES_COMPLETE": len(os.listdir(os.path.join(PRISM_ROOT, "EXTRACTED", "machines", "CORE"))) >= 7 if os.path.exists(os.path.join(PRISM_ROOT, "EXTRACTED", "machines", "CORE")) else False,
        "SCRIPTS_PRESENT": os.path.exists(os.path.join(PRISM_ROOT, "SCRIPTS")),
    }
    
    print("\n Verification Results:")
    print("─" * 50)
    for check, passed in checks.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {check}: {status}")
    
    passed = sum(checks.values())
    total = len(checks)
    print("─" * 50)
    print(f"  Total: {passed}/{total} checks passed")
    
    return all(checks.values())

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        show_status()
        sys.exit(0)
    
    command = sys.argv[1].lower()
    
    if command == "start":
        if len(sys.argv) < 3:
            print("Usage: python session_manager.py start <session_id>")
            sys.exit(1)
        start_session(sys.argv[2])
    
    elif command == "status":
        show_status()
    
    elif command == "end":
        end_session()
    
    elif command == "verify":
        success = run_verification()
        sys.exit(0 if success else 1)
    
    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)
