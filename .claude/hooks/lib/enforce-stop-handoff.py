#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Auto-save HANDOFF on Stop.

When Claude stops (session end, interrupt, crash), this hook:
1. Checks if HANDOFF.md exists and is recent (< 5 min old)
2. If stale or missing, writes a minimal HANDOFF with timestamp
3. Copies to shared state for Desktop Claude pickup

This ensures session context is never fully lost on unexpected stops.
"""
import json
import os
from datetime import datetime

HANDOFF = "H:/prism/state/HANDOFF.md"
HANDOFF_SHARED = "H:/prism/state/shared/HANDOFF-latest.md"


def main():
    now = datetime.now()

    # Check if HANDOFF exists and is recent
    if os.path.exists(HANDOFF):
        mtime = datetime.fromtimestamp(os.path.getmtime(HANDOFF))
        age_minutes = (now - mtime).total_seconds() / 60
        if age_minutes < 5:
            # Fresh HANDOFF exists — just copy to shared
            try:
                import shutil
                shutil.copy2(HANDOFF, HANDOFF_SHARED)
            except Exception:
                pass
            print(json.dumps({"continue": True}))
            return

    # HANDOFF is stale or missing — write minimal one
    minimal = (
        f"# HANDOFF: {now.strftime('%Y-%m-%d')} — Auto-saved on Stop\n\n"
        f"## STATE\n"
        f"- Session ended at {now.strftime('%H:%M:%S')}\n"
        f"- HANDOFF was auto-generated (Claude stopped before manual /handoff)\n"
        f"- Check git log for what was changed this session\n\n"
        f"## RESUME\n"
        f"Read git log --oneline -10 and H:/prism/state/session-edit-counter.json "
        f"to understand what was done. Then check the roadmap for next steps.\n"
    )

    try:
        os.makedirs(os.path.dirname(HANDOFF), exist_ok=True)
        with open(HANDOFF, "w", encoding="utf-8") as f:
            f.write(minimal)
        import shutil
        shutil.copy2(HANDOFF, HANDOFF_SHARED)
    except Exception:
        pass

    print(json.dumps({"continue": True}))


if __name__ == "__main__":
    main()
