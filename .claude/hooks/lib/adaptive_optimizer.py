#!/usr/bin/env python3
"""PRISM Adaptive Optimizer -- ML-based auto-tuning of all system parameters."""
import json, os, math, sys
from datetime import datetime
from collections import defaultdict

STATS_FILE = os.path.expanduser("~/.prism/coordination-stats.json")
OPTIMIZER_CONFIG = os.path.expanduser("~/.prism/optimizer-config.json")


def load_stats():
    if os.path.exists(STATS_FILE):
        try:
            with open(STATS_FILE) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {}


def load_optimizer_config():
    if os.path.exists(OPTIMIZER_CONFIG):
        try:
            with open(OPTIMIZER_CONFIG) as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            pass
    return {
        "model_routing": {"haiku_threshold": 0.95, "sonnet_threshold": 0.85, "opus_fallback": True},
        "effort_routing": {"low_max_latency_ms": 5000, "medium_max_latency_ms": 30000, "high_max_latency_ms": 120000},
        "cron_frequency": {}, "dedup_windows": {}, "ab_tests": {}, "updated_at": None
    }


def save_optimizer_config(config):
    config["updated_at"] = datetime.now().isoformat()
    os.makedirs(os.path.dirname(OPTIMIZER_CONFIG), exist_ok=True)
    with open(OPTIMIZER_CONFIG, "w") as f:
        json.dump(config, f, indent=2)


def predict_optimal_model(task_features):
    """Logistic regression-style model selector based on complexity and historical success."""
    stats = load_stats()
    agent_stats = stats.get("agent_stats", {})
    model_success = {}
    for model in ["haiku", "sonnet", "opus"]:
        ms = agent_stats.get(model, {})
        total = ms.get("total", 0)
        if total >= 5:
            model_success[model] = ms.get("success", 0) / total
        else:
            model_success[model] = {"haiku": 0.7, "sonnet": 0.85, "opus": 0.95}[model]
    complexity = task_features.get("complexity_score", 5)
    file_count = task_features.get("file_count", 1)
    if complexity <= 3 and file_count <= 2 and model_success.get("haiku", 0) >= 0.9:
        return {"model": "haiku", "confidence": model_success["haiku"], "reason": "Low complexity, haiku success rate sufficient"}
    elif complexity <= 7 and model_success.get("sonnet", 0) >= 0.85:
        return {"model": "sonnet", "confidence": model_success["sonnet"], "reason": "Medium complexity, sonnet success rate sufficient"}
    else:
        return {"model": "opus", "confidence": model_success.get("opus", 0.95), "reason": "High complexity or lower-tier success rates insufficient"}


def predict_optimal_effort(action_name):
    """Predict minimum effort level for P(success) > 0.95 using latency data."""
    stats = load_stats()
    timeout_stats = stats.get("timeout_stats", {}).get(action_name, {})
    latencies = timeout_stats.get("latencies", [])
    if len(latencies) < 5:
        return {"effort": "medium", "reason": "Insufficient data, using default"}
    mean_latency = sum(latencies) / len(latencies)
    config = load_optimizer_config()
    if mean_latency < config["effort_routing"]["low_max_latency_ms"]:
        return {"effort": "low", "mean_latency_ms": round(mean_latency), "reason": f"Mean latency {mean_latency:.0f}ms fits low effort"}
    elif mean_latency < config["effort_routing"]["medium_max_latency_ms"]:
        return {"effort": "medium", "mean_latency_ms": round(mean_latency), "reason": f"Mean latency {mean_latency:.0f}ms fits medium effort"}
    else:
        return {"effort": "high", "mean_latency_ms": round(mean_latency), "reason": f"Mean latency {mean_latency:.0f}ms requires high effort"}


def optimize_max_turns(agent_type):
    """Set maxTurns = P95 of turns-to-completion distribution + 20% margin."""
    stats = load_stats()
    all_turns = []
    for _model, ms in stats.get("agent_stats", {}).items():
        turns = ms.get("turns", [])
        all_turns.extend(turns)
    if len(all_turns) < 5:
        return {"max_turns": 30, "reason": "Insufficient data, using default 30"}
    sorted_turns = sorted(all_turns)
    p95_idx = int(len(sorted_turns) * 0.95)
    p95 = sorted_turns[min(p95_idx, len(sorted_turns) - 1)]
    recommended = int(p95 * 1.2)
    recommended = max(10, min(100, recommended))
    return {"max_turns": recommended, "p95_turns": p95, "sample_size": len(all_turns), "reason": f"P95={p95} turns + 20% margin"}


def optimize_skill_model(skill_name):
    """Auto-promote/demote skill model tier based on success rate."""
    stats = load_stats()
    agent_stats = stats.get("agent_stats", {})
    recommendations = []
    for model in ["haiku", "sonnet", "opus"]:
        ms = agent_stats.get(model, {})
        total = ms.get("total", 0)
        if total >= 10:
            success_rate = ms.get("success", 0) / total
            recommendations.append({"model": model, "success_rate": round(success_rate, 4), "sample_size": total})
    if not recommendations:
        return {"recommendation": "sonnet", "reason": "No data, default to sonnet", "skill": skill_name}
    for rec in recommendations:
        if rec["success_rate"] >= 0.9:
            return {"recommendation": rec["model"], "reason": f"P(success)={rec['success_rate']} >= 0.9", "skill": skill_name, "data": recommendations}
    return {"recommendation": "opus", "reason": "No model meets 0.9 threshold, defaulting to opus", "skill": skill_name, "data": recommendations}


def predict_token_budget(task_type="general"):
    """Estimate token cost from historical data."""
    stats = load_stats()
    token_stats = stats.get("token_stats", [])
    if len(token_stats) < 3:
        return {"predicted_tokens": 50000, "confidence": "low", "reason": "Insufficient data", "task_type": task_type}
    values = [t.get("tokens", t) if isinstance(t, dict) else t for t in token_stats]
    values = [v for v in values if isinstance(v, (int, float)) and v > 0]
    if len(values) < 3:
        return {"predicted_tokens": 50000, "confidence": "low", "reason": "Insufficient numeric data", "task_type": task_type}
    mean_val = sum(values) / len(values)
    variance = sum((x - mean_val) ** 2 for x in values) / (len(values) - 1)
    std = math.sqrt(variance)
    median = sorted(values)[len(values) // 2]
    return {"predicted_tokens": round(mean_val), "std": round(std), "median": round(median),
            "warning_threshold": round(median * 2),
            "confidence": "high" if len(values) >= 20 else "medium" if len(values) >= 10 else "low",
            "sample_size": len(values), "task_type": task_type}


def rank_hook_priorities():
    """Rank hooks by P(trigger) x impact. Auto-skip low-impact under pressure."""
    stats = load_stats()
    hook_stats = stats.get("hook_stats", {})
    rankings = []
    for hook_name, hs in hook_stats.items():
        total = hs.get("total", 0)
        if total == 0:
            continue
        success_rate = hs.get("success", 0) / total
        mean_latency = hs.get("latency_sum", 0) / total if total > 0 else 0
        trigger_freq = total
        impact = 1 - success_rate + 0.1
        latency_cost = max(1, mean_latency)
        priority_score = (trigger_freq * impact) / latency_cost
        rankings.append({"hook": hook_name, "priority_score": round(priority_score, 4),
                         "trigger_count": total, "success_rate": round(success_rate, 4),
                         "mean_latency_ms": round(mean_latency, 1)})
    rankings.sort(key=lambda x: x["priority_score"], reverse=True)
    return {"rankings": rankings, "skip_candidates": [r for r in rankings if r["priority_score"] < 0.01]}


def optimize_cron_frequency(cron_name, history):
    """Adaptive cron: reduce after 10 no-change, increase after 3 consecutive changes."""
    if not history:
        return {"action": "keep", "cron": cron_name, "reason": "No history"}
    recent = history[-10:]
    no_changes = [h for h in recent if not h.get("had_changes", False)]
    if len(no_changes) >= 10:
        return {"action": "reduce", "cron": cron_name, "reason": "10 consecutive no-change runs", "suggested_factor": 2.0}
    elif len(recent) >= 3 and all(h.get("had_changes") for h in recent[-3:]):
        return {"action": "increase", "cron": cron_name, "reason": "3 consecutive changes detected", "suggested_factor": 0.5}
    else:
        changes = [h for h in recent if h.get("had_changes", False)]
        return {"action": "keep", "cron": cron_name, "reason": f"{len(changes)}/{len(recent)} had changes"}


def create_ab_test(test_name, parameter, control_value, treatment_value):
    """Create an A/B test for a system parameter."""
    config = load_optimizer_config()
    config["ab_tests"][test_name] = {
        "parameter": parameter, "control": control_value, "treatment": treatment_value,
        "control_results": [], "treatment_results": [],
        "started_at": datetime.now().isoformat(), "status": "active"
    }
    save_optimizer_config(config)
    return {"test": test_name, "status": "created"}


def record_ab_result(test_name, is_treatment, metric_value):
    """Record a result for an A/B test."""
    config = load_optimizer_config()
    test = config.get("ab_tests", {}).get(test_name)
    if not test or test["status"] != "active":
        return {"error": "Test not found or not active"}
    key = "treatment_results" if is_treatment else "control_results"
    test[key].append(metric_value)
    save_optimizer_config(config)
    return {"recorded": True, "group": "treatment" if is_treatment else "control"}


def evaluate_ab_test(test_name):
    """Evaluate A/B test using Welch t-test."""
    config = load_optimizer_config()
    test = config.get("ab_tests", {}).get(test_name)
    if not test:
        return {"error": "Test not found"}
    control = test["control_results"]
    treatment = test["treatment_results"]
    if len(control) < 5 or len(treatment) < 5:
        return {"status": "insufficient_data", "control_n": len(control), "treatment_n": len(treatment)}
    mean_c = sum(control) / len(control)
    mean_t = sum(treatment) / len(treatment)
    var_c = sum((x - mean_c) ** 2 for x in control) / (len(control) - 1)
    var_t = sum((x - mean_t) ** 2 for x in treatment) / (len(treatment) - 1)
    se = math.sqrt(var_c / len(control) + var_t / len(treatment))
    if se == 0:
        return {"status": "no_variance", "mean_control": mean_c, "mean_treatment": mean_t}
    t_stat = (mean_t - mean_c) / se
    significant = abs(t_stat) > 1.96
    better = "treatment" if mean_t > mean_c else "control"
    result = {"status": "significant" if significant else "not_significant",
              "mean_control": round(mean_c, 4), "mean_treatment": round(mean_t, 4),
              "delta": round(mean_t - mean_c, 4),
              "delta_pct": round((mean_t - mean_c) / max(0.001, abs(mean_c)) * 100, 2),
              "t_statistic": round(t_stat, 4), "better": better,
              "recommendation": f"Adopt {better} value" if significant else "Continue testing",
              "control_n": len(control), "treatment_n": len(treatment)}
    if significant:
        test["status"] = "concluded"
        test["result"] = result
        save_optimizer_config(config)
    return result


def predict_session_context():
    """Predict which files/engines will be accessed based on recent history."""
    telemetry_dir = os.path.expanduser("~/.prism/telemetry")
    sessions_file = os.path.join(telemetry_dir, "sessions.jsonl")
    if not os.path.exists(sessions_file):
        return {"predictions": [], "reason": "No session history"}
    file_counts = defaultdict(int)
    try:
        with open(sessions_file) as f:
            for line in f:
                try:
                    session = json.loads(line.strip())
                    for file_path in session.get("accessed_files", []):
                        file_counts[file_path] += 1
                except json.JSONDecodeError:
                    pass
    except IOError:
        return {"predictions": [], "reason": "Cannot read session history"}
    top_files = sorted(file_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return {"predictions": [{"file": f, "access_count": c} for f, c in top_files],
            "total_tracked_files": len(file_counts)}


def optimize_cost_per_outcome():
    """Track total token cost per outcome type, optimize routing."""
    stats = load_stats()
    agent_stats = stats.get("agent_stats", {})
    model_efficiency = {}
    for model, ms in agent_stats.items():
        total = ms.get("total", 0)
        success = ms.get("success", 0)
        tokens = ms.get("tokens", [])
        if total >= 5 and tokens:
            mean_tokens = sum(tokens) / len(tokens)
            success_rate = success / total
            cost_per_success = mean_tokens / max(0.01, success_rate)
            model_efficiency[model] = {"mean_tokens": round(mean_tokens), "success_rate": round(success_rate, 4),
                                        "cost_per_success": round(cost_per_success), "sample_size": total}
    recommendation = None
    min_cost = float("inf")
    for model, eff in model_efficiency.items():
        if eff["success_rate"] >= 0.85 and eff["cost_per_success"] < min_cost:
            min_cost = eff["cost_per_success"]
            recommendation = model
    return {"model_efficiency": model_efficiency, "recommended_default": recommendation or "sonnet",
            "reason": (f"Lowest cost per success at {min_cost} tokens" if recommendation else "Default recommendation")}


def optimize_dedup_windows():
    """Auto-tune dedup windows based on false-positive rates from coordination_stats."""
    stats = load_stats()
    dedup_stats = stats.get("dedup_stats", {})
    recommendations = {}
    for tool_name, ds in dedup_stats.items():
        blocked = ds.get("blocked", 0)
        allowed = ds.get("allowed", 0)
        total = blocked + allowed
        if total < 10:
            continue
        false_positive = ds.get("false_positive", 0)
        true_positive = ds.get("true_positive", 0)
        fp_rate = false_positive / total if total > 0 else 0
        tp_rate = true_positive / total if total > 0 else 0
        if fp_rate > 0.1:
            recommendations[tool_name] = {"action": "reduce", "total": total, "reason": f"FP rate {fp_rate:.1%} too high"}
        elif blocked > 0 and tp_rate < 0.5:
            recommendations[tool_name] = {"action": "increase", "total": total, "reason": f"TP rate {tp_rate:.1%} low, may be missing duplicates"}
        else:
            recommendations[tool_name] = {"action": "keep", "total": total, "reason": f"FP={fp_rate:.1%}, TP={tp_rate:.1%} within bounds"}
    return {"dedup_recommendations": recommendations}


def optimize_retry_strategy():
    """Tune retry backoff based on recovery success at each attempt."""
    stats = load_stats()
    retry_stats = stats.get("retry_stats", {})
    recommendations = []
    for error_type, attempts_by_num in retry_stats.items():
        if not isinstance(attempts_by_num, dict):
            continue
        for attempt_str, counts in attempts_by_num.items():
            if not isinstance(counts, dict):
                continue
            attempt = int(attempt_str)
            total = counts.get("success", 0) + counts.get("failure", 0)
            if total > 0:
                recovery_rate = counts["success"] / total
                recommendations.append({
                    "error_type": error_type,
                    "attempt": attempt,
                    "recovery_rate": round(recovery_rate, 4),
                    "sample_size": total
                })
    # Sort by error type then attempt number
    recommendations.sort(key=lambda x: (x["error_type"], x["attempt"]))
    # Find where marginal recovery drops below 5%
    max_useful_retry = {}
    for rec in recommendations:
        et = rec["error_type"]
        if rec["recovery_rate"] >= 0.05:
            max_useful_retry[et] = max(max_useful_retry.get(et, 0), rec["attempt"])
    return {"retry_recommendations": recommendations, "max_useful_retries": max_useful_retry}


def run_full_optimization():
    """Execute all optimizers and produce unified recommendation report."""
    report = {
        "timestamp": datetime.now().isoformat(),
        "model_routing": predict_optimal_model({"complexity_score": 5, "file_count": 3}),
        "effort_routing": predict_optimal_effort("general"),
        "max_turns": optimize_max_turns("general"),
        "token_budget": predict_token_budget(),
        "hook_priorities": rank_hook_priorities(),
        "cost_optimization": optimize_cost_per_outcome(),
        "context_prediction": predict_session_context(),
        "dedup_windows": optimize_dedup_windows(),
        "retry_strategy": optimize_retry_strategy(),
    }
    telemetry_dir = os.path.expanduser("~/.prism/telemetry")
    os.makedirs(telemetry_dir, exist_ok=True)
    report_file = os.path.join(telemetry_dir, "optimization-reports.jsonl")
    with open(report_file, "a") as f:
        f.write(json.dumps(report) + chr(10))
    return report


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "full"
    if cmd == "full":
        print(json.dumps(run_full_optimization(), indent=2))
    elif cmd == "model":
        complexity = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        file_count = int(sys.argv[3]) if len(sys.argv) > 3 else 1
        print(json.dumps(predict_optimal_model({"complexity_score": complexity, "file_count": file_count}), indent=2))
    elif cmd == "effort":
        action = sys.argv[2] if len(sys.argv) > 2 else "general"
        print(json.dumps(predict_optimal_effort(action), indent=2))
    elif cmd == "turns":
        agent_type = sys.argv[2] if len(sys.argv) > 2 else "general"
        print(json.dumps(optimize_max_turns(agent_type), indent=2))
    elif cmd == "budget":
        task_type = sys.argv[2] if len(sys.argv) > 2 else "general"
        print(json.dumps(predict_token_budget(task_type), indent=2))
    elif cmd == "hooks":
        print(json.dumps(rank_hook_priorities(), indent=2))
    elif cmd == "cost":
        print(json.dumps(optimize_cost_per_outcome(), indent=2))
    elif cmd == "dedup":
        print(json.dumps(optimize_dedup_windows(), indent=2))
    elif cmd == "retry":
        print(json.dumps(optimize_retry_strategy(), indent=2))
    elif cmd == "skill":
        skill = sys.argv[2] if len(sys.argv) > 2 else "default"
        print(json.dumps(optimize_skill_model(skill), indent=2))
    elif cmd == "ab-create":
        if len(sys.argv) >= 6:
            print(json.dumps(create_ab_test(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]), indent=2))
        else:
            print(json.dumps({"error": "Usage: ab-create <name> <param> <control> <treatment>"}))
    elif cmd == "ab-record":
        if len(sys.argv) >= 5:
            print(json.dumps(record_ab_result(sys.argv[2], sys.argv[3].lower() == "treatment", float(sys.argv[4])), indent=2))
        else:
            print(json.dumps({"error": "Usage: ab-record <name> <control|treatment> <value>"}))
    elif cmd == "ab-eval":
        if len(sys.argv) >= 3:
            print(json.dumps(evaluate_ab_test(sys.argv[2]), indent=2))
        else:
            print(json.dumps({"error": "Usage: ab-eval <name>"}))
    elif cmd == "context":
        print(json.dumps(predict_session_context(), indent=2))
    elif cmd == "cron":
        cron_name = sys.argv[2] if len(sys.argv) > 2 else "default"
        print(json.dumps(optimize_cron_frequency(cron_name, []), indent=2))
    else:
        print(json.dumps({"commands": [
            "full       - Run all optimizers",
            "model [c] [f] - Predict optimal model (complexity 1-10, file_count)",
            "effort [action] - Predict effort level",
            "turns [type]   - Optimize maxTurns",
            "budget [type]  - Predict token budget",
            "hooks          - Rank hook priorities",
            "cost           - Cost-per-outcome analysis",
            "dedup          - Optimize dedup windows",
            "retry          - Optimize retry strategy",
            "skill [name]   - Optimize skill model tier",
            "ab-create <name> <param> <control> <treatment>",
            "ab-record <name> <control|treatment> <value>",
            "ab-eval <name> - Evaluate A/B test (Welch t-test)",
            "context        - Predict session context",
            "cron [name]    - Optimize cron frequency"
        ]}, indent=2))


if __name__ == "__main__":
    main()
