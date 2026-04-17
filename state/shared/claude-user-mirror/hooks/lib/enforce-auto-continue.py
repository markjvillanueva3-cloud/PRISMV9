#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Auto-Continue After Compaction
Fires on PostCompact.

1. Resets all session trackers (edit counter, wiring tracker, auto-compact counter)
2. Sets compact-just-happened flag for failsafe hook
3. Reads HANDOFF.md RESUME section and embeds it in systemMessage
4. Claude sees the exact next action and auto-continues without asking

The systemMessage is also visible to the user in dim hook output,
giving them a "quick prompt" to continue if starting a new session.
"""
import json
import sys
import os
from datetime import datetime


def extract_resume_line(handoff_path: str) -> str:
    """Extract the RESUME section from HANDOFF.md."""
    try:
        with open(handoff_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        # Find ## RESUME heading, return everything after it
        in_resume = False
        resume_lines = []
        for line in lines:
            if line.strip().startswith("## RESUME"):
                in_resume = True
                continue
            if in_resume:
                if line.strip().startswith("## "):
                    break  # Next section
                stripped = line.strip()
                if stripped:
                    resume_lines.append(stripped)
        return " ".join(resume_lines) if resume_lines else ""
    except Exception:
        return ""


def main():
    # ── 1. Reset all session trackers ──
    tracker_path = "C:/PRISM/state/auto-compact-tracker.json"
    try:
        with open(tracker_path, 'r') as f:
            state = json.load(f)
        state["last_compact_at_edit"] = state.get("src_edits", 0)
        state["compact_reminders_sent"] = 0
        os.makedirs(os.path.dirname(tracker_path), exist_ok=True)
        with open(tracker_path, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass

    for tracker in [
        "C:/PRISM/state/session-edit-counter.json",
        "C:/PRISM/state/session-wiring-tracker.json",
    ]:
        try:
            with open(tracker, 'w') as f:
                json.dump({}, f)
        except Exception:
            pass

    # ── 2. Set auto-continue flag for failsafe hook ──
    try:
        flag_path = "C:/PRISM/state/compact-just-happened.json"
        with open(flag_path, 'w') as f:
            json.dump({"compact_happened": True, "timestamp": datetime.now().isoformat()}, f)
    except Exception:
        pass

    # ── 3. Read HANDOFF.md RESUME line ──
    handoff_path = "C:/PRISM/state/HANDOFF.md"
    resume = extract_resume_line(handoff_path)

    # ── 4. Build systemMessage with embedded resume prompt ──
    if resume:
        msg = (
            f"COMPACTION COMPLETE — RESUME: {resume} | "
            "Read C:/PRISM/state/HANDOFF.md for full context. "
            "Continue executing immediately — do NOT ask the user, do NOT summarize. Just work."
        )
    else:
        msg = (
            "COMPACTION COMPLETE — No RESUME line found in HANDOFF.md. "
            "Read C:/PRISM/state/HANDOFF.md and C:/PRISM/state/COMPACTION_SURVIVAL.json "
            "to determine next action. Continue executing without asking."
        )

    # PostCompact hooks use top-level systemMessage (not hookSpecificOutput)
    print(json.dumps({"systemMessage": msg}))


if __name__ == "__main__":
    main()
