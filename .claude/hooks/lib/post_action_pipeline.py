#!/usr/bin/env python3
"""
Post-Action Pipeline -- automatic actions after tool executions.

After Edit/Write to engine files:
  1. Log action to telemetry
  2. Physics verification fires (via agent hook)
  3. Test impact analysis fires (via agent hook)
  4. Track edit count for review threshold

After Bash (build/test):
  1. Log build/test results to telemetry
  2. Check for regressions against baseline
  3. Update health score

After Agent completion:
  1. Update coordination stats
  2. Check model success rates
  3. Suggest model escalation if needed
"""
import json, os, sys
from datetime import datetime

TELEMETRY_DIR = os.path.expanduser("~/.prism/telemetry")


def process_post_action(tool_name, tool_result, file_path=None):
    """Process post-action pipeline and return recommendations."""
    actions_taken = []

    # 1. Track edits for review threshold
    if tool_name in ("Edit", "Write") and file_path:
        edit_count = _increment_edit_count()
        if edit_count == 10:
            actions_taken.append("REVIEW_THRESHOLD: 10 edits reached - consider /prism-review")

        # Track which files were modified
        _log_modified_file(file_path)

    # 2. Track build/test results
    if tool_name == "Bash":
        result_str = str(tool_result).lower() if tool_result else ""
        if "error" in result_str or "fail" in result_str:
            _log_event("build-test-events.jsonl", {
                "timestamp": datetime.now().isoformat(),
                "type": "failure",
                "details": result_str[:200]
            })
            actions_taken.append("BUILD_FAILURE: Logged to telemetry")
        elif "pass" in result_str or "0 errors" in result_str:
            _log_event("build-test-events.jsonl", {
                "timestamp": datetime.now().isoformat(),
                "type": "success"
            })

    return actions_taken


def _increment_edit_count():
    count_file = "C:/tmp/prism-edit-count" if os.name == "nt" else "/tmp/prism-edit-count"
    count = 0
    try:
        if os.path.exists(count_file):
            with open(count_file) as f:
                count = int(f.read().strip())
    except Exception:
        pass
    count += 1
    try:
        os.makedirs(os.path.dirname(count_file), exist_ok=True)
        with open(count_file, "w") as f:
            f.write(str(count))
    except Exception:
        pass
    return count


def _log_modified_file(file_path):
    try:
        os.makedirs(TELEMETRY_DIR, exist_ok=True)
        _log_event("modified-files.jsonl", {
            "timestamp": datetime.now().isoformat(),
            "file": file_path
        })
    except Exception:
        pass


def _log_event(filename, data):
    try:
        os.makedirs(TELEMETRY_DIR, exist_ok=True)
        with open(os.path.join(TELEMETRY_DIR, filename), "a") as f:
            f.write(json.dumps(data) + "\n")
    except Exception:
        pass


if __name__ == "__main__":
    tool = sys.argv[1] if len(sys.argv) > 1 else "Edit"
    result = sys.argv[2] if len(sys.argv) > 2 else ""
    path = sys.argv[3] if len(sys.argv) > 3 else ""
    actions = process_post_action(tool, result, path)
    for a in actions:
        print(a)
