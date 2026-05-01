#!/usr/bin/env python3
"""PRISM State Update - Update state during session (every 3-5 tool calls)."""

import json
import os
import argparse
from datetime import datetime

LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")

def read_state():
    with open(STATE_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_state(state):
    state["meta"]["lastUpdated"] = datetime.now().isoformat()
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

def update_extraction_progress(state, category, count):
    """Update extraction progress counters."""
    if category in ['materials', 'machines', 'tools', 'workholding', 'post', 'process', 'business', 'ai_ml', 'cad_cam', 'manufacturer', 'infrastructure']:
        state["extractionProgress"]["databases"]["categories"][category] = count
        total = sum(state["extractionProgress"]["databases"]["categories"].values())
        state["extractionProgress"]["databases"]["extracted"] = total
    elif category.startswith('engine_'):
        engine_type = category.replace('engine_', '')
        if "categories" not in state["extractionProgress"]["engines"]:
            state["extractionProgress"]["engines"]["categories"] = {}
        state["extractionProgress"]["engines"]["categories"][engine_type] = count
        total = sum(state["extractionProgress"]["engines"]["categories"].values())
        state["extractionProgress"]["engines"]["extracted"] = total
    return state

def main():
    parser = argparse.ArgumentParser(description='Update PRISM state during session')
    parser.add_argument('--task', type=str, help='Description of completed task')
    parser.add_argument('--category', type=str, help='Extraction category (e.g., materials, engine_cad)')
    parser.add_argument('--count', type=int, help='Number extracted in category')
    parser.add_argument('--progress', type=int, help='Overall progress percentage')
    parser.add_argument('--blocker', type=str, help='Add a blocker')
    parser.add_argument('--clear-blockers', action='store_true', help='Clear all blockers')
    parser.add_argument('--next-step', type=str, help='Update next step')
    args = parser.parse_args()
    
    state = read_state()
    
    if args.task:
        state["quickResume"]["lastAction"] = args.task
        print(f"✓ Updated last action: {args.task}")
    
    if args.category and args.count is not None:
        state = update_extraction_progress(state, args.category, args.count)
        print(f"✓ Updated {args.category}: {args.count} extracted")
    
    if args.blocker:
        state["currentWork"]["blockers"].append(args.blocker)
        print(f"⚠ Added blocker: {args.blocker}")
    
    if args.clear_blockers:
        state["currentWork"]["blockers"] = []
        print("✓ Cleared all blockers")
    
    if args.next_step:
        state["currentWork"]["nextSteps"] = [args.next_step]
        print(f"✓ Updated next step: {args.next_step}")
    
    save_state(state)
    
    # Show current progress
    db_prog = state["extractionProgress"]["databases"]
    eng_prog = state["extractionProgress"]["engines"]
    print(f"\n[Progress] DBs: {db_prog['extracted']}/{db_prog['total']} | Engines: {eng_prog['extracted']}/{eng_prog['total']}")
    print(f"[State updated at {datetime.now().strftime('%H:%M:%S')}]")
    
    return 0

if __name__ == "__main__":
    exit(main())
