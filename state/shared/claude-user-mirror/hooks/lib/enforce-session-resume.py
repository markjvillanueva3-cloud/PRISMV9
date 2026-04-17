#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Session Resume Prompt
Fires on UserPromptSubmit.

On the FIRST user message of a session, checks if HANDOFF.md has a RESUME
section and injects it as additionalContext. This gives both Claude and the
user immediate visibility into what to do next — no /startup needed.

Only fires ONCE per session (writes a flag file to prevent repeat injection).
"""
import json
import sys
import os
from datetime import datetime

FLAG_FILE = "C:/PRISM/state/session-resume-shown.json"
HANDOFF_PATH = "C:/PRISM/state/HANDOFF.md"


def already_shown_this_session() -> bool:
    """Check if we've already shown the resume prompt this session."""
    try:
        with open(FLAG_FILE, 'r') as f:
            data = json.load(f)
        # Consider "shown" if flag was set within last 4 hours
        ts = data.get("shown_at", "")
        if ts:
            shown_time = datetime.fromisoformat(ts)
            age_hours = (datetime.now() - shown_time).total_seconds() / 3600
            return age_hours < 4
    except Exception:
        pass
    return False


def mark_shown():
    """Mark that we've shown the resume prompt."""
    try:
        os.makedirs(os.path.dirname(FLAG_FILE), exist_ok=True)
        with open(FLAG_FILE, 'w') as f:
            json.dump({"shown_at": datetime.now().isoformat()}, f)
    except Exception:
        pass


def extract_resume() -> str:
    """Extract RESUME section from HANDOFF.md."""
    try:
        with open(HANDOFF_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        in_resume = False
        resume_lines = []
        for line in lines:
            if line.strip().startswith("## RESUME"):
                in_resume = True
                continue
            if in_resume:
                if line.strip().startswith("## "):
                    break
                stripped = line.strip()
                if stripped:
                    resume_lines.append(stripped)
        return " ".join(resume_lines)
    except Exception:
        return ""


def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except Exception:
        print(json.dumps({"continue": True}))
        return

    # Only fire once per session
    if already_shown_this_session():
        print(json.dumps({"continue": True}))
        return

    resume = extract_resume()
    if not resume:
        print(json.dumps({"continue": True}))
        return

    mark_shown()

    # Check if compact-just-happened (post-compaction session)
    compact_flag = ""
    try:
        with open("C:/PRISM/state/compact-just-happened.json", 'r') as f:
            data = json.load(f)
        if data.get("compact_happened"):
            compact_flag = " (post-compaction)"
    except Exception:
        pass

    msg = f"SESSION RESUME{compact_flag}: {resume}"

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": msg
        }
    }))


if __name__ == "__main__":
    main()
