#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os, glob
from datetime import datetime, timedelta
from collections import defaultdict, Counter

TELEMETRY_DIR = os.path.expanduser("~/.prism/telemetry")

def read_jsonl(filename):
    path = os.path.join(TELEMETRY_DIR, filename)
    if not os.path.exists(path):
        return []
    entries = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return entries

def analyze_tool_failures():
    failures = read_jsonl("tool-failures.jsonl")
    if not failures:
        return {"total": 0, "by_tool": {}, "by_type": {}}
    by_tool = Counter(f.get("tool_name", "unknown") for f in failures)
    by_type = Counter(f.get("classification", "unknown") for f in failures)
    return {"total": len(failures), "by_tool": dict(by_tool.most_common(10)), "by_type": dict(by_type)}

def analyze_agent_spawns():
    spawns = read_jsonl("agent-spawns.jsonl")
    if not spawns:
        return {"total": 0, "by_type": {}, "by_name": {}}
    by_type = Counter(s.get("agent_type", "unknown") for s in spawns)
    by_name = Counter(s.get("agent_name", "unknown") for s in spawns)
    completed = sum(1 for s in spawns if s.get("status") == "completed")
    return {"total": len(spawns), "completed": completed, "by_type": dict(by_type.most_common(10)), "by_name": dict(by_name.most_common(10))}

def analyze_sessions():
    sessions = read_jsonl("sessions.jsonl")
    if not sessions:
        return {"total": 0}
    return {"total": len(sessions), "reasons": dict(Counter(s.get("reason", "unknown") for s in sessions).most_common(5))}

def analyze_compactions():
    compactions = read_jsonl("compactions.jsonl")
    if not compactions:
        return {"total": 0}
    by_type = Counter(c.get("type", "unknown") for c in compactions)
    return {"total": len(compactions), "by_type": dict(by_type)}

def analyze_stop_failures():
    failures = read_jsonl("stop-failures.jsonl")
    if not failures:
        return {"total": 0}
    by_type = Counter(f.get("type", "unknown") for f in failures)
    return {"total": len(failures), "by_type": dict(by_type)}

def analyze_cron_results():
    results = read_jsonl("cron-results.jsonl")
    if not results:
        return {"total": 0}
    by_cron = defaultdict(lambda: {"pass": 0, "fail": 0})
    for r in results:
        cron = r.get("cron", "unknown")
        status = r.get("status", "unknown")
        by_cron[cron]["pass" if status == "pass" else "fail"] += 1
    reliability = {}
    for cron, counts in by_cron.items():
        total = counts["pass"] + counts["fail"]
        reliability[cron] = {
            "total_runs": total,
            "success_rate": round(counts["pass"] / total, 4) if total > 0 else 0,
            "consecutive_failures": 0
        }
    return {"total": len(results), "by_cron": reliability}

def analyze_review_metrics():
    metrics = read_jsonl("review-metrics.jsonl")
    if not metrics:
        return {"total": 0}
    findings = sum(m.get("findings_count", 0) for m in metrics)
    false_positives = sum(m.get("false_positive_count", 0) for m in metrics)
    return {
        "total_reviews": len(metrics),
        "total_findings": findings,
        "false_positives": false_positives,
        "precision": round(1 - false_positives / max(1, findings), 4) if findings > 0 else None
    }


def analyze_worktrees():
    entries = read_jsonl("worktrees.jsonl")
    if not entries:
        return {"total": 0}
    by_status = Counter(e.get("status", "unknown") for e in entries)
    by_branch = Counter(e.get("branch", "unknown") for e in entries)
    return {"total": len(entries), "by_status": dict(by_status), "by_branch": dict(by_branch.most_common(10))}

def analyze_team_runs():
    entries = read_jsonl("team-runs.jsonl")
    if not entries:
        return {"total": 0}
    by_team = Counter(e.get("team", "unknown") for e in entries)
    by_status = Counter(e.get("overall_status", "unknown") for e in entries)
    total_findings = sum(e.get("total_findings", 0) for e in entries)
    return {"total": len(entries), "by_team": dict(by_team), "by_status": dict(by_status), "total_findings": total_findings}

def analyze_health_checks():
    entries = read_jsonl("health-checks.jsonl")
    if not entries:
        return {"total": 0}
    by_status = Counter(e.get("status", "unknown") for e in entries)
    failed = [e for e in entries if e.get("status") == "fail"]
    failure_reasons = Counter()
    for e in failed:
        for check in e.get("checks", []):
            if check.get("status") == "fail":
                failure_reasons[check.get("name", "unknown")] += 1
    return {"total": len(entries), "by_status": dict(by_status), "failure_reasons": dict(failure_reasons.most_common(10))}

def generate_weekly_report():
    report = {
        "generated_at": datetime.now().isoformat(),
        "period": "last_7_days",
        "tool_failures": analyze_tool_failures(),
        "agent_spawns": analyze_agent_spawns(),
        "sessions": analyze_sessions(),
        "compactions": analyze_compactions(),
        "stop_failures": analyze_stop_failures(),
        "cron_reliability": analyze_cron_results(),
        "code_reviews": analyze_review_metrics(),
        "worktrees": analyze_worktrees(),
        "team_runs": analyze_team_runs(),
        "health_checks": analyze_health_checks(),
    }
    report_path = os.path.join(TELEMETRY_DIR, "weekly-reports.jsonl")
    with open(report_path, "a") as f:
        f.write(json.dumps(report) + chr(10))
    return report

def get_telemetry_size():
    total = 0
    if os.path.exists(TELEMETRY_DIR):
        for f in os.listdir(TELEMETRY_DIR):
            fp = os.path.join(TELEMETRY_DIR, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return {"total_bytes": total, "total_mb": round(total / 1048576, 2)}

def prune_old_telemetry(max_days=30):
    cutoff = datetime.now() - timedelta(days=max_days)
    cutoff_str = cutoff.isoformat()
    pruned = 0
    if not os.path.exists(TELEMETRY_DIR):
        return {"pruned": 0}
    for filename in os.listdir(TELEMETRY_DIR):
        if not filename.endswith(".jsonl"):
            continue
        filepath = os.path.join(TELEMETRY_DIR, filename)
        kept = []
        with open(filepath) as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())
                    ts = entry.get("timestamp", entry.get("generated_at", ""))
                    if ts >= cutoff_str:
                        kept.append(line)
                    else:
                        pruned += 1
                except json.JSONDecodeError:
                    kept.append(line)
        with open(filepath, "w") as f:
            f.writelines(kept)
    return {"pruned": pruned}

if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "report":
        print(json.dumps(generate_weekly_report(), indent=2))
    elif cmd == "size":
        print(json.dumps(get_telemetry_size(), indent=2))
    elif cmd == "prune":
        print(json.dumps(prune_old_telemetry(), indent=2))
    else:
        print(f"Unknown command: {cmd}. Use: report, size, prune")
