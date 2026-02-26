"""
PRISM State Updater v1.0
Quick updates to CURRENT_STATE.json without loading full file

Usage:
    python update_state.py complete "Task description"
    python update_state.py next "1.A.2" "Extract Materials"
    python update_state.py stats databases 8
    python update_state.py blocker "Waiting for monolith file"
    python update_state.py clear-blocker
"""

import json
import os
import sys
from datetime import datetime

PRISM_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_FILE = os.path.join(PRISM_ROOT, "CURRENT_STATE.json")

def load_state():
    with open(STATE_FILE, 'r') as f:
        return json.load(f)

def save_state(state):
    state['updated'] = datetime.now().isoformat()
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)
    print(f"✅ State updated: {STATE_FILE}")

def add_completed(description):
    """Add item to last_completed"""
    state = load_state()
    entry = f"{datetime.now().strftime('%Y-%m-%d')}: {description}"
    
    if 'last_completed' not in state:
        state['last_completed'] = []
    
    state['last_completed'].insert(0, entry)
    state['last_completed'] = state['last_completed'][:10]  # Keep last 10
    
    save_state(state)
    print(f"Added: {entry}")

def set_next_task(task_id, description):
    """Set the next priority task"""
    state = load_state()
    
    new_task = {
        "id": task_id,
        "task": description,
        "priority": "HIGH"
    }
    
    if 'next_tasks' not in state:
        state['next_tasks'] = []
    
    state['next_tasks'].insert(0, new_task)
    state['current']['phase'] = task_id.rsplit('.', 1)[0] if '.' in task_id else task_id
    
    save_state(state)
    print(f"Next task: {task_id} - {description}")

def update_stats(category, count):
    """Update extraction stats"""
    state = load_state()
    
    totals = {
        'databases': 62,
        'engines': 213,
        'knowledge': 14,
        'systems': 31
    }
    
    total = totals.get(category, 100)
    state['quick_stats'][category] = f"{count}/{total}"
    
    # Recalculate overall
    extracted = int(count) if category == 'databases' else 7
    state['quick_stats']['extracted'] = f"{extracted}/831 modules"
    
    save_state(state)
    print(f"Updated {category}: {count}/{total}")

def set_blocker(description):
    """Set a blocker"""
    state = load_state()
    state['current']['blocker'] = description
    save_state(state)
    print(f"⚠️ Blocker set: {description}")

def clear_blocker():
    """Clear blocker"""
    state = load_state()
    state['current']['blocker'] = None
    save_state(state)
    print("✅ Blocker cleared")

def show_status():
    """Show current status"""
    state = load_state()
    print(f"""
PRISM Status
─────────────────────────────
Phase: {state.get('current', {}).get('phase', 'N/A')}
Focus: {state.get('current', {}).get('focus', 'N/A')}
Blocker: {state.get('current', {}).get('blocker', 'None')}
Stats: {state.get('quick_stats', {}).get('extracted', 'N/A')}
─────────────────────────────
""")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        show_status()
        print(__doc__)
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == 'complete' and len(sys.argv) >= 3:
        add_completed(' '.join(sys.argv[2:]))
    
    elif cmd == 'next' and len(sys.argv) >= 4:
        set_next_task(sys.argv[2], ' '.join(sys.argv[3:]))
    
    elif cmd == 'stats' and len(sys.argv) >= 4:
        update_stats(sys.argv[2], sys.argv[3])
    
    elif cmd == 'blocker' and len(sys.argv) >= 3:
        set_blocker(' '.join(sys.argv[2:]))
    
    elif cmd == 'clear-blocker':
        clear_blocker()
    
    elif cmd == 'status':
        show_status()
    
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
