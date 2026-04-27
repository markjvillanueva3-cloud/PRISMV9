#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Wiring Completeness — Wire to ALL consumers, not just one
Fires on PreCompact.

The user's #1 complaint: engines get wired to ONE place and marked "done"
when they should be wired to EVERY place that could use them.

This hook checks: for each engine written this session, HOW MANY places
reference it? If only 1, it WARNS that there are likely more consumers.

A force engine should be wired to:
  - PrintToProgramPipeline (milling)
  - TurningPrintToProgram (turning)
  - MultiAxisPrintToProgram (5-axis)
  - MillTurnSwissPipeline (mill-turn)
  - SpeedFeedOrchestrator (S/F optimization)
  - PostProcessorPipeline (per-block verification)
NOT just one pipeline.

A tool selection engine should be wired to ALL 9 machine type pipelines.
"""
import json
import sys
import os
import glob
from datetime import datetime

WIRING_STATE = "H:/prism/state/session-wiring-tracker.json"
ENGINE_DIR = "H:/prism/mcp-server/src/engines"
DISPATCHER_DIR = "H:/prism/mcp-server/src/tools/dispatchers"

# Engines that should be wired to MULTIPLE places
MULTI_WIRE_PATTERNS = {
    "Force": ["Pipeline", "SpeedFeed", "Post", "Safety"],
    "Collision": ["Pipeline", "Safety", "Simulation"],
    "ToolSelect": ["Pipeline", "Program"],
    "SpeedFeed": ["Pipeline", "Post", "Program"],
    "Safety": ["Pipeline", "Orchestrator"],
    "Strategy": ["Pipeline", "Decision", "Orchestrator"],
    "Material": ["Pipeline", "SpeedFeed", "Tool"],
    "Workholding": ["Pipeline", "Feasibility", "Safety"],
    "Controller": ["Pipeline", "Post", "Program"],
    "Cost": ["Pipeline", "Quote", "ROI"],
}

def count_references(engine_name):
    """Count how many OTHER files reference this engine."""
    base = engine_name.replace(".ts", "")
    count = 0
    referencing_files = []

    # Check all engine files
    if os.path.isdir(ENGINE_DIR):
        for eng in glob.glob(os.path.join(ENGINE_DIR, "*.ts")):
            if os.path.basename(eng) == engine_name:
                continue
            try:
                with open(eng, 'r', encoding='utf-8', errors='ignore') as f:
                    if base in f.read():
                        count += 1
                        referencing_files.append(os.path.basename(eng))
            except Exception:
                continue

    # Check dispatchers
    if os.path.isdir(DISPATCHER_DIR):
        for dp in glob.glob(os.path.join(DISPATCHER_DIR, "*.ts")):
            try:
                with open(dp, 'r', encoding='utf-8', errors='ignore') as f:
                    if base in f.read():
                        count += 1
                        referencing_files.append(os.path.basename(dp))
            except Exception:
                continue

    return count, referencing_files

def should_be_multi_wired(engine_name):
    """Check if this engine type should be wired to multiple consumers."""
    for pattern, expected_consumers in MULTI_WIRE_PATTERNS.items():
        if pattern.lower() in engine_name.lower():
            return True, expected_consumers
    return False, []

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    session_state = {}
    try:
        with open(WIRING_STATE, 'r') as f:
            session_state = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    engines_written = session_state.get("engines_written", [])
    if not engines_written:
        print(json.dumps({"continue": True}))
        return

    issues = []

    for eng in engines_written:
        ref_count, ref_files = count_references(eng)
        needs_multi, expected = should_be_multi_wired(eng)

        if ref_count == 0:
            issues.append(f"UNWIRED: {eng} — 0 references (ORPHANED)")
        elif ref_count == 1 and needs_multi:
            ref_list = ", ".join(ref_files)
            expected_list = ", ".join(expected)
            issues.append(
                f"UNDER-WIRED: {eng} — only {ref_count} reference ({ref_list}). "
                f"This type of engine should also be wired to: {expected_list}. "
                f"Wiring to ONE place and calling it done = incomplete integration."
            )

    if issues:
        issue_text = "\\n  ".join(issues)
        msg = (
            f"WIRING COMPLETENESS CHECK — {len(issues)} issue(s):\\n  {issue_text}\\n"
            f"Wire engines to ALL consumers, not just the first one you find. "
            f"A force engine goes in EVERY pipeline. A tool selector serves ALL machine types."
        )
        # PreCompact does not accept hookSpecificOutput in the harness schema.
        # systemMessage at the top level is the supported channel.
        print(json.dumps({
            "continue": True,
            "systemMessage": msg
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
