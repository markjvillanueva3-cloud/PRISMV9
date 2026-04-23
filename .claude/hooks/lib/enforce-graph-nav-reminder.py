#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Nudge toward codebase-memory graph queries.
Fires on PreToolUse for Grep|Glob.

After 5+ Grep/Glob calls in a session, reminds that search_graph
exists and is 99% cheaper on tokens. Fires once per session.
"""
import json
import sys
import os

TRACKER = "H:/prism/state/session-search-tracker.json"


def main():
    try:
        data = json.loads(sys.stdin.read())
    except Exception:
        print(json.dumps({"continue": True}))
        return

    # Load tracker
    try:
        with open(TRACKER, "r") as f:
            tracker = json.load(f)
    except Exception:
        tracker = {"grep_glob_count": 0, "reminded": False}

    tracker["grep_glob_count"] = tracker.get("grep_glob_count", 0) + 1

    # Save updated count
    os.makedirs(os.path.dirname(TRACKER), exist_ok=True)
    with open(TRACKER, "w") as f:
        json.dump(tracker, f)

    # Remind once at 5 searches
    if tracker["grep_glob_count"] == 5 and not tracker.get("reminded"):
        tracker["reminded"] = True
        with open(TRACKER, "w") as f:
            json.dump(tracker, f)
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": (
                    "GRAPH NAV AVAILABLE: 5+ Grep/Glob calls this session. "
                    "Consider codebase-memory-mcp search_graph/trace_call_path "
                    "for structural queries — 99% fewer tokens than file search. "
                    "Use Grep for exact text; use graph for 'what calls X' / 'show architecture'."
                )
            }
        }))
        return

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
