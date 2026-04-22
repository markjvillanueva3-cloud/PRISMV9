#!/usr/bin/env python3
"""
CONSOLIDATED PostCompact hook — replaces 3 separate hooks with 1.

Does ALL post-compaction work in a single process:
1. Resets session trackers (edit counter, wiring tracker, auto-compact)
2. Sets compact-just-happened flag for failsafe
3. Copies HANDOFF.md to shared state
4. Logs compaction event
4.5. Updates coordination surfaces (AGENT_WORKBOARD, ROADMAP_COLLABORATION_STATE)
5. Outputs systemMessage with RESUME directive
"""
import json
import os
import shutil
import subprocess
from datetime import datetime

HANDOFF = "C:/PRISM/state/HANDOFF.md"
HANDOFF_SHARED = "C:/PRISM/state/shared/HANDOFF-latest.md"
FLAG = "C:/PRISM/state/compact-just-happened.json"
LOG = "C:/PRISM/state/shared/post-compact-log.json"
TRACKERS = [
    "C:/PRISM/state/session-edit-counter.json",
    "C:/PRISM/state/session-wiring-tracker.json",
]
AUTO_COMPACT = "C:/PRISM/state/auto-compact-tracker.json"


def extract_resume(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        in_resume = False
        out = []
        for line in lines:
            if line.strip().startswith("## RESUME"):
                in_resume = True
                continue
            if in_resume:
                if line.strip().startswith("## "):
                    break
                s = line.strip()
                if s:
                    out.append(s)
        return " ".join(out)
    except Exception:
        return ""


def main():
    now = datetime.now().isoformat()

    # 1. Reset session trackers
    for t in TRACKERS:
        try:
            with open(t, "w") as f:
                json.dump({}, f)
        except Exception:
            pass

    try:
        with open(AUTO_COMPACT, "r") as f:
            state = json.load(f)
        state["last_compact_at_edit"] = state.get("src_edits", 0)
        state["compact_reminders_sent"] = 0
        with open(AUTO_COMPACT, "w") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass

    # 2. Set flag for failsafe
    try:
        with open(FLAG, "w") as f:
            json.dump({"compact_happened": True, "timestamp": now}, f)
    except Exception:
        pass

    # 3. Copy HANDOFF to shared state
    try:
        if os.path.exists(HANDOFF):
            shutil.copy2(HANDOFF, HANDOFF_SHARED)
    except Exception:
        pass

    # 4. Log event
    handoff_size = 0
    try:
        if os.path.exists(HANDOFF):
            handoff_size = os.path.getsize(HANDOFF)
        with open(LOG, "w", encoding="utf-8") as f:
            json.dump({
                "event": "post_compact",
                "timestamp": now,
                "handoff_exists": os.path.exists(HANDOFF),
                "handoff_size": handoff_size,
            }, f)
    except Exception:
        pass

    # 4.5. Update coordination surfaces (AGENT_WORKBOARD, ROADMAP_COLLABORATION_STATE)
    # Extract resume early so it's available for coordination messages
    resume = extract_resume(HANDOFF)
    try:
        agent_instance = (
            f"Claude@{os.environ.get('COMPUTERNAME', os.environ.get('HOSTNAME', 'unknown'))}"
            f"/ppid-{os.getppid()}"
        )
        resume_snippet = resume[:100] if resume else "none"

        # Update AGENT_CHAT + AGENT_WORKBOARD + AGENT_COORDINATION_STATUS
        subprocess.run(
            [
                "node", "C:/PRISM/.claude/helpers/agent-coordination.mjs", "post",
                "--agent", "Claude",
                "--agent-instance", agent_instance,
                "--status", "compacted",
                "--current", f"Compact complete — {resume[:80] if resume else 'no resume'}",
                "--next", resume[:120] if resume else "awaiting /startup",
                "--message", f"Compact complete. Resume: {resume_snippet}",
            ],
            capture_output=True,
            timeout=5,
        )

        # Sync to ROADMAP_COLLABORATION_STATE
        subprocess.run(
            [
                "node", "C:/PRISM/.claude/helpers/roadmap-sync.mjs", "sync",
                "--agent", "Claude",
                "--agent-instance", agent_instance,
                "--status", "compacted",
                "--note", f"Compact complete. Resume: {resume_snippet}",
            ],
            capture_output=True,
            timeout=5,
        )
    except Exception:
        # Coordination sync must NEVER block post-compact
        pass

    # 5. Build resume message
    if resume:
        msg = (
            f"COMPACTION COMPLETE — RESUME: {resume} | "
            "Read C:/PRISM/state/HANDOFF.md for full context. "
            "Continue executing immediately — do NOT ask the user."
        )
    else:
        msg = (
            "COMPACTION COMPLETE — No RESUME found in HANDOFF.md. "
            "Read C:/PRISM/state/HANDOFF.md to determine next action."
        )

    print(json.dumps({"systemMessage": msg}))


if __name__ == "__main__":
    main()
