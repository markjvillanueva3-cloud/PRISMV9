#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Unit/Edit Counter — Context Quality Enforcer
Fires on PostToolUse for Write|Edit.

Counts source file modifications in the session. After thresholds:
  - 30 edits: WARN — "Context getting heavy, consider /compact"
  - 60 edits: STRONG WARN — "Quality degrading, /compact NOW"
  - 90 edits: BLOCK — "Compact required before continuing"

Also tracks if /prism-review was run after engine edits.
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "H:/prism/state/session-edit-counter.json"

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            "session_date": "",
            "edit_count": 0,
            "engine_edits_since_review": 0,
            "engines_written": [],
            "test_files_written": [],
            "prism_review_count": 0,
            "last_compact": "",
        }

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

    tool_input = input_data.get("tool_input", {})
    tool_response = input_data.get("tool_response", {})
    file_path = (tool_input.get("file_path", "") or
                 (tool_response.get("filePath", "") if isinstance(tool_response, dict) else ""))

    # Normalize path
    file_path = file_path.replace("\\", "/")

    # Only count src/ file edits (not docs, configs, state files)
    if "/src/" not in file_path and "/tests/" not in file_path:
        print(json.dumps({"continue": True}))
        return

    state = load_state()
    today = datetime.now().strftime("%Y-%m-%d")

    # Reset counter for new day (new session)
    if state.get("session_date") != today:
        state = {
            "session_date": today,
            "edit_count": 0,
            "engine_edits_since_review": 0,
            "engines_written": [],
            "test_files_written": [],
            "prism_review_count": 0,
            "last_compact": state.get("last_compact", ""),
        }

    state["edit_count"] += 1
    count = state["edit_count"]

    # Track engine writes for wiring enforcement
    # Skip non-physics engines (course management, knowledge bases, etc.)
    NON_PHYSICS_ENGINES = {
        "CurriculumEngine.ts", "CourseBuilderEngine.ts", "CertificationTrackingEngine.ts",
        "ApprenticeEngine.ts", "ManufacturingKnowledgeGraphEngine.ts", "KnowledgeQueryEngine.ts",
        "CADDrawingKnowledgeEngine.ts", "TribalKnowledgeEngine.ts", "MachiningPlaybookEngine.ts",
        "FeatureStrategyKnowledgeBaseEngine.ts", "LessonRendererEngine.ts",
    }
    if "src/engines/" in file_path and file_path.endswith(".ts") and ".test." not in file_path:
        engine_name = os.path.basename(file_path)
        if engine_name in NON_PHYSICS_ENGINES:
            # Non-physics engine — don't count toward review gate
            save_state(state)
            print(json.dumps({"continue": True}))
            return
        if engine_name not in state["engines_written"]:
            state["engines_written"].append(engine_name)
        state["engine_edits_since_review"] += 1

        # Also update the wiring tracker
        try:
            wiring_state_file = "H:/prism/state/session-wiring-tracker.json"
            try:
                with open(wiring_state_file, 'r') as f:
                    wiring_state = json.load(f)
            except (FileNotFoundError, json.JSONDecodeError):
                wiring_state = {"engines_written": [], "engines_verified_wired": [], "session_date": today}

            wiring_state["session_date"] = today
            if engine_name not in wiring_state.get("engines_written", []):
                wiring_state.setdefault("engines_written", []).append(engine_name)

            with open(wiring_state_file, 'w') as f:
                json.dump(wiring_state, f, indent=2)
        except Exception:
            pass

    # Track test file writes
    if ("__tests__/" in file_path or "tests/" in file_path) and ".test." in file_path:
        test_name = os.path.basename(file_path)
        if test_name not in state["test_files_written"]:
            state["test_files_written"].append(test_name)

    save_state(state)

    # Generate warnings based on thresholds
    messages = []

    # Engine edits without /prism-review
    engine_edits = state["engine_edits_since_review"]
    if engine_edits >= 4:
        messages.append(
            f"REVIEW GATE: {engine_edits} engine edits since last /prism-review. "
            f"Run /prism-review NOW before more edits. Quality degrades without peer review."
        )
    elif engine_edits >= 2:
        messages.append(
            f"Review reminder: {engine_edits} engine edits since last /prism-review. "
            f"Consider running /prism-review soon."
        )

    # Total edit counter — tightened for quality
    if count >= 60:
        messages.append(
            f"CONTEXT QUALITY BLOCK: {count} source file edits this session. "
            f"Context window is heavily loaded — output quality is degrading. "
            f"Run /compact NOW. Fresh context produces better code than exhausted context."
        )
    elif count >= 40:
        messages.append(
            f"CONTEXT QUALITY WARNING: {count} source file edits. "
            f"Quality typically degrades past 40 edits. Run /compact soon."
        )
    elif count >= 20:
        messages.append(
            f"Edit count: {count}/60. Consider /compact after completing current unit."
        )

    # Engine edits without test writes
    engines_count = len(state["engines_written"])
    tests_count = len(state["test_files_written"])
    if engines_count >= 2 and tests_count == 0:
        messages.append(
            f"TEST GAP: {engines_count} engines written but 0 test files. "
            f"Every engine needs tests. Write tests before /compact."
        )

    if messages:
        combined = " | ".join(messages)
        if count >= 60:
            # BLOCK — too many edits without compact
            print(json.dumps({
                "decision": "block",
                "reason": f"EDIT LIMIT REACHED (60): {combined}. Run /compact NOW.",
            }))
        else:
            # WARN
            print(json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": combined
                }
            }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
