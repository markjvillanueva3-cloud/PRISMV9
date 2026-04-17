#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Knowledge Consultation Tracker (PostToolUse)
Fires after successful MCP tool calls to track when knowledge bases are consulted.

Detects when tribal knowledge, playbook, formula registry, or material databases
are queried and marks those domains as "consulted" in the session tracker.

This pairs with enforce-knowledge-consult.py (PreToolUse) which checks
if consultation happened before engine writes.
"""
import json
import sys
import os
from datetime import datetime

STATE_FILE = "C:/PRISM/state/knowledge-consult-tracker.json"

# Map MCP tool calls and their arguments to knowledge domains
CONSULTATION_SIGNALS = {
    # MCP actions that count as knowledge consultation
    "tribal": ["tribal_knowledge", "tribal_tip", "tribal_action", "tribal_decision",
               "playbook_lookup", "playbook_advise", "cam_tip"],
    "turning": ["turning_", "lathe_", "chuck_", "threading_"],
    "milling": ["milling_", "pocket_", "adaptive_", "dynamic_"],
    "5axis": ["5axis_", "multiaxis_", "tcpm_", "tilted_"],
    "millturn": ["millturn_", "swiss_", "subspindle_", "multichannel_"],
    "grinding": ["grinding_", "grind_", "wheel_", "dress_"],
    "edm": ["edm_", "wire_edm_", "sinker_"],
    "laser": ["laser_", "pierce_"],
    "waterjet": ["waterjet_", "abrasive_"],
    "tooling": ["tool_select", "tool_catalog", "coating_", "holder_", "insert_"],
    "physics": ["force_", "kienzle_", "taylor_", "chatter_", "stability_",
                "deflect_", "formula_", "physics_"],
    "speed_feed": ["speed_feed", "chip_load", "engagement_", "sfm_"],
    "strategy": ["strategy_", "toolpath_", "cam_recommend"],
    "safety": ["safety_", "collision_", "veto_"],
    "cost": ["cost_", "quote_", "roi_", "oee_"],
    "quality": ["quality_", "inspection_", "cpk_", "spc_"],
}

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"consultations": {}, "engine_writes": {}, "warnings_given": 0}

def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Check if this was an MCP call or a Read of knowledge files
    action = ""
    if isinstance(tool_input, dict):
        action = str(tool_input.get("action", "")).lower()
        # Also check file reads of knowledge data
        file_path = str(tool_input.get("file_path", "")).replace("\\", "/").lower()

    state = load_state()
    today = datetime.now().strftime("%Y-%m-%d")

    if today not in state["consultations"]:
        state["consultations"][today] = {}

    consulted_domains = []

    # Check MCP action names
    for domain, signals in CONSULTATION_SIGNALS.items():
        for signal in signals:
            if signal in action:
                consulted_domains.append(domain)
                break

    # Check file reads that count as consultation
    if tool_name in ("Read",) and isinstance(tool_input, dict):
        file_path = str(tool_input.get("file_path", "")).replace("\\", "/").lower()

        knowledge_files = {
            "cam-tips": ["turning", "milling", "5axis", "strategy"],
            "tribal": ["turning", "milling", "5axis", "strategy"],
            "playbook": ["turning", "milling", "5axis", "strategy", "safety"],
            "speed-feed-data": ["speed_feed", "tooling"],
            "controller-knowledge": ["turning", "milling", "5axis", "millturn"],
            "constants.ts": ["physics"],
            "materialregistry": ["speed_feed", "physics"],
            "formularegistry": ["physics"],
            "coatingregistry": ["tooling"],
            "toolpathstrategyregistry": ["strategy"],
            "machineregistry": ["cost"],
            "grinding": ["grinding"],
            "edm": ["edm"],
            "laser": ["laser"],
            "waterjet": ["waterjet"],
        }

        for keyword, domains in knowledge_files.items():
            if keyword in file_path:
                consulted_domains.extend(domains)

    # Also check Grep/Glob that search knowledge areas
    if tool_name in ("Grep", "Glob") and isinstance(tool_input, dict):
        pattern = str(tool_input.get("pattern", "")).lower()
        path = str(tool_input.get("path", "")).replace("\\", "/").lower()

        if "tribal" in pattern or "tips" in path or "playbook" in pattern:
            consulted_domains.extend(["turning", "milling", "strategy"])
        if "kc1" in pattern or "kienzle" in pattern or "constants" in path:
            consulted_domains.append("physics")
        if "formula" in pattern or "registry" in path:
            consulted_domains.append("physics")

    # Mark domains as consulted
    if consulted_domains:
        for domain in set(consulted_domains):
            state["consultations"][today][domain] = True

        # Also mark "general" as consulted when any specific domain is consulted
        # This fixes the bug where "general" domain could never be satisfied
        # because no knowledge source maps to "general" directly
        if len(consulted_domains) > 0:
            state["consultations"][today]["general"] = True

        save_state(state)

    print(json.dumps({"continue": True, "suppressOutput": True}))

if __name__ == "__main__":
    main()
