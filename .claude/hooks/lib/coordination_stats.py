#!/usr/bin/env python3
"""Stochastic coordination layer -- probabilistic tracking for PRISM system behavior."""
import json, os, time, math
from collections import defaultdict
from datetime import datetime

STATS_FILE = os.path.expanduser("~/.prism/coordination-stats.json")

def load_stats():
    """Load or initialize coordination stats."""
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {
        "hook_stats": {},
        "dedup_stats": {},
        "retry_stats": {},
        "timeout_stats": {},
        "cache_stats": {},
        "agent_stats": {},
        "token_stats": [],
        "updated_at": datetime.now().isoformat()
    }

def save_stats(stats):
    """Persist stats to disk."""
    os.makedirs(os.path.dirname(STATS_FILE), exist_ok=True)
    stats["updated_at"] = datetime.now().isoformat()
    with open(STATS_FILE, "w") as f:
        json.dump(stats, f, indent=2)

def record_hook_result(hook_name, success, latency_ms=0):
    """Record hook execution result for P(success) tracking."""
    stats = load_stats()
    if hook_name not in stats["hook_stats"]:
        stats["hook_stats"][hook_name] = {"success": 0, "failure": 0, "total": 0, "latency_sum": 0, "latency_sq_sum": 0}
    h = stats["hook_stats"][hook_name]
    h["total"] += 1
    h["success" if success else "failure"] += 1
    h["latency_sum"] += latency_ms
    h["latency_sq_sum"] += latency_ms * latency_ms
    save_stats(stats)

def record_dedup_event(tool_name, was_duplicate, was_legitimate):
    """Track dedup effectiveness: P(false positive), P(missed duplicate)."""
    stats = load_stats()
    if tool_name not in stats["dedup_stats"]:
        stats["dedup_stats"][tool_name] = {"blocked": 0, "allowed": 0, "false_positive": 0, "true_positive": 0}
    d = stats["dedup_stats"][tool_name]
    if was_duplicate:
        d["blocked"] += 1
        if was_legitimate:
            d["false_positive"] += 1
        else:
            d["true_positive"] += 1
    else:
        d["allowed"] += 1
    save_stats(stats)

def record_retry_result(error_type, attempt_number, success):
    """Track P(success | attempt N, error_type)."""
    stats = load_stats()
    if error_type not in stats["retry_stats"]:
        stats["retry_stats"][error_type] = {}
    key = str(attempt_number)
    if key not in stats["retry_stats"][error_type]:
        stats["retry_stats"][error_type][key] = {"success": 0, "failure": 0}
    stats["retry_stats"][error_type][key]["success" if success else "failure"] += 1
    save_stats(stats)

def record_timeout_event(action_name, effort_level, latency_ms, timed_out):
    """Track latency distribution for timeout calibration."""
    stats = load_stats()
    if action_name not in stats["timeout_stats"]:
        stats["timeout_stats"][action_name] = {"latencies": [], "timeouts": 0, "total": 0}
    t = stats["timeout_stats"][action_name]
    t["total"] += 1
    if timed_out:
        t["timeouts"] += 1
    else:
        t["latencies"].append(latency_ms)
        if len(t["latencies"]) > 100:
            t["latencies"] = t["latencies"][-100:]
    save_stats(stats)

def record_cache_event(cache_name, hit, stale=False):
    """Track cache performance."""
    stats = load_stats()
    if cache_name not in stats["cache_stats"]:
        stats["cache_stats"][cache_name] = {"hits": 0, "misses": 0, "stale": 0}
    c = stats["cache_stats"][cache_name]
    if hit:
        c["hits"] += 1
        if stale:
            c["stale"] += 1
    else:
        c["misses"] += 1
    save_stats(stats)

def record_agent_completion(model, success, turns_used, tokens_estimated=0):
    """Track P(success | model, complexity)."""
    stats = load_stats()
    if model not in stats["agent_stats"]:
        stats["agent_stats"][model] = {"success": 0, "failure": 0, "total": 0, "turns": [], "tokens": []}
    a = stats["agent_stats"][model]
    a["total"] += 1
    a["success" if success else "failure"] += 1
    a["turns"].append(turns_used)
    a["tokens"].append(tokens_estimated)
    if len(a["turns"]) > 50:
        a["turns"] = a["turns"][-50:]
        a["tokens"] = a["tokens"][-50:]
    save_stats(stats)

def record_session_tokens(total_tokens):
    """Track per-session token costs for variance analysis."""
    stats = load_stats()
    stats["token_stats"].append({"timestamp": datetime.now().isoformat(), "tokens": total_tokens})
    if len(stats["token_stats"]) > 100:
        stats["token_stats"] = stats["token_stats"][-100:]
    save_stats(stats)

def get_hook_probability(hook_name):
    """Calculate P(success) for a hook with Wilson score 95% CI."""
    stats = load_stats()
    h = stats.get("hook_stats", {}).get(hook_name, {})
    total = h.get("total", 0)
    if total == 0:
        return {"p_success": None, "sample_size": 0}
    p = h["success"] / total
    z = 1.96
    denom = 1 + z*z/total
    center = (p + z*z/(2*total)) / denom
    margin = z * math.sqrt((p*(1-p) + z*z/(4*total)) / total) / denom
    mean_latency = h["latency_sum"] / total if total > 0 else 0
    return {
        "p_success": round(p, 4),
        "ci_lower": round(max(0, center - margin), 4),
        "ci_upper": round(min(1, center + margin), 4),
        "sample_size": total,
        "mean_latency_ms": round(mean_latency, 1)
    }

def get_dedup_effectiveness(tool_name):
    """Calculate dedup false positive rate."""
    stats = load_stats()
    d = stats.get("dedup_stats", {}).get(tool_name, {})
    blocked = d.get("blocked", 0)
    if blocked == 0:
        return {"p_false_positive": None, "sample_size": 0}
    fp_rate = d.get("false_positive", 0) / blocked
    return {"p_false_positive": round(fp_rate, 4), "blocked": blocked, "false_positives": d.get("false_positive", 0)}

def get_retry_probability(error_type):
    """Calculate P(success | attempt N) for an error type."""
    stats = load_stats()
    r = stats.get("retry_stats", {}).get(error_type, {})
    if not r:
        return {"probabilities": {}, "sample_size": 0}
    probs = {}
    total_samples = 0
    for attempt, counts in r.items():
        total = counts["success"] + counts["failure"]
        total_samples += total
        probs[attempt] = round(counts["success"] / total, 4) if total > 0 else None
    return {"probabilities": probs, "sample_size": total_samples}

def get_timeout_calibration(action_name):
    """Calculate recommended timeout from latency distribution (p99 + 2*sigma)."""
    stats = load_stats()
    t = stats.get("timeout_stats", {}).get(action_name, {})
    latencies = t.get("latencies", [])
    if len(latencies) < 5:
        return {"recommended_timeout_ms": None, "sample_size": len(latencies)}
    mean = sum(latencies) / len(latencies)
    variance = sum((x - mean)**2 for x in latencies) / len(latencies)
    std = math.sqrt(variance)
    p99 = sorted(latencies)[int(len(latencies) * 0.99)]
    recommended = p99 + 2 * std
    return {
        "mean_ms": round(mean, 1),
        "std_ms": round(std, 1),
        "p99_ms": round(p99, 1),
        "recommended_timeout_ms": round(recommended, 0),
        "sample_size": len(latencies),
        "timeout_rate": round(t.get("timeouts", 0) / max(1, t.get("total", 1)), 4)
    }

def get_cache_effectiveness(cache_name):
    """Calculate cache hit rate and stale rate."""
    stats = load_stats()
    c = stats.get("cache_stats", {}).get(cache_name, {})
    total = c.get("hits", 0) + c.get("misses", 0)
    if total == 0:
        return {"hit_rate": None, "stale_rate": None, "sample_size": 0}
    hit_rate = c["hits"] / total
    stale_rate = c.get("stale", 0) / max(1, c["hits"])
    return {
        "hit_rate": round(hit_rate, 4),
        "stale_rate": round(stale_rate, 4),
        "hits": c["hits"],
        "misses": c["misses"],
        "stale": c.get("stale", 0),
        "sample_size": total
    }

def get_agent_model_stats(model):
    """Get P(success | model) and performance metrics."""
    stats = load_stats()
    a = stats.get("agent_stats", {}).get(model, {})
    total = a.get("total", 0)
    if total == 0:
        return {"p_success": None, "sample_size": 0}
    turns = a.get("turns", [])
    tokens = a.get("tokens", [])
    return {
        "p_success": round(a["success"] / total, 4),
        "sample_size": total,
        "mean_turns": round(sum(turns) / len(turns), 1) if turns else None,
        "mean_tokens": round(sum(tokens) / len(tokens), 0) if tokens else None
    }

def get_full_dashboard():
    """Generate complete stochastic coordination dashboard."""
    stats = load_stats()
    dashboard = {
        "timestamp": datetime.now().isoformat(),
        "hooks": {name: get_hook_probability(name) for name in stats.get("hook_stats", {})},
        "dedup": {name: get_dedup_effectiveness(name) for name in stats.get("dedup_stats", {})},
        "retries": {name: get_retry_probability(name) for name in stats.get("retry_stats", {})},
        "timeouts": {name: get_timeout_calibration(name) for name in stats.get("timeout_stats", {})},
        "caches": {name: get_cache_effectiveness(name) for name in stats.get("cache_stats", {})},
        "agents": {name: get_agent_model_stats(name) for name in stats.get("agent_stats", {})},
        "token_variance": _calc_token_variance(stats.get("token_stats", []))
    }
    return dashboard

def _calc_token_variance(token_stats):
    """Calculate token cost mean, sigma, 95% CI."""
    if len(token_stats) < 3:
        return {"mean": None, "std": None, "ci_95": None, "sample_size": len(token_stats)}
    values = [t["tokens"] for t in token_stats]
    mean = sum(values) / len(values)
    variance = sum((x - mean)**2 for x in values) / (len(values) - 1)
    std = math.sqrt(variance)
    ci_margin = 1.96 * std / math.sqrt(len(values))
    return {
        "mean": round(mean, 0),
        "std": round(std, 0),
        "ci_95_lower": round(mean - ci_margin, 0),
        "ci_95_upper": round(mean + ci_margin, 0),
        "sample_size": len(values)
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "dashboard":
        print(json.dumps(get_full_dashboard(), indent=2))
    else:
        print("Usage: coordination_stats.py dashboard")
