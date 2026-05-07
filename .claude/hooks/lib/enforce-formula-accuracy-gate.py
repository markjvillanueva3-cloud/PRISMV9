#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Formula Accuracy Pre-Compact Gate (AUTO-5 U-FA2)
Fires on PreCompact.

Checks if physics files were modified (formula_validation_pending flag)
without a subsequent formula accuracy validation run.

Behavior:
  - If no physics files were modified this session: PASS
  - If physics files were modified AND FORMULA_ACCURACY.json is newer than the pending flag: PASS
  - If physics files were modified AND accuracy < 0.90: BLOCK
  - If physics files were modified AND accuracy < 0.95: WARN (allow compact)
  - If physics files were modified AND no accuracy results: BLOCK

State file: H:/prism/state/formula-validation-pending.json
Accuracy file: H:/prism/mcp-server/state/shared/FORMULA_ACCURACY.json
"""
import json
import sys
import os
from datetime import datetime, timezone

STATE_FILE = "H:/prism/state/formula-validation-pending.json"
ACCURACY_FILE = "H:/prism/mcp-server/state/shared/FORMULA_ACCURACY.json"

BLOCK_THRESHOLD = 0.90
WARN_THRESHOLD = 0.95

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    # Check if there's a pending validation flag
    try:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # No pending flag — no physics edits this session
        print(json.dumps({"continue": True}))
        return

    if not state.get("pending", False):
        print(json.dumps({"continue": True}))
        return

    pending_time = state.get("last_set", "")
    files_modified = state.get("files_modified", [])

    # Check if formula accuracy results exist and are newer than the pending flag
    if not os.path.exists(ACCURACY_FILE):
        msg = (
            f"FORMULA ACCURACY GATE BLOCKED: {len(files_modified)} physics file(s) modified "
            f"({', '.join(files_modified[:5])}) but no formula accuracy results found. "
            f"Run /formula-check (prism_dev formula_accuracy) to validate before compacting."
        )
        print(json.dumps({"decision": "block", "reason": msg}))
        return

    # Read accuracy results
    try:
        with open(ACCURACY_FILE, 'r') as f:
            accuracy_data = json.load(f)
    except (json.JSONDecodeError, Exception):
        msg = (
            f"FORMULA ACCURACY GATE BLOCKED: Could not read FORMULA_ACCURACY.json. "
            f"Run /formula-check to regenerate."
        )
        print(json.dumps({"decision": "block", "reason": msg}))
        return

    # Check if accuracy results are newer than the pending flag
    result_time = accuracy_data.get("timestamp", "")
    if pending_time and result_time:
        try:
            pending_dt = datetime.fromisoformat(pending_time.replace("Z", "+00:00"))
            result_dt = datetime.fromisoformat(result_time.replace("Z", "+00:00"))
            if result_dt < pending_dt:
                msg = (
                    f"FORMULA ACCURACY GATE BLOCKED: Physics files modified AFTER last validation. "
                    f"Modified: {', '.join(files_modified[:5])}. "
                    f"Last validation: {result_time}. Last edit: {pending_time}. "
                    f"Run /formula-check to re-validate."
                )
                print(json.dumps({"decision": "block", "reason": msg}))
                return
        except (ValueError, TypeError):
            pass  # Can't compare timestamps, fall through to accuracy check

    # Check aggregate accuracy
    aggregate_accuracy = accuracy_data.get("aggregate_accuracy")
    if aggregate_accuracy is None:
        # Try to compute from individual results
        results = accuracy_data.get("results", {})
        if results:
            accuracies = [r.get("accuracy", 0) for r in results.values() if isinstance(r, dict)]
            if accuracies:
                aggregate_accuracy = sum(accuracies) / len(accuracies)

    if aggregate_accuracy is None:
        msg = (
            f"FORMULA ACCURACY GATE BLOCKED: No accuracy data in FORMULA_ACCURACY.json. "
            f"Run /formula-check to compute."
        )
        print(json.dumps({"decision": "block", "reason": msg}))
        return

    # Check thresholds
    if aggregate_accuracy < BLOCK_THRESHOLD:
        msg = (
            f"FORMULA ACCURACY GATE BLOCKED: Aggregate accuracy {aggregate_accuracy:.3f} "
            f"is below BLOCK threshold ({BLOCK_THRESHOLD}). "
            f"Fix physics formula regressions before compacting. "
            f"Modified files: {', '.join(files_modified[:5])}."
        )
        print(json.dumps({"decision": "block", "reason": msg}))
        return

    if aggregate_accuracy < WARN_THRESHOLD:
        msg = (
            f"FORMULA ACCURACY WARNING: Aggregate accuracy {aggregate_accuracy:.3f} "
            f"is below WARN threshold ({WARN_THRESHOLD}). "
            f"Consider investigating formula accuracy before next session. "
            f"Modified files: {', '.join(files_modified[:5])}."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreCompact",
                "additionalContext": msg
            }
        }))
        return

    # All good — accuracy is above both thresholds
    # Clear the pending flag since validation passed
    try:
        cleared = {
            "pending": False,
            "files_modified": [],
            "last_set": None,
            "last_cleared": datetime.now(timezone.utc).isoformat(),
            "cleared_accuracy": aggregate_accuracy,
        }
        with open(STATE_FILE, 'w') as f:
            json.dump(cleared, f, indent=2)
    except Exception:
        pass

    print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
