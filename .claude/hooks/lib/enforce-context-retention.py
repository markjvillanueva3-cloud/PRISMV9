#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Context Retention + Master Index + Registry Utilization
Fires on SessionStart and PreToolUse for Write|Edit.

Enforces:
1. MASTER_INDEX_COMPACT.md was read this session before building
2. reference_system_capabilities.md was consulted
3. ENGINE_DIGEST.md checked before creating a new engine (duplicate prevention)
4. DISPATCHER_DIGEST.md checked before wiring (know what exists)
5. The roadmap file for current phase was read
6. Knowledge graph queried for architecture before major changes

Tracks all reads in session state. Warns/blocks when building without context.
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "H:/prism/state/context-retention-tracker.json"

REQUIRED_READS = {
    "master_index": {
        "patterns": ["MASTER_INDEX_COMPACT", "MASTER_INDEX"],
        "description": "MASTER_INDEX_COMPACT.md — system map with all engines/dispatchers",
        "required_before": "any engine creation or wiring",
    },
    "system_capabilities": {
        "patterns": ["reference_system_capabilities", "SYSTEM_CAPABILITIES"],
        "description": "reference_system_capabilities.md — what the system can already do",
        "required_before": "any new engine creation (prevents duplicates)",
    },
    "engine_digest": {
        "patterns": ["ENGINE_DIGEST"],
        "description": "ENGINE_DIGEST.md — 1,246+ engines with descriptions (THE authoritative engine index)",
        "required_before": "creating a new engine (check it doesn't already exist)",
    },
    "dispatcher_digest": {
        "patterns": ["DISPATCHER_DIGEST"],
        "description": "DISPATCHER_DIGEST.md — 67+ dispatchers with action counts",
        "required_before": "wiring an engine to a dispatcher",
    },
    "roadmap": {
        "patterns": ["CAMX-RESTRUCTURED-ROADMAP", "CAMX-CONSOLIDATED-ROADMAP", "COMPREHENSIVE-ROADMAP"],
        "description": "Current phase roadmap file — know what you're supposed to build",
        "required_before": "starting any roadmap unit",
    },
    "handoff": {
        "patterns": ["HANDOFF.md"],
        "description": "HANDOFF.md — what happened last session",
        "required_before": "starting work (know where you left off)",
    },
}

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"session_date": "", "reads": {}, "engine_creates": 0, "wiring_attempts": 0}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    state = load_state()
    today = datetime.now().strftime("%Y-%m-%d")

    if state.get("session_date") != today:
        state = {"session_date": today, "reads": {}, "engine_creates": 0, "wiring_attempts": 0}

    file_path = ""
    if isinstance(tool_input, dict):
        file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # TRACKING MODE: Record reads of important files
    if tool_name in ("Read",):
        for key, info in REQUIRED_READS.items():
            for pattern in info["patterns"]:
                if pattern.lower() in file_path.lower():
                    state["reads"][key] = True
                    break
        save_state(state)
        print(json.dumps({"continue": True}))
        return

    # Also track Grep/Glob of important paths
    if tool_name in ("Grep", "Glob"):
        search_path = str(tool_input.get("path", "")).replace("\\", "/").lower()
        search_pattern = str(tool_input.get("pattern", "")).lower()
        for key, info in REQUIRED_READS.items():
            for pattern in info["patterns"]:
                if pattern.lower() in search_path or pattern.lower() in search_pattern:
                    state["reads"][key] = True
                    break
        save_state(state)
        print(json.dumps({"continue": True}))
        return

    # ENFORCEMENT MODE: Check reads before Write/Edit
    if tool_name not in ("Write", "Edit"):
        print(json.dumps({"continue": True}))
        return

    # Determine what this write is doing
    is_engine_create = "src/engines/" in file_path and file_path.endswith(".ts") and ".test." not in file_path
    is_dispatcher_edit = "dispatchers/" in file_path
    is_src_edit = "/src/" in file_path

    missing = []

    # Detect if this is Write (new file) vs Edit (modify existing)
    is_new_file = (tool_name == "Write")

    if is_engine_create:
        state["engine_creates"] = state.get("engine_creates", 0) + 1

        # Must have read engine digest (duplicate prevention) — BLOCK for new engines
        if not state["reads"].get("engine_digest"):
            if is_new_file:
                missing.append(
                    "BLOCKED: ENGINE_DIGEST.md not read before creating NEW engine! "
                    "Read data/docs/ENGINE_DIGEST.md first (1,007+ engines listed) to prevent duplicates."
                )
            else:
                missing.append(
                    "ENGINE_DIGEST.md not read — check that this engine doesn't already exist! "
                    "Read data/docs/ENGINE_DIGEST.md first (1,007+ engines listed)."
                )

        # Must have read MASTER_INDEX for new engines
        if not state["reads"].get("master_index") and is_new_file:
            missing.append(
                "BLOCKED: MASTER_INDEX_COMPACT.md not read before creating NEW engine! "
                "Read data/docs/MASTER_INDEX_COMPACT.md first — it's the AUTHORITATIVE system map. "
                "The engine you're about to build may ALREADY EXIST."
            )

        # Must have read system capabilities for new engines
        if not state["reads"].get("system_capabilities") and is_new_file:
            missing.append(
                "reference_system_capabilities.md not read — understand what the system "
                "already has before creating new engines."
            )

    if is_dispatcher_edit:
        state["wiring_attempts"] = state.get("wiring_attempts", 0) + 1
        if not state["reads"].get("dispatcher_digest"):
            missing.append(
                "DISPATCHER_DIGEST.md not read — check existing dispatcher actions "
                "before adding new ones. Read data/docs/DISPATCHER_DIGEST.md first."
            )

    if is_src_edit and not state["reads"].get("handoff"):
        # Only warn on first src edit
        if state.get("engine_creates", 0) + state.get("wiring_attempts", 0) <= 1:
            missing.append(
                "HANDOFF.md not read — you may be missing context from the previous session. "
                "Read H:/prism/state/HANDOFF.md to understand where you left off."
            )

    save_state(state)

    if missing:
        missing_text = " | ".join(missing)
        # BLOCK if creating a new engine without ENGINE_DIGEST
        should_block = is_new_file and is_engine_create and not state["reads"].get("engine_digest")
        msg = (
            f"CONTEXT RETENTION: {len(missing)} reference(s) not consulted before this edit: "
            f"{missing_text}"
        )
        if should_block:
            print(json.dumps({
                "decision": "block",
                "reason": msg,
            }))
        else:
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
