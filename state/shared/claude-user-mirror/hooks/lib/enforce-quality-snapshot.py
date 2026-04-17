#!/usr/bin/env python3
"""
ENFORCEMENT HOOK: Pre-Compact Quality Dashboard Snapshot
Fires on PreCompact event.

Reads all quality data sources and produces a compact quality summary
in the systemMessage so quality metrics are visible at every compact.

Also detects regressions since the last snapshot and warns.
"""
import json
import os
from datetime import datetime

SHARED = "C:/PRISM/state/shared"
DASHBOARD = os.path.join(SHARED, "QUALITY_DASHBOARD.json")
QUALITY_SCORES = os.path.join(SHARED, "QUALITY_SCORES.json")
SVI = os.path.join(SHARED, "SVI.json")
FORMULA_ACCURACY = os.path.join(SHARED, "FORMULA_ACCURACY.json")
SELF_IMPROVEMENT = os.path.join(SHARED, "SELF_IMPROVEMENT_PATTERNS.json")
AUTO_FIX = os.path.join(SHARED, "AUTO_FIX_CANDIDATES.json")


def load(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    parts = []
    warnings = []

    # Quality Scores
    qs = load(QUALITY_SCORES)
    if qs:
        sys_q = qs.get("system_Q", 0)
        mean_q = qs.get("mean_Q", 0)
        below70 = qs.get("engines_below_70", 0)
        parts.append(f"Q={sys_q} mean={mean_q} below70={below70}")
        if sys_q < 0.70:
            warnings.append(f"QUALITY LOW: system Q={sys_q}")
    else:
        parts.append("Q=no data")

    # SVI
    svi = load(SVI)
    if svi:
        psi = svi.get("psi_pct", svi.get("reachability_pct", 0))
        parts.append(f"Psi={psi}%")
    else:
        parts.append("Psi=no data")

    # Formula Accuracy
    fa = load(FORMULA_ACCURACY)
    if fa:
        acc = fa.get("aggregate_accuracy", 0)
        parts.append(f"accuracy={acc}")
        if acc > 0 and acc < 0.90:
            warnings.append(f"FORMULA ACCURACY CRITICAL: {acc}")
        elif acc > 0 and acc < 0.95:
            warnings.append(f"FORMULA ACCURACY WARN: {acc}")
    else:
        parts.append("accuracy=no data")

    # Self-Improvement
    si = load(SELF_IMPROVEMENT)
    if si:
        patterns = si.get("total_patterns", 0)
        parts.append(f"patterns={patterns}")
    else:
        parts.append("patterns=no data")

    # Auto-Fix
    af = load(AUTO_FIX)
    if af:
        candidates = af.get("candidates_generated", 0)
        parts.append(f"fixes={candidates}")

    # Regression check against previous dashboard
    prev = load(DASHBOARD)
    if prev and qs:
        prev_q = prev.get("system_Q", 0)
        curr_q = qs.get("system_Q", 0)
        if prev_q > 0 and curr_q > 0 and curr_q < prev_q - 0.05:
            warnings.append(f"Q REGRESSION: {prev_q} -> {curr_q}")

    summary = " | ".join(parts)
    if warnings:
        warn_str = " | ".join(warnings)
        msg = f"QUALITY SNAPSHOT: {summary} | WARNINGS: {warn_str}"
    else:
        msg = f"QUALITY SNAPSHOT: {summary}"

    print(json.dumps({"systemMessage": msg, "continue": True}))


if __name__ == "__main__":
    main()
