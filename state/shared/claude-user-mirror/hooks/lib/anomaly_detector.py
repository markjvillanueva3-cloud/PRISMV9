#!/usr/bin/env python3
"""CUSUM/EWMA anomaly detection for coordination metrics."""
import json, os, math

STATS_FILE = os.path.expanduser("~/.prism/coordination-stats.json")

def ewma_detect(values, span=10, threshold=2.0):
    """Exponentially weighted moving average anomaly detection.

    Tracks a smoothed mean and variance, flags points where the deviation
    from the EWMA exceeds threshold standard deviations.
    """
    if len(values) < span:
        return []
    alpha = 2.0 / (span + 1)
    ewma = values[0]
    ewma_var = 0
    anomalies = []
    for i, v in enumerate(values):
        diff = v - ewma
        ewma = alpha * v + (1 - alpha) * ewma
        ewma_var = alpha * diff * diff + (1 - alpha) * ewma_var
        std = math.sqrt(ewma_var) if ewma_var > 0 else 1
        if i >= span and abs(diff) > threshold * std:
            anomalies.append({"index": i, "value": v, "expected": round(ewma, 2), "z_score": round(diff / std, 2)})
    return anomalies

def cusum_detect(values, target=None, threshold=5.0, drift=0.5):
    """Cumulative sum change-point detection (Page 1954).

    Maintains upper and lower cumulative sums; when either exceeds
    threshold, a regime change is flagged and the accumulators reset.
    """
    if len(values) < 5:
        return []
    if target is None:
        target = sum(values[:10]) / min(10, len(values))
    s_pos = 0
    s_neg = 0
    changes = []
    for i, v in enumerate(values):
        s_pos = max(0, s_pos + v - target - drift)
        s_neg = max(0, s_neg - v + target - drift)
        if s_pos > threshold or s_neg > threshold:
            changes.append({"index": i, "value": v, "direction": "up" if s_pos > threshold else "down"})
            s_pos = 0
            s_neg = 0
    return changes

def detect_latency_anomalies(action_name=None):
    """Run EWMA anomaly detection on latency data for one or all actions."""
    if not os.path.exists(STATS_FILE):
        return {}
    with open(STATS_FILE) as f:
        stats = json.load(f)
    timeout_stats = stats.get("timeout_stats", {})
    results = {}
    targets = [action_name] if action_name else list(timeout_stats.keys())
    for name in targets:
        latencies = timeout_stats.get(name, {}).get("latencies", [])
        if len(latencies) >= 10:
            results[name] = {
                "ewma_anomalies": ewma_detect(latencies),
                "cusum_changes": cusum_detect(latencies)
            }
    return results

def detect_token_anomalies():
    """Run anomaly detection on session token costs."""
    if not os.path.exists(STATS_FILE):
        return {"ewma_anomalies": [], "cusum_changes": []}
    with open(STATS_FILE) as f:
        stats = json.load(f)
    tokens = [t["tokens"] for t in stats.get("token_stats", [])]
    if len(tokens) < 10:
        return {"ewma_anomalies": [], "cusum_changes": [], "sample_size": len(tokens)}
    return {
        "ewma_anomalies": ewma_detect(tokens),
        "cusum_changes": cusum_detect(tokens),
        "sample_size": len(tokens)
    }

def detect_hook_degradation():
    """Detect hooks whose success rate is declining via failure rate analysis."""
    if not os.path.exists(STATS_FILE):
        return {}
    with open(STATS_FILE) as f:
        stats = json.load(f)
    results = {}
    for name, h in stats.get("hook_stats", {}).items():
        total = h.get("total", 0)
        if total >= 10:
            p_fail = h.get("failure", 0) / total
            if p_fail > 0.1:
                results[name] = {
                    "p_failure": round(p_fail, 4),
                    "total": total,
                    "failures": h.get("failure", 0),
                    "severity": "high" if p_fail > 0.3 else "medium"
                }
    return results

def full_anomaly_report():
    """Generate complete anomaly detection report."""
    return {
        "token_anomalies": detect_token_anomalies(),
        "latency_anomalies": detect_latency_anomalies(),
        "hook_degradation": detect_hook_degradation()
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "tokens":
        print(json.dumps(detect_token_anomalies(), indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "latency":
        action = sys.argv[2] if len(sys.argv) > 2 else None
        print(json.dumps(detect_latency_anomalies(action), indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "hooks":
        print(json.dumps(detect_hook_degradation(), indent=2))
    else:
        print(json.dumps(full_anomaly_report(), indent=2))
