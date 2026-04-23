#!/usr/bin/env python3
# PRISM Code Review Metrics Tracker
# Appends review findings to ~/.prism/telemetry/review-metrics.jsonl
#
# Usage:
#   python review-metrics.py --pr 42 --critical 0 --high 2 --medium 5 --low 3 --fp 1 --duration 45
#   python review-metrics.py --summary
#   python review-metrics.py --trend 30

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

TELEMETRY_DIR = Path.home() / ".prism" / "telemetry"
METRICS_FILE = TELEMETRY_DIR / "review-metrics.jsonl"


def ensure_dir():
    TELEMETRY_DIR.mkdir(parents=True, exist_ok=True)


def append_review(pr, crit, high, med, low, fp, dur, scope="", files=0, engines=0):
    ensure_dir()
    total = crit + high + med + low
    rec = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "pr_number": pr,
        "findings_count": total,
        "severity_breakdown": {"critical": crit, "high": high, "medium": med, "low": low},
        "false_positive_count": fp,
        "duration_seconds": dur,
        "scope": scope,
        "files_reviewed": files,
        "engines_analyzed": engines,
        "verdict": "PASS" if (crit + high) == 0 else "NEEDS_CHANGES",
        "precision": round(1.0 - (fp / max(total, 1)), 3),
    }
    with open(METRICS_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + chr(10))
    sb = rec["severity_breakdown"]
    print(
        f"Recorded PR#{pr}: {total} findings "
        f'({sb["critical"]}C/{sb["high"]}H/{sb["medium"]}M/{sb["low"]}L), '
        f'{fp}FP, {rec["verdict"]}'
    )
    return rec


def load_records():
    if not METRICS_FILE.exists():
        return []
    recs = []
    with open(METRICS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    recs.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return recs


def print_summary():
    records = load_records()
    if not records:
        print("No review records found.")
        return
    total = len(records)
    pass_c = sum(1 for r in records if r.get("verdict") == "PASS")
    total_f = sum(r.get("findings_count", 0) for r in records)
    total_fp = sum(r.get("false_positive_count", 0) for r in records)
    total_crit = sum(r["severity_breakdown"]["critical"] for r in records)
    total_high = sum(r["severity_breakdown"]["high"] for r in records)
    avg_dur = sum(r.get("duration_seconds", 0) for r in records) / max(total, 1)
    avg_prec = sum(r.get("precision", 1.0) for r in records) / max(total, 1)
    print("=== PRISM Code Review Metrics Summary ===")
    print(f"Total reviews:     {total}")
    print(f"Pass rate:         {pass_c}/{total} ({100*pass_c/total:.1f}%)")
    print(f"Total findings:    {total_f} ({total_crit} critical, {total_high} high)")
    print(f"False positives:   {total_fp}")
    print(f"Avg precision:     {avg_prec:.1%}")
    print(f"Avg duration:      {avg_dur:.0f}s")
    print()
    print("--- Last 5 Reviews ---")
    for r in records[-5:]:
        ts = r.get("timestamp", "unknown")[:19]
        pr = r.get("pr_number", "?")
        v = r.get("verdict", "?")
        fc = r.get("findings_count", 0)
        sb = r.get("severity_breakdown", {})
        print(
            f'  {ts}  PR#{pr:>4}  {v:<14}  '
            f'{fc} findings ({sb.get("critical",0)}C/{sb.get("high",0)}H/'
            f'{sb.get("medium",0)}M/{sb.get("low",0)}L)'
        )


def print_trend(days):
    records = load_records()
    if not records:
        print("No review records found.")
        return
    cutoff = datetime.utcnow() - timedelta(days=days)
    recent = []
    for r in records:
        try:
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
            if ts.replace(tzinfo=None) >= cutoff:
                recent.append(r)
        except (KeyError, ValueError):
            pass
    if not recent:
        print(f"No reviews in the last {days} days.")
        return
    total = len(recent)
    pass_c = sum(1 for r in recent if r.get("verdict") == "PASS")
    avg_f = sum(r.get("findings_count", 0) for r in recent) / max(total, 1)
    avg_fp = sum(r.get("false_positive_count", 0) for r in recent) / max(total, 1)
    print(f"=== Trend: Last {days} Days ===")
    print(f"Reviews:           {total}")
    print(f"Pass rate:         {100*pass_c/total:.1f}%")
    print(f"Avg findings/PR:   {avg_f:.1f}")
    print(f"Avg FP/PR:         {avg_fp:.1f}")
    sev = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for r in recent:
        sb = r.get("severity_breakdown", {})
        for s in sev:
            sev[s] += sb.get(s, 0)
    tf = sum(sev.values()) or 1
    print(
        f'Severity dist:     C={sev["critical"]} ({100*sev["critical"]/tf:.0f}%) '
        f'H={sev["high"]} ({100*sev["high"]/tf:.0f}%) '
        f'M={sev["medium"]} ({100*sev["medium"]/tf:.0f}%) '
        f'L={sev["low"]} ({100*sev["low"]/tf:.0f}%)'
    )


def main():
    p = argparse.ArgumentParser(description="PRISM Code Review Metrics Tracker")
    p.add_argument("--pr", type=int, help="PR number")
    p.add_argument("--critical", type=int, default=0)
    p.add_argument("--high", type=int, default=0)
    p.add_argument("--medium", type=int, default=0)
    p.add_argument("--low", type=int, default=0)
    p.add_argument("--fp", type=int, default=0, help="False positive count")
    p.add_argument("--duration", type=int, default=0, help="Duration in seconds")
    p.add_argument("--scope", type=str, default="")
    p.add_argument("--files-reviewed", type=int, default=0)
    p.add_argument("--engines-analyzed", type=int, default=0)
    p.add_argument("--from-json", type=str, help="JSON severity breakdown")
    p.add_argument("--summary", action="store_true", help="Print summary")
    p.add_argument("--trend", type=int, metavar="DAYS", help="Show N-day trend")
    a = p.parse_args()
    if a.summary:
        print_summary()
        return
    if a.trend:
        print_trend(a.trend)
        return
    if a.pr is None:
        p.error("--pr is required when recording a review")
    if a.from_json:
        try:
            d = json.loads(a.from_json)
            a.critical = d.get("critical", a.critical)
            a.high = d.get("high", a.high)
            a.medium = d.get("medium", a.medium)
            a.low = d.get("low", a.low)
            a.fp = d.get("false_positives", a.fp)
            a.duration = d.get("duration", a.duration)
        except json.JSONDecodeError as e:
            p.error(f"Invalid JSON for --from-json: {e}")
    append_review(
        a.pr, a.critical, a.high, a.medium, a.low,
        a.fp, a.duration, a.scope, a.files_reviewed, a.engines_analyzed,
    )


if __name__ == "__main__":
    main()
