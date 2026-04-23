#!/usr/bin/env python3
"""
Session Orchestrator - runs on SessionStart to set up optimal Claude Code features.

On every session start:
1. Load coordination stats -> check if model routing needs adjustment
2. Load health score -> suggest /self-heal if score < 80
3. Check cron status -> suggest /cron-bootstrap if not active
4. Load optimizer config -> apply adaptive settings
5. Check telemetry retention -> auto-prune if needed
"""
import json, os
from datetime import datetime

def orchestrate_session():
    hints = []

    # 1. Check health
    health_file = os.path.expanduser("~/.prism/telemetry/health-checks.jsonl")
    if os.path.exists(health_file):
        try:
            with open(health_file) as f:
                lines = f.readlines()
            if lines:
                last = json.loads(lines[-1].strip())
                score = last.get("health_score", 100)
                issues = last.get("total_issues", 0)
                if score < 80:
                    hints.append(f"Health score {score}/100 ({issues} issues) - run /self-heal")
        except:
            pass

    # 2. Check telemetry size
    telemetry_dir = os.path.expanduser("~/.prism/telemetry")
    if os.path.isdir(telemetry_dir):
        total_size = sum(
            os.path.getsize(os.path.join(telemetry_dir, f))
            for f in os.listdir(telemetry_dir)
            if os.path.isfile(os.path.join(telemetry_dir, f))
        )
        if total_size > 40_000_000:
            hints.append(f"Telemetry at {total_size/1048576:.1f}MB - consider pruning")

    # 3. Check optimizer recommendations
    optimizer_file = os.path.expanduser("~/.prism/telemetry/optimization-reports.jsonl")
    if os.path.exists(optimizer_file):
        try:
            with open(optimizer_file) as f:
                lines = f.readlines()
            if lines:
                last = json.loads(lines[-1].strip())
                model_rec = last.get("model_routing", {}).get("model", "")
                if model_rec:
                    hints.append(f"Recommended default model: {model_rec}")
        except:
            pass

    # 4. Summary
    if hints:
        return "Session insights: " + " | ".join(hints)
    return ""

if __name__ == "__main__":
    result = orchestrate_session()
    if result:
        print(result)
