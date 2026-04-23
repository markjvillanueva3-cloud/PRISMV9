#!/usr/bin/env python3
"""Aggregate results from multi-agent team runs.

Usage: python3 team-aggregator.py <team-name> [--json]

Collects step result JSON files from C:/tmp/prism-team-{name}-step*.json,
aggregates them into a unified summary, and appends to telemetry log.
"""
import json
import glob
import os
import sys
from datetime import datetime


def aggregate_team(team_name):
    """Collect all step results for a team run."""
    pattern = f"/tmp/prism-team-{team_name}-*.json"
    if os.name == "nt":
        pattern = f"C:/tmp/prism-team-{team_name}-*.json"

    results = []
    total_findings = 0
    has_block = False
    has_fail = False

    for f in sorted(glob.glob(pattern)):
        try:
            with open(f) as fh:
                data = json.load(fh)
                results.append(data)
                status = data.get("status", "")
                verdict = data.get("verdict", "")
                if status == "block" or verdict == "BLOCK":
                    has_block = True
                if status == "fail":
                    has_fail = True
                findings = data.get("findings", [])
                if isinstance(findings, list):
                    total_findings += len(findings)
        except (json.JSONDecodeError, IOError) as e:
            results.append({"file": f, "error": str(e)})

    if has_block:
        overall_status = "blocked"
    elif has_fail:
        overall_status = "failed"
    elif results:
        overall_status = "complete"
    else:
        overall_status = "no_results"

    summary = {
        "team": team_name,
        "timestamp": datetime.now().isoformat(),
        "steps_completed": len(results),
        "overall_status": overall_status,
        "total_findings": total_findings,
        "results": results,
    }

    telemetry_dir = os.path.expanduser("~/.prism/telemetry")
    os.makedirs(telemetry_dir, exist_ok=True)
    telemetry_path = os.path.join(telemetry_dir, "team-runs.jsonl")
    with open(telemetry_path, "a") as f:
        line = json.dumps(summary)
        f.write(line + chr(10))

    return summary


def print_report(summary):
    """Print a human-readable report from aggregated results."""
    team = summary["team"]
    print(f"TEAM REPORT: {team}-team")
    print("=" * 50)
    print(f"Timestamp: {summary['timestamp']}")
    print(f"Steps completed: {summary['steps_completed']}")
    print(f"Overall status: {summary['overall_status'].upper()}")
    print(f"Total findings: {summary['total_findings']}")
    print()

    for i, result in enumerate(summary.get("results", []), 1):
        agent = result.get("agent", "unknown")
        status = result.get("status", "unknown")
        print(f"  Step {i} ({agent}): {status}")
        if "verdict" in result:
            print(f"    Verdict: {result['verdict']}")
        if "build_status" in result:
            print(f"    Build: {result['build_status']}")
        if "results" in result and isinstance(result["results"], dict):
            r = result["results"]
            if "total" in r:
                print(f"    Tests: {r.get('passed', 0)}/{r.get('total', 0)} passed")
        if "error" in result:
            print(f"    ERROR: {result['error']}")
        print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 team-aggregator.py <team-name>")
        print("  team-name: forge, test, or pipeline")
        sys.exit(1)

    team = sys.argv[1]
    result = aggregate_team(team)

    if "--json" in sys.argv:
        print(json.dumps(result, indent=2))
    else:
        print_report(result)
        print(chr(10) + "Raw JSON saved to ~/.prism/telemetry/team-runs.jsonl")
