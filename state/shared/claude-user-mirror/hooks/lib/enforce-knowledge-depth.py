#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Knowledge Depth Verification
Fires on PreToolUse for Write to src/engines/*.ts (new engine creation).

Goes beyond "did you read the tips" to verify DEPTH of knowledge consultation:
- Were MULTIPLE knowledge sources queried (not just one)?
- Were ALL relevant domains consulted (turning + physics + tooling, not just turning)?
- Was the FormulaRegistry queried for the applicable formula?
- Was the playbook checked for anti-patterns?
- Were manufacturer data tables referenced?
- Was the academy course content considered?

Reads from knowledge-consult-tracker.json to verify breadth of consultation.
"""
import json
import sys
import os
from datetime import datetime

CONSULT_STATE = "C:/PRISM/state/knowledge-consult-tracker.json"

# Minimum domains that should be consulted for each engine type
REQUIRED_DEPTH = {
    "turning": ["turning", "physics", "tooling"],
    "milling": ["milling", "physics", "tooling", "strategy"],
    "5axis": ["5axis", "physics", "tooling", "strategy"],
    "millturn": ["millturn", "turning", "physics", "tooling"],
    "grinding": ["grinding", "physics"],
    "edm": ["edm", "physics"],
    "laser": ["laser", "physics"],
    "waterjet": ["waterjet", "physics"],
    "force": ["physics", "tooling"],
    "speed": ["speed_feed", "physics", "tooling"],
    "feed": ["speed_feed", "physics"],
    "safety": ["safety", "physics"],
    "cost": ["cost", "tooling"],
    "quality": ["quality", "physics"],
    "collision": ["safety", "physics"],
    "strategy": ["strategy", "physics", "tooling"],
    "tool": ["tooling", "physics"],
    "workholding": ["physics", "safety"],
}

def detect_domain(file_path):
    name = os.path.basename(file_path).lower()
    detected = []
    for domain in REQUIRED_DEPTH:
        if domain in name:
            detected.append(domain)
    return detected if detected else ["general"]

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    file_path = str(tool_input.get("file_path", "")).replace("\\", "/")

    # Only check NEW engine files
    if tool_name != "Write":
        print(json.dumps({"continue": True}))
        return
    if "src/engines/" not in file_path or not file_path.endswith(".ts") or ".test." in file_path:
        print(json.dumps({"continue": True}))
        return

    # Load consultation tracker
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(CONSULT_STATE, 'r') as f:
            state = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        state = {"consultations": {}}

    consulted = state.get("consultations", {}).get(today, {})
    consulted_domains = [d for d, v in consulted.items() if v]

    # Determine required depth
    detected = detect_domain(file_path)
    required = set()
    for d in detected:
        required.update(REQUIRED_DEPTH.get(d, ["physics"]))

    missing = required - set(consulted_domains)

    if missing and len(missing) > 1:
        engine_name = os.path.basename(file_path)
        missing_text = ", ".join(sorted(missing))
        consulted_text = ", ".join(sorted(consulted_domains)) if consulted_domains else "NONE"
        msg = (
            f"KNOWLEDGE DEPTH INSUFFICIENT for {engine_name}: "
            f"Consulted domains: [{consulted_text}]. "
            f"Missing domains: [{missing_text}]. "
            f"MIT-level engineering requires consulting ALL relevant knowledge sources: "
            f"tribal tips + playbook + formulas + manufacturer data + published research. "
            f"Read the relevant tip files, formula registry, and manufacturer catalogs BEFORE writing code."
        )
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "additionalContext": msg
            }
        }))
    else:
        print(json.dumps({"continue": True}))

if __name__ == "__main__":
    main()
