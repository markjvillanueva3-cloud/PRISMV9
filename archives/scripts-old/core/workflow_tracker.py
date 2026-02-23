#!/usr/bin/env python3
"""
PRISM Workflow Tracker v1.0 — W6.1 Deliverable
Workflow-aware state machine for compaction recovery.

Instead of recovering from "here's what tools you called",
recover from "you were on step 4 of 7 in bug_fix workflow."

Usage:
    python workflow_tracker.py start <type> [--name "description"]
    python workflow_tracker.py step <step_num> [--status done|active|skip]
    python workflow_tracker.py advance [--intent "what to do next"]
    python workflow_tracker.py status
    python workflow_tracker.py complete
    python workflow_tracker.py abort [--reason "why"]
    python workflow_tracker.py recover   # What compaction recovery reads

All output is JSON for MCP consumption.
"""
import json
import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

STATE_DIR = Path(r"C:\PRISM\state")
WORKFLOW_FILE = STATE_DIR / "WORKFLOW_STATE.json"
WORKFLOW_HISTORY = STATE_DIR / "workflow_history.jsonl"

# ── Workflow Templates ──────────────────────────────────────────────────────
TEMPLATES = {
    "session_boot": {
        "steps": [
            {"id": 1, "name": "BOOT", "intent": "prism_dev→session_boot (loads state+GSD+integrity)"},
            {"id": 2, "name": "ANCHOR", "intent": "prism_context→todo_update (anchor current task)"},
        ]
    },
    "bug_fix": {
        "steps": [
            {"id": 1, "name": "IDENTIFY", "intent": "Read error/report, understand the bug"},
            {"id": 2, "name": "LOCATE", "intent": "Search codebase to find relevant code"},
            {"id": 3, "name": "READ", "intent": "Read the specific file(s), understand current logic"},
            {"id": 4, "name": "PLAN", "intent": "State the fix approach (get approval if >50 lines)"},
            {"id": 5, "name": "EDIT", "intent": "Apply the fix via edit_block/str_replace"},
            {"id": 6, "name": "BUILD", "intent": "npm run build, verify clean output"},
            {"id": 7, "name": "VERIFY", "intent": "Test the fix works (smoke test or manual call)"},
        ]
    },
    "feature_implement": {
        "steps": [
            {"id": 1, "name": "BRAINSTORM", "intent": "prism_sp→brainstorm (understand problem space)"},
            {"id": 2, "name": "PLAN", "intent": "prism_sp→plan (concrete steps, get approval)"},
            {"id": 3, "name": "SCAFFOLD", "intent": "Create new files/types if needed"},
            {"id": 4, "name": "IMPLEMENT", "intent": "Write the core logic"},
            {"id": 5, "name": "WIRE", "intent": "Connect to dispatcher/cadence/hooks"},
            {"id": 6, "name": "BUILD", "intent": "npm run build, verify clean output"},
            {"id": 7, "name": "VALIDATE", "intent": "prism_ralph→scrutinize or →loop"},
            {"id": 8, "name": "DOCUMENT", "intent": "Update ACTION_TRACKER, roadmap, memories"},
        ]
    },
    "build_verify": {
        "steps": [
            {"id": 1, "name": "BUILD", "intent": "npm run build (gsd_sync auto-fires)"},
            {"id": 2, "name": "CHECK", "intent": "Verify build output (size, errors, warnings)"},
            {"id": 3, "name": "CHECKPOINT", "intent": "prism_session→state_save + ACTION_TRACKER update"},
        ]
    },
    "code_search_edit": {
        "steps": [
            {"id": 1, "name": "SEARCH", "intent": "Find target code (DC search or code_search)"},
            {"id": 2, "name": "READ", "intent": "Read surrounding context (±20 lines)"},
            {"id": 3, "name": "PLAN", "intent": "State exact change to make"},
            {"id": 4, "name": "EDIT", "intent": "Apply change via edit_block/str_replace"},
            {"id": 5, "name": "VERIFY", "intent": "Re-read to confirm edit applied correctly"},
        ]
    },
    "validation": {
        "steps": [
            {"id": 1, "name": "SAFETY", "intent": "prism_validate→safety (S(x)≥0.70 gate)"},
            {"id": 2, "name": "SCRUTINIZE", "intent": "prism_ralph→scrutinize (single validator)"},
            {"id": 3, "name": "FULL", "intent": "prism_ralph→loop (4-phase validation) [optional]"},
            {"id": 4, "name": "ASSESS", "intent": "prism_ralph→assess + prism_omega→compute [release]"},
        ]
    },
    "refactor": {
        "steps": [
            {"id": 1, "name": "AUDIT", "intent": "Read current code, identify what needs changing"},
            {"id": 2, "name": "PLAN", "intent": "Define refactor scope and approach"},
            {"id": 3, "name": "EXTRACT", "intent": "Move/rename/split code as planned"},
            {"id": 4, "name": "REWIRE", "intent": "Update imports, references, dispatchers"},
            {"id": 5, "name": "BUILD", "intent": "npm run build, verify clean"},
            {"id": 6, "name": "TEST", "intent": "Verify functionality preserved"},
        ]
    },
}


# ── Core State Machine ──────────────────────────────────────────────────────

def _load_state():
    """Load current workflow state."""
    if WORKFLOW_FILE.exists():
        try:
            return json.loads(WORKFLOW_FILE.read_text(encoding="utf-8"))
        except:
            pass
    return None

def _save_state(state):
    """Save workflow state. Atomic write."""
    WORKFLOW_FILE.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")

def _log_history(event_type, state, extra=None):
    """Append to workflow history log."""
    entry = {
        "ts": datetime.now().isoformat(),
        "event": event_type,
        "workflow_id": state.get("workflow_id", "?"),
        "workflow_type": state.get("workflow_type", "?"),
        "current_step": state.get("current_step", 0),
        "total_steps": state.get("total_steps", 0),
    }
    if extra:
        entry.update(extra)
    with open(WORKFLOW_HISTORY, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, default=str) + "\n")


def start_workflow(workflow_type, name=None, custom_steps=None):
    """Start a new workflow. Returns workflow state."""
    if workflow_type not in TEMPLATES and not custom_steps:
        return {"error": f"Unknown workflow type: {workflow_type}", "available": list(TEMPLATES.keys())}
    
    template = TEMPLATES.get(workflow_type, {})
    steps = custom_steps or template.get("steps", [])
    
    # Build step entries with status tracking
    step_entries = []
    for s in steps:
        step_entries.append({
            "id": s["id"],
            "name": s["name"],
            "intent": s["intent"],
            "status": "pending",       # pending | active | done | skipped
            "started_at": None,
            "completed_at": None,
            "files_touched": [],
            "notes": None,
        })
    
    # Mark step 1 as active
    if step_entries:
        step_entries[0]["status"] = "active"
        step_entries[0]["started_at"] = datetime.now().isoformat()
    
    state = {
        "workflow_id": f"WF-{int(datetime.now().timestamp())}",
        "workflow_type": workflow_type,
        "name": name or f"{workflow_type} workflow",
        "total_steps": len(step_entries),
        "current_step": 1,
        "steps": step_entries,
        "started_at": datetime.now().isoformat(),
        "last_step_at": datetime.now().isoformat(),
        "status": "active",            # active | completed | aborted
    }
    
    _save_state(state)
    _log_history("started", state)
    return state


def advance_step(intent_override=None, files_touched=None, notes=None):
    """Mark current step done, advance to next. Returns updated state."""
    state = _load_state()
    if not state or state.get("status") != "active":
        return {"error": "No active workflow", "hint": "Call start_workflow first"}
    
    current = state["current_step"]
    steps = state["steps"]
    
    # Mark current step done
    if 0 < current <= len(steps):
        idx = current - 1
        steps[idx]["status"] = "done"
        steps[idx]["completed_at"] = datetime.now().isoformat()
        if files_touched:
            steps[idx]["files_touched"] = files_touched
        if notes:
            steps[idx]["notes"] = notes
    
    # Advance to next
    next_step = current + 1
    if next_step > len(steps):
        # Workflow complete
        state["current_step"] = current
        state["status"] = "completed"
        state["completed_at"] = datetime.now().isoformat()
        _save_state(state)
        _log_history("completed", state)
        return state
    
    # Activate next step
    state["current_step"] = next_step
    state["last_step_at"] = datetime.now().isoformat()
    steps[next_step - 1]["status"] = "active"
    steps[next_step - 1]["started_at"] = datetime.now().isoformat()
    if intent_override:
        steps[next_step - 1]["intent"] = intent_override
    
    _save_state(state)
    _log_history("advanced", state, {"from_step": current, "to_step": next_step})
    return state


def update_step(step_num=None, status=None, intent=None, files=None, notes=None):
    """Update a specific step without advancing."""
    state = _load_state()
    if not state:
        return {"error": "No active workflow"}
    
    idx = (step_num or state["current_step"]) - 1
    if idx < 0 or idx >= len(state["steps"]):
        return {"error": f"Invalid step {step_num}"}
    
    if status:
        state["steps"][idx]["status"] = status
    if intent:
        state["steps"][idx]["intent"] = intent
    if files:
        existing = state["steps"][idx].get("files_touched", [])
        state["steps"][idx]["files_touched"] = list(set(existing + files))
    if notes:
        state["steps"][idx]["notes"] = notes
    
    _save_state(state)
    return state


def complete_workflow():
    """Mark workflow as completed."""
    state = _load_state()
    if not state:
        return {"error": "No active workflow"}
    
    # Mark any remaining active steps as done
    for s in state["steps"]:
        if s["status"] == "active":
            s["status"] = "done"
            s["completed_at"] = datetime.now().isoformat()
    
    state["status"] = "completed"
    state["completed_at"] = datetime.now().isoformat()
    _save_state(state)
    _log_history("completed", state)
    return state


def abort_workflow(reason=None):
    """Abort workflow with optional reason."""
    state = _load_state()
    if not state:
        return {"error": "No active workflow"}
    
    state["status"] = "aborted"
    state["aborted_at"] = datetime.now().isoformat()
    state["abort_reason"] = reason
    _save_state(state)
    _log_history("aborted", state, {"reason": reason})
    return state


def get_recovery_context():
    """
    THE KEY FUNCTION — called by compaction recovery.
    Returns exactly what the LLM needs to resume work:
    - What workflow type
    - Which step you're on (N of M)
    - What that step's intent is (what to do)
    - What steps are already done (don't redo)
    - What steps remain (what's coming)
    """
    state = _load_state()
    if not state or state.get("status") != "active":
        return {
            "has_active_workflow": False,
            "instruction": "No active workflow. Check quick_resume and ACTION_TRACKER for context.",
        }
    
    current = state["current_step"]
    total = state["total_steps"]
    steps = state["steps"]
    current_step = steps[current - 1] if current <= len(steps) else None
    
    # Build done/remaining summaries
    done_steps = [f"Step {s['id']}: {s['name']} ✅" + (f" ({s['notes']})" if s.get('notes') else "")
                  for s in steps if s["status"] == "done"]
    remaining_steps = [f"Step {s['id']}: {s['name']} — {s['intent']}"
                       for s in steps if s["status"] in ("pending", "active")]
    files_touched = []
    for s in steps:
        files_touched.extend(s.get("files_touched", []))
    files_touched = list(set(files_touched))
    
    return {
        "has_active_workflow": True,
        "workflow_type": state["workflow_type"],
        "workflow_name": state.get("name", ""),
        "workflow_id": state["workflow_id"],
        "progress": f"Step {current} of {total}",
        "current_step": {
            "number": current,
            "name": current_step["name"] if current_step else "?",
            "intent": current_step["intent"] if current_step else "?",
            "status": current_step["status"] if current_step else "?",
        },
        "instruction": f"RESUME: You are on step {current} of {total} ({current_step['name'] if current_step else '?'}) in a {state['workflow_type']} workflow. "
                       f"Your task: {current_step['intent'] if current_step else '?'}. "
                       f"Do NOT redo completed steps.",
        "completed_steps": done_steps,
        "remaining_steps": remaining_steps,
        "files_touched": files_touched,
        "started_at": state.get("started_at"),
        "elapsed_since_last_step": state.get("last_step_at"),
    }


def get_status():
    """Get current workflow status (for display, not recovery)."""
    state = _load_state()
    if not state:
        return {"status": "no_workflow", "instruction": "No active workflow"}
    return state


# ── CLI ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PRISM Workflow Tracker")
    sub = parser.add_subparsers(dest="command")
    
    # start
    p_start = sub.add_parser("start")
    p_start.add_argument("type", help="Workflow type")
    p_start.add_argument("--name", help="Workflow description")
    
    # advance
    p_adv = sub.add_parser("advance")
    p_adv.add_argument("--intent", help="Override next step intent")
    p_adv.add_argument("--files", nargs="*", help="Files touched this step")
    p_adv.add_argument("--notes", help="Notes for completed step")
    
    # step (update without advancing)
    p_step = sub.add_parser("step")
    p_step.add_argument("step_num", type=int, nargs="?", help="Step number")
    p_step.add_argument("--status", choices=["done", "active", "pending", "skipped"])
    p_step.add_argument("--intent", help="Update intent")
    p_step.add_argument("--files", nargs="*", help="Files touched")
    p_step.add_argument("--notes", help="Notes")
    
    # status
    sub.add_parser("status")
    
    # recover
    sub.add_parser("recover")
    
    # complete
    sub.add_parser("complete")
    
    # abort
    p_abort = sub.add_parser("abort")
    p_abort.add_argument("--reason", help="Abort reason")
    
    # types (list available)
    sub.add_parser("types")
    
    args = parser.parse_args()
    
    if args.command == "start":
        result = start_workflow(args.type, name=args.name)
    elif args.command == "advance":
        result = advance_step(
            intent_override=args.intent,
            files_touched=args.files,
            notes=args.notes
        )
    elif args.command == "step":
        result = update_step(
            step_num=args.step_num,
            status=args.status,
            intent=args.intent,
            files=args.files,
            notes=args.notes
        )
    elif args.command == "status":
        result = get_status()
    elif args.command == "recover":
        result = get_recovery_context()
    elif args.command == "complete":
        result = complete_workflow()
    elif args.command == "abort":
        result = abort_workflow(reason=args.reason)
    elif args.command == "types":
        result = {t: {"steps": len(s["steps"]), "names": [st["name"] for st in s["steps"]]} 
                  for t, s in TEMPLATES.items()}
    else:
        parser.print_help()
        return
    
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
