#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Pre-Compact Session Quality Audit (lightweight)
Replaces the agent-type hook (not supported for PreCompact).

Checks:
1. HANDOFF.md exists and has RESUME section
2. Session edit counter — warns if high with no review
3. Reports findings as systemMessage
"""
import json
import os

HANDOFF = "C:/PRISM/state/HANDOFF.md"
EDIT_COUNTER = "C:/PRISM/state/session-edit-counter.json"


def main():
    findings = []

    # 1. HANDOFF.md check
    if os.path.exists(HANDOFF):
        with open(HANDOFF, "r", encoding="utf-8") as f:
            content = f.read()
        if "## RESUME" not in content:
            findings.append("HANDOFF.md exists but has NO RESUME section — add one before compacting")
        else:
            findings.append("HANDOFF.md OK with RESUME section")
    else:
        findings.append("WARNING: No HANDOFF.md — run /handoff before compacting")

    # 2. Edit counter check
    try:
        with open(EDIT_COUNTER, "r") as f:
            counter = json.load(f)
        edits = counter.get("engine_edits", 0) or counter.get("edits", 0) or 0
        if edits > 10:
            findings.append(f"{edits} edits this session — consider /prism-review before compact")
    except Exception:
        pass

    msg = "PRE-COMPACT AUDIT: " + "; ".join(findings)
    print(json.dumps({"systemMessage": msg}))


if __name__ == "__main__":
    main()
