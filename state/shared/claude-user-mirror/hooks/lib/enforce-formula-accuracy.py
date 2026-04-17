#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Formula Accuracy Continuous Validation (AUTO-5 U-FA2)
Fires on PostToolUse for Write|Edit.

When a physics-related file is edited, sets a formula_validation_pending flag.
Returns a warning reminding to run /formula-check before compacting.

Physics file patterns:
  - src/physics/constants.ts (canonical formulas)
  - src/engines/*Force*, *Kienzle*, *Taylor*, *Deflection*, *Surface*, *Thermal*
  - src/engines/*Chatter*, *Wear*, *Speed*, *Feed*, *Torque*, *Power*
  - src/engines/SpeedFeedOrchestratorEngine.ts
  - src/engines/FormulaValidationEngine.ts
  - src/algorithms/*.ts (physics algorithms)

State file: C:/PRISM/state/formula-validation-pending.json
Cleared by: enforce-formula-accuracy-gate.py (PreCompact) when FORMULA_ACCURACY.json is fresh
"""
import json
import sys
import os
import re
from datetime import datetime, timezone

STATE_FILE = "C:/PRISM/state/formula-validation-pending.json"
ACCURACY_FILE = "C:/PRISM/mcp-server/state/shared/FORMULA_ACCURACY.json"

# Keywords that indicate physics-related engine files
PHYSICS_KEYWORDS = [
    "force", "kienzle", "taylor", "deflection", "surface", "thermal",
    "chatter", "wear", "speed", "feed", "torque", "power", "roughness",
    "cutting", "spindle", "mrr", "chipload", "constitutive", "stochastic",
    "sld", "stability", "vibration", "damping", "temperature", "coolant",
    "friction", "stress", "strain", "fatigue", "hardness",
]

def is_physics_file(file_path):
    """Check if the file is a physics-related source file."""
    fp = file_path.lower().replace("\\", "/")

    # Direct match: canonical constants file
    if "src/physics/constants" in fp:
        return True

    # Direct match: algorithms directory
    if "src/algorithms/" in fp and fp.endswith(".ts") and ".test." not in fp:
        return True

    # Engine files with physics keywords
    if "src/engines/" in fp and fp.endswith(".ts") and ".test." not in fp:
        basename = os.path.basename(fp).lower().replace(".ts", "").replace("engine", "")
        for kw in PHYSICS_KEYWORDS:
            if kw in basename:
                return True

    return False

def load_state():
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"pending": False, "files_modified": [], "last_set": None}

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

    tool_input = input_data.get("tool_input", {})
    file_path = tool_input.get("file_path", "").replace("\\", "/")

    if not file_path:
        print(json.dumps({"continue": True}))
        return

    if not is_physics_file(file_path):
        print(json.dumps({"continue": True}))
        return

    # Physics file was edited — set pending flag
    state = load_state()
    basename = os.path.basename(file_path)
    now = datetime.now(timezone.utc).isoformat()

    if basename not in state.get("files_modified", []):
        state.setdefault("files_modified", []).append(basename)

    state["pending"] = True
    state["last_set"] = now
    save_state(state)

    # Check if we have recent formula accuracy results
    accuracy_fresh = False
    if os.path.exists(ACCURACY_FILE):
        try:
            mtime = os.path.getmtime(ACCURACY_FILE)
            from datetime import datetime as dt
            accuracy_age_s = (dt.now().timestamp() - mtime)
            # Consider fresh if less than 5 minutes old
            accuracy_fresh = accuracy_age_s < 300
        except Exception:
            pass

    if accuracy_fresh:
        # Results exist and are recent — just note it
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": (
                    f"PHYSICS EDIT: {basename} modified. "
                    f"Formula accuracy results are recent (<5 min). "
                    f"Run /formula-check to re-validate if needed."
                )
            }
        }))
    else:
        # Results are stale or missing — warn
        n_files = len(state.get("files_modified", []))
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": (
                    f"PHYSICS EDIT: {basename} modified ({n_files} physics file(s) this session). "
                    f"Formula validation is PENDING. Run /formula-check (prism_dev formula_accuracy) "
                    f"before compacting to ensure no accuracy regression."
                )
            }
        }))

if __name__ == "__main__":
    main()
