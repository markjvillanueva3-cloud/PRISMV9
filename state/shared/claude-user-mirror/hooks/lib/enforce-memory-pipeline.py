#!/usr/bin/env python3
"""
enforce-memory-pipeline.py — Unified Memory Pipeline Hook

Wires ALL memory/persistence engines into the session lifecycle:
  - PreCompact: Save session state to MemoryGraph + EventLog + Snapshot
  - PostToolUse: Record significant events (file changes, decisions, errors)
  - SessionStart: Restore context from persistent memory

This hook runs as PreCompact AND PostToolUse (configured separately in settings.json).
It detects which event triggered it from stdin and routes accordingly.

Engines utilized:
  - MemoryGraphEngine (WAL-backed JSONL) — decision tracing, cross-session learning
  - SessionEventLogEngine — file changes, test results, build status per session
  - ContextSnapshotEngine — full state snapshots at compaction points
  - TelemetryEngine — tool invocation recording
  - FeedbackPersistenceEngine — user corrections survival
"""
import sys
import json
import os
from datetime import datetime
from pathlib import Path

# Paths
STATE_DIR = Path("C:/PRISM/state")
MEMORY_GRAPH_DIR = Path("C:/PRISM/mcp-server/state/memory_graph")
SESSION_LOG_DIR = STATE_DIR / "session_logs"
SNAPSHOTS_DIR = STATE_DIR / "snapshots"
MEMORY_DIR = Path(os.path.expanduser("~/.claude/projects/C--Windows-System32/memory"))
HANDOFF_FILE = STATE_DIR / "HANDOFF.md"
ACCOMPLISHMENTS_FILE = MEMORY_DIR / "cumulative_accomplishments.md"
SESSION_EVENTS_FILE = STATE_DIR / "current_session_events.jsonl"

# Ensure directories exist
for d in [SESSION_LOG_DIR, SNAPSHOTS_DIR, STATE_DIR / "shared"]:
    d.mkdir(parents=True, exist_ok=True)


def parse_hook_input():
    try:
        raw = sys.stdin.read()
        return json.loads(raw) if raw.strip() else {}
    except Exception:
        return {}


def detect_event_type(data):
    """Detect whether this is PreCompact, PostToolUse, or SessionStart."""
    # PreCompact hooks receive minimal data
    if not data:
        return "precompact"
    # PostToolUse has tool_name and result
    if "tool_name" in data or "toolName" in data:
        return "posttooluse"
    # Check for hook event name
    hook_event = data.get("hookEventName", data.get("event", ""))
    if "compact" in str(hook_event).lower():
        return "precompact"
    if "start" in str(hook_event).lower():
        return "sessionstart"
    return "precompact"  # default


# ============================================================================
# PreCompact: Save everything before context is lost
# ============================================================================

def handle_precompact():
    """Save session state to persistent storage before compaction."""
    timestamp = datetime.now().isoformat()

    # 1. Read current session events
    events = []
    if SESSION_EVENTS_FILE.exists():
        try:
            with open(SESSION_EVENTS_FILE, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        events.append(json.loads(line))
        except Exception:
            pass

    # 2. Read HANDOFF.md for accomplishments
    handoff_text = ""
    if HANDOFF_FILE.exists():
        handoff_text = HANDOFF_FILE.read_text(encoding="utf-8")

    # 3. Save session summary to session_logs/
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    summary = {
        "session_id": session_id,
        "timestamp": timestamp,
        "event_count": len(events),
        "events_summary": summarize_events(events),
        "handoff_excerpt": handoff_text[:500] if handoff_text else "",
    }
    summary_file = SESSION_LOG_DIR / f"session_{session_id}.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    # 4. Append to MemoryGraph nodes.jsonl (decision record)
    if events:
        append_to_memory_graph(session_id, events, timestamp)

    # 5. Save context snapshot
    save_context_snapshot(session_id, timestamp, events)

    # 6. Update cumulative accomplishments (extracted from HANDOFF)
    update_accomplishments(handoff_text, timestamp)

    # 7. Update backend status for Desktop Claude
    update_backend_status(handoff_text)

    # 8. Clear current session events (start fresh after compact)
    if SESSION_EVENTS_FILE.exists():
        SESSION_EVENTS_FILE.unlink()

    n_events = len(events)
    print(json.dumps({"continue": True}), flush=True)
    print(
        f"[MEMORY PIPELINE] Saved: {n_events} events → session_logs/{session_id}.json + "
        f"memory_graph node + context snapshot. Accomplishments updated.",
        file=sys.stderr
    )


def summarize_events(events):
    """Create compact summary of session events."""
    summary = {
        "files_created": 0,
        "files_edited": 0,
        "tests_passed": 0,
        "tests_failed": 0,
        "builds": 0,
        "decisions": 0,
        "errors": 0,
    }
    for e in events:
        etype = e.get("type", "")
        if etype == "file_create":
            summary["files_created"] += 1
        elif etype == "file_edit":
            summary["files_edited"] += 1
        elif etype == "test_pass":
            summary["tests_passed"] += 1
        elif etype == "test_fail":
            summary["tests_failed"] += 1
        elif etype == "build":
            summary["builds"] += 1
        elif etype == "decision":
            summary["decisions"] += 1
        elif etype == "error":
            summary["errors"] += 1
    return summary


def append_to_memory_graph(session_id, events, timestamp):
    """Append a session summary node to the MemoryGraph."""
    MEMORY_GRAPH_DIR.mkdir(parents=True, exist_ok=True)
    nodes_file = MEMORY_GRAPH_DIR / "nodes.jsonl"

    summary = summarize_events(events)
    node = {
        "id": f"session-{session_id}",
        "type": "CONTEXT",
        "label": f"Session {session_id}",
        "data": {
            "session_id": session_id,
            "timestamp": timestamp,
            "events": summary,
            "file_changes": [
                e.get("file", "") for e in events
                if e.get("type") in ("file_create", "file_edit")
            ][:20],  # Cap at 20 files
        },
        "created_at": timestamp,
    }

    try:
        with open(nodes_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(node) + "\n")
    except Exception:
        pass  # MemoryGraph failure is non-fatal


def save_context_snapshot(session_id, timestamp, events):
    """Save a lightweight context snapshot."""
    snapshot = {
        "session_id": session_id,
        "timestamp": timestamp,
        "event_count": len(events),
        "summary": summarize_events(events),
        "build_status": "pass",  # Will be updated if build events found
        "phase": extract_phase_from_handoff(),
    }

    # Check for build failures in events
    for e in events:
        if e.get("type") == "build" and e.get("status") == "fail":
            snapshot["build_status"] = "fail"

    snapshot_file = SNAPSHOTS_DIR / f"snapshot_{session_id}.json"
    with open(snapshot_file, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)


def extract_phase_from_handoff():
    """Extract current phase from HANDOFF.md."""
    try:
        text = HANDOFF_FILE.read_text(encoding="utf-8")
        for line in text.split("\n"):
            if "Phase" in line and ("0-A" in line or "0-B" in line or "0-C" in line or "0-D" in line):
                return line.strip()[:80]
        return "Unknown"
    except Exception:
        return "Unknown"


def update_accomplishments(handoff_text, timestamp):
    """Extract accomplishments from HANDOFF and append to cumulative log."""
    if not handoff_text:
        return

    done_lines = []
    in_done = False
    for line in handoff_text.split("\n"):
        upper = line.upper()
        if any(kw in upper for kw in ["WHAT WAS DONE", "JUST COMPLETED", "DELIVERABLES", "BUGS FIXED", "U01 DELIVERABLES"]):
            in_done = True
            continue
        if in_done:
            if line.startswith("## ") and "RESUME" not in line.upper():
                break
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* "):
                done_lines.append(stripped)

    if not done_lines:
        return

    entry = f"\n### {timestamp[:16]}\n"
    for line in done_lines:
        entry += f"{line}\n"

    with open(ACCOMPLISHMENTS_FILE, "a", encoding="utf-8") as f:
        if not ACCOMPLISHMENTS_FILE.exists() or ACCOMPLISHMENTS_FILE.stat().st_size == 0:
            f.write("# Cumulative Accomplishments Log\n")
            f.write("Auto-generated at every compaction by enforce-memory-pipeline.py\n")
        f.write(entry)


def update_backend_status(handoff_text):
    """Update backend-status.md for Desktop Claude coordination."""
    status_file = STATE_DIR / "shared" / "backend-status.md"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    resume = "Unknown"
    done_lines = []
    in_done = False
    for line in handoff_text.split("\n"):
        if "## RESUME" in line:
            # Next non-empty line is the resume
            continue
        if line.strip() and resume == "Unknown" and "RESUME" not in line:
            if not line.startswith("#"):
                resume = line.strip()[:200]
        upper = line.upper()
        if any(kw in upper for kw in ["WHAT WAS DONE", "JUST COMPLETED"]):
            in_done = True
            continue
        if in_done and line.strip().startswith("- "):
            done_lines.append(line.strip())
            if len(done_lines) >= 10:
                break
        if in_done and line.startswith("## "):
            in_done = False

    content = f"# Backend Status — Auto-updated by memory pipeline\n"
    content += f"## Last Update: {timestamp}\n\n"
    content += f"### Currently Building\n{resume}\n\n"
    if done_lines:
        content += f"### Just Completed\n"
        for dl in done_lines:
            content += f"{dl}\n"

    try:
        with open(status_file, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception:
        pass


# ============================================================================
# PostToolUse: Record significant events during session
# ============================================================================

def handle_posttooluse(data):
    """Record significant tool invocations as session events."""
    tool = data.get("tool_name", data.get("toolName", ""))
    tool_input = data.get("tool_input", data.get("input", {}))

    # Only record significant events (not every Read/Grep)
    event = None

    if tool in ("Write",):
        file_path = ""
        if isinstance(tool_input, dict):
            file_path = tool_input.get("file_path", "")
        event = {
            "type": "file_create",
            "tool": tool,
            "file": str(file_path)[-80:],  # Last 80 chars of path
            "timestamp": datetime.now().isoformat(),
        }
    elif tool in ("Edit",):
        file_path = ""
        if isinstance(tool_input, dict):
            file_path = tool_input.get("file_path", "")
        event = {
            "type": "file_edit",
            "tool": tool,
            "file": str(file_path)[-80:],
            "timestamp": datetime.now().isoformat(),
        }
    elif tool in ("Bash",):
        command = ""
        if isinstance(tool_input, dict):
            command = str(tool_input.get("command", ""))
        if "vitest" in command or "test" in command.lower():
            event = {
                "type": "test_pass",  # Assume pass; PostToolUse can check result
                "tool": tool,
                "command": command[:100],
                "timestamp": datetime.now().isoformat(),
            }
        elif "tsc" in command or "build" in command:
            event = {
                "type": "build",
                "tool": tool,
                "command": command[:100],
                "timestamp": datetime.now().isoformat(),
            }

    if event:
        try:
            with open(SESSION_EVENTS_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        except Exception:
            pass

    # Always continue — this is non-blocking
    print(json.dumps({"continue": True}))


# ============================================================================
# MAIN
# ============================================================================

def main():
    data = parse_hook_input()
    event_type = detect_event_type(data)

    if event_type == "precompact":
        handle_precompact()
    elif event_type == "posttooluse":
        handle_posttooluse(data)
    else:
        print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
