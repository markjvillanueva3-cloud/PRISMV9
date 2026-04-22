#!/usr/bin/env python3
"""Generate and store weekly telemetry report."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from telemetry_analyzer import generate_weekly_report, prune_old_telemetry
import json

report = generate_weekly_report()
prune_result = prune_old_telemetry(max_days=30)
report["pruned_entries"] = prune_result["pruned"]
print(json.dumps(report, indent=2))
