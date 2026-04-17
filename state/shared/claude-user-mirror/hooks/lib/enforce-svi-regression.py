#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: SVI Regression Gate
Domain: SystemVariabilityIndex

Fires on PreCompact. Reads SVI state and warns if Ψ (reachability) has decreased
since the last computation. Ψ should only increase as wiring improves.

Protects: SystemVariabilityIndexEngine
"""
import json
import sys
import os

SVI_FILE = "C:/PRISM/state/shared/SVI.json"

def main():
    try:
        input_data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    # Read current SVI state
    if not os.path.exists(SVI_FILE):
        # SVI not yet computed — allow, but warn
        print(json.dumps({
            "continue": True,
            "systemMessage": "SVI: No SVI.json found. Run svi_compute to establish baseline."
        }))
        return

    try:
        with open(SVI_FILE, 'r', encoding='utf-8') as f:
            svi = json.load(f)
    except (json.JSONDecodeError, Exception):
        print(json.dumps({"continue": True}))
        return

    psi = svi.get("psi_reachability", 0)
    trend = svi.get("trend", "unknown")
    svi_display = svi.get("svi_display", "unknown")
    psi_display = svi.get("psi_display", "unknown")

    if trend == "shrinking":
        print(json.dumps({
            "decision": "warn",
            "reason": f"SVI REGRESSION: Ψ decreased to {psi_display} (trend: shrinking). "
                      f"SVI={svi_display}. Wiring may have been broken. "
                      f"Run svi_compute to verify, then check for dead imports or removed engine connections."
        }))
        return

    if psi < 0.01:
        print(json.dumps({
            "decision": "warn",
            "reason": f"SVI ANOMALY: Ψ={psi_display} is near zero. This suggests SVI computation failed or system is severely under-wired."
        }))
        return

    # All good — report current state
    print(json.dumps({
        "continue": True,
        "systemMessage": f"SVI: {svi_display} | Ψ={psi_display} | Trend: {trend}"
    }))

if __name__ == "__main__":
    main()
